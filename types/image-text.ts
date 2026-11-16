/** The editorial state of an `ImageText` row, as the API spells it. */
export type ImageTextStatus = 'Draft' | 'Review' | 'Live' | 'Reviewed';

// Mirrors the backend's public visibility rule (ImageTextViewSet.get_queryset):
// anonymous visitors only ever see Live/Reviewed texts.
export const PUBLIC_STATUSES: ReadonlySet<ImageTextStatus> = new Set(['Live', 'Reviewed']);

/** The two kinds of text an image can carry. */
export type ImageTextKind = 'Transcription' | 'Translation';
