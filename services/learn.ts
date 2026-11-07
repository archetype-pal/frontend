/**
 * The palaeography tutor (AI programme W4.4): `/api/v1/learn/*`.
 *
 * The backend knows the student who started a lesson by their account when
 * they are signed in, and by the address their requests come from when they
 * are not. So every call takes one route per requester, the same each time:
 * a signed-in student goes through the same-origin `/api/proxy`, which adds
 * their token, and an anonymous one goes straight to the API. Through the
 * proxy every anonymous visitor would arrive from the Next server's one
 * address, share one daily allowance and be able to ask each other's lessons.
 */

import { apiFetch, proxyFetch } from '@/lib/api-fetch';
import { refusalCode } from '@/lib/refusal';
import type { LearnPage, LearnStatus, TutorSession } from '@/types/learn';

/** A request the tutor would not take. `status` is 0 when it never reached the API. */
export class LearnError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
    readonly code: string = ''
  ) {
    super(detail || `The tutor answered ${status}`);
    this.name = 'LearnError';
  }
}

/** What a lesson is about: a corpus page, or a picture of the student's own. */
export type LessonSource = { itemImage: number } | { picture: File };

function learnFetch(path: string, signedIn: boolean, init?: RequestInit): Promise<Response> {
  return signedIn ? proxyFetch(path, init) : apiFetch(path, init);
}

/**
 * The words the API gave for refusing, if any: `{detail}` from the tutor and
 * the proxy, or a serializer's `{field: [message]}`.
 */
async function refusal(response: Response): Promise<{ detail: string; code: string }> {
  const none = { detail: '', code: '' };
  try {
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object') return none;
    if ('detail' in body && typeof body.detail === 'string') {
      return { detail: body.detail, code: refusalCode(body) };
    }
    for (const value of Object.values(body)) {
      if (typeof value === 'string') return { ...none, detail: value };
      if (Array.isArray(value) && typeof value[0] === 'string') {
        return { ...none, detail: value[0] };
      }
    }
  } catch {
    // A gateway's error page is HTML; the status is all there is.
  }
  return none;
}

async function send(path: string, signedIn: boolean, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await learnFetch(path, signedIn, { cache: 'no-store', ...init });
  } catch {
    throw new LearnError(0, '');
  }
  if (!response.ok) {
    const { detail, code } = await refusal(response);
    throw new LearnError(response.status, detail, code);
  }
  return response;
}

/** Whether the tutor is on, and whether this requester may bring a picture of their own. */
export async function getLearnStatus(signedIn: boolean): Promise<LearnStatus> {
  return (await send('/api/v1/learn/', signedIn)).json();
}

/** The corpus pages experts annotated most, which give the richest lessons. */
export async function getLearnPages(): Promise<LearnPage[]> {
  return (await send('/api/v1/learn/pages/', false)).json();
}

/** Start a lesson. The API answers 202 with the session, queued. */
export async function startLesson(
  source: LessonSource,
  language: string,
  signedIn: boolean
): Promise<TutorSession> {
  let init: RequestInit;
  if ('picture' in source) {
    // No Content-Type: the browser writes it, with the multipart boundary.
    const body = new FormData();
    body.append('picture', source.picture);
    body.append('language', language);
    init = { method: 'POST', body };
  } else {
    init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_image: source.itemImage, language }),
    };
  }
  return (await send('/api/v1/learn/sessions/', signedIn, init)).json();
}

/** A lesson, as far as the tutor has got with it. */
export async function getLesson(id: string, signedIn: boolean): Promise<TutorSession> {
  return (await send(`/api/v1/learn/sessions/${encodeURIComponent(id)}/`, signedIn)).json();
}

async function itemPart(path: string): Promise<number> {
  const body: unknown = await (await send(path, false)).json();
  const part = body && typeof body === 'object' && 'item_part' in body ? body.item_part : null;
  if (typeof part !== 'number') throw new LearnError(404, '');
  return part;
}

/**
 * The manuscript part a glyph's page belongs to, which the viewer's address
 * needs. Any glyph of a page answers for the whole page.
 */
export function getGlyphPart(glyphId: number): Promise<number> {
  return itemPart(`/api/v1/manuscripts/graphs/${glyphId}/`);
}

/** The manuscript part a corpus page belongs to. */
export function getPagePart(itemImage: number): Promise<number> {
  return itemPart(`/api/v1/manuscripts/item-images/${itemImage}/`);
}

/** Ask the tutor about the lesson. The API answers 202 with the session, working on it. */
export async function askTutor(
  id: string,
  question: string,
  signedIn: boolean
): Promise<TutorSession> {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  };
  return (
    await send(`/api/v1/learn/sessions/${encodeURIComponent(id)}/questions/`, signedIn, init)
  ).json();
}
