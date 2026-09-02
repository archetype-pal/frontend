import type { ResultType } from '@/lib/search-types';

export type SearchParamsLike =
  URLSearchParams | Record<string, string | string[] | undefined> | null | undefined;

export function stringifySearchParams(searchParams: SearchParamsLike): string {
  if (!searchParams) return '';
  if (searchParams instanceof URLSearchParams) return searchParams.toString();

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    } else if (value !== undefined) {
      params.append(key, value);
    }
  }
  return params.toString();
}

export function searchHref(resultType: ResultType, searchParams?: SearchParamsLike): string {
  const query = stringifySearchParams(searchParams);
  return `/search/${resultType}${query ? `?${query}` : ''}`;
}

export function searchHrefForKeyword(resultType: ResultType, keyword: string): string {
  const normalized = keyword.trim();
  return searchHref(resultType, normalized ? { keyword: normalized } : undefined);
}
