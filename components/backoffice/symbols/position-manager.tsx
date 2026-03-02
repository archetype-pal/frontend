'use client';

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
      placeholder={`New ${positionLabel.toLowerCase()} name...`}
      emptyMessage={`No ${positionLabelPlural.toLowerCase()} yet. Create one above.`}
      deleteDescription={`This will remove the ${positionLabel.toLowerCase()} from all annotations that reference it.`}
    />
  );
}
