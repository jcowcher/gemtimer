#!/usr/bin/env node
// Flip GemTimer feature flags (kill switches) via Supabase REST.
//
// Usage:
//   node scripts/flag.js list
//   node scripts/flag.js enable <key>
//   node scripts/flag.js disable <key>
//
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
// Service role key bypasses RLS (anon can only read feature_flags).

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env.local');

function parseEnvFile(p) {
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const raw of fs.readFileSync(p, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function die(msg, code = 1) {
  console.error('flag: ' + msg);
  process.exit(code);
}

async function main() {
  const env = { ...parseEnvFile(ENV_PATH), ...process.env };
  const SUPABASE_URL = env.SUPABASE_URL;
  const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL) die('missing SUPABASE_URL in .env.local');
  if (!SERVICE_KEY) die('missing SUPABASE_SERVICE_ROLE_KEY in .env.local (grab it from Supabase → Project Settings → API)');

  const [, , cmd, key] = process.argv;

  if (!cmd || !['list', 'enable', 'disable'].includes(cmd)) {
    die('usage: node scripts/flag.js <list|enable|disable> [key]');
  }

  const headers = {
    apikey: SERVICE_KEY,
    Authorization: 'Bearer ' + SERVICE_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  if (cmd === 'list') {
    const res = await fetch(SUPABASE_URL + '/rest/v1/feature_flags?select=key,enabled,updated_at&order=key.asc', { headers });
    if (!res.ok) die(`list failed: HTTP ${res.status} — ${await res.text()}`);
    const rows = await res.json();
    if (!rows.length) { console.log('(no flags)'); return; }
    const maxKey = Math.max(...rows.map(r => r.key.length));
    for (const r of rows) {
      const status = r.enabled ? 'ON ' : 'OFF';
      console.log(`  ${r.key.padEnd(maxKey)}  ${status}  (updated ${r.updated_at})`);
    }
    return;
  }

  if (!key) die(`'${cmd}' requires a flag key, e.g. \`node scripts/flag.js ${cmd} carve_outs\``);

  const enabled = cmd === 'enable';
  const url = SUPABASE_URL + '/rest/v1/feature_flags?key=eq.' + encodeURIComponent(key);
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ enabled, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) die(`${cmd} failed: HTTP ${res.status} — ${await res.text()}`);
  const updated = await res.json();
  if (!updated.length) die(`no flag named '${key}' in feature_flags table. Run \`npm run flag:list\` to see available keys.`);
  console.log(`flag '${key}' -> ${enabled ? 'ON' : 'OFF'}  (takes effect on next page load)`);
}

main().catch(err => die(err.message || String(err)));
