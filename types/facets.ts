export type FacetListItem = {
  label: string;
  count: number;
  value: string;
  href: string;
};

export type FacetListValue = {
  kind: 'list';
  items: FacetListItem[];
};

export type FacetRangeValue = {
  kind: 'range';
  range: [number, number];
  defaultValue: [number, number];
};

export type FacetValue = FacetListValue | FacetRangeValue;
export type FacetData = Record<string, FacetValue>;

export type FacetClickAction =
  | { type: 'mergeDateParams' }
  | { type: 'selectFacet'; facetKey: string; value: string }
  | { type: 'deselectFacet'; facetKey: string; value: string };
