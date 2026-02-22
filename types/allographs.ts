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
  components: Component[];
}

export type AllographsResponse = Allograph[];
