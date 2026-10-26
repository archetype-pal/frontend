import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const dir = mkdtempSync(path.join(tmpdir(), 'auth-guards-'));
writeFileSync(
  path.join(dir, '.oxlintrc.json'),
  JSON.stringify({
    jsPlugins: [path.join(root, 'oxlint-plugins/auth-guards.mjs')],
    categories: { correctness: 'off' },
    rules: { 'auth-guards/no-document-cookie': 'error', 'auth-guards/no-auth-header': 'error' },
  })
);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

let probes = 0;

/** The auth-guards rules Oxlint reports for `source`, one entry per report. */
function lint(source: string): string[] {
  const file = `probe-${probes++}.ts`;
  writeFileSync(path.join(dir, file), source);
  const run = spawnSync(path.join(root, 'node_modules/.bin/oxlint'), ['-f', 'json', file], {
    cwd: dir,
    encoding: 'utf8',
  });
  const { diagnostics } = JSON.parse(run.stdout) as { diagnostics: { code: string }[] };
  return diagnostics.map((d) => d.code);
}

describe('auth-guards/no-document-cookie', () => {
  it('reports reading or writing document.cookie', () => {
    expect(lint('const c = document.cookie;\ndocument.cookie = "a=b";\n')).toEqual([
      'auth-guards(no-document-cookie)',
      'auth-guards(no-document-cookie)',
    ]);
  });

  it('leaves other document properties alone', () => {
    expect(lint('const t = document.title;\n')).toEqual([]);
  });
});

describe('auth-guards/no-auth-header', () => {
  it('reports an Authorization header, however it is written', () => {
    const source = [
      "headers.set('Authorization', value);",
      "headers.set('authorization', value);",
      'fetch(url, { headers: { Authorization: value } });',
      "fetch(url, { headers: { 'Authorization': value } });",
    ].join('\n');
    expect(lint(source)).toEqual(Array(4).fill('auth-guards(no-auth-header)'));
  });

  it('reports a DRF token value built from "Token "', () => {
    const source = ['const a = `Token ${token}`;', "const b = 'Token ' + token;"].join('\n');
    expect(lint(source)).toEqual(Array(2).fill('auth-guards(no-auth-header)'));
  });

  it('leaves other headers and token wording alone', () => {
    const source = [
      "fetch(url, { headers: { 'Content-Type': 'application/json' } });",
      "const label = 'Token expired';",
      'const tokenize = `${a} tokens`;',
    ].join('\n');
    expect(lint(source)).toEqual([]);
  });
});
