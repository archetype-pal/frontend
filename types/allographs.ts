export interface Position {
  id: number;
  name: string;
}

export interface Feature {
  id: number;
  name: string;
  set_by_default: boolean;
}

export interface Component {
  component_id: number;
  component_name: string;
  features: Feature[];
}

export interface Allograph {
  id: number;
  name: string;
  character_name?: string | null;
  components: Component[];
  positions: Position[];
}

export type AllographsResponse = Allograph[];

// Labels-only allograph (the `?light=1` list response) — used where only the
// id and display label are needed (e.g. gallery grouping/filter).
export interface AllographSummary {
  id: number;
  name: string;
  character_name?: string | null;
}
