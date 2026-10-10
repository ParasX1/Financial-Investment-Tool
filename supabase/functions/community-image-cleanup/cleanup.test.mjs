import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { createBoundedFetch, handleCleanup } from './cleanup.mjs';

const TOKEN = 'a'.repeat(64);
const OWNER = '12345678-1234-4321-8123-123456789abc';
const ENV = { SUPABASE_URL: 'https://unit.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'unit-service-credential' };
const EMPTY = { listed: 0, attempted: 0, completed: 0, skipped: 0, failed: 0, diagnostic_failures: 0 };
const success = (data) => ({ data, error: null });
const row = (id = 1, changes = {}) => ({ id, bucket_id: 'comment-images', object_name: 'posts/photo_1.png', owner_id: OWNER, state: 'ready', ...changes });

function fixture(overrides = {}) {
  const calls = [];
  const client = {
    async rpc(name, params) {
      calls.push([name, params]);
      const value = overrides[name];
      if (value instanceof Error) throw value;
      if (typeof value === 'function') return value(params);
      if (Object.hasOwn(overrides, name)) return value;
      if (name === 'community_image_cleanup_authorized') return success(true);
      if (name === 'community_image_cleanup_list') return success([{ id: 1 }]);
      if (name === 'community_image_cleanup_dispatch') return success([row(params.p_id)]);
      if (name === 'community_image_cleanup_ack') return success(true);
      if (name === 'community_image_cleanup_error') return success(null);
      throw new Error('Unexpected RPC');
    },
    storage: {
      from(bucket) {
        calls.push(['bucket', bucket]);
        return { async remove(paths) {
          calls.push(['remove', paths]);
          const value = overrides.remove ?? success([]);
          if (value instanceof Error) throw value;
          return typeof value === 'function' ? value(paths) : value;
        } };
      },
    },
  };
  let created = 0;
  let clientOptions;
  const deps = {
    env: ENV,
    createClient(url, key, options) {
      created += 1;
      assert.equal(url, ENV.SUPABASE_URL);
      assert.equal(key, ENV.SUPABASE_SERVICE_ROLE_KEY);
      clientOptions = options;
      return client;
    },
    now: () => 0,
  };
  return { calls, deps, created: () => created, options: () => clientOptions };
}

async function invoke(f, options = {}, method = 'POST', token = TOKEN) {
  const response = await handleCleanup(new Request('https://worker.invalid', {
    method,
    headers: token === null ? {} : { 'x-fit-cleanup-token': token },
    ...(method === 'POST' ? { body: '{"path":"avatars/foreign.png","limit":100}' } : {}),
  }), { ...f.deps, ...options });
  return { response, summary: await response.json() };
}

test('authorized work uses a fixed batch and dispatched Storage path before ACK', async () => {
  const f = fixture({ remove: success([{ name: 'posts/photo_1.png' }]) });
  const { response, summary } = await invoke(f);
  assert.equal(response.status, 200);
  assert.deepEqual(summary, { ...EMPTY, listed: 1, attempted: 1, completed: 1 });
  assert.deepEqual(f.calls, [
    ['community_image_cleanup_authorized', { p_token: TOKEN }],
    ['community_image_cleanup_list', { p_limit: 10 }],
    ['community_image_cleanup_dispatch', { p_id: 1 }],
    ['bucket', 'comment-images'],
    ['remove', ['posts/photo_1.png']],
    ['community_image_cleanup_ack', { p_id: 1 }],
  ]);
  assert.deepEqual(f.options().auth, { persistSession: false, autoRefreshToken: false });
  assert.equal(typeof f.options().global.fetch, 'function');
});

for (const method of ['GET', 'DELETE', 'PATCH']) {
  test(`${method} cannot start a cleanup`, async () => {
    const f = fixture();
    const { response, summary } = await invoke(f, {}, method);
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'POST');
    assert.deepEqual(summary, { ...EMPTY, failed: 1 });
    assert.equal(f.created(), 0);
    assert.deepEqual(f.calls, []);
  });
}

for (const token of [null, '', 'a'.repeat(63), 'a'.repeat(65), 'g'.repeat(64)]) {
  test(`missing or malformed token is rejected before the service client (${token?.length ?? 'missing'})`, async () => {
    const f = fixture();
    assert.equal((await invoke(f, {}, 'POST', token)).response.status, 401);
    assert.equal(f.created(), 0);
    assert.deepEqual(f.calls, []);
  });
}

for (const value of [success(false), success('true'), success(null), success([true])]) {
  test(`only a boolean authorization success permits work (${JSON.stringify(value.data)})`, async () => {
    const f = fixture({ community_image_cleanup_authorized: value });
    assert.equal((await invoke(f)).response.status, 401);
    assert.deepEqual(f.calls, [['community_image_cleanup_authorized', { p_token: TOKEN }]]);
  });
}

test('authorization failures are redacted and never reach list or Storage', async () => {
  for (const value of [new Error('private/path secret'), { data: true, error: { message: TOKEN } }, { data: true }]) {
    const f = fixture({ community_image_cleanup_authorized: value });
    const { response, summary } = await invoke(f);
    assert.equal(response.status, 503);
    assert.deepEqual(summary, { ...EMPTY, failed: 1 });
    assert.equal(f.calls.length, 1);
  }
});

test('missing or invalid service configuration fails closed without SUPABASE_KEY fallback', async () => {
  for (const env of [{}, { SUPABASE_URL: ENV.SUPABASE_URL, SUPABASE_KEY: 'legacy' },
    { ...ENV, SUPABASE_SERVICE_ROLE_KEY: '' }, { ...ENV, SUPABASE_URL: 'not-a-url' },
    { ...ENV, SUPABASE_SERVICE_ROLE_KEY: 'your_supabase_service_role_key' }]) {
    const f = fixture();
    const { response, summary } = await invoke(f, { env });
    assert.equal(response.status, 503);
    assert.deepEqual(summary, { ...EMPTY, failed: 1 });
    assert.equal(f.created(), 0);
    assert.deepEqual(f.calls, []);
  }
});

test('client creation failure is redacted', async () => {
  const f = fixture();
  const { response, summary } = await invoke(f, { createClient() { throw new Error(TOKEN); } });
  assert.equal(response.status, 503);
  assert.deepEqual(summary, { ...EMPTY, failed: 1 });
  assert.deepEqual(f.calls, []);
});

test('absent object ACKs without removal; empty successful removal remains idempotent', async () => {
  for (const state of ['absent', 'ready']) {
    const f = fixture({ community_image_cleanup_dispatch: success([row(1, { state })]) });
    assert.equal((await invoke(f)).summary.completed, 1);
    assert.equal(f.calls.filter(([name]) => name === 'remove').length, state === 'ready' ? 1 : 0);
    assert.deepEqual(f.calls.at(-1), ['community_image_cleanup_ack', { p_id: 1 }]);
  }
});

test('reviewed comments namespace is accepted', async () => {
  const path = `comments/${OWNER}/photo-test.webp`;
  const f = fixture({ community_image_cleanup_dispatch: success([row(1, { object_name: path })]) });
  assert.equal((await invoke(f)).summary.completed, 1);
  assert.ok(f.calls.some(([name, paths]) => name === 'remove' && paths[0] === path));
});

test('duplicate listed IDs run once and tickets removed by concurrent workers skip', async () => {
  const f = fixture({
    community_image_cleanup_list: success([{ id: 1 }, { id: 1 }, { id: 2 }]),
    community_image_cleanup_dispatch: ({ p_id }) => success(p_id === 1 ? [row()] : []),
  });
  assert.deepEqual((await invoke(f)).summary, { ...EMPTY, listed: 3, attempted: 2, completed: 1, skipped: 1 });
  assert.equal(f.calls.filter(([name]) => name === 'remove').length, 1);
});

test('empty batch does no ticket work', async () => {
  const f = fixture({ community_image_cleanup_list: success([]) });
  assert.deepEqual((await invoke(f)).summary, EMPTY);
  assert.equal(f.calls.length, 2);
});

test('unsafe list IDs and malformed or oversized batches reject all ticket side effects', async () => {
  for (const data of [null, {}, [null], [{}], [{ id: '1' }], [{ id: true }], [{ id: 0 }],
    [{ id: -1 }], [{ id: Number.MAX_SAFE_INTEGER + 1 }], [{ id: 1 }, { id: 'bad' }],
    Array.from({ length: 11 }, (_, i) => ({ id: i + 1 }))]) {
    const f = fixture({ community_image_cleanup_list: success(data) });
    const { response, summary } = await invoke(f);
    assert.equal(response.status, 503);
    assert.deepEqual(summary, { ...EMPTY, failed: 1 });
    assert.equal(f.calls.length, 2);
  }
});

test('list failure does not call dispatch', async () => {
  const f = fixture({ community_image_cleanup_list: { data: null, error: { message: TOKEN } } });
  assert.equal((await invoke(f)).summary.failed, 1);
  assert.equal(f.calls.length, 2);
});

test('foreign bucket/path, noncanonical owner, wrong ID, and unknown state never reach Storage or ACK', async () => {
  for (const change of [{ bucket_id: 'avatars' }, { object_name: 'posts/../foreign.png' },
    { object_name: 'posts/a.png\n' }, { object_name: 'posts/a.png?token=secret' },
    { object_name: 'posts/a.svg' }, { object_name: 'comments/not-uuid/a.png' },
    { object_name: 'posts/a%2fb.png' }, { object_name: null }, { owner_id: OWNER.toUpperCase() },
    { owner_id: null }, { id: 2 }, { id: true }, { state: 'unknown' }, { state: [] }]) {
    const f = fixture({ community_image_cleanup_dispatch: success([row(1, change)]) });
    const { response, summary } = await invoke(f);
    assert.equal(response.status, 503);
    assert.equal(summary.failed, 1);
    assert.deepEqual(f.calls.at(-1), ['community_image_cleanup_error', { p_id: 1, p_code: 'invalid_dispatch' }]);
    assert.ok(!f.calls.some(([name]) => ['bucket', 'remove', 'community_image_cleanup_ack'].includes(name)));
  }
});

test('invalid dispatch shape is rejected', async () => {
  for (const data of [null, {}, [null], [row(), row()]]) {
    const f = fixture({ community_image_cleanup_dispatch: success(data) });
    assert.equal((await invoke(f)).summary.failed, 1);
    assert.deepEqual(f.calls.at(-1), ['community_image_cleanup_error', { p_id: 1, p_code: 'invalid_dispatch' }]);
  }
});

test('owner mismatch and live references record bounded diagnostics without deletion', async () => {
  for (const state of ['owner_mismatch', 'referenced']) {
    const f = fixture({ community_image_cleanup_dispatch: success([row(1, { state })]) });
    assert.equal((await invoke(f)).summary.failed, 1);
    assert.deepEqual(f.calls.at(-1), ['community_image_cleanup_error', { p_id: 1, p_code: state }]);
    assert.ok(!f.calls.some(([name]) => name === 'bucket' || name === 'community_image_cleanup_ack'));
  }
});

test('dispatch error and diagnostic failure preserve fair progress to the next ticket', async () => {
  const f = fixture({
    community_image_cleanup_list: success([{ id: 1 }, { id: 2 }]),
    community_image_cleanup_dispatch: ({ p_id }) => p_id === 1 ? { data: null, error: { message: TOKEN } } : success([row(2)]),
    community_image_cleanup_error: { data: null, error: { message: 'private/path' } },
  });
  const { response, summary } = await invoke(f);
  assert.equal(response.status, 503);
  assert.deepEqual(summary, { ...EMPTY, listed: 2, attempted: 2, completed: 1, failed: 1, diagnostic_failures: 1 });
  assert.ok(f.calls.some(([name, params]) => name === 'community_image_cleanup_dispatch' && params.p_id === 2));
});

test('diagnostic RPC must acknowledge its void result without hiding the original failure', async () => {
  const f = fixture({
    community_image_cleanup_dispatch: success([row(1, { state: 'referenced' })]),
    community_image_cleanup_error: success(false),
  });
  assert.deepEqual((await invoke(f)).summary, { ...EMPTY, listed: 1, attempted: 1, failed: 1, diagnostic_failures: 1 });
});

test('Storage errors and malformed successes never ACK, and the next ticket still completes', async () => {
  for (const value of [new Error(TOKEN), { data: [], error: { message: TOKEN } }, success(null), success({}), success([null]), success(['bad'])]) {
    let removed = 0;
    const f = fixture({
      community_image_cleanup_list: success([{ id: 1 }, { id: 2 }]),
      remove() { if (++removed === 1) { if (value instanceof Error) throw value; return value; } return success([]); },
    });
    const { response, summary } = await invoke(f);
    assert.equal(response.status, 503);
    assert.equal(summary.failed, 1);
    assert.equal(summary.completed, 1);
    assert.ok(!f.calls.some(([name, params]) => name === 'community_image_cleanup_ack' && params.p_id === 1));
    assert.ok(f.calls.some(([name, params]) => name === 'community_image_cleanup_error' && params.p_code === 'storage_remove_failed'));
  }
});

test('false or malformed ACK stays failed with a bounded diagnostic', async () => {
  for (const value of [success(false), success('true'), { data: null, error: { message: TOKEN } }, new Error(TOKEN)]) {
    const f = fixture({ community_image_cleanup_ack: value });
    const { response, summary } = await invoke(f);
    assert.equal(response.status, 503);
    assert.equal(summary.completed, 0);
    assert.deepEqual(f.calls.at(-1), ['community_image_cleanup_error', {
      p_id: 1, p_code: value.data === false ? 'object_restored' : 'ack_failed',
    }]);
  }
});

test('invocation budget stops new tickets and reports incomplete work', async () => {
  let clock = 0;
  const f = fixture({
    community_image_cleanup_list: success([{ id: 1 }, { id: 2 }]),
    community_image_cleanup_ack() { clock = 60_000; return success(true); },
  });
  const { response, summary } = await invoke(f, { now: () => clock });
  assert.equal(response.status, 503);
  assert.deepEqual(summary, { ...EMPTY, listed: 2, attempted: 1, completed: 1, failed: 1 });
  assert.ok(!f.calls.some(([name, params]) => name === 'community_image_cleanup_dispatch' && params.p_id === 2));
});

test('fetch timeout is 8 seconds or the shorter remaining global budget', async () => {
  const timeouts = [];
  const timeout = mock.method(AbortSignal, 'timeout', (ms) => { timeouts.push(ms); return new AbortController().signal; });
  try {
    const bounded = createBoundedFetch(async () => new Response('{}'), 60_000, () => 0);
    await bounded('https://api.invalid');
    await createBoundedFetch(async () => new Response('{}'), 60_000, () => 59_500)('https://api.invalid');
    assert.deepEqual(timeouts, [8_000, 500]);
  } finally { timeout.mock.restore(); }
});

test('fetch does not start after the deadline and retains caller cancellation', async () => {
  let fetched = 0;
  const fake = async (_input, init) => { fetched += 1; assert.equal(init.signal.aborted, true); throw init.signal.reason; };
  await assert.rejects(createBoundedFetch(fake, 60_000, () => 60_000)('https://api.invalid'));
  assert.equal(fetched, 0);
  const controller = new AbortController();
  controller.abort(new Error('caller cancelled'));
  await assert.rejects(createBoundedFetch(fake, 60_000, () => 0)('https://api.invalid', { signal: controller.signal }), /caller cancelled/);
  assert.equal(fetched, 1);
});

test('timeout remains active while a response body stalls after immediate headers', async () => {
  const fake = async (_input, { signal }) => new Response(new ReadableStream({
    start(controller) { signal.addEventListener('abort', () => controller.error(signal.reason), { once: true }); },
  }));
  const response = await createBoundedFetch(fake, 60_000, () => 59_975)('https://api.invalid');
  await Promise.all([assert.rejects(response.text(), { name: 'TimeoutError' }), new Promise((resolve) => setTimeout(resolve, 40))]);
});
