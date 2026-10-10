const BUCKET = 'comment-images';
const BATCH_SIZE = 10;
const BUDGET_MS = 60_000;
const REQUEST_TIMEOUT_MS = 8_000;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const OWNER_PATTERN = new RegExp(`^${UUID}$`);
const PATH_PATTERN = new RegExp(`^(?:posts|comments/${UUID})/[A-Za-z0-9_-]+\\.(?:jpg|jpeg|png|webp|gif)$`);
const STATES = new Set(['ready', 'absent', 'owner_mismatch', 'referenced']);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const validId = (value) => Number.isSafeInteger(value) && value > 0;
// Comparing the entire match also rejects the final newline accepted by JS '$'.
const fullMatch = (pattern, value) => typeof value === 'string' && pattern.exec(value)?.[0] === value;

function validDispatch(row, id) {
  return isRecord(row) && validId(row.id) && row.id === id && row.bucket_id === BUCKET
    && fullMatch(PATH_PATTERN, row.object_name) && fullMatch(OWNER_PATTERN, row.owner_id)
    && STATES.has(row.state);
}

function unwrap(result) {
  if (!isRecord(result) || result.error !== null || !Object.hasOwn(result, 'data')) {
    throw new Error('Cleanup request failed');
  }
  return result.data;
}

export function createBoundedFetch(fetcher, deadline, now = () => performance.now()) {
  return async (input, init = {}) => {
    const remaining = Math.floor(deadline - now());
    if (remaining <= 0) throw new Error('Cleanup budget exhausted');
    // Keep this signal alive after headers arrive: the SDK still reads the body.
    const timeout = AbortSignal.timeout(Math.min(REQUEST_TIMEOUT_MS, remaining));
    const upstream = init.signal ?? (input instanceof Request ? input.signal : undefined);
    const signal = upstream ? AbortSignal.any([upstream, timeout]) : timeout;
    return fetcher(input, { ...init, signal });
  };
}

async function cleanupTicket(client, summary, id) {
  const rpc = async (name, params) => unwrap(await client.rpc(name, params));
  const fail = async (code) => {
    summary.failed += 1;
    try {
      if (await rpc('community_image_cleanup_error', { p_id: id, p_code: code }) !== null) {
        throw new Error('Invalid diagnostic response');
      }
    } catch { summary.diagnostic_failures += 1; }
  };
  let rows;
  try { rows = await rpc('community_image_cleanup_dispatch', { p_id: id }); }
  catch { await fail('dispatch_failed'); return; }
  if (Array.isArray(rows) && rows.length === 0) { summary.skipped += 1; return; }
  if (!Array.isArray(rows) || rows.length !== 1 || !validDispatch(rows[0], id)) {
    await fail('invalid_dispatch'); return;
  }
  const row = rows[0];
  if (row.state === 'owner_mismatch' || row.state === 'referenced') {
    await fail(row.state); return;
  }
  if (row.state === 'ready') {
    try {
      const removed = unwrap(await client.storage.from(BUCKET).remove([row.object_name]));
      if (!Array.isArray(removed) || !removed.every(isRecord)) throw new Error('Invalid removal response');
    } catch { await fail('storage_remove_failed'); return; }
  }
  // Empty removal is idempotent. SQL ACK confirms absence and detects restoration.
  let acknowledged;
  try { acknowledged = await rpc('community_image_cleanup_ack', { p_id: id }); }
  catch { await fail('ack_failed'); return; }
  if (acknowledged === true) summary.completed += 1;
  else await fail(acknowledged === false ? 'object_restored' : 'ack_failed');
}

export async function handleCleanup(request, { env, createClient, fetcher = fetch, now = () => performance.now() }) {
  const summary = { listed: 0, attempted: 0, completed: 0, skipped: 0, failed: 0, diagnostic_failures: 0 };
  const reply = (status) => Response.json(summary, {
    status, headers: { 'Cache-Control': 'no-store', ...(status === 405 ? { Allow: 'POST' } : {}) },
  });
  const reject = (status) => { summary.failed += 1; return reply(status); };
  if (request.method !== 'POST') return reject(405);
  const token = request.headers.get('x-fit-cleanup-token');
  if (token?.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(token)) return reject(401);
  const deadline = now() + BUDGET_MS;
  let client;
  try {
    const url = env?.SUPABASE_URL?.trim();
    const key = env?.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname || parsed.username
      || parsed.password || parsed.search || parsed.hash || !key
      || key.toLowerCase() === 'your_supabase_service_role_key') return reject(503);
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: createBoundedFetch(fetcher, deadline, now) },
    });
    const authorized = unwrap(await client.rpc('community_image_cleanup_authorized', { p_token: token }));
    if (authorized !== true) return reject(401);
  } catch { return reject(503); }
  let rows;
  try { rows = unwrap(await client.rpc('community_image_cleanup_list', { p_limit: BATCH_SIZE })); }
  catch { return reject(503); }
  if (!Array.isArray(rows) || rows.length > BATCH_SIZE || rows.some((row) => !isRecord(row) || !validId(row.id))) {
    return reject(503);
  }
  summary.listed = rows.length;
  for (const id of new Set(rows.map((row) => row.id))) {
    if (now() >= deadline) { summary.failed += 1; break; }
    summary.attempted += 1;
    await cleanupTicket(client, summary, id);
  }
  return reply(summary.failed > 0 ? 503 : 200);
}
