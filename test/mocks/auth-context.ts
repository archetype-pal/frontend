// `vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'))`:
// a signed-in viewer with nothing else on the session.
export const useAuth = () => ({ isAuthenticated: true });
