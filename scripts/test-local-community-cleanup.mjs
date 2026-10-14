import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Credentials come only from CLI local status, never hosted environment inputs.
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workdir = resolve(process.argv[2] ?? '.');
const python = process.argv[3] ?? 'python';
const config = readFileSync(resolve(workdir, 'supabase/config.toml'), 'utf8');
const projectId = config.match(/^project_id\s*=\s*"([a-zA-Z0-9_-]+)"/m)?.[1];
assert.ok(projectId, 'local project config required');
const db = `supabase_db_${projectId}`;
const storage = `supabase_storage_${projectId}`;
const status = spawnSync('supabase', ['status', '--workdir', workdir, '--output', 'json'], { encoding: 'utf8', windowsHide: true });
assert.equal(status.status, 0, 'local stack must already be running');
const local = JSON.parse(status.stdout);
const base = new URL(local.API_URL);
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname) && base.protocol === 'http:', 'loopback HTTP only');
assert.ok(local.ANON_KEY && local.SERVICE_ROLE_KEY, 'CLI local credentials required');
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aXcAAAAASUVORK5CYII=', 'base64');
const users = [], objects = [], posts = [], heldSessions = [], pausedRequests = [];
let checks = 0;
let primaryFailure;
const cleanupFailures = [];
const environment = { ...process.env, SUPABASE_URL: base.href, SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY };

function sql(query) {
  const result = spawnSync('docker', ['exec', '-i', db, 'psql', '-U', 'postgres', '-d', 'postgres', '-qAt', '-v', 'ON_ERROR_STOP=1'],
    { input: query, encoding: 'utf8', windowsHide: true, timeout: 15_000 });
  assert.equal(result.status, 0, 'local fixture SQL must succeed');
  return result.stdout.trim();
}
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const objectRows = (name) => JSON.parse(sql(`select coalesce(json_agg(o),'[]') from
 (select id,version,owner_id from storage.objects where bucket_id='comment-images' and name=${quote(name)}) o;`));
const ticket = (name) => JSON.parse(sql(`select coalesce(json_agg(t),'[]') from
 (select id,object_id,completed_at,error_code,last_attempt_at from private.community_image_cleanup where object_name=${quote(name)}) t;`))[0];
function backendVersions(name) {
  assert.match(name, /^(?:posts\/[A-Za-z0-9_-]+|comments\/[0-9a-f-]+\/[A-Za-z0-9_-]+)\.png$/);
  const code = `const fs=require('fs'),p=require('path');const target=p.join('/mnt/stub/stub/comment-images',process.argv[1]);let a=[];
    if(fs.existsSync(target)&&fs.statSync(target).isDirectory())a=fs.readdirSync(target);
    const parent=p.dirname(target),stem=p.basename(target)+'-$v-';
    if(fs.existsSync(parent))a.push(...fs.readdirSync(parent).filter(n=>n.startsWith(stem)).map(n=>n.slice(stem.length)));
    process.stdout.write(JSON.stringify(a));`;
  const result = spawnSync('docker', ['exec', storage, 'node', '-e', code, name], { encoding: 'utf8', windowsHide: true, timeout: 10_000 });
  assert.equal(result.status, 0, 'read exact fixture backing files');
  return JSON.parse(result.stdout);
}
async function request(path, token = local.ANON_KEY, options = {}) {
  const response = await fetch(new URL(path, base), { ...options, redirect: 'error', signal: AbortSignal.timeout(15_000),
    headers: { apikey: local.ANON_KEY, Authorization: `Bearer ${token}`, ...options.headers } });
  const bytes = Buffer.from(await response.arrayBuffer());
  let data;
  try { data = JSON.parse(bytes.toString()); } catch { data = bytes; }
  return { status: response.status, data, bytes };
}
function success(result, label) {
  assert.ok(result.status >= 200 && result.status < 300, `${label}: HTTP ${result.status}`);
  checks += 1;
  return result.data;
}
const rpc = async (name, args, token = local.SERVICE_ROLE_KEY) => success(await request(`/rest/v1/rpc/${name}`, token,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) }), name);
async function createPost(user, imagePath = null) {
  const rows = await rpc('create_community_post_with_tickers', { p_expected_author_id: user.id, p_title: 'Synthetic cleanup test',
    p_body: null, p_tags: [], p_post_type: 'discussion', p_time_frame: null, p_tickers: [], p_source_url: null,
    p_image_url: null, p_image_path: imagePath }, user.token);
  assert.ok(rows[0]?.id, 'post RPC returns fixture');
  posts.push(rows[0].id);
  return rows[0].id;
}
async function upload(name, user, bucket = 'comment-images') {
  objects.push({ bucket, name });
  success(await request(`/storage/v1/object/${bucket}/${name}`, user.token,
    { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: image }), 'fixture upload');
  return name;
}
async function attach(postId, name, user) {
  return request('/rest/v1/comments', user.token, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_id: postId, author_id: user.id, body: null, image_path: name }) });
}
async function deletePost(postId, user) {
  success(await request(`/rest/v1/posts?id=eq.${postId}`, user.token, { method: 'DELETE' }), 'relational post deletion');
  const rows = success(await request(`/rest/v1/posts?id=eq.${postId}&select=id`, user.token), 'post read after delete');
  assert.equal(rows.length, 0, 'discussion is gone before cleanup runs');
  checks += 1;
}
function runWorker(limit = 100, failStorage = false) {
  const faultCode = `import importlib.util,json,sys
spec=importlib.util.spec_from_file_location('cleanup',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
c=m.create_cleanup_client()
class FailingStorage:
 def from_(self,bucket): return self
 def remove(self,paths): raise TimeoutError('synthetic timeout')
c.storage.from_=FailingStorage().from_
s=m.cleanup_batch(c,int(sys.argv[2]));print(json.dumps(s));sys.exit(int(s['failed']>0))`;
  const script = resolve(repo, 'scripts/cleanup_community_images.py');
  const args = failStorage ? ['-c', faultCode, script, String(limit)] : [script, '--limit', String(limit)];
  const result = spawnSync(python, args, { env: environment, encoding: 'utf8', windowsHide: true, timeout: 30_000 });
  assert.ok([0, 1].includes(result.status), 'worker must finish with bounded exit status');
  return { code: result.status, summary: JSON.parse(result.stdout.trim()) };
}
function coordinatedWorker() {
  // Freeze only the real server-selected list at a fixture barrier, so two
  // actual worker processes dispatch/remove/ACK the same ID concurrently.
  const code = `import importlib.util,json,sys
from types import SimpleNamespace
spec=importlib.util.spec_from_file_location('cleanup',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
c=m.create_cleanup_client();rows=c.rpc('community_image_cleanup_list',{'p_limit':100}).execute().data
print('WORKER_READY',flush=True);sys.stdin.readline()
class FrozenList:
 def execute(self): return SimpleNamespace(data=rows)
class Client:
 storage=c.storage
 def rpc(self,name,params): return FrozenList() if name=='community_image_cleanup_list' else c.rpc(name,params)
s=m.cleanup_batch(Client());print(json.dumps(s),flush=True);sys.exit(int(s['failed']>0))`;
  const child = spawn(python, ['-u', '-c', code, resolve(repo, 'scripts/cleanup_community_images.py')],
    { env: environment, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.resume();
  const result = new Promise((done, reject) => {
    child.on('error', () => reject(new Error('coordinated local worker failed to start')));
    child.on('exit', (code) => {
      if (code !== 0) reject(new Error('coordinated local worker failed'));
      else done(JSON.parse(output.trim().split('\n').at(-1)));
    });
  });
  result.catch(() => {});
  heldSessions.push(child);
  return { ready: () => output.includes('WORKER_READY'), resume: () => child.stdin.end('RUN\n'), result };
}
async function absent(name) {
  const result = await request(`/storage/v1/object/public/comment-images/${name}`);
  assert.ok(result.status >= 400 && result.status < 500, 'deleted fixture is absent from origin URL');
  assert.equal(objectRows(name).length, 0, 'deleted fixture metadata is absent');
  assert.equal(backendVersions(name).length, 0, 'deleted fixture physical bytes are absent');
  checks += 3;
}
async function waitFor(predicate, label, timeout = 10_000) {
  const end = Date.now() + timeout;
  while (!predicate()) {
    assert.ok(Date.now() < end, label);
    await new Promise((done) => setTimeout(done, 100));
  }
  checks += 1;
}
function heldTransaction(statement) {
  const child = spawn('docker', ['exec', '-i', db, 'psql', '-U', 'postgres', '-d', 'postgres', '-qAt', '-v', 'ON_ERROR_STOP=1'],
    { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  heldSessions.push(child);
  let output = '', errors = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { errors += chunk; });
  child.stdin.write(`begin;\nselect pg_backend_pid();\n${statement};\n\\echo FIXTURE_HELD\n`);
  return { ready: () => output.includes('FIXTURE_HELD'),
    pid: () => Number(output.match(/^\d+$/m)?.[0]),
    commit: (statement = '') => new Promise((done, reject) => {
      child.on('exit', (code) => code === 0 ? done() : reject(new Error(`local fixture transaction failed: ${errors.length} diagnostic bytes`)));
      child.stdin.end(`${statement ? `${statement};\n` : ''}commit;\n`);
    }) };
}
function waitingForParent(holder) {
  assert.ok(Number.isInteger(holder.pid()) && holder.pid() > 0, 'fixture lock holder PID required');
  return sql(`select count(*) from pg_stat_activity where pid<>pg_backend_pid()
    and wait_event_type='Lock' and ${holder.pid()}=any(pg_blocking_pids(pid))`) !== '0';
}
function pausedUpload(name, user) {
  // Kong buffers ordinary request bodies. Send the same genuine authenticated
  // Storage HTTP request from inside the local container so the server sees a
  // paused stream. Credentials are delivered only over stdin, never argv/logs.
  const code = `const http=require('http'),rl=require('readline').createInterface({input:process.stdin});let req;
    rl.on('line',line=>{if(!req){const c=JSON.parse(line);const bytes=Buffer.from(c.image,'base64');
      req=http.request({host:'127.0.0.1',port:5000,path:'/object/comment-images/'+c.name,method:'POST',
        headers:{apikey:c.apikey,Authorization:'Bearer '+c.token,'Content-Type':'image/png','Content-Length':bytes.length,'x-upsert':'true'}},res=>{
          res.resume();res.on('end',()=>{process.stdout.write(JSON.stringify({status:res.statusCode})+'\\n');rl.close();process.stdin.destroy();});});
      req.on('error',()=>{process.stdout.write(JSON.stringify({status:0})+'\\n');process.exitCode=1;rl.close();process.stdin.destroy();});
      req.setTimeout(20000,()=>req.destroy());req.write(bytes.subarray(0,16));req.fixtureTail=bytes.subarray(16);
    }else if(line==='RESUME'){req.end(req.fixtureTail);}else{req.destroy();}});`;
  const child = spawn('docker', ['exec', '-i', storage, 'node', '-e', code], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  const response = new Promise((done, reject) => {
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
      if (output.includes('\n')) done(JSON.parse(output.trim()));
    });
    child.on('error', () => reject(new Error('local paused upload process failed')));
    child.on('exit', (code) => { if (!output.trim()) reject(new Error(`local paused upload exited ${code}`)); });
  });
  child.stderr.resume();
  child.stdin.write(`${JSON.stringify({ name, token: user.token, apikey: local.ANON_KEY, image: image.toString('base64') })}\n`);
  // Retain a rejection handler while the request is deliberately paused.
  response.catch(() => {});
  pausedRequests.push({ destroy: () => { if (child.exitCode === null) child.stdin.end('ABORT\n'); } });
  return { resume: () => child.stdin.write('RESUME\n'), response };
}

try {
  const imageVersion = spawnSync('docker', ['inspect', storage, '--format', '{{.Config.Image}}'], { encoding: 'utf8', windowsHide: true });
  assert.match(imageVersion.stdout, /storage-api:v1\.44\.11/, 'race proof is pinned to the inspected Storage runtime');
  assert.equal((await rpc('community_image_cleanup_list', { p_limit: 100 })).length, 0,
    'exclusive disposable stack must have no preexisting cleanup work');
  for (const label of ['owner', 'commenter']) {
    const user = success(await request('/auth/v1/signup', local.ANON_KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `cleanup-${label}-${randomUUID()}@fit.test`, password: randomBytes(24).toString('base64url') }) }), 'synthetic user');
    if (user.user?.id) users.push({ id: user.user.id, token: user.access_token });
    assert.ok(user.user?.id && user.access_token, 'local signup session required');
  }
  const [owner, commenter] = users;
  const unrelated = await upload(`posts/${randomUUID()}.png`, owner);
  await upload(`${owner.id}/avatar`, owner, 'avatars');
  const postId = await createPost(owner);
  const name = await upload(`comments/${postId}/${randomUUID()}.png`, commenter);
  success(await attach(postId, name, commenter), 'other author attachment');
  assert.ok(backendVersions(name).length === 1, 'real API produced backing bytes');
  checks += 1;
  await deletePost(postId, owner);
  const pending = ticket(name);
  assert.ok(pending && !pending.completed_at, 'cascade creates durable ticket');
  checks += 1;
  for (const actor of [local.ANON_KEY, owner.token, commenter.token]) {
    const denied = await request('/rest/v1/rpc/community_image_cleanup_list', actor, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"p_limit":1}' });
    assert.ok(denied.status >= 400 && denied.status < 500, 'unprivileged ticket dispatch denied');
    checks += 1;
  }
  const failed = runWorker(1, true);
  assert.equal(failed.code, 1, 'Storage timeout causes worker failure');
  assert.equal(ticket(name).error_code, 'storage_remove_failed', 'failure leaves a bounded retry diagnostic');
  success(await request(`/storage/v1/object/public/comment-images/${name}`), 'failed cleanup retains bytes');
  const laterPost = await createPost(owner);
  const laterName = await upload(`comments/${laterPost}/${randomUUID()}.png`, commenter);
  success(await attach(laterPost, laterName, commenter), 'later attachment');
  await deletePost(laterPost, owner);
  assert.equal(runWorker(1).summary.completed, 1, 'new unattempted ticket is not starved by old failure');
  await absent(laterName);
  assert.equal(ticket(name).completed_at, null, 'first failure still pending after fair batch');
  assert.equal(runWorker().summary.completed, 1, 'next scheduled invocation retries first failure');
  await absent(name);
  assert.equal(runWorker().summary.attempted, 0, 'completed absent reservations are a no-op');
  assert.deepEqual(success(await request(`/storage/v1/object/public/comment-images/${unrelated}`), 'unrelated image survives'), image);
  success(await request(`/storage/v1/object/public/avatars/${owner.id}/avatar`), 'unrelated avatar survives');

  // Crash after successful Storage removal, before ACK: replay confirms absence.
  const crashName = await upload(`posts/${randomUUID()}.png`, owner);
  const crashPost = await createPost(owner, crashName);
  await deletePost(crashPost, owner);
  const crashTicket = ticket(crashName);
  await rpc('community_image_cleanup_dispatch', { p_id: crashTicket.id });
  success(await request('/storage/v1/object/comment-images', local.SERVICE_ROLE_KEY, { method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [crashName] }) }), 'remove before simulated crash');
  assert.equal(ticket(crashName).completed_at, null, 'crash left pending ticket');
  assert.equal(runWorker().summary.completed, 1, 'restart safely ACKs already absent path');
  await absent(crashName);
  assert.equal(await rpc('community_image_cleanup_ack', { p_id: crashTicket.id }), true, 'duplicate ACK is safe');

  const duplicateName = await upload(`posts/${randomUUID()}.png`, owner);
  const duplicatePost = await createPost(owner, duplicateName);
  await deletePost(duplicatePost, owner);
  const workers = [coordinatedWorker(), coordinatedWorker()];
  await waitFor(() => workers.every((worker) => worker.ready()), 'both workers select the same real ticket');
  workers.forEach((worker) => worker.resume());
  const duplicateSummaries = await Promise.all(workers.map((worker) => worker.result));
  assert.ok(duplicateSummaries.every((summary) => summary.completed === 1 && summary.failed === 0), 'duplicate workers safely remove and ACK same path');
  checks += 1;
  await absent(duplicateName);

  // DELETE holds the parent first; attachment waits there and fails after commit.
  const lockedPost = await createPost(owner);
  const lockedName = await upload(`comments/${lockedPost}/${randomUUID()}.png`, commenter);
  success(await attach(lockedPost, lockedName, commenter), 'initial lock fixture attachment');
  const deletion = heldTransaction(`select 1 from public.posts where id=${quote(lockedPost)} for update`);
  await waitFor(deletion.ready, 'deletion transaction holds parent only');
  const waitingAttach = attach(lockedPost, lockedName, commenter);
  await waitFor(() => waitingForParent(deletion), 'attachment waits on parent before object');
  sql(`begin; select id from storage.objects where bucket_id='comment-images' and name=${quote(lockedName)} for update nowait; rollback;`);
  checks += 1; // Waiting attachment has not locked the object ahead of its parent.
  await deletion.commit(`delete from public.posts where id=${quote(lockedPost)}`);
  const rejectedAttach = await waitingAttach;
  assert.ok(rejectedAttach.status >= 400 && rejectedAttach.status < 500, 'attachment cannot resurrect deleted parent');
  checks += 1;
  runWorker();
  await absent(lockedName);

  // Attachment holds parent KEY SHARE first; DELETE waits, then cascades it.
  const attachedPost = await createPost(owner);
  const attachedName = await upload(`comments/${attachedPost}/${randomUUID()}.png`, commenter);
  const insertion = heldTransaction(`insert into public.comments(post_id,author_id,body,image_path) values
    (${quote(attachedPost)},${quote(commenter.id)},null,${quote(attachedName)})`);
  await waitFor(insertion.ready, 'attachment transaction holds parent and object');
  const waitingDelete = request(`/rest/v1/posts?id=eq.${attachedPost}`, owner.token, { method: 'DELETE' });
  await waitFor(() => waitingForParent(insertion), 'DELETE waits for attaching transaction');
  await insertion.commit();
  success(await waitingDelete, 'DELETE completes after attachment commit');
  assert.ok(ticket(attachedName), 'concurrent committed attachment is queued by cascade');
  runWorker();
  await absent(attachedName);

  // Mandatory late completion proof: watch a second physical version appear
  // while its authenticated request is paused, proving initial RLS passed.
  const streamPost = await createPost(owner);
  const streamName = await upload(`comments/${streamPost}/${randomUUID()}.png`, commenter);
  success(await attach(streamPost, streamName, commenter), 'streaming fixture attachment');
  const beforeObject = objectRows(streamName)[0];
  const paused = pausedUpload(streamName, commenter);
  await waitFor(() => backendVersions(streamName).length === 2, 'paused authenticated upsert passed RLS and started writing bytes');
  await deletePost(streamPost, owner);
  assert.equal(runWorker().summary.completed, 1, 'worker removes original object and ACKs while stream is paused');
  assert.ok(ticket(streamName).completed_at, 'reservation is completed before upload resumes');
  assert.equal(objectRows(streamName).length, 0, 'original metadata absent before resume');
  paused.resume();
  success(await paused.response, 'previously authorized upload completes after retirement');
  const restored = objectRows(streamName)[0];
  assert.ok(restored && restored.id !== beforeObject.id, 'late completion restores path with a different object UUID');
  assert.equal(sql(`select count(*) from private.community_image_cleanup where id=${ticket(streamName).id} and completed_at is null;`), '0',
    'pending-only eligibility would miss the same restored path');
  assert.ok((await rpc('community_image_cleanup_list', { p_limit: 100 })).some((row) => row.id === ticket(streamName).id),
    'completed reservation with restored object is listed again');
  checks += 3;
  assert.equal(runWorker().summary.completed, 1, 'scheduled recovery removes restored matching-owner path');
  await absent(streamName);
  console.log(`Local Community cleanup: PASS (${checks} checks; cascade, timeout/retry, fair batches, crash replay, parent ordering, paused authorized upsert with changed UUID, physical bytes)`);
} catch (error) { primaryFailure = error; }
finally {
  for (const request of pausedRequests) request.destroy();
  for (const child of heldSessions) { if (child.exitCode === null) child.stdin.end('rollback;\n'); }
  const cleanup = async (operation) => { try { await operation(); } catch (error) { cleanupFailures.push(error); } };
  for (const postId of posts) await cleanup(async () => success(await request(`/rest/v1/posts?id=eq.${postId}`, local.SERVICE_ROLE_KEY, { method: 'DELETE' }), 'fixture post cleanup'));
  for (const { bucket, name } of objects) await cleanup(async () => success(await request(`/storage/v1/object/${bucket}`, local.SERVICE_ROLE_KEY,
    { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [name] }) }), 'fixture object cleanup'));
  // Remove only this run's private fixture reservations. No Storage metadata SQL
  // deletion, global reset, configuration changes, or hosted requests are used.
  if (users.length) await cleanup(async () => sql(`delete from private.community_image_cleanup where owner_id in (${users.map((u) => quote(u.id)).join(',')});`));
  for (const user of users) await cleanup(async () => success(await request(`/auth/v1/admin/users/${user.id}`, local.SERVICE_ROLE_KEY, { method: 'DELETE' }), 'fixture user cleanup'));
}
if (cleanupFailures.length) throw new AggregateError(primaryFailure ? [primaryFailure, ...cleanupFailures] : cleanupFailures, 'Local verification or exact fixture cleanup failed');
if (primaryFailure) throw primaryFailure;
