import type { ResultType } from '@/lib/search-types';

export type SavedSearch = {
  id: string;
  label: string;
  resultType: ResultType;
  keyword: string;
  url: string;
  filterCount: number;
  resultCount: number;
  savedAt: number;
};

const STORAGE_KEY = 'archetype_saved_searches';
const MAX_SAVED_SEARCHES = 50;

function readStore(): SavedSearch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(searches: SavedSearch[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
}

export function getSavedSearches(): SavedSearch[] {
  return readStore();
}

export function addSavedSearch(search: Omit<SavedSearch, 'id' | 'savedAt'>): SavedSearch {
  const entry: SavedSearch = {
    ...search,
    id: crypto.randomUUID(),
    savedAt: Date.now(),
  };
  const current = readStore();
  const updated = [entry, ...current].slice(0, MAX_SAVED_SEARCHES);
  writeStore(updated);
  return entry;
}

export function removeSavedSearch(id: string): void {
  const current = readStore();
  writeStore(current.filter((s) => s.id !== id));
}

export function buildFilterSummary(
  keyword: string,
  filterCount: number,
  resultType: ResultType
): string {
  const parts: string[] = [];
  if (keyword) parts.push(`"${keyword}"`);
  if (filterCount > 0) parts.push(`${filterCount} filter${filterCount > 1 ? 's' : ''}`);
  if (parts.length === 0) return resultType;
  return parts.join(', ');
}
