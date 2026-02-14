export interface TextListItem {
  id: number
  item_image: number | null
  item_part: number | null
  repository_city: string
  repository_name: string
  shelfmark: string
  text_type: string
  date: string | null
  date_min: number | null
  date_max: number | null
  content: string
  locus: string
  catalogue_numbers: string
  type: string
  status: string
  language: string
  thumbnail_iiif: string | null
}
