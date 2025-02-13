export interface SearchResult {
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

export interface SearchResponse {
  dates: any
  queries: any
  objects: {
    count: number
    next: string | null
    previous: string | null
    results: SearchResult[]
  }
}
