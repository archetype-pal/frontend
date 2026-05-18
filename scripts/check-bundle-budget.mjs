#!/usr/bin/env node
/*
 * Bundle budget check.
 *
 * Measures the gzipped size of the built client bundle from `.next/static/`
 * and compares it against `frontend/.bundle-budget.json`. Exits non-zero if
 * any tracked metric exceeds its budget — this is the CI gate.
 *
 * The script does NOT depend on `@next/bundle-analyzer`. It reads the built
 * chunks directly so the contract stays stable across analyzer versions and
 * works regardless of whether the analyzer was run.
 *
 * Usage:
 *   node scripts/check-bundle-budget.mjs           # check against budget
 *   node scripts/check-bundle-budget.mjs --update  # refresh budget to current sizes + headroom
 *   node scripts/check-bundle-budget.mjs --json    # emit machine-readable JSON to stdout
 */

import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BUDGET_PATH = path.join(ROOT, '.bundle-budget.json');
const CHUNKS_DIR = path.join(ROOT, '.next', 'static', 'chunks');

const args = new Set(process.argv.slice(2));
const MODE_UPDATE = args.has('--update');
const MODE_JSON = args.has('--json');

// Headroom applied when generating a new budget. 10% gives short-term churn
// space without disguising a real regression — anything beyond it should be
// a conscious update by the author of the bumping PR.
const HEADROOM = 1.1;

function fail(msg) {
  console.error(`bundle-budget: ${msg}`);
  process.exit(1);
}

function gzipSize(filePath) {
  return gzipSync(readFileSync(filePath)).length;
}

function walkJsFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJsFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

function measure() {
  if (!existsSync(CHUNKS_DIR)) {
    fail(
      `no built output at ${path.relative(ROOT, CHUNKS_DIR)} — run \`pnpm build\` before this script.`
    );
  }

  const files = walkJsFiles(CHUNKS_DIR);
  if (files.length === 0) fail('no .js chunks found under .next/static/chunks.');

  let totalRaw = 0;
  let totalGzip = 0;
  let largestRaw = 0;
  let largestRawFile = '';
  let largestGzip = 0;
  let largestGzipFile = '';

  for (const file of files) {
    const raw = statSync(file).size;
    const gz = gzipSize(file);
    totalRaw += raw;
    totalGzip += gz;
    if (raw > largestRaw) {
      largestRaw = raw;
      largestRawFile = path.relative(CHUNKS_DIR, file);
    }
    if (gz > largestGzip) {
      largestGzip = gz;
      largestGzipFile = path.relative(CHUNKS_DIR, file);
    }
  }

  return {
    chunk_count: files.length,
    total_raw_bytes: totalRaw,
    total_gzip_bytes: totalGzip,
    largest_chunk_raw_bytes: largestRaw,
    largest_chunk_raw_file: largestRawFile,
    largest_chunk_gzip_bytes: largestGzip,
    largest_chunk_gzip_file: largestGzipFile,
  };
}

function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

function gitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

const measured = measure();

if (MODE_JSON) {
  process.stdout.write(JSON.stringify(measured, null, 2) + '\n');
  process.exit(0);
}

if (MODE_UPDATE) {
  const budget = {
    note: 'Bundle-size guardrail. Regenerate with `pnpm bundle-budget:update` whenever an intentional growth lands.',
    generated_at: new Date().toISOString(),
    git_sha: gitSha(),
    headroom_multiplier: HEADROOM,
    budgets: {
      total_gzip_bytes: Math.ceil(measured.total_gzip_bytes * HEADROOM),
      largest_chunk_gzip_bytes: Math.ceil(measured.largest_chunk_gzip_bytes * HEADROOM),
    },
    last_measured: {
      total_gzip_bytes: measured.total_gzip_bytes,
      largest_chunk_gzip_bytes: measured.largest_chunk_gzip_bytes,
      largest_chunk_gzip_file: measured.largest_chunk_gzip_file,
      chunk_count: measured.chunk_count,
    },
  };
  writeFileSync(BUDGET_PATH, JSON.stringify(budget, null, 2) + '\n');
  console.log(
    `bundle-budget: wrote ${path.relative(ROOT, BUDGET_PATH)}\n` +
      `  total (gzip)         ${fmt(measured.total_gzip_bytes)}  → budget ${fmt(budget.budgets.total_gzip_bytes)}\n` +
      `  largest chunk (gzip) ${fmt(measured.largest_chunk_gzip_bytes)}  → budget ${fmt(budget.budgets.largest_chunk_gzip_bytes)}  (${measured.largest_chunk_gzip_file})`
  );
  process.exit(0);
}

if (!existsSync(BUDGET_PATH)) {
  fail(
    `no budget at ${path.relative(ROOT, BUDGET_PATH)} — run \`pnpm bundle-budget:update\` to create one.`
  );
}

const budget = JSON.parse(readFileSync(BUDGET_PATH, 'utf8'));
const checks = [
  {
    name: 'total (gzip)',
    actual: measured.total_gzip_bytes,
    limit: budget.budgets?.total_gzip_bytes,
  },
  {
    name: `largest chunk (gzip) — ${measured.largest_chunk_gzip_file}`,
    actual: measured.largest_chunk_gzip_bytes,
    limit: budget.budgets?.largest_chunk_gzip_bytes,
  },
];

let failed = false;
console.log(`bundle-budget: ${measured.chunk_count} chunks measured`);
for (const c of checks) {
  if (typeof c.limit !== 'number') {
    console.warn(`  ✗ ${c.name}: no budget defined`);
    failed = true;
    continue;
  }
  const overBy = c.actual - c.limit;
  if (overBy > 0) {
    console.error(
      `  ✗ ${c.name}: ${fmt(c.actual)} exceeds budget ${fmt(c.limit)} (+${fmt(overBy)})`
    );
    failed = true;
  } else {
    const pct = Math.round((c.actual / c.limit) * 100);
    console.log(`  ✓ ${c.name}: ${fmt(c.actual)} / ${fmt(c.limit)} (${pct}%)`);
  }
}

if (failed) {
  console.error(
    '\nIf this growth is intentional, run `pnpm bundle-budget:update` and commit the refreshed .bundle-budget.json.'
  );
  process.exit(1);
}
