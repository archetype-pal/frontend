# Mock API Server

This mock server provides fake API responses for the Archetype frontend application, allowing development without a backend dependency. The mock server uses real image URLs from the backend and rotates through 10 actual images.

## Setup

1. Install dependencies:
```bash
cd mock
pnpm install
```

2. Start the mock server:
```bash
pnpm dev
```

The server will run on `http://localhost:8000` by default (or the port specified in `MOCK_PORT` environment variable).

## Usage

### Option 1: Using npm scripts (Recommended)

From the frontend root directory:

1. Start the mock server in one terminal:
```bash
pnpm mock
```

2. In another terminal, start the Next.js frontend with mock mode:
```bash
pnpm dev:mock
```

### Option 2: Manual setup

1. Start the mock server in one terminal:
```bash
cd mock
pnpm dev
```

2. In another terminal, start the Next.js frontend with the mock API URL:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm dev
```

Or create a `.env.local` file in the frontend root:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Features

- **Real Image URLs**: Uses 10 actual image URLs from the backend and rotates through them
- **Realistic Data Structure**: Matches the actual API response structure from the backend
- **All Endpoints**: Implements all major API endpoints used by the frontend
- **TypeScript**: Written in TypeScript for type safety

## Available Endpoints

The mock server implements the following endpoints:

### Search
- `GET /api/v1/search/{item-parts,item-images,scribes,hands,graphs}/facets` - Search with facets

### Authentication
- `POST /api/v1/auth/token/login` - Login
- `POST /api/v1/auth/token/logout` - Logout
- `GET /api/v1/auth/profile` - Get user profile

### Manuscripts
- `GET /api/v1/manuscripts/item-parts/:id` - Get manuscript by ID
- `GET /api/v1/manuscripts/item-images/:id` - Get manuscript image by ID
- `GET /api/v1/manuscripts/item-images/?item_part=:id` - Get images by item part

### Hands & Allographs
- `GET /api/v1/hands?item_image=:id` - Get hands for an image
- `GET /api/v1/symbols_structure/allographs/` - Get all allographs

### Annotations
- `GET /api/v1/manuscripts/graphs/?item_image=:id&allograph=:id` - Get annotations
- `POST /api/v1/manuscripts/graphs/` - Create annotation
- `PATCH /api/v1/manuscripts/graphs/:id` - Update annotation

### Media
- `GET /api/v1/media/carousel-items/` - Get carousel items
- `GET /api/v1/media/publications/` - Get publications (supports query params: is_news, is_featured, is_blog_post, limit, offset)
- `GET /api/v1/media/publications/:slug` - Get publication by slug

## Customization

You can modify the mock data generators in `src/mockData.ts` to customize the fake data returned by the server.

## Development

- `pnpm dev` - Run server in watch mode with tsx
- `pnpm build` - Build TypeScript to JavaScript
- `pnpm start` - Run the built server
