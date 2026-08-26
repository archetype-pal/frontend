import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BackofficeHeader } from './backoffice-header';

const logout = vi.fn();
let activeCount = 0;

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { username: 'ali', email: 'ali@example.org' }, logout, token: 'tok' }),
}));
vi.mock('@/contexts/upload-manager-context', () => ({
  useUploadManager: () => ({ activeCount }),
}));
vi.mock('@/contexts/model-labels-context', () => ({
  useModelLabels: () => ({ getLabel: (k: string) => k, getPluralLabel: (k: string) => k }),
}));
vi.mock('@/hooks/backoffice/use-recent-entities', () => ({
  useRecentEntities: () => ({ recent: [], addRecent: vi.fn(), clearRecent: vi.fn() }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/backoffice/manuscripts' }));
vi.mock('next-intl', () => ({
  // Render keys so assertions do not depend on the copy.
  useTranslations: () => Object.assign((k: string) => k, { rich: (k: string) => k }),
}));

// Radix menus need pointer-capture APIs jsdom lacks, and there is no
// user-event in this repo. Render the menu inline instead: the behaviour under
// test is which handler the sign-out item calls, not Radix's open/close.
vi.mock('@/components/ui/dropdown-menu', () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    DropdownMenu: Pass,
    DropdownMenuTrigger: Pass,
    DropdownMenuContent: Pass,
    DropdownMenuSeparator: () => null,
    DropdownMenuItem: ({
      children,
      onClick,
      disabled,
    }: {
      children?: React.ReactNode;
      onClick?: () => void;
      disabled?: boolean;
    }) => (
      <button type="button" onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  activeCount = 0;
});

describe('signing out with uploads in flight', () => {
  it('signs out immediately when nothing is uploading', () => {
    render(<BackofficeHeader collapsed={false} onToggleSidebar={vi.fn()} />);
    fireEvent.click(screen.getByText('header.signOut'));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('asks first when an upload is running, and only signs out on confirm', async () => {
    activeCount = 2;
    render(<BackofficeHeader collapsed={false} onToggleSidebar={vi.fn()} />);

    fireEvent.click(screen.getByText('header.signOut'));

    // Held back — losing an in-flight transfer silently is the thing to avoid.
    expect(logout).not.toHaveBeenCalled();
    await waitFor(() => screen.getByText('uploads.signOutTitle'));

    fireEvent.click(screen.getByText('uploads.signOutConfirm'));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
