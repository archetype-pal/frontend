import { vi } from 'vitest';

// `vi.mock('next/navigation', () => import('@/test/mocks/next-navigation'))`:
// an inert router at `/` with no query string.
export const useRouter = () => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  prefetch: vi.fn(),
});
export const usePathname = () => '/';
export const useSearchParams = () => new URLSearchParams();
