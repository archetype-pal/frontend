import type { A9sWithMeta } from '@/types/annotation-viewer';

export const ALLOGRAPH_BODY_PURPOSE = 'commenting';
export const STANDARD_NOTE_BODY_PURPOSE = 'describing';
export const EDITORIAL_INTERNAL_NOTE_BODY_PURPOSE = 'editing';

function firstBodyValue(
  annotation: A9sWithMeta,
  predicate: (purpose: string | undefined) => boolean
): string {
  return annotation.body?.find((body) => predicate(body.purpose))?.value?.trim() ?? '';
}

export function getAllographBodyText(annotation: A9sWithMeta): string {
  return firstBodyValue(annotation, (purpose) => purpose === ALLOGRAPH_BODY_PURPOSE);
}

export function getStandardAnnotationNote(annotation: A9sWithMeta): string {
  return (
    annotation._meta?.note?.trim() ??
    firstBodyValue(
      annotation,
      (purpose) =>
        purpose !== ALLOGRAPH_BODY_PURPOSE && purpose !== EDITORIAL_INTERNAL_NOTE_BODY_PURPOSE
    )
  );
}

export function getEditorialInternalNote(annotation: A9sWithMeta): string {
  return (
    annotation._meta?.internalNote?.trim() ??
    firstBodyValue(annotation, (purpose) => purpose === EDITORIAL_INTERNAL_NOTE_BODY_PURPOSE)
  );
}

export function buildStandardAnnotationBody(
  allographText: string,
  noteText: string
): A9sWithMeta['body'] {
  return [
    ...(allographText.trim()
      ? [
          {
            type: 'TextualBody',
            purpose: ALLOGRAPH_BODY_PURPOSE,
            value: allographText.trim(),
          },
        ]
      : []),
    ...(noteText.trim()
      ? [
          {
            type: 'TextualBody',
            purpose: STANDARD_NOTE_BODY_PURPOSE,
            value: noteText.trim(),
          },
        ]
      : []),
  ];
}

export function buildEditorialAnnotationBody(internalNoteText: string): A9sWithMeta['body'] {
  return internalNoteText.trim()
    ? [
        {
          type: 'TextualBody',
          purpose: EDITORIAL_INTERNAL_NOTE_BODY_PURPOSE,
          value: internalNoteText.trim(),
        },
      ]
    : [];
}
