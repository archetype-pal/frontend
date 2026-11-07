/**
 * Pure helpers for the palaeography tutor's pages (AI programme W4.4): what a
 * picture may be, where a box sits on the picture, how long a lesson has
 * taken, and what to call a refusal.
 */

import { LearnError } from '@/services/learn';
import type { LearnBox, LearnGlyph, TutorSession, TutorSessionStatus } from '@/types/learn';

/** Shared by the header's link and the start page. A requester's own status depends on who they are. */
export const LEARN_STATUS_KEY = ['learn-status'] as const;
export const learnStatusKey = (signedIn: boolean) => [...LEARN_STATUS_KEY, signedIn] as const;
export const LEARN_PAGES_KEY = ['learn-pages'] as const;
export const lessonKey = (id: string, signedIn: boolean) =>
  ['learn-session', id, signedIn] as const;

/** The longest question the backend accepts. */
export const MAX_QUESTION = 2000;

/** The largest picture the backend takes, and the kinds it reads. */
export const MAX_PICTURE_BYTES = 15 * 1024 * 1024;
export const PICTURE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'] as const;
const PICTURE_EXTENSIONS = /\.(jpe?g|png|webp|tiff?)$/i;

/** How often a lesson in progress is asked how far it has got. */
export const POLL_MS = 2500;
/** A page hidden this long stops asking, and asks again the moment it is shown. */
export const HIDDEN_POLL_LIMIT_MS = 60_000;
/** After this long the page says the lesson is taking longer than usual. */
export const SLOW_LESSON_MS = 8 * 60_000;

export const LESSON_LANGUAGES = ['en', 'de', 'fr'] as const;
export type LessonLanguage = (typeof LESSON_LANGUAGES)[number];

/** The lesson's language: the site's, when the tutor teaches in it, else English. */
export function lessonLanguage(locale: string, offered?: readonly string[]): LessonLanguage {
  const known = (LESSON_LANGUAGES as readonly string[]).includes(locale);
  const taught = !offered || offered.length === 0 || offered.includes(locale);
  return known && taught ? (locale as LessonLanguage) : 'en';
}

export type PictureProblem = 'type' | 'size' | 'empty';

/** Why the backend would refuse this file, checked before it is sent. */
export function pictureProblem(file: File): PictureProblem | null {
  const typed = (PICTURE_TYPES as readonly string[]).includes(file.type);
  // Some systems give a TIFF no type at all; its name still says what it is.
  if (!typed && !(file.type === '' && PICTURE_EXTENSIONS.test(file.name))) return 'type';
  if (file.size === 0) return 'empty';
  if (file.size > MAX_PICTURE_BYTES) return 'size';
  return null;
}

/** A corpus page id from `?page=`, or null when it is not one. */
export function parsePageParam(value: string | string[] | undefined | null): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Sessions are addressed by UUID; anything else names none. */
export function isLessonId(value: string): boolean {
  return UUID.test(value);
}

/** The tutor is still at it: the page keeps asking. */
export function isWorking(status: TutorSessionStatus): boolean {
  return status === 'queued' || status === 'working';
}

/** The walkthrough has been written. A session answering a question is working with one. */
export function hasLesson(session: Pick<TutorSession, 'walkthrough'>): boolean {
  const walkthrough = session.walkthrough ?? {};
  return (walkthrough.steps?.length ?? 0) > 0 || Boolean(walkthrough.overview);
}

/**
 * The picture's address for the browser. The API builds `picture_url` from
 * the host it was asked on, which for a signed-in student is the Next
 * server's internal one; only its path is kept, on the public API base.
 */
export function pictureSrc(
  session: Pick<TutorSession, 'picture_url'>,
  apiBase: string
): string | null {
  if (!session.picture_url) return null;
  try {
    const url = new URL(session.picture_url, apiBase);
    return `${apiBase.replace(/\/$/, '')}${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

/**
 * An absolute IIIF URL through the same-origin `/iiif-proxy` rewrite, as
 * `utils/iiif.ts` serves every other IIIF image: the browser may not reach the
 * image server itself. The path's encoding is kept, so `%2F` stays one segment.
 */
export function iiifSrc(url: string | null | undefined): string | null {
  const trimmed = (url ?? '').trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    return `/iiif-proxy${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

/** A glyph in the manuscript viewer, opened on it, once its page's part is known. */
export function glyphHref(glyph: Pick<LearnGlyph, 'id' | 'item_image'>, itemPart: number): string {
  return `/manuscripts/${itemPart}/images/${glyph.item_image}?graph=${glyph.id}`;
}

/** The glyphs a step or an answer cites, in its order, skipping any it could not show. */
export function citedGlyphs(
  ids: readonly number[] | undefined,
  glyphs: Record<string, LearnGlyph> | undefined
): LearnGlyph[] {
  return (ids ?? []).map((id) => glyphs?.[String(id)]).filter((g): g is LearnGlyph => Boolean(g));
}

/** Model output, shown as text: its paragraphs. */
export function paragraphs(text: string | undefined): string[] {
  return (text ?? '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** What the student is looking at: a step, the practice line, or one of the tutor's answers. */
export type LessonFocus =
  { kind: 'step'; index: number } | { kind: 'practice' } | { kind: 'message'; index: number };

export function sameFocus(a: LessonFocus | null, b: LessonFocus | null): boolean {
  if (!a || !b || a.kind !== b.kind) return a === b;
  return a.kind === 'practice' || a.index === (b as { index: number }).index;
}

/** The boxes on the picture that belong to what is in focus. */
export function focusedBoxes(
  session: Pick<TutorSession, 'walkthrough' | 'messages'>,
  focus: LessonFocus | null
): LearnBox[] {
  if (!focus) return [];
  if (focus.kind === 'step') return session.walkthrough.steps?.[focus.index]?.boxes ?? [];
  if (focus.kind === 'practice') {
    const box = session.walkthrough.practice?.box;
    return box ? [box] : [];
  }
  return session.messages[focus.index]?.boxes ?? [];
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The smallest rectangle around every box, or null for none. */
export function boundsOf(boxes: readonly LearnBox[]): Bounds | null {
  if (boxes.length === 0) return null;
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** How close the picture may come: enough to read a letter, not so much it blurs. */
export const MAX_ZOOM = 5;

export interface Zoom {
  scale: number;
  /** The layer's offset, in percent of the picture's own width and height. */
  x: number;
  y: number;
}

export const NO_ZOOM: Zoom = { scale: 1, x: 0, y: 0 };

/**
 * The transform that brings `bounds` to the middle of a `width` x `height`
 * picture, with a margin around it, without showing past the picture's edge.
 * Applied as `translate(x%, y%) scale(scale)` from the top left.
 */
export function zoomTo(bounds: Bounds | null, width: number, height: number): Zoom {
  if (!bounds || width <= 0 || height <= 0) return NO_ZOOM;
  const margin = Math.max(bounds.width, bounds.height) * 0.35 + Math.max(width, height) * 0.02;
  const wide = Math.min(width, bounds.width + 2 * margin);
  const tall = Math.min(height, bounds.height + 2 * margin);
  const scale = Math.max(1, Math.min(MAX_ZOOM, width / wide, height / tall));
  if (scale === 1) return NO_ZOOM;
  const centreX = bounds.x + bounds.width / 2;
  const centreY = bounds.y + bounds.height / 2;
  const clamp = (value: number, low: number) => Math.min(0, Math.max(low, value));
  const offsetX = clamp(width / 2 - scale * centreX, width - scale * width);
  const offsetY = clamp(height / 2 - scale * centreY, height - scale * height);
  return { scale, x: (offsetX / width) * 100, y: (offsetY / height) * 100 };
}

/** `m:ss`, or `h:mm:ss` past an hour. */
export function formatElapsed(milliseconds: number): string {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${minutes}:${seconds}`;
}

export type LearnFailure =
  | 'throttled'
  | 'forbidden'
  | 'busy'
  | 'invalid'
  | 'unavailable'
  | 'notFound'
  | 'unreachable'
  | 'unknown';

/** What kind of refusal this was, for a heading in the student's language. */
export function learnFailure(error: unknown): LearnFailure {
  if (!(error instanceof LearnError)) return 'unknown';
  switch (error.status) {
    case 0:
    case 502:
    case 504:
      return 'unreachable';
    case 400:
    case 413:
      return 'invalid';
    case 401:
    case 403:
      return 'forbidden';
    case 404:
      return 'notFound';
    case 409:
      return 'busy';
    case 429:
      return 'throttled';
    case 503:
      return 'unavailable';
    default:
      return 'unknown';
  }
}

/** The API's own words for a refusal, when it gave any. */
export function learnDetail(error: unknown): string {
  return error instanceof LearnError ? error.detail : '';
}
