import { vi } from 'vitest';

// `vi.mock('sonner', () => import('@/test/mocks/sonner'))`: every toast kind is
// a spy, so a test can `import { toast } from 'sonner'` and assert on it.
export const toast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  loading: vi.fn(),
};
