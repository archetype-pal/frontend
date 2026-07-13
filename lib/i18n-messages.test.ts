import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { defaultLocale, locales } from '@/lib/locale';

const messagesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'messages');

type Messages = Record<string, unknown>;

function loadLocale(locale: string): Messages {
  return JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), 'utf8')) as Messages;
}

/** Every leaf (dotted) key path in a message catalogue, e.g. `errors.backToHome`. */
function leafKeyPaths(obj: Messages, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === 'object'
      ? leafKeyPaths(value as Messages, path)
      : [path];
  });
}

describe('i18n message catalogues', () => {
  const reference = loadLocale(defaultLocale);
  const referenceKeys = leafKeyPaths(reference).sort();

  // Guards the class of bug where a namespace/key exists in one locale but not
  // another (or is dropped entirely) — which throws MISSING_MESSAGE at render.
  it.each(locales.filter((l) => l !== defaultLocale))(
    'locale "%s" has the same key structure as the default locale',
    (locale) => {
      expect(leafKeyPaths(loadLocale(locale)).sort()).toEqual(referenceKeys);
    }
  );

  // The error boundaries (app/error.tsx, app/not-found.tsx,
  // components/page/entity-error-state.tsx) resolve these under `errors`.
  const REQUIRED_ERROR_KEYS = [
    'somethingWentWrong',
    'unexpectedErrorTryAgain',
    'backToHome',
    'notFoundTitle',
    'notFoundBody',
  ] as const;

  it.each(locales)(
    'locale "%s" defines the errors namespace the error boundaries use',
    (locale) => {
      const errors = loadLocale(locale).errors as Record<string, string> | undefined;
      expect(errors).toBeDefined();
      for (const key of REQUIRED_ERROR_KEYS) {
        expect(errors).toHaveProperty(key);
        expect(typeof errors?.[key]).toBe('string');
      }
    }
  );
});
