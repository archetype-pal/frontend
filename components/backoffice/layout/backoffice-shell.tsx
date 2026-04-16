'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { getAuthTokenCookie } from '@/lib/auth-token-cookie';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BackofficeSidebar } from './backoffice-sidebar';
import { BackofficeHeader } from './backoffice-header';
import { SearchCommand } from '@/components/backoffice/common/search-command';
import { KeyboardShortcutsDialog } from '@/components/backoffice/common/keyboard-shortcuts-dialog';

export function BackofficeShell({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // Auth guard — redirect non-authenticated visitors to login
  useEffect(() => {
    if (token === null) {
      if (!getAuthTokenCookie()) {
        router.replace('/login');
      }
    }
  }, [token, router]);

  if (!token) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="backoffice-shell fixed inset-0 z-50 flex bg-background">
        <BackofficeSidebar collapsed={collapsed} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <BackofficeHeader collapsed={collapsed} onToggleSidebar={() => setCollapsed((c) => !c)} />
          <main className="flex-1 overflow-y-auto">
            <div className="p-6">{children}</div>
          </main>
        </div>
        <SearchCommand />
        <KeyboardShortcutsDialog />
      </div>
    </TooltipProvider>
  );
}
