'use client';

import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface StaffEditLinkProps {
  textId: number;
}

export function StaffEditLink({ textId }: StaffEditLinkProps) {
  const { user } = useAuth();
  if (!user?.is_staff) return null;
  return (
    <Link
      href={`/backoffice/image-texts/${textId}`}
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      <Pencil className="h-3 w-3" /> Edit
    </Link>
  );
}
