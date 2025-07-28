export interface HandListItem {
  id: number
  name: string         
  repository_name: string
  repository_city: string
  shelfmark: string
  catalogue_numbers: string  // stringified array
  place: string
  date: string | null
  description?: string
}