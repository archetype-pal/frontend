'use client';

import { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export type SortableItem = {
  id: string;
  label: string;
};

type Props = {
  allItems: SortableItem[];
  checkedIds: string[];
  onChangeOrder: (reordered: string[]) => void;
};

function SortableRow({
  item,
  checked,
  onToggle,
}: {
  item: SortableItem;
  checked: boolean;
  onToggle: (id: string, checked: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1.5 rounded border bg-card px-1.5 py-1 text-[13px]"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none shrink-0 p-0.5"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground/60" />
      </button>
      <Checkbox
        checked={checked}
        onCheckedChange={(c) => onToggle(item.id, !!c)}
        className="h-3.5 w-3.5"
      />
      <span className="truncate select-none leading-tight">{item.label}</span>
    </div>
  );
}

export function SortableCheckboxList({ allItems, checkedIds, onChangeOrder }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const checkedSet = new Set(checkedIds);
  const checkedItems = checkedIds
    .map((id) => allItems.find((i) => i.id === id))
    .filter(Boolean) as SortableItem[];
  const uncheckedItems = allItems.filter((i) => !checkedSet.has(i.id));

  const handleToggle = useCallback(
    (id: string, checked: boolean) => {
      if (checked) {
        onChangeOrder([...checkedIds, id]);
      } else {
        onChangeOrder(checkedIds.filter((cid) => cid !== id));
      }
    },
    [checkedIds, onChangeOrder]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = checkedIds.indexOf(String(active.id));
      const newIndex = checkedIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      onChangeOrder(arrayMove(checkedIds, oldIndex, newIndex));
    },
    [checkedIds, onChangeOrder]
  );

  return (
    <div className="space-y-0.5">
      {checkedItems.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={checkedIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">
              {checkedItems.map((item) => (
                <SortableRow key={item.id} item={item} checked onToggle={handleToggle} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {uncheckedItems.length > 0 && (
        <div
          className={cn(
            'space-y-0.5',
            checkedItems.length > 0 && 'mt-1.5 pt-1.5 border-t border-dashed'
          )}
        >
          {uncheckedItems.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-1.5 rounded px-1.5 py-1 text-[13px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
            >
              <div className="w-4 shrink-0" />
              <Checkbox
                checked={false}
                onCheckedChange={() => handleToggle(item.id, true)}
                className="h-3.5 w-3.5"
              />
              <span className="truncate select-none leading-tight">{item.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
