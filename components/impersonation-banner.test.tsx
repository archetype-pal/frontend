import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));

const stopImpersonation = vi.fn();
let mockAuth: {
  isImpersonating: boolean;
  user: { username: string } | null;
  stopImpersonation: () => void;
};
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuth,
}));

import { ImpersonationBanner } from './impersonation-banner';

beforeEach(() => {
  push.mockClear();
  refresh.mockClear();
  stopImpersonation.mockClear();
  mockAuth = { isImpersonating: false, user: null, stopImpersonation };
});

describe('ImpersonationBanner', () => {
  it('renders nothing when not impersonating', () => {
    mockAuth.isImpersonating = false;
    const { container } = render(<ImpersonationBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the banner with the impersonated username when impersonating', () => {
    mockAuth.isImpersonating = true;
    mockAuth.user = { username: 'jdoe' };
    render(<ImpersonationBanner />);
    expect(screen.getByRole('alert').textContent).toContain('jdoe');
    expect(screen.getByRole('button', { name: /stop impersonating/i })).not.toBeNull();
  });

  it('calls stopImpersonation and navigates home when the button is clicked', () => {
    mockAuth.isImpersonating = true;
    mockAuth.user = { username: 'jdoe' };
    render(<ImpersonationBanner />);

    fireEvent.click(screen.getByRole('button', { name: /stop impersonating/i }));

    expect(stopImpersonation).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/');
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
