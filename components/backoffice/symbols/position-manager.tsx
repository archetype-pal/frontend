'use client';

import { useEntityCrud } from '@/hooks/backoffice/use-entity-crud';
import { NamedEntityManager } from '@/components/backoffice/common/named-entity-manager';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { createPosition, updatePosition, deletePosition } from '@/services/backoffice/symbols';
import type { Position } from '@/types/backoffice';

interface PositionManagerProps {
  positions: Position[];
}

export function PositionManager({ positions }: PositionManagerProps) {
  const crud = useEntityCrud<Position>({
    queryKeys: [backofficeKeys.positions.all()],
    createFn: createPosition,
    updateFn: updatePosition,
    deleteFn: deletePosition,
    entityLabel: 'Position',
  });

  return (
    <NamedEntityManager
      items={positions}
      crud={crud}
      placeholder="New position name..."
      emptyMessage="No positions yet. Create one above."
      deleteDescription="This will remove the position from all annotations that reference it."
    />
  );
}
