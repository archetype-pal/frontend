'use client';

import type { ResultType } from '@/lib/search-types';

const STORAGE_KEY = 'search-history';
const MAX_HISTORY = 10;

export type SearchHistoryEntry = {
  keyword: string;
  resultType: ResultType;
  timestamp: number;
};

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getSearchHistory(): SearchHistoryEntry[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is SearchHistoryEntry => {
        return (
          typeof entry === 'object' &&
          entry != null &&
          typeof (entry as SearchHistoryEntry).keyword === 'string' &&
          typeof (entry as SearchHistoryEntry).resultType === 'string' &&
          typeof (entry as SearchHistoryEntry).timestamp === 'number'
        );
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

export function addSearchHistory(keyword: string, resultType: ResultType): void {
  const normalized = keyword.trim();
  if (!normalized || !canUseStorage()) return;
  const nextEntry: SearchHistoryEntry = { keyword: normalized, resultType, timestamp: Date.now() };
  const existing = getSearchHistory();
  const deduped = existing.filter(
    (entry) =>
      !(entry.keyword.toLowerCase() === normalized.toLowerCase() && entry.resultType === resultType)
  );
  const next = [nextEntry, ...deduped].slice(0, MAX_HISTORY);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearSearchHistory(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
