import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

const directory = new URL('../supabase/migrations/', import.meta.url);
const files = readdirSync(directory).filter((name) => name.endsWith('.sql')).sort();
const versions = new Set();
for (const file of files) {
  assert.match(file, /^\d{14}_[a-z0-9_]+\.sql$/, `invalid migration filename: ${file}`);
  const version = file.slice(0, 14);
  assert.ok(!versions.has(version), `duplicate migration version: ${version}`);
  versions.add(version);
}
const manifest = JSON.parse(readFileSync(new URL('../supabase/migration-provenance.json', import.meta.url), 'utf8'));
const mapped = new Set();
for (const entry of manifest.migrations) {
  assert.ok(!mapped.has(entry.replay_file), `ambiguous history mapping: ${entry.replay_file}`);
  mapped.add(entry.replay_file);
  assert.match(entry.original_sha256, /^[a-f0-9]{64}$/, 'original Git-blob SHA256 is required');
  assert.ok(entry.effect, `historical effect description is required: ${entry.original_file}`);
  const sql = readFileSync(new URL(entry.replay_file, directory), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const hash = createHash('sha256').update(sql).digest('hex');
  assert.equal(hash, entry.replay_sha256,
    `historical migration changed without updating its reviewed provenance: ${entry.replay_file}`);
}
console.log(`Supabase history: PASS (${files.length} unique versions, ${mapped.size} preserved original mappings)`);
