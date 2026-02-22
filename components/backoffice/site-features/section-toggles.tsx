'use client';

import {
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
import { ALL_SECTION_KEYS, SECTION_LABELS, type SectionKey } from '@/lib/site-features';
import type { LucideIcon } from 'lucide-react';

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
  onChange: (key: SectionKey, enabled: boolean) => void;
};

export function SectionToggles({ sections, onChange }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Site Sections</CardTitle>
        <CardDescription>
          Disabled sections are hidden from navigation and return 404.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ALL_SECTION_KEYS.map((key) => {
            const Icon = SECTION_ICONS[key];
            const enabled = sections[key];
            return (
              <label
                key={key}
                htmlFor={`section-${key}`}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                  enabled
                    ? 'bg-card border-border'
                    : 'bg-muted/40 border-transparent text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <Label
                  htmlFor={`section-${key}`}
                  className="text-sm font-medium cursor-pointer flex-1 truncate"
                >
                  {SECTION_LABELS[key]}
                </Label>
                <Switch
                  id={`section-${key}`}
                  checked={enabled}
                  onCheckedChange={(checked) => onChange(key, checked)}
                  className="shrink-0"
                />
              </label>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
