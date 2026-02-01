export interface GraphListItem {
  id: number
  repository_name: string
  repository_city: string
  shelfmark: string
  date: string
  image_iiif: string    // IIIF Image Information URL
  coordinates: string   // GeoJSON as string
  is_annotated: boolean
}
