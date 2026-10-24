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
  GitCompare,
  Newspaper,
  BookOpen,
  PenTool,
  CalendarDays,
  Info,
  Image,
  ListTree,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  headingSlugFromNavKey,
  isHeadingNavKey,
  resolveNavOrder,
  type HeadingNavKey,
  type NavKey,
  type SectionKey,
} from '@/lib/site-features';
import { resolvePageText, type MenuHeading } from '@/lib/pages';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const SECTION_ICONS: Record<SectionKey, LucideIcon> = {
  search: Search,
  collection: FolderOpen,
  lightbox: Image,
  compare: GitCompare,
  news: Newspaper,
  blogs: PenTool,
  featureArticles: BookOpen,
  events: CalendarDays,
  about: Info,
};

type Props = {
  sections: Record<SectionKey, boolean>;
  sectionOrder: NavKey[];
  /** Custom menu headings, sortable alongside the built-in sections. */
  menuHeadings: MenuHeading[];
  onChange: (key: SectionKey, enabled: boolean) => void;
  onOrderChange: (sectionOrder: NavKey[]) => void;
};

/** A custom heading's card: sortable, but with no switch — it shows whenever it has a published page. */
function SortableHeadingCard({ navKey, label }: { navKey: HeadingNavKey; label: string }) {
  const t = useTranslations('backoffice');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: navKey,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      title={t('siteFeatures.headingHint')}
      className={cn(
        'flex items-center gap-2.5 rounded-lg border border-dashed bg-card px-3 py-2.5',
        isDragging && 'opacity-60 z-20'
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none shrink-0 p-0.5 rounded-sm hover:bg-muted"
        aria-label={t('siteFeatures.reorderSection', { section: label })}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground/70" />
      </button>
      <ListTree className="h-4 w-4 shrink-0" />
      <span className="text-sm font-medium flex-1 truncate">{label}</span>
    </div>
  );
}

function SortableSectionCard({
  sectionKey,
  enabled,
  onChange,
}: {
  sectionKey: SectionKey;
  enabled: boolean;
  onChange: (key: SectionKey, enabled: boolean) => void;
}) {
  const t = useTranslations('backoffice');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sectionKey,
  });
  const Icon = SECTION_ICONS[sectionKey];
  const sectionLabel = t(`siteFeatures.sections.${sectionKey}`);

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
        aria-label={t('siteFeatures.reorderSection', { section: sectionLabel })}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground/70" />
      </button>
      <Icon className="h-4 w-4 shrink-0" />
      <Label
        htmlFor={`section-${sectionKey}`}
        className="text-sm font-medium cursor-pointer flex-1 truncate"
      >
        {sectionLabel}
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

export function SectionToggles({
  sections,
  sectionOrder,
  menuHeadings,
  onChange,
  onOrderChange,
}: Props) {
  const t = useTranslations('backoffice');
  const orderedKeys = resolveNavOrder(
    sectionOrder,
    menuHeadings.map((heading) => heading.slug)
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedKeys.indexOf(active.id as NavKey);
    const newIndex = orderedKeys.indexOf(over.id as NavKey);
    if (oldIndex < 0 || newIndex < 0) return;
    onOrderChange(arrayMove(orderedKeys, oldIndex, newIndex));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{t('siteFeatures.sectionsTitle')}</CardTitle>
        <CardDescription>{t('siteFeatures.sectionsDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedKeys} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {orderedKeys.map((key) => {
                if (!isHeadingNavKey(key)) {
                  return (
                    <SortableSectionCard
                      key={key}
                      sectionKey={key}
                      enabled={sections[key]}
                      onChange={onChange}
                    />
                  );
                }
                const slug = headingSlugFromNavKey(key);
                const heading = menuHeadings.find((h) => h.slug === slug);
                const label = (heading && resolvePageText(heading.title, 'en')) || slug;
                return <SortableHeadingCard key={key} navKey={key} label={label} />;
              })}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
}
