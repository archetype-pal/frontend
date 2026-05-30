import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

/** Absolute path to a file under the repo's top-level `config/` directory. */
export function configFilePath(filename: string): string {
  return path.join(process.cwd(), 'config', filename);
}

/**
 * Read + JSON.parse a config file, mapping the raw parsed value through
 * `parse`. Any failure — missing file, malformed JSON, or a `parse` that
 * throws — falls back to `fallback` so SSR never 500s over a broken config.
 * (The per-config `parse` is also responsible for returning `fallback` when
 * the JSON is structurally wrong, e.g. an array or primitive.)
 */
export async function readJsonConfig<T>(
  filename: string,
  parse: (raw: unknown) => T,
  fallback: T
): Promise<T> {
  try {
    const raw = await readFile(configFilePath(filename), 'utf-8');
    return parse(JSON.parse(raw));
  } catch {
    return fallback;
  }
}

/** Pretty-print `data` as JSON to a `config/` file, creating the dir if needed. */
export async function writeJsonConfig(filename: string, data: unknown): Promise<void> {
  const filePath = configFilePath(filename);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
