import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import {
  getDefaultModelLabelsConfig,
  normalizeModelLabels,
  type ModelLabelsConfig,
} from './model-labels';

const CONFIG_PATH = path.join(process.cwd(), 'config', 'model-labels.json');

export async function readModelLabels(): Promise<ModelLabelsConfig> {
  const defaults = getDefaultModelLabelsConfig();
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ModelLabelsConfig>;
    return {
      labels: normalizeModelLabels(parsed.labels),
    };
  } catch {
    return defaults;
  }
}

export async function writeModelLabels(config: ModelLabelsConfig): Promise<void> {
  const dir = path.dirname(CONFIG_PATH);
  await mkdir(dir, { recursive: true });
  const normalized: ModelLabelsConfig = {
    labels: normalizeModelLabels(config.labels),
  };
  await writeFile(CONFIG_PATH, JSON.stringify(normalized, null, 2), 'utf-8');
}
