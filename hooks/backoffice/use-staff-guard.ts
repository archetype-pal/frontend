'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export function useStaffGuard(redirectTo = '/backoffice') {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !user.is_staff) {
      router.replace(redirectTo);
    }
  }, [user, router, redirectTo]);

  return { allowed: !user || user.is_staff };
}
