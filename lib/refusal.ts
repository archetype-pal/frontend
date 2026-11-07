/**
 * Refusals the backend names with a `code`, so they can be said in the
 * reader's language. Any other refusal is shown in the backend's own words.
 */

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

const WORDED = [
  'switched_off',
  'limit',
  'throttled',
  'question_quota',
  'lesson_quota',
  'lesson_questions',
  'tutor_unavailable',
  'too_large',
  'no_allograph',
  'no_place',
  'no_picture',
  'no_models',
  'failed',
] as const;
type WordedCode = (typeof WORDED)[number];

function isWorded(code: string): code is WordedCode {
  return (WORDED as readonly string[]).includes(code);
}

export function refusalCode(body: unknown): string {
  return body && typeof body === 'object' && 'code' in body && typeof body.code === 'string'
    ? body.code
    : '';
}

export function useRefusalWords(): (code: string, detail: string) => string {
  const t = useTranslations('refusal');
  return useCallback((code: string, detail: string) => (isWorded(code) ? t(code) : detail), [t]);
}
