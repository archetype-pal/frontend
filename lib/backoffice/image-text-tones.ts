import type { ImageTextKind, ImageTextStatus } from '@/types/image-text';

// Status palette is routed through the `--c-status-*` design tokens
// (globals.css). Wash backgrounds and borders use the named utility
// (`bg-status-draft/10`); foreground text needs role-tuned lightness, so
// it consumes the raw HSL channels via arbitrary classes — same pattern
// as KIND_TONE above. A single source of truth still drives the palette.
export const STATUS_TONE: Record<ImageTextStatus, string> = {
  Draft:
    'bg-status-draft/10 border-status-draft/20 text-[hsl(var(--c-status-draft-h)_var(--c-status-draft-s)_32%)] dark:text-[hsl(var(--c-status-draft-h)_var(--c-status-draft-s)_75%)]',
  Review:
    'bg-status-review/10 border-status-review/20 text-[hsl(var(--c-status-review-h)_var(--c-status-review-s)_32%)] dark:text-[hsl(var(--c-status-review-h)_var(--c-status-review-s)_75%)]',
  Live: 'bg-status-live/10 border-status-live/20 text-[hsl(var(--c-status-live-h)_var(--c-status-live-s)_28%)] dark:text-[hsl(var(--c-status-live-h)_var(--c-status-live-s)_72%)]',
  Reviewed:
    'bg-status-reviewed/10 border-status-reviewed/20 text-[hsl(var(--c-status-reviewed-h)_var(--c-status-reviewed-s)_42%)] dark:text-[hsl(var(--c-status-reviewed-h)_var(--c-status-reviewed-s)_78%)]',
};

// Mixed canonical-token + role-tuned arbitrary classes: borders use the
// token directly with an opacity modifier; the wash backgrounds and
// foreground text need bespoke lightness, so they route the hue through
// the canonical CSS var (`--c-transcription-h` etc.) so a single source
// still drives the palette while leaving the role-tuned L tunable.
export const KIND_TONE: Record<ImageTextKind, string> = {
  Transcription:
    'border-transcription/30 bg-[hsl(var(--c-transcription-h)_50%_96%)] text-[hsl(var(--c-transcription-h)_55%_30%)] dark:bg-[hsl(var(--c-transcription-h)_45%_18%)]/40 dark:text-[hsl(var(--c-transcription-h)_45%_75%)]',
  Translation:
    'border-translation/30 bg-[hsl(var(--c-translation-h)_40%_96%)] text-[hsl(var(--c-translation-h)_45%_30%)] dark:bg-[hsl(var(--c-translation-h)_40%_18%)]/40 dark:text-[hsl(var(--c-translation-h)_40%_75%)]',
};

export const STATUS_DOT: Record<ImageTextStatus, string> = {
  Draft: 'bg-status-draft',
  Review: 'bg-status-review',
  Live: 'bg-status-live',
  Reviewed: 'bg-status-reviewed',
};

export const STATUS_BAR: Record<ImageTextStatus, string> = {
  Draft: 'bg-status-draft/70',
  Review: 'bg-status-review/70',
  Live: 'bg-status-live/70',
  Reviewed: 'bg-status-reviewed/70',
};
