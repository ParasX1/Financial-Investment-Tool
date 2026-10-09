import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// This runner intentionally has no hosted URL / key environment inputs. Only
// Supabase CLI's local status is accepted; credentials stay in process memory.
const workdir = resolve(process.argv[2] ?? '.');
const config = readFileSync(resolve(workdir, 'supabase/config.toml'), 'utf8');
assert.match(config, /^project_id\s*=\s*"[^"]+"/m, 'local project config is required');
const status = spawnSync('supabase', ['status', '--workdir', workdir, '--output', 'json'], {
  encoding: 'utf8', windowsHide: true,
});
assert.equal(status.status, 0, 'local Supabase services must be running');
const local = JSON.parse(status.stdout);
const base = new URL(local.API_URL);
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'only loopback API hosts are allowed');
assert.equal(base.protocol, 'http:', 'use the disposable local HTTP stack');
assert.ok(local.ANON_KEY && local.SERVICE_ROLE_KEY, 'local CLI must supply test keys');
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aXcAAAAASUVORK5CYII=', 'base64');
const users = [];
const objects = [];
const posts = [];
let checks = 0;
let primaryFailure;
const cleanupFailures = [];

async function request(path, token = local.ANON_KEY, options = {}) {
  const response = await fetch(new URL(path, base), {
    ...options, redirect: 'error', signal: AbortSignal.timeout(15_000),
    headers: { apikey: local.ANON_KEY, Authorization: `Bearer ${token}`, ...options.headers },
  });
  const body = await response.text();
  let data;
  try { data = JSON.parse(body); } catch { data = body; }
  return { status: response.status, data };
}
function success(result, description) {
  assert.ok(result.status >= 200 && result.status < 300, `${description}: HTTP ${result.status}`);
  checks += 1;
}
async function deniedUpload(bucket, name, user) {
  const result = await request(`/storage/v1/object/${bucket}/${name}`, user.token, {
    method: 'POST', headers: { 'Content-Type': 'image/png', 'x-upsert': 'true' }, body: image,
  });
  // Storage reports policy rejection as HTTP 400 with a structured 403 code.
  assert.ok(result.status >= 400 && result.status < 500, `cross-owner upsert: HTTP ${result.status}`);
  assert.match(JSON.stringify(result.data), /row.level.security|not authorized|unauthorized|403/i,
    'the failure must be authorization, not an unrelated request error');
  checks += 1;
}
async function ownerDelete(bucket, name, token) {
  const result = await request(`/storage/v1/object/${bucket}`, token, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [name] }),
  });
  success(result, `${bucket} owner deletes own object`);
  assert.ok(Array.isArray(result.data) && result.data.some((object) => object.name === name),
    `${bucket} deletion returns the exact owned object`);
  checks += 1;
  const missing = await request(`/storage/v1/object/public/${bucket}/${name}`);
  assert.ok(missing.status >= 400 && missing.status < 500, `${bucket} deleted file is no longer public`);
  assert.match(JSON.stringify(missing.data), /404|not found/i, 'deleted object fails because it is absent');
  checks += 1;
}

try {
  for (const label of ['owner', 'other']) {
    const result = await request('/auth/v1/signup', local.ANON_KEY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${label}-${randomUUID()}@fit.test`, password: randomBytes(24).toString('base64url') }),
    });
    success(result, `create synthetic ${label} account`);
    if (result.data.user?.id) users.push({ id: result.data.user.id, token: result.data.access_token });
    assert.ok(result.data.user?.id && result.data.access_token, 'local email confirmation must be disabled');
  }
  const [owner, other] = users;
  for (const [bucket, name] of [['avatars', `${owner.id}/avatar`], ['comment-images', `posts/local-${randomUUID()}.png`]]) {
    objects.push({ bucket, name });
    success(await request(`/storage/v1/object/${bucket}/${name}`, owner.token, {
      method: 'POST', headers: { 'Content-Type': 'image/png' }, body: image,
    }), `${bucket} owner upload`);
    success(await request(`/storage/v1/object/${bucket}/${name}`, owner.token, {
      method: 'POST', headers: { 'Content-Type': 'image/png', 'x-upsert': 'true' }, body: image,
    }), `${bucket} owner upsert`);
    await deniedUpload(bucket, name, other);

    const list = (user) => request(`/storage/v1/object/list/${bucket}`, user.token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: bucket === 'avatars' ? owner.id : 'posts', limit: 100 }),
    });
    const ownerList = await list(owner);
    success(ownerList, `${bucket} owner metadata list`);
    assert.ok(ownerList.data.some((object) => object.name === name.split('/').at(-1)), `${bucket} owner sees own object`);
    checks += 1;
    const otherList = await list(other);
    success(otherList, `${bucket} other-user metadata list`);
    assert.ok(!otherList.data.some((object) => object.name === name.split('/').at(-1)), `${bucket} other cannot list owner object`);
    checks += 1;

    const removed = await request(`/storage/v1/object/${bucket}`, other.token, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [name] }),
    });
    // Storage returns an empty successful result for rows hidden by RLS.
    assert.ok((removed.status >= 400 && removed.status < 500) ||
      (removed.status >= 200 && removed.status < 300 && Array.isArray(removed.data) && removed.data.length === 0),
      `${bucket} another user cannot delete owner object`);
    checks += 1;
    const stillThere = await request(`/storage/v1/object/public/${bucket}/${name}`);
    success(stillThere, `${bucket} public image remains after cross-owner deletion attempt`);
    await ownerDelete(bucket, name, owner.token);
    objects.pop();
  }
  // A post deletion cascades comment rows, but does not authorize its author
  // to remove image objects uploaded by another comment author.
  const post = await request('/rest/v1/posts', owner.token, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ title: 'Local deletion cleanup test', author_id: owner.id }),
  });
  success(post, 'owner post creation through REST');
  assert.ok(post.data[0]?.id, 'REST returns the created post');
  const postId = post.data[0].id;
  posts.push(postId);
  const commentImage = `comments/${postId}/${randomUUID()}.png`;
  objects.push({ bucket: 'comment-images', name: commentImage });
  success(await request(`/storage/v1/object/comment-images/${commentImage}`, other.token, {
    method: 'POST', headers: { 'Content-Type': 'image/png' }, body: image,
  }), 'other user comment image upload');
  success(await request('/rest/v1/comments', other.token, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_id: postId, author_id: other.id, body: 'Local comment', image_path: commentImage }),
  }), 'other user comment creation through REST');
  const prematureCleanup = await request('/storage/v1/object/comment-images', owner.token, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [commentImage] }),
  });
  assert.ok(Array.isArray(prematureCleanup.data) && prematureCleanup.data.length === 0,
    'post author cannot delete another author image before the post is removed');
  checks += 1;
  success(await request(`/rest/v1/posts?id=eq.${postId}`, owner.token, { method: 'DELETE' }),
    'owner post deletion through REST');
  posts.pop();
  const comments = await request(`/rest/v1/comments?post_id=eq.${postId}&select=id`, owner.token);
  success(comments, 'read comments after post deletion');
  assert.equal(comments.data.length, 0, 'post deletion cascades the other-author comment row');
  checks += 1;
  const crossAuthorCleanup = await request('/storage/v1/object/comment-images', owner.token, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [commentImage] }),
  });
  assert.ok(Array.isArray(crossAuthorCleanup.data) && crossAuthorCleanup.data.length === 0,
    'post author has no authority to remove another author image during cleanup');
  checks += 1;
  success(await request(`/storage/v1/object/public/comment-images/${commentImage}`),
    'other-author image remains after unauthorized cleanup');
  await ownerDelete('comment-images', commentImage, other.token);
  objects.pop();
} catch (error) {
  primaryFailure = error;
} finally {
  // Clean only exact synthetic resources created by this run, even on failure.
  // Attempt every cleanup even if one fails, retaining the original test error.
  const cleanup = async (operation, description) => {
    try { success(await operation(), description); }
    catch (error) { cleanupFailures.push(error); }
  };
  for (const { bucket, name } of objects) {
    await cleanup(() => request(`/storage/v1/object/${bucket}`, local.SERVICE_ROLE_KEY, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [name] }),
    }), 'synthetic object cleanup');
  }
  for (const postId of posts) {
    await cleanup(() => request(`/rest/v1/posts?id=eq.${postId}`, local.SERVICE_ROLE_KEY, { method: 'DELETE' }),
      'synthetic post cleanup');
  }
  for (const user of users) {
    await cleanup(() => request(`/auth/v1/admin/users/${user.id}`, local.SERVICE_ROLE_KEY, { method: 'DELETE' }),
      'synthetic account cleanup');
  }
}
if (cleanupFailures.length) {
  throw new AggregateError(primaryFailure ? [primaryFailure, ...cleanupFailures] : cleanupFailures,
    'Local verification or synthetic resource cleanup failed');
}
if (primaryFailure) throw primaryFailure;
console.log(`Local Auth/Storage API: PASS (${checks} checks including cleanup, two users, two buckets)`);
