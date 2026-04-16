'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { backofficeUrlFor, type BackofficeKind } from '@/lib/backoffice-urls';
import { cn } from '@/lib/utils';

type Props = {
  kind: BackofficeKind;
  id: string | number;
  className?: string;
  label?: string;
};

export function BackofficeLink({ kind, id, className, label = 'View in backoffice' }: Props) {
  const { token } = useAuth();
  if (!token) return null;
  return (
    <Link
      href={backofficeUrlFor(kind, id)}
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline',
        className
      )}
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </Link>
  );
}
