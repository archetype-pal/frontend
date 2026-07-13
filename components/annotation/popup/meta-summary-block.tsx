import { useTranslations } from 'next-intl';

import type { AnnotationPopupMetaSummary } from '@/types/annotation-viewer';

export function AnnotationMetaSummaryBlock({
  metaSummary,
}: {
  metaSummary?: AnnotationPopupMetaSummary;
}) {
  const t = useTranslations('annotation');

  if (!metaSummary) return null;

  return (
    <div className="rounded-md border bg-muted/20 px-3 py-3">
      <div className="mb-2 text-xs font-semibold text-foreground">
        {t('popup.metaSummary.title')}
      </div>

      <div className="grid grid-cols-[88px_1fr] gap-x-2 gap-y-1 text-xs">
        <div className="text-muted-foreground">{t('popup.metaSummary.type')}</div>
        <div>{metaSummary.kindLabel}</div>

        {metaSummary.allographLabel ? (
          <>
            <div className="text-muted-foreground">{t('popup.metaSummary.allograph')}</div>
            <div>{metaSummary.allographLabel}</div>
          </>
        ) : null}

        {metaSummary.handLabel ? (
          <>
            <div className="text-muted-foreground">{t('popup.metaSummary.hand')}</div>
            <div>{metaSummary.handLabel}</div>
          </>
        ) : null}
      </div>
    </div>
  );
}
