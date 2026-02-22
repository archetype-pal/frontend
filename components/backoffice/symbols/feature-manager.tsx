'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { InlineEdit } from '@/components/backoffice/common/inline-edit';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEntityCrud } from '@/hooks/backoffice/use-entity-crud';
import { NamedEntityManager } from '@/components/backoffice/common/named-entity-manager';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { createFeature, updateFeature, deleteFeature } from '@/services/backoffice/symbols';
import type { Feature, Component } from '@/types/backoffice';

interface FeatureManagerProps {
  features: Feature[];
  /** All components, used to compute reverse usage counts. */
  components?: Component[];
}

export function FeatureManager({ features, components = [] }: FeatureManagerProps) {
  const crud = useEntityCrud<Feature>({
    queryKeys: [backofficeKeys.features.all()],
    createFn: createFeature,
    updateFn: updateFeature,
    deleteFn: deleteFeature,
    entityLabel: 'Feature',
  });

  // Compute how many components link each feature
  const usageMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const comp of components) {
      for (const fId of comp.features) {
        map.set(fId, (map.get(fId) ?? 0) + 1);
      }
    }
    return map;
  }, [components]);

  return (
    <NamedEntityManager
      items={features}
      crud={crud}
      placeholder="New feature name..."
      emptyMessage="No features yet. Create one above."
      deleteDescription="This will remove the feature from all components and allographs that reference it."
      renderItem={(feat) => {
        const usage = usageMap.get(feat.id) ?? 0;
        return (
          <div
            key={feat.id}
            className="group flex items-center gap-1 rounded px-1 py-0.5 hover:bg-accent/50"
          >
            <InlineEdit
              value={feat.name}
              onSave={(name) => crud.renameMut.mutate({ id: feat.id, name })}
              className="flex-1 min-w-0"
            />
            <div className="flex items-center gap-0.5">
              {usage > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 h-4 tabular-nums"
                  title={`Used by ${usage} component${usage !== 1 ? 's' : ''}`}
                >
                  {usage}c
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                onClick={() => crud.setDeleteTarget(feat)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      }}
    />
  );
}
