import { QueryClient } from '@tanstack/react-query';

/** A React Query client for tests: no retries, so a failing query settles at once. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}
