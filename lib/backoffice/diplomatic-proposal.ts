/**
 * What a diplomatic proposal claims the charter says, pipeline by pipeline.
 *
 * Each pipeline asks its model for the charter's own wording: a witness as
 * written, a formula's excerpt verbatim, the clause a dating flag rests on.
 * Those are the strings a reviewer can check against the text. Anything that
 * is the model's own account (a normalised name, a reasoning, an English
 * translation, the kind of act a `transaction` entry names) is not a
 * quotation, and checking it would flag every honest answer.
 */

import { quotedFragments } from '@/lib/backoffice/quote-finder';
import type { DiplomaticPayload, DiplomaticProposalItem } from '@/types/backoffice';

/** The registered pipelines, in roadmap order. */
export const DIPLOMATIC_PIPELINES = ['W2.1', 'W2.2', 'W2.4', 'W3.2', 'W3.3'] as const;
export type DiplomaticPipeline = (typeof DIPLOMATIC_PIPELINES)[number];

export function isKnownPipeline(key: string): key is DiplomaticPipeline {
  return (DIPLOMATIC_PIPELINES as readonly string[]).includes(key);
}

/**
 * Each pipeline's name in message keys. A roadmap number carries a dot, which
 * next-intl reads as a namespace separator.
 */
export const PIPELINE_SLUGS = {
  'W2.1': 'entities',
  'W2.2': 'formulae',
  'W2.4': 'translation',
  'W3.2': 'dating',
  'W3.3': 'relations',
} as const satisfies Record<DiplomaticPipeline, string>;

/** The model-quoted strings in a payload, unique and in reading order. */
export function proposalQuotes(pipeline: string, payload: DiplomaticPayload): string[] {
  const quotes: string[] = [];
  switch (pipeline) {
    case 'W2.1':
      for (const entity of payload.entities ?? []) {
        if (entity.role !== 'transaction') quotes.push(entity.name);
      }
      break;
    case 'W2.2':
      for (const formula of payload.formulae ?? []) {
        if (formula.excerpt) quotes.push(formula.excerpt);
      }
      break;
    case 'W3.2':
      quotes.push(...quotedFragments(payload.evidence ?? ''));
      break;
    case 'W3.3':
      for (const triple of payload.triples ?? []) quotes.push(triple.subject, triple.object);
      break;
  }
  return Array.from(new Set(quotes.map((q) => q.trim()).filter(Boolean)));
}

/** What the pipeline's `source_text` ends with when the backend cut it short. */
const TRUNCATION_MARK = '[…truncated]';

/** Whether the model read only the start of the charter, so a quotation may lie past the end. */
export function isTruncated(sourceText: string): boolean {
  return sourceText.trimEnd().endsWith(TRUNCATION_MARK);
}

/**
 * Why a proposal cannot be accepted as it stands, or null when it can.
 *
 * Every pipeline writes its records against the charter text it read, so a
 * proposal whose text has since been deleted has nothing to attach them to.
 */
export function diplomaticAcceptBlocker(
  proposal: Pick<DiplomaticProposalItem, 'source'>
): 'sourceGone' | null {
  return proposal.source == null ? 'sourceGone' : null;
}

/** How many records accepting would write, for the pipelines that write one per item. */
export function itemCount(pipeline: string, payload: DiplomaticPayload): number {
  switch (pipeline) {
    case 'W2.1':
      return payload.entities?.length ?? 0;
    case 'W2.2':
      return payload.formulae?.length ?? 0;
    case 'W3.3':
      return payload.triples?.length ?? 0;
    default:
      return 0;
  }
}
