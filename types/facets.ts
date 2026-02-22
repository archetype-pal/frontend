export type FacetItem = {
  text?: string;
  label?: string;
  count: number;
  narrow_url?: string;
  href?: string;
  value?: string;
  range?: [number, number];
  defaultValue?: [number, number];
  active?: boolean;

  options?: {
    date_min?: FacetItem[];
    date_max?: FacetItem[];
  };
};

export type FacetData = Record<string, FacetItem[] | FacetItem>;

export type FacetClickOpts = {
  merge?: boolean;
  facetKey?: string;
  value?: string;
  isDeselect?: boolean;
};
