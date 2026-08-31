'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { LinkedProse } from '@/components/manuscript/linked-prose';

import type { RenderedMsDescArea } from '@/lib/msdesc-public';
import { SectionHeading } from './section-heading';

export const MSDESC_SECTION_ID = 'msdesc';

interface MsDescSectionProps {
  /**
   * Already-rendered, already-sanitized areas in canonical order — build them
   * with `renderPublicMsDescAreas` (`lib/msdesc-public.ts`). Passing the
   * rendered list (rather than the raw fragments) lets the page decide whether
   * to advertise the section in its on-this-page nav without rendering twice.
   */
  areas: RenderedMsDescArea[];
}

/**
 * The public manuscript page's structured TEI description (roadmap 5.2) —
 * the primary description surface, sitting above the secondary, non-TEI
 * "Catalogue descriptions / citations" section (roadmap 8.2).
 *
 * Renders nothing at all when no published area produced output: no empty
 * section, no dangling anchor. The markup is inert HTML (pure string work in
 * the renderer), so it server-renders like the rest of the page.
 */
export function MsDescSection({ areas }: MsDescSectionProps) {
  const t = useTranslations('manuscript');
  if (areas.length === 0) return null;

  // One innerHTML for the whole block, not one wrapper div per area: the
  // `.msdesc-preview` rules in globals.css space the areas with an
  // `.msdesc-area + .msdesc-area` rule, which needs them to be DOM siblings.
  // Each fragment was sanitized (and therefore balanced) on its own, so
  // concatenating them cannot smuggle markup past the sanitizer.
  const html = areas.map((area) => area.html).join('');

  return (
    <section id={MSDESC_SECTION_ID} className="mt-20 scroll-mt-24">
      <SectionHeading title={t('sections.msDesc')} />
      {/* Glossed like the catalogue descriptions: the structured description
          already carries `<ref key="person_…">` links (the recorded hand, for
          one), and a hover card is worth having wherever an entity link is. */}
      <LinkedProse
        html={html}
        gloss
        className="msdesc-preview max-w-3xl font-serif text-foreground"
      />
    </section>
  );
}
