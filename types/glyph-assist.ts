/** Asking a model about one shape, from the viewer (AI programme W3.5, W3.6). */

export interface ShapeSuggestion {
  id: number;
  allograph: number | null;
  allograph_label: string;
  hand: number | null;
  confidence: number | null;
  components: Array<{
    component: number;
    component_name: string;
    features: number[];
    feature_details: Array<{ id: number; name: string }>;
  }>;
  positions: number[];
  reasoning: string;
  alternatives: Array<{ allograph: number; label: string; why: string }>;
  /** Why the box does not hold one letter, when it does not. */
  problem: string;
  model_name: string;
}

export type ExplanationBasis = 'form' | 'context' | 'practice' | 'comparison' | 'record';
export type ExplanationVerdict = 'obvious' | 'likely' | 'doubtful' | 'disagree';

export interface AnnotationExplanationData {
  id: number;
  graph: number;
  language: string;
  verdict: ExplanationVerdict;
  summary: string;
  reasons: Array<{ basis: ExplanationBasis; text: string }>;
  doubts: string[];
  alternative: { allograph: number; label: string } | null;
  model_name: string;
  created: string;
}
