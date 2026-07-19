'use client';

import { useTranslations } from 'next-intl';

import type { ItemPartNested } from '@/types/backoffice';
import { MsDescPartSection } from './msdesc/msdesc-part-section';

interface MsDescSectionProps {
  historicalItemId: number;
  itemParts: ItemPartNested[];
}

/**
 * Structured TEI description section (roadmap 2.1), fed by the workspace's
 * HistoricalItem detail query — part ids and their `msdesc_areas` arrive
 * nested, so this makes no API call of its own. Descriptions attach at the
 * `ItemPart` (§8.8): the ~1:1 corpus renders a single part's areas directly;
 * multi-part items get one sub-section per part; part-less items see a
 * disabled empty state prompting part creation first.
 */
export function MsDescSection({ historicalItemId, itemParts }: MsDescSectionProps) {
  const t = useTranslations('backoffice');

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{t('msdesc.section.title')}</h3>
      {itemParts.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          {t('msdesc.section.noParts')}
        </p>
      ) : (
        <div className="space-y-4">
          {itemParts.map((part) => (
            <MsDescPartSection
              key={part.id}
              historicalItemId={historicalItemId}
              part={part}
              showPartHeading={itemParts.length > 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
