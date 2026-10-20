import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Explicit native smoke test: creates and removes only its unique synthetic
// Credential Manager entry. It never reads the user's configured profile.
assert.equal(process.platform, 'win32', 'This test requires Windows Credential Manager');
const script = fileURLToPath(new URL('../scripts/windows-cli.ps1', import.meta.url));
const profile = `test-${randomUUID()}`;
const record = {
  version: 1, endpoint: 'https://example.test', store: 'synthetic-store',
  namespace: 'personal', board_token: `wb1.synthetic.${'b'.repeat(43)}`,
  sites_token: `synthetic-sites-${randomUUID()}`, expires_at: '2099-01-01T00:00:00.000Z',
};
const run = (action, args = [], input) => {
  const result = spawnSync('pwsh', ['-NoProfile', '-File', script, action, profile, ...args],
    { encoding: 'utf8', input, timeout: 30000, windowsHide: true });
  assert.ifError(result.error);
  for (const secret of [record.board_token, record.sites_token]) {
    assert.ok(!`${result.stdout}${result.stderr}`.includes(secret), 'No secret in output');
  }
  return result;
};
let written = false;
try {
  assert.equal(run('status').status, 2, 'Absent profile does not fall back to environment');
  const configured = run('configure', ['--stdin'], JSON.stringify(record));
  assert.equal(configured.status, 0, configured.stderr);
  written = true;
  const metadata = JSON.parse(configured.stdout);
  assert.equal(metadata.credential_target, `WorkflowBoard:${profile}`);
  assert.equal(metadata.credential_id, 'synthetic');
  assert.equal(metadata.expired, false);
  const reread = run('status');
  assert.equal(reread.status, 0, reread.stderr);
  assert.deepEqual(JSON.parse(reread.stdout), metadata, 'Another process can read metadata');
  const version = run('run', ['version', '--json']);
  assert.equal(version.status, 0, version.stderr);
  assert.equal(JSON.parse(version.stdout).data.version, '0.1.0');
  for (const args of [
    ['capabilities', '--endpoint', 'https://other.example'],
    ['capabilities', '--endpoint=https://other.example'],
    ['capabilities', '--allow-loopback'],
    ['capabilities', '--store', 'other-store'],
  ]) {
    const rejected = run('run', args);
    assert.equal(rejected.status, 2);
    assert.match(rejected.stderr, /profile_connection_override_forbidden/);
  }
  const invalid = run('configure', ['--stdin'], JSON.stringify({ ...record, endpoint: 'http://example.test' }));
  assert.equal(invalid.status, 2);
  assert.deepEqual(JSON.parse(run('status').stdout), metadata, 'Invalid configuration preserves saved entry');
  const expired = run('configure', ['--stdin'], JSON.stringify({ ...record, expires_at: '2000-01-01T00:00:00Z' }));
  assert.equal(expired.status, 2);
  assert.deepEqual(JSON.parse(run('status').stdout), metadata);
  const removed = run('remove');
  assert.equal(removed.status, 0, removed.stderr);
  written = false;
  assert.equal(run('status').status, 2);
  console.log('PASS Windows Credential Manager: process-to-process read, safe CLI launch, scope binding, validation, secret-free output and removal');
} finally {
  if (written) {
    const cleanup = run('remove');
    assert.equal(cleanup.status, 0, 'Remove only the synthetic credential created by this test');
  }
}
