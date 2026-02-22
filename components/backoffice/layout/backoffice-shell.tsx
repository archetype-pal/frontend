'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BackofficeSidebar } from './backoffice-sidebar';
import { BackofficeHeader } from './backoffice-header';
import { SearchCommand } from '@/components/backoffice/common/search-command';
import { KeyboardShortcutsDialog } from '@/components/backoffice/common/keyboard-shortcuts-dialog';

export function BackofficeShell({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // Auth guard — redirect non-authenticated or non-staff users
  useEffect(() => {
    if (token === null) {
      // Wait for initial token load from localStorage
      const stored = localStorage.getItem('token');
      if (!stored) {
        router.replace('/login');
      }
    }
  }, [token, router]);

  useEffect(() => {
    if (user && !user.is_staff) {
      router.replace('/');
    }
  }, [user, router]);

  // Show nothing while checking auth
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

  if (user && !user.is_staff) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Access Denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You do not have permission to access the backoffice.
          </p>
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
