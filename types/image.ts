export interface ImageListItem {
  id: number
  repository_name: string
  repository_city: string
  shelfmark: string
  date: string
  type: string
  text: string
  image: string         // IIIF path
  thumbnail: string     // ready‑to‑use URL
  locus: string
  number_of_annotations: number
  components: string[]
}
