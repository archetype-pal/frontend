export interface GraphListItem {
  id: number
  repository_name: string
  repository_city: string
  shelfmark: string
  date: string
  item_image: number
  coordinates: string   // GeoJSON as string
  is_annotated: boolean
}
