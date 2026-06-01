import type { Annotation as A9sAnnotation } from '@/components/manuscript/manuscript-annotorious';
import type { A9sWithMeta } from '@/types/annotation-viewer';

/**
 * Text-region graphs share the Annotorious canvas with glyph annotations so
 * text spans can highlight image regions. They must not enter glyph workflows
 * such as allograph galleries, collections, or generic annotation editing.
 */
export function isTextRegionAnnotation(annotation: A9sAnnotation | null | undefined): boolean {
  return (annotation as A9sWithMeta | null | undefined)?._meta?.annotationType === 'text';
}

/**
 * Glyph annotations include persisted image graphs, public drafts, and legacy
 * graphs without an explicit type. Editorial and text-region graphs belong to
 * separate viewer workflows.
 */
export function isGlyphAnnotation(annotation: A9sAnnotation | null | undefined): boolean {
  if (!annotation) return false;

  const annotationType = (annotation as A9sWithMeta)._meta?.annotationType;
  return annotationType !== 'editorial' && annotationType !== 'text';
}
