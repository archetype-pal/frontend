import { readJsonConfig, writeJsonConfig } from './json-config-file';
import {
  getDefaultModelLabelsConfig,
  normalizeModelLabels,
  type ModelLabelsConfig,
} from './model-labels';

const CONFIG_FILE = 'model-labels.json';

export async function readModelLabels(): Promise<ModelLabelsConfig> {
  const defaults = getDefaultModelLabelsConfig();
  return readJsonConfig(
    CONFIG_FILE,
    (raw) => {
      // If the file was hand-edited to `null`, an array, or a primitive,
      // reading `parsed.labels` below would crash; bail to defaults.
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
      const parsed = raw as Partial<ModelLabelsConfig>;
      return { labels: normalizeModelLabels(parsed.labels) };
    },
    defaults
  );
}

export async function writeModelLabels(config: ModelLabelsConfig): Promise<void> {
  await writeJsonConfig(CONFIG_FILE, { labels: normalizeModelLabels(config.labels) });
}
