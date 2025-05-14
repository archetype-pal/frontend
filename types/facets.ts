export type FacetItem = {
    text?: string
    label?: string
    count: number
    narrow_url?: string
    href?: string
    value?: string
    range?: [number, number]
    defaultValue?: [number, number]
    active?: boolean
  }
  
  export type FacetData = Record<string, FacetItem[] | FacetItem>