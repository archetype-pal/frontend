const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
if (!apiUrl) {
  throw new Error('Missing required environment variable: NEXT_PUBLIC_API_URL');
}

const iiifUpstream = process.env.NEXT_PUBLIC_IIIF_UPSTREAM?.trim();
if (!iiifUpstream) {
  throw new Error('Missing required environment variable: NEXT_PUBLIC_IIIF_UPSTREAM');
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
if (!siteUrl) {
  throw new Error('Missing required environment variable: NEXT_PUBLIC_SITE_URL');
}

// Server-only overrides for reaching the backend from inside a container, e.g.
// http://host.docker.internal:8000. These are NOT NEXT_PUBLIC, so they are
// never inlined into the browser bundle; on the client they resolve to
// undefined and fall back to the public URL. Host-run dev and production leave
// them unset and keep using the public URL. Consumers MUST gate on
// `typeof window === 'undefined'` so the browser never uses them.
const internalApiUrl = process.env.INTERNAL_API_URL?.trim() || apiUrl;
const internalIiifUpstream = process.env.INTERNAL_IIIF_UPSTREAM?.trim() || iiifUpstream;

export const env = {
  apiUrl,
  iiifUpstream,
  siteUrl,
  internalApiUrl,
  internalIiifUpstream,
} as const;
