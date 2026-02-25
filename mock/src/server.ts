import express, { Request, Response } from 'express'
import cors from 'cors'
import sharp from 'sharp'
import type { Manuscript } from '../../types/manuscript'
import {
  generateManuscripts,
  generateManuscriptImages,
  generateImageSearchResults,
  generateFacets,
  generateHands,
  generateHandDetail,
  generateScribeDetail,
  generateAllographs,
  generateGraphs,
  generateGraphSearchResults,
  generateSearchResponse,
  generateUserProfile,
  generateCarouselItems,
  generatePublications,
  resetIdCounter,
  initializeMockBaseUrl,
} from './mockData'

const app = express()
const PORT = process.env.MOCK_PORT ? parseInt(process.env.MOCK_PORT) : 8000

// Initialize base URLs with the server port
initializeMockBaseUrl(PORT)

app.use(cors())
app.use(express.json())

// Color palette for generating different colored placeholders
const COLOR_PALETTE = [
  { r: 139, g: 69, b: 19 },   // SaddleBrown
  { r: 72, g: 61, b: 139 },   // DarkSlateBlue
  { r: 85, g: 107, b: 47 },   // DarkOliveGreen
  { r: 139, g: 0, b: 0 },     // DarkRed
  { r: 0, g: 100, b: 0 },     // DarkGreen
  { r: 25, g: 25, b: 112 },   // MidnightBlue
  { r: 139, g: 90, b: 43 },   // Peru
  { r: 72, g: 61, b: 139 },   // DarkSlateBlue
  { r: 47, g: 79, b: 79 },    // DarkSlateGray
  { r: 128, g: 0, b: 128 },   // Purple
]

// Generate a colored placeholder image based on the image path
async function generateColoredPlaceholder(
  width: number = 200,
  height: number = 200,
  imagePath?: string
): Promise<Buffer> {
  // Determine color based on image path (hash the path to get consistent color per image)
  let colorIndex = 0
  if (imagePath) {
    // Simple hash function to get consistent color for same image
    let hash = 0
    for (let i = 0; i < imagePath.length; i++) {
      hash = ((hash << 5) - hash) + imagePath.charCodeAt(i)
      hash = hash & hash // Convert to 32-bit integer
    }
    colorIndex = Math.abs(hash) % COLOR_PALETTE.length
  } else {
    // Random color if no path provided
    colorIndex = Math.floor(Math.random() * COLOR_PALETTE.length)
  }
  
  const color = COLOR_PALETTE[colorIndex]
  
  // Create a colored rectangle with sharp
  const svg = `
    <svg width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="rgb(${color.r},${color.g},${color.b})"/>
      <text x="50%" y="50%" font-family="Arial" font-size="16" fill="white" text-anchor="middle" dominant-baseline="middle">
        ${width}x${height}
      </text>
    </svg>
  `
  
  return await sharp(Buffer.from(svg))
    .png()
    .toBuffer()
}

// Mock IIIF server endpoints
// Handle IIIF image requests - this matches the pattern: /scans/{encoded_path}/{region}/{size}/{rotation}/{quality}.{format}
app.get('/scans*', async (req: Request, res: Response) => {
  const fullPath = req.path
  
  // Set CORS headers for all IIIF requests
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  
  // Extract the base image path (before any IIIF parameters)
  const baseImagePath = fullPath.split('/full/')[0].split('/square/')[0].split('/info.json')[0]
  
  // If it's an info.json request, return IIIF Image API 2.1 info
  if (fullPath.endsWith('/info.json')) {
    const baseUrl = `http://localhost:${PORT}${fullPath.replace('/info.json', '')}`
    res.json({
      '@context': 'http://iiif.io/api/image/2/context.json',
      '@id': baseUrl,
      protocol: 'http://iiif.io/api/image',
      width: 2000,
      height: 3000,
      sizes: [
        { width: 2000, height: 3000 },
        { width: 1000, height: 1500 },
        { width: 500, height: 750 },
        { width: 300, height: 450 },
        { width: 150, height: 225 },
      ],
      tiles: [
        {
          width: 512,
          height: 512,
          scaleFactors: [1, 2, 4, 8, 16],
        },
      ],
      profile: ['http://iiif.io/api/image/2/level2.json'],
    })
    return
  }
  
  // Handle IIIF image requests (e.g., /full/300,/0/default.jpg or /full/150,/0/default.jpg)
  // Pattern: /{region}/{size}/{rotation}/{quality}.{format}
  const iiifMatch = fullPath.match(/\/(full|square|\d+,\d+,\d+,\d+)\/([^/]+)\/(\d+)\/(default|color|gray|bitonal)\.(jpg|png|gif|webp|json)$/)
  if (iiifMatch) {
    const format = iiifMatch[5] || 'jpg'
    const sizeStr = iiifMatch[2] || '200,'
    
    // Parse size (e.g., "300," or "200,200" or "full")
    let width = 200
    let height = 200
    if (sizeStr === 'full') {
      width = 2000
      height = 3000
    } else if (sizeStr.includes(',')) {
      const [w, h] = sizeStr.split(',')
      width = w ? parseInt(w) : 200
      height = h ? parseInt(h) : Math.round(width * 1.5) // Maintain aspect ratio if height not specified
    } else {
      width = parseInt(sizeStr) || 200
      height = Math.round(width * 1.5)
    }
    
    const contentType = format === 'png' ? 'image/png' : 
                       format === 'gif' ? 'image/gif' :
                       format === 'webp' ? 'image/webp' :
                       format === 'json' ? 'application/json' :
                       'image/jpeg'
    
    res.setHeader('Content-Type', contentType)
    
    // For JSON requests (like info.json), return the info
    if (format === 'json') {
      const baseUrl = fullPath.substring(0, fullPath.lastIndexOf('/'))
      res.json({
        '@context': 'http://iiif.io/api/image/2/context.json',
        '@id': `http://localhost:${PORT}${baseUrl}`,
        protocol: 'http://iiif.io/api/image',
        width: 2000,
        height: 3000,
      })
      return
    }
    
    // Generate a colored placeholder image based on the base image path
    try {
      const imageBuffer = await generateColoredPlaceholder(width, height, baseImagePath)
      res.send(imageBuffer)
    } catch (error) {
      console.error('Error generating placeholder image:', error)
      // Fallback to a simple colored buffer
      const fallbackColor = COLOR_PALETTE[Math.abs(baseImagePath.length) % COLOR_PALETTE.length]
      const svg = `<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="rgb(${fallbackColor.r},${fallbackColor.g},${fallbackColor.b})"/></svg>`
      const buffer = await sharp(Buffer.from(svg)).png().toBuffer()
      res.send(buffer)
    }
    return
  }
  
  // Default: return placeholder for any other image request
  try {
    const imageBuffer = await generateColoredPlaceholder(200, 200, baseImagePath)
    res.setHeader('Content-Type', 'image/png')
    res.send(imageBuffer)
  } catch (error) {
    console.error('Error generating default placeholder:', error)
    res.status(500).send('Error generating image')
  }
})

// Reset ID counter on server start
resetIdCounter()

// Helper to parse query parameters
function parseQueryParams(req: Request) {
  const limit = parseInt(req.query.limit as string) || 20
  const offset = parseInt(req.query.offset as string) || 0
  return { limit, offset }
}

// Search endpoints with facets
const searchEndpoints = ['item-parts', 'item-images', 'scribes', 'hands', 'graphs']

searchEndpoints.forEach((endpoint) => {
  app.get(`/api/v1/search/${endpoint}/facets`, (req: Request, res: Response) => {
    const { limit, offset } = parseQueryParams(req)
    const baseUrl = `${req.protocol}://${req.get('host')}/api/v1/search/${endpoint}/facets`
    
    let results: any[] = []
    if (endpoint === 'item-parts') {
      // Generate search results matching real API structure
      const manuscripts = generateManuscripts(50)
      results = manuscripts.map((m) => ({
        repository_name: m.current_item.repository.name,
        repository_city: m.current_item.repository.place,
        shelfmark: m.current_item.shelfmark,
        catalogue_numbers: m.historical_item.catalogue_numbers.map((cn) => cn.number).join(', '),
        date: m.historical_item.date,
        type: m.historical_item.type,
        number_of_images: Math.floor(Math.random() * 10) + 1,
        image_availability: 'With images',
        id: m.id,
      }))
    } else if (endpoint === 'item-images') {
      results = generateImageSearchResults(50)
    } else if (endpoint === 'scribes') {
      results = Array.from({ length: 20 }, (_, i) => ({
        name: `Scribe ${i + 1}`,
        period: `${1200 + i * 10}-${1210 + i * 10}`,
        scriptorium: ['Durham', 'Edinburgh', 'London'][i % 3],
      }))
    } else if (endpoint === 'hands') {
      const hands = generateHands(20)
      results = hands.map((h) => ({
        name: h.name,
        date: h.date,
        place: h.place,
        description: h.description,
        repository_name: 'National Records of Scotland',
        repository_city: 'Edinburgh',
        shelfmark: `GD55/${h.id}`,
        catalogue_numbers: [`no. ${h.id}`],
      }))
    } else if (endpoint === 'graphs') {
      results = generateGraphSearchResults(20)
    }

    const facets = generateFacets()
    const response = generateSearchResponse(results, facets, limit, offset, baseUrl)
    
    res.json(response)
  })
})

// Auth endpoints
app.post('/api/v1/auth/token/login', (req: Request, res: Response) => {
  const { username, password } = req.body
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }

  // Mock successful login
  res.json({
    auth_token: 'mock-auth-token-12345',
    user: generateUserProfile(),
  })
})

app.post('/api/v1/auth/token/logout', (req: Request, res: Response) => {
  // Mock successful logout
  res.status(200).json({ message: 'Logged out successfully' })
})

app.get('/api/v1/auth/profile', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Token ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  res.json(generateUserProfile())
})

// Media endpoints
app.get('/api/v1/media/carousel-items/', (req: Request, res: Response) => {
  res.json(generateCarouselItems())
})

app.get('/api/v1/media/publications/', (req: Request, res: Response) => {
  const { is_news, is_featured, is_blog_post, limit, offset } = req.query
  
  let publications = generatePublications(50)
  
  if (is_news === 'true') {
    publications = publications.filter((p) => p.is_news)
  }
  if (is_featured === 'true') {
    publications = publications.filter((p) => p.is_featured)
  }
  if (is_blog_post === 'true') {
    publications = publications.filter((p) => p.is_blog_post)
  }

  const limitNum = limit ? parseInt(limit as string) : publications.length
  const offsetNum = offset ? parseInt(offset as string) : 0
  
  res.json({
    count: publications.length,
    next: offsetNum + limitNum < publications.length ? `?limit=${limitNum}&offset=${offsetNum + limitNum}` : null,
    previous: offsetNum > 0 ? `?limit=${limitNum}&offset=${Math.max(0, offsetNum - limitNum)}` : null,
    results: publications.slice(offsetNum, offsetNum + limitNum),
  })
})

app.get('/api/v1/media/publications/:slug', (req: Request, res: Response) => {
  const { slug } = req.params
  const publications = generatePublications(50)
  const publication = publications.find((p) => p.slug === slug)
  
  if (!publication) {
    return res.status(404).json({ error: 'Publication not found' })
  }
  
  res.json(publication)
})

// Helper to generate a single manuscript with a specific ID
function generateManuscriptById(id: number): Manuscript {
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

  const repo = repositories[id % repositories.length]
  const i = id % 100 // Use modulo to cycle through options
  
  return {
    id: id,
    display_label: `${repo.name} - ${shelfmarks[i % shelfmarks.length]}`,
    historical_item: {
      type: types[i % types.length],
      format: 'Parchment',
      date: dates[i % dates.length],
      catalogue_numbers: [
        {
          number: catalogueNumbers[i % catalogueNumbers.length],
          url: `https://example.com/catalogue/${id}`,
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
          content: `Description for manuscript ${id}`,
        },
      ],
    },
    current_item: {
      shelfmark: shelfmarks[i % shelfmarks.length],
      repository: {
        name: repo.name,
        label: repo.name,
        place: repo.place,
        url: `https://example.com/repository/${id}`,
      },
    },
  }
}

// Manuscript endpoints
app.get('/api/v1/manuscripts/item-parts/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const manuscriptId = parseInt(id)
  
  if (isNaN(manuscriptId)) {
    return res.status(400).json({ error: 'Invalid manuscript ID' })
  }
  
  // Generate manuscript on-demand for any ID
  const manuscript = generateManuscriptById(manuscriptId)
  res.json(manuscript)
})

app.get('/api/v1/manuscripts/item-images/:id', (req: Request, res: Response) => {
  const idNum = parseInt(req.params.id, 10)
  if (isNaN(idNum)) {
    return res.status(400).json({ error: 'Invalid image ID' })
  }
  const images = generateManuscriptImages(50)
  const template = images[idNum % images.length]
  const image = { ...template, id: idNum }
  res.json(image)
})

app.get('/api/v1/manuscripts/item-images/', (req: Request, res: Response) => {
  const { item_part, limit, offset } = req.query
  const itemPartId = item_part ? parseInt(item_part as string) : undefined
  const limitNum = limit ? parseInt(limit as string) : 20
  const offsetNum = offset ? parseInt(offset as string) : 0
  
  const allImages = generateManuscriptImages(50, itemPartId)
  const paginatedImages = allImages.slice(offsetNum, offsetNum + limitNum)
  
  res.json({
    count: allImages.length,
    next: offsetNum + limitNum < allImages.length ? `?limit=${limitNum}&offset=${offsetNum + limitNum}` : null,
    previous: offsetNum > 0 ? `?limit=${limitNum}&offset=${Math.max(0, offsetNum - limitNum)}` : null,
    results: paginatedImages,
  })
})

// Hand detail endpoint
app.get('/api/v1/hands/:id/', (req: Request, res: Response) => {
  const { id } = req.params
  const handId = parseInt(id)

  if (isNaN(handId)) {
    return res.status(400).json({ error: 'Invalid hand ID' })
  }

  res.json(generateHandDetail(handId))
})

// Hands list endpoint (supports item_image and scribe filters)
app.get('/api/v1/hands', (req: Request, res: Response) => {
  const { item_image, scribe } = req.query
  const itemImageId = item_image ? parseInt(item_image as string) : undefined
  const scribeId = scribe ? parseInt(scribe as string) : undefined

  let hands = generateHands(10, itemImageId)

  // When filtering by scribe, generate hands with enriched fields for ScribeHand
  if (scribeId) {
    hands = Array.from({ length: 3 + (scribeId % 4) }, (_, i) => ({
      id: scribeId * 100 + i + 1,
      name: `Hand ${scribeId * 100 + i + 1}`,
      scribe: scribeId,
      item_part: (scribeId + i) % 20 + 1,
      date: ['1200', '1250', '1300', '1350'][i % 4],
      place: ['London', 'Oxford', 'Edinburgh', 'Durham'][i % 4],
      description: `Hand by scribe ${scribeId}`,
      item_part_display_label: `NRS - GD55/${(scribeId + i) % 20 + 1}`,
      shelfmark: `GD55/${(scribeId + i) % 20 + 1}`,
    }))
  }

  res.json({
    count: hands.length,
    next: null,
    previous: null,
    results: hands,
  })
})

// Scribe detail endpoint
app.get('/api/v1/scribes/:id/', (req: Request, res: Response) => {
  const { id } = req.params
  const scribeId = parseInt(id)

  if (isNaN(scribeId)) {
    return res.status(400).json({ error: 'Invalid scribe ID' })
  }

  res.json(generateScribeDetail(scribeId))
})

// Allographs endpoint
app.get('/api/v1/symbols_structure/allographs/', (req: Request, res: Response) => {
  res.json(generateAllographs())
})

// Annotations/Graphs endpoints
app.get('/api/v1/manuscripts/graphs/', (req: Request, res: Response) => {
  const { item_image, allograph, hand } = req.query
  const itemImageId = item_image ? parseInt(item_image as string) : undefined
  const handId = hand ? parseInt(hand as string) : undefined
  const graphs = generateGraphs(handId ? 30 : 10, itemImageId, handId)
  
  // Filter by allograph if provided
  let filteredGraphs = graphs
  if (allograph) {
    filteredGraphs = graphs.filter((g) => g.allograph === parseInt(allograph as string))
  }
  
  res.json(filteredGraphs)
})

app.post('/api/v1/manuscripts/graphs/', (req: Request, res: Response) => {
  const payload = req.body
  const newGraph = {
    id: Date.now(), // Simple ID generation
    ...payload,
  }
  
  res.status(201).json(newGraph)
})

app.patch('/api/v1/manuscripts/graphs/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const partial = req.body
  
  const existingGraph = generateGraphs(1)[0]
  const updatedGraph = {
    ...existingGraph,
    id: parseInt(id),
    ...partial,
  }
  
  res.json(updatedGraph)
})

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Mock server is running' })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock API server running on http://localhost:${PORT}`)
  console.log(`📝 Available endpoints:`)
  console.log(`   - GET  /api/v1/search/*/facets`)
  console.log(`   - POST /api/v1/auth/token/login`)
  console.log(`   - GET  /api/v1/manuscripts/*`)
  console.log(`   - GET  /api/v1/hands/:id/`)
  console.log(`   - GET  /api/v1/hands?scribe=&item_image=`)
  console.log(`   - GET  /api/v1/scribes/:id/`)
  console.log(`   - GET  /api/v1/symbols_structure/allographs/`)
  console.log(`   - GET/POST/PATCH /api/v1/manuscripts/graphs/`)
  console.log(`   - GET  /api/v1/media/*`)
  console.log(`   - GET  /scans/* (IIIF image server)`)
})
