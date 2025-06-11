import { FacetPanel } from '@/components/filters/FacetPanel'
import { FacetRadioPanel } from '@/components/filters/FacetRadioPanel'
import { FacetDateRangePanel } from '@/components/filters/FacetDateRangePanel'

export const FACET_COMPONENT_MAP = {
  checkbox: FacetPanel,
  toggle: FacetRadioPanel,
  range: FacetDateRangePanel,
} as const