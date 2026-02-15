import type { FacetData } from '../../types/facets'
import type { Manuscript, ManuscriptImage } from '../../types/manuscript'
import type { HandType } from '../../types/hands'
import type { Allograph } from '../../types/allographs'
import type { BackendGraph } from '../../services/annotations'

// Helper to generate random IDs
let idCounter = 1
export function generateId(): number {
  return idCounter++
}

// Reset ID counter (useful for testing)
export function resetIdCounter(): void {
  idCounter = 1
}

// Mock manuscripts data - matches real API structure
export function generateManuscripts(count: number = 20): Manuscript[] {
  const repositories = [
    { name: 'National Records of Scotland', city: 'Edinburgh', place: 'Edinburgh' },
    { name: 'Durham Cathedral', city: 'Durham', place: 'Durham' },
    { name: 'British Library', city: 'London', place: 'London' },
  ]

  const dates = [
    '24 May 1153 X 1162',
    '6 January 1161 X 13 September 1162',
    '1165',
    '1189',
    '1200',
    '1203',
    '1204',
    '1211',
    '1214',
    '1220',
    '1232',
    '1242',
    '1245',
    '1250',
  ]
  const types = ['Charter', 'Agreement', 'Brieve', 'Letter']
  const shelfmarks = ['GD55/1', 'GD55/6', 'GD55/10', 'GD55/15', 'GD55/20']
  const catalogueNumbers = [
    'no. 120, Document 1/4/56',
    'no. 6, Document 3/15/4',
    'no. 10, Document 5/20/8',
    'no. 15, Document 7/25/12',
  ]

  return Array.from({ length: count }, (_, i) => {
    const repo = repositories[i % repositories.length]
    return {
      id: generateId(),
      display_label: `${repo.name} - ${shelfmarks[i % shelfmarks.length]}`,
      historical_item: {
        type: types[i % types.length],
        format: 'Parchment',
        date: dates[i % dates.length],
        catalogue_numbers: [
          {
            number: catalogueNumbers[i % catalogueNumbers.length],
            url: `https://example.com/catalogue/${i + 1}`,
            catalogue: {
              name: 'catalogue',
              label: 'Catalogue',
              location: 'https://example.com',
              url: 'https://example.com',
            },
          },
        ],
        descriptions: [
          {
            source: {
              name: 'source',
              label: 'Source',
              location: 'https://example.com',
              url: 'https://example.com',
            },
            content: `Description for manuscript ${i + 1}`,
          },
        ],
      },
      current_item: {
        shelfmark: shelfmarks[i % shelfmarks.length],
        repository: {
          name: repo.name,
          label: repo.name,
          place: repo.place,
          url: `https://example.com/repository/${i + 1}`,
        },
      },
    }
  })
}

// Base URL for the mock server (will be set by initializeMockBaseUrl)
let MOCK_SERVER_BASE = 'http://localhost:8000'
let MOCK_IMAGE_BASE = 'http://localhost:8000/scans'

// Initialize base URLs with the server port
export function initializeMockBaseUrl(port: number = 8000): void {
  MOCK_SERVER_BASE = `http://localhost:${port}`
  MOCK_IMAGE_BASE = `http://localhost:${port}/scans`
}

const REAL_IMAGE_PATHS = [
  'S-ABD-003_Formaston_WB_DSC0028.jpg',
  'S-ABD-003_Formaston_WB_DSC0030.jpg',
  'S-ABD-003_Formaston_WB_DSC0031.jpg',
  'S-ABD-003_Formaston_WB_DSC0032.jpg',
  'S-ABD-003_Formaston_WB_DSC0225.jpg',
  'S-ABD-003_Formaston_WB_DSC0226.jpg',
  'S-ABD-003_Formaston_WB_DSC0227.jpg',
  'S-ABD-003_Formaston_WB_DSC0228.jpg',
  'S-ABD-003_Formaston_WB_DSC0230.jpg',
  'S-ABD-003_Formaston_WB_DSC0028.jpg', // Repeat to have 10
]

// Helper to get mock image URL (with proper URL encoding)
function getMockImageUrl(index: number): string {
  const path = REAL_IMAGE_PATHS[index % REAL_IMAGE_PATHS.length]
  // URL encode the path (e.g., S-ABD-003_Formaston_WB_DSC0028.jpg becomes S-ABD-003_Formaston_WB_DSC0028.jpg)
  // But we need to handle it as if it's a path with slashes encoded
  const encodedPath = encodeURIComponent(path)
  return `${MOCK_IMAGE_BASE}/${encodedPath}`
}

const LOCUS_VALUES = ['face', 'dorse', 'dorse: raking', 'f.1r', 'f.1v', 'f.2r', 'f.2v']

// Mock manuscript images - rotates through mock image URLs
export function generateManuscriptImages(count: number = 10, itemPartId?: number): ManuscriptImage[] {
  return Array.from({ length: count }, (_, i) => {
    const imageUrl = getMockImageUrl(i)
    return {
      id: generateId(),
      text: `Sample transcription text for image ${i + 1}`,
      iiif_image: imageUrl,
      thumbnail: `${imageUrl}/full/150,/0/default.jpg`,
      locus: LOCUS_VALUES[i % LOCUS_VALUES.length],
      number_of_annotations: Math.floor(Math.random() * 10),
      item_part: itemPartId ?? generateId(),
      texts: [
        {
          type: 'transcription',
          content: `Sample transcription text for image ${i + 1}`,
        },
      ],
    }
  })
}

// Generate image search results matching ImageListItem interface
export function generateImageSearchResults(count: number = 50): any[] {
  const repositories = [
    { name: 'National Records of Scotland', city: 'Edinburgh' },
    { name: 'Durham Cathedral', city: 'Durham' },
    { name: 'British Library', city: 'London' },
  ]
  const shelfmarks = ['GD45/13/230', 'GD55/1', 'GD55/6', 'GD55/10', 'GD55/15']
  const dates = [
    '13 December 1229 X 1231',
    '24 May 1153 X 1162',
    '6 January 1161 X 13 September 1162',
    '1165',
    '1189',
    '1200',
  ]
  const types = ['Charter', 'Agreement', 'Brieve', 'Letter']
  const components = ['Component A', 'Component B', 'Component C']

  return Array.from({ length: count }, (_, i) => {
    const repo = repositories[i % repositories.length]
    const imageUrl = getMockImageUrl(i)
    const image_iiif = imageUrl.endsWith('/info.json') ? imageUrl : `${imageUrl}/info.json`

    return {
      id: generateId(),
      repository_name: repo.name,
      repository_city: repo.city,
      shelfmark: shelfmarks[i % shelfmarks.length],
      date: dates[i % dates.length],
      type: types[i % types.length],
      text: `Sample transcription text for image ${i + 1}`,
      image_iiif,
      locus: LOCUS_VALUES[i % LOCUS_VALUES.length],
      number_of_annotations: Math.floor(Math.random() * 10),
      components: [components[i % components.length]],
    }
  })
}

// Mock facets data - matches real API structure
export function generateFacets(): FacetData {
  const baseUrl = `${MOCK_SERVER_BASE}/api/v1/search/item-parts/facets`
  return {
    date_min: [
      { text: '1242', count: 63, narrow_url: `${baseUrl}?limit=20&selected_facets=date_min_exact%3A1242` },
      { text: '1200', count: 22, narrow_url: `${baseUrl}?limit=20&selected_facets=date_min_exact%3A1200` },
      { text: '1204', count: 21, narrow_url: `${baseUrl}?limit=20&selected_facets=date_min_exact%3A1204` },
      { text: '1214', count: 21, narrow_url: `${baseUrl}?limit=20&selected_facets=date_min_exact%3A1214` },
      { text: '1165', count: 20, narrow_url: `${baseUrl}?limit=20&selected_facets=date_min_exact%3A1165` },
    ],
    date_max: [
      { text: '1242', count: 61, narrow_url: `${baseUrl}?limit=20&selected_facets=date_max_exact%3A1242` },
      { text: '1200', count: 17, narrow_url: `${baseUrl}?limit=20&selected_facets=date_max_exact%3A1200` },
      { text: '1232', count: 16, narrow_url: `${baseUrl}?limit=20&selected_facets=date_max_exact%3A1232` },
      { text: '1214', count: 15, narrow_url: `${baseUrl}?limit=20&selected_facets=date_max_exact%3A1214` },
      { text: '1250', count: 14, narrow_url: `${baseUrl}?limit=20&selected_facets=date_max_exact%3A1250` },
    ],
    repository_city: [
      { text: 'Durham', count: 341, narrow_url: `${baseUrl}?limit=20&selected_facets=repository_city_exact%3ADurham` },
      { text: 'Edinburgh', count: 295, narrow_url: `${baseUrl}?limit=20&selected_facets=repository_city_exact%3AEdinburgh` },
      { text: 'London', count: 77, narrow_url: `${baseUrl}?limit=20&selected_facets=repository_city_exact%3ALondon` },
    ],
    type: [
      { text: 'Charter', count: 588, narrow_url: `${baseUrl}?limit=20&selected_facets=type_exact%3ACharter` },
      { text: 'Agreement', count: 29, narrow_url: `${baseUrl}?limit=20&selected_facets=type_exact%3AAgreement` },
      { text: 'Brieve', count: 15, narrow_url: `${baseUrl}?limit=20&selected_facets=type_exact%3ABrieve` },
    ],
    image_availability: [
      { text: 'With images', count: 710, narrow_url: `${baseUrl}?limit=20&selected_facets=image_availability_exact%3AWith+images` },
      { text: 'Without images', count: 3, narrow_url: `${baseUrl}?limit=20&selected_facets=image_availability_exact%3AWithout+images` },
    ],
  }
}

// Mock hands data
export function generateHands(count: number = 5, itemImageId?: number): HandType[] {
  const places = ['London', 'Oxford', 'Cambridge', 'Edinburgh', 'York']
  const dates = ['1200', '1250', '1300', '1350', '1400']

  return Array.from({ length: count }, (_, i) => ({
    id: generateId(),
    name: `Hand ${i + 1}`,
    scribe: generateId(),
    item_part: generateId(),
    date: dates[i % dates.length],
    place: places[i % places.length],
    description: `Description for hand ${i + 1}`,
  }))
}

// Mock allographs data
export function generateAllographs(): Allograph[] {
  const allographNames = [
    'a, Caroline', 'b', 'c', 'd, Caroline', 'e', 'f, Caroline',
    'g, Caroline', 'h, Caroline', 'i', 'k', 'l', 'm', 'n', 'o',
    'p', 'q', 'r, 2-shaped', 'r, Caroline', 's, Caroline', 's, Round',
    't', 'u', 'w', 'x',
  ]
  return allographNames.map((name, i) => ({
    id: i + 1,
    name,
    components: [
      {
        component_id: i + 1,
        component_name: `Component ${i + 1}`,
        features: [
          { id: i * 2 + 1, name: `Feature ${i * 2 + 1}`, set_by_default: true },
          { id: i * 2 + 2, name: `Feature ${i * 2 + 2}`, set_by_default: false },
        ],
      },
    ],
  }))
}

// Mock annotations/graphs
export function generateGraphs(count: number = 5, itemImageId?: number, handId?: number): BackendGraph[] {
  const allographCount = 24 // matches generateAllographs length
  return Array.from({ length: count }, (_, i) => ({
    id: generateId(),
    item_image: itemImageId ?? generateId(),
    annotation: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[100 + i * 10, 100 + i * 10], [200 + i * 10, 100 + i * 10], [200 + i * 10, 200 + i * 10], [100 + i * 10, 200 + i * 10], [100 + i * 10, 100 + i * 10]]],
      },
      properties: {
        id: `annotation-${i + 1}`,
        type: 'editorial',
      },
    },
    allograph: (i % allographCount) + 1,
    hand: handId ?? 1,
    graphcomponent_set: [],
    positions: [],
  }))
}

// Generate graph search results with image_iiif
export function generateGraphSearchResults(count: number = 20): any[] {
  const repositories = [
    { name: 'National Records of Scotland', city: 'Edinburgh' },
    { name: 'Durham Cathedral', city: 'Durham' },
    { name: 'British Library', city: 'London' },
  ]
  const shelfmarks = ['GD45/13/230', 'GD55/1', 'GD55/6', 'GD55/10', 'GD55/15']
  const dates = [
    '13 December 1229 X 1231',
    '24 May 1153 X 1162',
    '6 January 1161 X 13 September 1162',
    '1165',
    '1189',
    '1200',
  ]

  return Array.from({ length: count }, (_, i) => {
    const repo = repositories[i % repositories.length]
    const imageUrl = getMockImageUrl(i)
    const image_iiif = imageUrl.endsWith('/info.json') ? imageUrl : `${imageUrl}/info.json`

    return {
      id: generateId(),
      image_iiif,
      coordinates: JSON.stringify({
        crs: { type: 'name', properties: { name: 'EPSG:3785' } },
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[100 + i * 10, 100 + i * 10], [200 + i * 10, 100 + i * 10], [200 + i * 10, 200 + i * 10], [100 + i * 10, 200 + i * 10], [100 + i * 10, 100 + i * 10]]],
        },
        properties: { saved: 0 },
      }),
      is_annotated: i % 3 === 0,
      repository_name: repo.name,
      repository_city: repo.city,
      shelfmark: shelfmarks[i % shelfmarks.length],
      date: dates[i % dates.length],
    }
  })
}

// Mock search response structure - matches real API structure
export function generateSearchResponse(
  results: any[],
  facets: FacetData,
  limit: number = 20,
  offset: number = 0,
  baseUrl: string = `${MOCK_SERVER_BASE}/api/v1/search/item-parts/facets`
) {
  const count = results.length
  const hasNext = offset + limit < count
  const hasPrevious = offset > 0

  // Build query string for pagination
  const buildQuery = (newOffset: number) => {
    const params = new URLSearchParams()
    params.set('limit', limit.toString())
    params.set('offset', newOffset.toString())
    return `?${params.toString()}`
  }

  return {
    fields: Object.fromEntries(
      Object.entries(facets).map(([key, value]) => [key, Array.isArray(value) ? value : [value]])
    ),
    dates: {},
    queries: {},
    objects: {
      count,
      next: hasNext ? `${baseUrl}${buildQuery(offset + limit)}` : null,
      previous: hasPrevious ? `${baseUrl}${buildQuery(Math.max(0, offset - limit))}` : null,
      results: results.slice(offset, offset + limit),
      ordering: {
        current: 'id',
        options: [
          { name: 'id', text: 'ID', url: `${baseUrl}?ordering=id` },
          { name: '-id', text: 'ID (desc)', url: `${baseUrl}?ordering=-id` },
          { name: 'date', text: 'Date', url: `${baseUrl}?ordering=date` },
          { name: '-date', text: 'Date (desc)', url: `${baseUrl}?ordering=-date` },
        ],
      },
    },
  }
}

// Mock user profile
export function generateUserProfile() {
  return {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
  }
}

// Mock carousel items
export function generateCarouselItems() {
  return [
    {
      title: 'Carousel Item 1',
      image: `${MOCK_IMAGE_BASE}/${encodeURIComponent(REAL_IMAGE_PATHS[0])}/info.json`,
      url: '/about/about-models-of-authority',
    },
    {
      title: 'Carousel Item 2',
      image: `${MOCK_IMAGE_BASE}/${encodeURIComponent(REAL_IMAGE_PATHS[1])}/info.json`,
      url: '/search',
    },
  ]
}

// Mock publications
export function generatePublications(count: number = 10) {
  const authors = [
    { id: 1, first_name: 'John', last_name: 'Smith', name: 'John Smith' },
    { id: 2, first_name: 'Jane', last_name: 'Doe', name: 'Jane Doe' },
    { id: 3, first_name: 'Robert', last_name: 'Johnson', name: 'Robert Johnson' },
    { id: 4, first_name: 'Mary', last_name: 'Williams', name: 'Mary Williams' },
  ]

  return Array.from({ length: count }, (_, i) => ({
    id: generateId(),
    slug: `publication-${i + 1}`,
    title: `Publication ${i + 1}`,
    content: `Content for publication ${i + 1}`,
    is_news: i % 3 === 0,
    is_featured: i % 5 === 0,
    is_blog_post: i % 2 === 0,
    published_at: new Date(2024, 0, i + 1).toISOString(),
    published_date: new Date(2024, 0, i + 1).toISOString(),
    author: authors[i % authors.length],
  }))
}
