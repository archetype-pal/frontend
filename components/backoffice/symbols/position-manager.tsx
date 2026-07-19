'use client';

import { useTranslations } from 'next-intl';
import { useEntityCrud } from '@/hooks/backoffice/use-entity-crud';
import { NamedEntityManager } from '@/components/backoffice/common/named-entity-manager';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { createPosition, updatePosition, deletePosition } from '@/services/backoffice/symbols';
import type { Position } from '@/types/backoffice';
import { useModelLabels } from '@/contexts/model-labels-context';

interface PositionManagerProps {
  positions: Position[];
}

export function PositionManager({ positions }: PositionManagerProps) {
  const t = useTranslations('backoffice');
  const { getLabel, getPluralLabel } = useModelLabels();
  const positionLabel = getLabel('position');
  const positionLabelPlural = getPluralLabel('position');

  const crud = useEntityCrud<Position>({
    queryKeys: [backofficeKeys.positions.all()],
    createFn: createPosition,
    updateFn: updatePosition,
    deleteFn: deletePosition,
    entityLabel: positionLabel,
  });

  return (
    <NamedEntityManager
      items={positions}
      crud={crud}
      placeholder={t('symbols.positionNamePlaceholder', { label: positionLabel.toLowerCase() })}
      emptyMessage={t('symbols.positionEmptyMessage', { label: positionLabelPlural.toLowerCase() })}
      deleteDescription={t('symbols.positionDeleteDescription', {
        label: positionLabel.toLowerCase(),
      })}
    />
  );
}
