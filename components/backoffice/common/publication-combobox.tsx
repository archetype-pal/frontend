'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getAllPublications } from '@/services/backoffice/publications';
import { backofficeKeys } from '@/lib/backoffice/query-keys';

interface PublicationComboboxProps {
  value: number | null;
  onChange: (publicationId: number | null) => void;
  className?: string;
}

export function PublicationCombobox({ value, onChange, className }: PublicationComboboxProps) {
  const { isAuthenticated } = useAuth();
  const t = useTranslations('backoffice');

  const { data: publications = [], isPending } = useQuery({
    queryKey: backofficeKeys.publications.options(),
    queryFn: getAllPublications,
    enabled: isAuthenticated,
  });

  const options = publications.map((p) => ({
    value: String(p.id),
    label: `${p.title} (${p.comment_count})`,
  }));

  const placeholder =
    value == null
      ? t('comments.filterPostAll')
      : isPending
        ? t('comments.filterPostLoading')
        : t('comments.filterPostUnknown');

  return (
    <div className={cn('w-64', className)}>
      <label htmlFor="comment-post-filter" className="sr-only">
        {t('comments.filterPostLabel')}
      </label>
      <SearchableSelect
        id="comment-post-filter"
        options={options}
        value={value == null ? null : String(value)}
        onValueChange={(next) => onChange(next == null ? null : Number(next))}
        placeholder={placeholder}
        searchPlaceholder={t('comments.filterPostSearch')}
        emptyText={t('comments.filterPostNone')}
        clearLabel={t('comments.filterPostAll')}
        triggerClassName="h-8 px-3 text-xs"
        contentClassName="w-[360px]"
      />
    </div>
  );
}
