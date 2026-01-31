export interface SearchResponse {
  results: Manuscript[]
  total: number
  limit?: number
  offset?: number
  next?: string | null
  previous?: string | null
}

export interface ManuscriptListItem {
  id: number
  repository_name: string
  repository_city: string
  shelfmark: string
  catalogue_numbers: string[]
  date: string
  type: string
  number_of_images: number
  issuer_name: string
  named_beneficiary: string
}

export interface Catalogue {
  name: string
  label: string
  location: string
  url: string
}

export interface CatalogueNumber {
  number: string
  url: string
  catalogue: Catalogue
}

export interface Description {
  source: {
    name: string
    label: string
    location: string
    url: string
  }
  content: string
}

export interface HistoricalItem {
  type: string
  format: string
  date: string
  catalogue_numbers: CatalogueNumber[]
  descriptions: Description[]
}

export interface CurrentItem {
  shelfmark: string
  repository: {
    name: string
    label: string
    place: string
    url: string
  }
}

export interface Manuscript {
  id: number
  display_label: string
  historical_item: HistoricalItem
  current_item: CurrentItem
}

export interface ManuscriptImage {
  id: number
  text: string
  iiif_image: string
  thumbnail: string
  locus: string
  number_of_annotations: number
  texts: {
    type: string
    content: string
  }[]
}
