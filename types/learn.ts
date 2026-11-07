/**
 * The palaeography tutor (AI programme W4.4): `/api/v1/learn/*`.
 *
 * Every box is in the pixels of the session's picture (`width` x `height`),
 * origin at the top left, so the page draws them on an overlay whose
 * viewBox is the picture's own size.
 */

export type LearnUploads = 'anyone' | 'signed-in' | 'nobody';

/** Whether the tutor is on, and what this requester may do with it. */
export interface LearnStatus {
  enabled: boolean;
  uploads: LearnUploads;
  may_upload: boolean;
  daily_sessions: number;
  questions_per_session: number;
  retention_days: number;
  languages: string[];
}

/** A corpus page to learn from. */
export interface LearnPage {
  /** The page's ItemImage id. */
  id: number;
  label: string;
  charter: string;
  date: string;
  /** An absolute IIIF URL of a thumbnail, when the page has an image. */
  thumbnail_url: string | null;
}

/** A place on the picture, in its pixels, origin at the top left. */
export interface LearnBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

/** A glyph from the corpus a lesson shows, with its crop and where it comes from. */
export interface LearnGlyph {
  id: number;
  allograph_id: number;
  letter_form: string;
  hand: string;
  page: string;
  item_image: number;
  charter: string;
  historical_item: number;
  date: string;
  /** An absolute IIIF URL of the glyph's crop, or null when its page could not be measured. */
  crop_url: string | null;
}

export interface LearnStep {
  title: string;
  explanation: string;
  boxes: LearnBox[];
  character: string;
  allograph_id: number | null;
  look_for: string[];
  example_glyph_ids: number[];
}

export interface LearnPractice {
  instructions: string;
  box: LearnBox | null;
  reading: string;
  note: string;
}

/** Empty (`{}`) until the lesson is written. */
export interface LearnWalkthrough {
  title?: string;
  overview?: string;
  script?: { name: string; date: string; reasons: string[] };
  steps?: LearnStep[];
  practice?: LearnPractice | null;
  /** Each glyph a step shows, by its id. */
  glyphs?: Record<string, LearnGlyph>;
}

/** A question the student asked, or the tutor's answer to one. */
export interface LearnMessage {
  role: 'student' | 'tutor';
  text: string;
  boxes?: LearnBox[];
  example_glyph_ids?: number[];
  glyphs?: Record<string, LearnGlyph>;
  /** The tutor could not answer: `text` says why. */
  failed?: boolean;
  at: string;
}

export interface LearnProgress {
  text: string;
  at: string;
}

export type TutorSessionStatus = 'queued' | 'working' | 'ready' | 'failed' | 'refused';

export interface TutorSession {
  id: string;
  status: TutorSessionStatus;
  /** Why the lesson stopped, in words fit for the student. */
  error: string;
  item_image: number | null;
  page: LearnPage | null;
  uploaded: boolean;
  /** An absolute API URL of the picture the boxes are drawn on; null until it is fetched. */
  picture_url: string | null;
  width: number;
  height: number;
  language: string;
  walkthrough: LearnWalkthrough;
  messages: LearnMessage[];
  progress: LearnProgress[];
  /** This requester started the lesson and has questions left. */
  can_ask: boolean;
  questions_left: number;
  created: string;
  updated: string;
}
