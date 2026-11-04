/**
 * The public agent, Ask Archetype (AI programme W3.1): `/api/v1/agent/*`.
 */

/**
 * One claim and the record that supports it. The backend resolves every
 * citation against the database before the answer is written, so none of
 * these points at a record that does not exist.
 */
export interface AgentCitation {
  claim: string;
  image_text_id: number;
  item_image_id: number;
  item_part_id: number;
  historical_item_id: number | null;
  /** The text's type as stored: "Transcription" or "Translation". */
  type: string;
  locus: string;
  shelfmark: string;
  repository: string;
  date: string;
  /** An IIIF region "x,y,w,h", when the claim is about a place on the page. */
  region?: string;
  /** True only when the region matches an annotation this platform computed. */
  verified_region?: boolean;
  /** The annotation a verified region matched. */
  graph_id?: number;
}

export type AgentRunStatus = 'answered' | 'refused' | 'failed' | 'exhausted';

export interface AgentRun {
  id: number;
  question: string;
  answer: string;
  citations: AgentCitation[];
  turns: number;
  status: AgentRunStatus;
  error: string;
  created: string;
}

export interface AgentTool {
  name: string;
  description: string;
  /** This site's agent is allowed to call it. */
  granted: boolean;
  /** It can currently answer anything. */
  available: boolean;
  unavailable_reason: string;
}

export interface AgentTools {
  identity: string;
  enabled: boolean;
  tools: AgentTool[];
}
