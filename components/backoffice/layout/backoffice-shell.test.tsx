/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserProfile } from '@/types';

const { authState, replace } = vi.hoisted(() => ({
  authState: { user: null as Partial<UserProfile> | null },
  replace: vi.fn(),
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: authState.user, isReady: true }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('./backoffice-sidebar', () => ({ BackofficeSidebar: () => null }));
vi.mock('./backoffice-header', () => ({ BackofficeHeader: () => null }));
vi.mock('@/components/backoffice/common/search-command', () => ({ SearchCommand: () => null }));
vi.mock('@/components/backoffice/common/keyboard-shortcuts-dialog', () => ({
  KeyboardShortcutsDialog: () => null,
}));
vi.mock('@/contexts/upload-manager-context', () => ({
  UploadManagerProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/components/backoffice/uploads/upload-tray', () => ({ UploadTray: () => null }));

import { BackofficeShell } from './backoffice-shell';

const capabilities = (manage: boolean) => ({
  annotate: true,
  annotate_editorially: manage,
  read_drafts: true,
  manage,
});

describe('<BackofficeShell>', () => {
  beforeEach(() => replace.mockClear());

  it('opens for a user who may manage, whatever the staff flag says', () => {
    authState.user = { is_staff: false, is_superuser: true, capabilities: capabilities(true) };

    render(<BackofficeShell>page</BackofficeShell>);

    expect(screen.getByText('page')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('sends a user who may not manage back to the site, staff included', () => {
    authState.user = { is_staff: true, is_superuser: false, capabilities: capabilities(false) };

    render(<BackofficeShell>page</BackofficeShell>);

    expect(screen.queryByText('page')).toBeNull();
    expect(replace).toHaveBeenCalledWith('/');
  });
});
