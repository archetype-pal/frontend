function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] || fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const env = {
  apiUrl: requireEnv('NEXT_PUBLIC_API_URL', 'http://localhost:8000'),
  iiifUpstream: requireEnv('NEXT_PUBLIC_IIIF_UPSTREAM', 'http://localhost:1024'),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://archetype.gla.ac.uk',
} as const
