import { SEARCH_RESULT_TYPES, type ResultType } from './search-types'
import { FILTER_ORDER_MAP } from './filter-order'

export type SectionKey =
  | 'search'
  | 'collection'
  | 'lightbox'
  | 'news'
  | 'blogs'
  | 'featureArticles'
  | 'events'
  | 'about'

export type SearchCategoryConfig = {
  enabled: boolean
  visibleColumns: string[]
  visibleFacets: string[]
}

export type SiteFeaturesConfig = {
  sections: Record<SectionKey, boolean>
  searchCategories: Record<ResultType, SearchCategoryConfig>
}

export const ALL_SECTION_KEYS: SectionKey[] = [
  'search',
  'collection',
  'lightbox',
  'news',
  'blogs',
  'featureArticles',
  'events',
  'about',
]

export const SECTION_LABELS: Record<SectionKey, string> = {
  search: 'Search',
  collection: 'My Collection',
  lightbox: 'Lightbox',
  news: 'News',
  blogs: 'Blogs',
  featureArticles: 'Feature Articles',
  events: 'Past Events',
  about: 'About',
}

const DEFAULT_COLUMNS: Record<ResultType, string[]> = {
  manuscripts: ['Repository City', 'Repository', 'Shelfmark', 'Catalogue Num.', 'Text Date', 'Doc. Type', 'Images'],
  images: ['Repository City', 'Repository', 'Shelfmark', 'Category Number', 'Doc. Type', 'Thumbnail', 'Ann.'],
  scribes: ['Scribe Name', 'Date', 'Scriptorium'],
  hands: ['Hand Title', 'Repository City', 'Repository', 'Shelfmark', 'Place', 'Date', 'Catalogue Num.'],
  graphs: ['Repository City', 'Repository', 'Shelfmark', 'Document Date', 'Allograph', 'Thumbnail'],
  texts: ['Repository City', 'Repository', 'Shelfmark', 'Text Type', 'MS Date', 'Thumbnail'],
  clauses: ['Cat. Num.', 'Document Type', 'Repository City', 'Repository', 'Shelfmark', 'Text Date', 'Text Type', 'Clause Type'],
  people: ['Cat. Num.', 'Document Type', 'Repository City', 'Repository', 'Shelfmark', 'Text Date', 'Text Type', 'Category'],
  places: ['Cat. Num.', 'Document Type', 'Repository City', 'Repository', 'Shelfmark', 'Text Date', 'Text Type', 'Clause Type'],
}

export { DEFAULT_COLUMNS }

export function getDefaultConfig(): SiteFeaturesConfig {
  const sections = Object.fromEntries(
    ALL_SECTION_KEYS.map((k) => [k, true]),
  ) as Record<SectionKey, boolean>

  const searchCategories = Object.fromEntries(
    SEARCH_RESULT_TYPES.map((type) => [
      type,
      {
        enabled: true,
        visibleColumns: DEFAULT_COLUMNS[type],
        visibleFacets: FILTER_ORDER_MAP[type] ?? [],
      },
    ]),
  ) as Record<ResultType, SearchCategoryConfig>

  return { sections, searchCategories }
}
