/**
 * Pure helpers for the Ask Archetype page: where a citation leads, how an
 * answer is laid out, and what to call a failure.
 */

import type { AgentCitation, AgentTool } from '@/types/agent';
import { AskError } from '@/services/agent';

/** Shared by the header's link and the page, so they read one response. */
export const AGENT_TOOLS_KEY = ['agent-tools'] as const;

/** The longest question the backend accepts. */
export const MAX_QUESTION = 2000;

/** Tools the page has its own words for. Any other is shown by its backend description. */
export const KNOWN_TOOLS = [
  'search_charters',
  'get_charter',
  'get_image_regions',
  'cite_record',
  'find_hands',
  'fetch_witnesses',
  'fetch_relations',
  'compare_hands',
] as const;
export type KnownTool = (typeof KNOWN_TOOLS)[number];

/** Unavailable tools whose reason the page can say in the reader's language. */
export const KNOWN_REASONS = ['fetch_witnesses', 'fetch_relations', 'compare_hands'] as const;
export type KnownReason = (typeof KNOWN_REASONS)[number];

export function isKnownTool(name: string): name is KnownTool {
  return (KNOWN_TOOLS as readonly string[]).includes(name);
}

export function hasKnownReason(name: string): name is KnownReason {
  return (KNOWN_REASONS as readonly string[]).includes(name);
}

/** The folio in the viewer, opened on the cited mark when the region was verified. */
export function citationViewerHref(citation: AgentCitation): string {
  const base = `/manuscripts/${citation.item_part_id}/images/${citation.item_image_id}`;
  return citation.verified_region && citation.graph_id
    ? `${base}?graph=${citation.graph_id}`
    : base;
}

/** The cited text itself, on the image's text tab. */
export function citationTextHref(citation: AgentCitation): string {
  return `/manuscripts/${citation.item_part_id}/images/${citation.item_image_id}/texts/${citation.image_text_id}`;
}

/**
 * A region the model supplied that no annotation confirms. The page names it
 * but does not link it: a box that may be mirrored or invented is a citation
 * that points confidently at the wrong place.
 */
export function hasUnverifiedRegion(citation: AgentCitation): boolean {
  return Boolean(citation.region) && !citation.verified_region;
}

/** The answer's paragraphs. Model output is shown as text, never as markup. */
export function answerParagraphs(answer: string): string[] {
  return answer
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** Where a tool is listed: in `KNOWN_TOOLS` order, then any the page does not know. */
function rank(tool: AgentTool): number {
  const index = (KNOWN_TOOLS as readonly string[]).indexOf(tool.name);
  return index === -1 ? KNOWN_TOOLS.length : index;
}

/**
 * What the agent can do here, and what it cannot. Listed in `KNOWN_TOOLS`
 * order, finding before reading before citing, rather than the backend's
 * alphabetical one.
 */
export function splitTools(tools: AgentTool[]): { can: AgentTool[]; cannot: AgentTool[] } {
  const can: AgentTool[] = [];
  const cannot: AgentTool[] = [];
  const ordered = [...tools].sort((a, b) => rank(a) - rank(b));
  for (const tool of ordered) (tool.granted && tool.available ? can : cannot).push(tool);
  return { can, cannot };
}

export type AskFailure = 'throttled' | 'unavailable' | 'invalid' | 'unreachable' | 'unknown';

export function askFailure(error: unknown): AskFailure {
  if (!(error instanceof AskError)) return 'unknown';
  if (error.status === 0) return 'unreachable';
  if (error.status === 429) return 'throttled';
  if (error.status === 503) return 'unavailable';
  if (error.status === 400) return 'invalid';
  // nginx answers 502/504 for the agent when the API is down or too slow.
  if (error.status === 502 || error.status === 504) return 'unreachable';
  return 'unknown';
}
