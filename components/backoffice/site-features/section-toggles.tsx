'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Search,
  FolderOpen,
  Newspaper,
  BookOpen,
  PenTool,
  CalendarDays,
  Info,
  Image,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  normalizeSectionOrder,
  SECTION_LABELS,
  type SectionKey,
} from '@/lib/site-features';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const SECTION_ICONS: Record<SectionKey, LucideIcon> = {
  search: Search,
  collection: FolderOpen,
  lightbox: Image,
  news: Newspaper,
  blogs: PenTool,
  featureArticles: BookOpen,
  events: CalendarDays,
  about: Info,
};

type Props = {
  sections: Record<SectionKey, boolean>;
  sectionOrder: SectionKey[];
  onChange: (key: SectionKey, enabled: boolean) => void;
  onOrderChange: (sectionOrder: SectionKey[]) => void;
};

function SortableSectionCard({
  sectionKey,
  enabled,
  onChange,
}: {
  sectionKey: SectionKey;
  enabled: boolean;
  onChange: (key: SectionKey, enabled: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sectionKey,
  });
  const Icon = SECTION_ICONS[sectionKey];

  return (
    <label
      ref={setNodeRef}
      htmlFor={`section-${sectionKey}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors',
        enabled ? 'bg-card border-border' : 'bg-muted/40 border-transparent text-muted-foreground',
        isDragging && 'opacity-60 z-20'
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none shrink-0 p-0.5 rounded-sm hover:bg-muted"
        aria-label={`Reorder ${SECTION_LABELS[sectionKey]}`}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground/70" />
      </button>
      <Icon className="h-4 w-4 shrink-0" />
      <Label
        htmlFor={`section-${sectionKey}`}
        className="text-sm font-medium cursor-pointer flex-1 truncate"
      >
        {SECTION_LABELS[sectionKey]}
      </Label>
      <Switch
        id={`section-${sectionKey}`}
        checked={enabled}
        onCheckedChange={(checked) => onChange(sectionKey, checked)}
        className="shrink-0"
      />
    </label>
  );
}

export function SectionToggles({ sections, sectionOrder, onChange, onOrderChange }: Props) {
  const orderedKeys = normalizeSectionOrder(sectionOrder);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedKeys.indexOf(active.id as SectionKey);
    const newIndex = orderedKeys.indexOf(over.id as SectionKey);
    if (oldIndex < 0 || newIndex < 0) return;
    onOrderChange(arrayMove(orderedKeys, oldIndex, newIndex));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Site Sections</CardTitle>
        <CardDescription>
          Drag to reorder sections in navigation. Disabled sections are hidden and return 404.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedKeys} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {orderedKeys.map((key) => (
                <SortableSectionCard
                  key={key}
                  sectionKey={key}
                  enabled={sections[key]}
                  onChange={onChange}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
}
