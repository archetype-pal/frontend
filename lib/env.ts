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

// Server-side fetch base. In the containerized dev mode the backend is only
// reachable from inside the container via host.docker.internal, while the
// browser must keep the localhost URL — INTERNAL_API_URL (not NEXT_PUBLIC,
// so it never reaches browser bundles) carries the server-side override and
// falls back to the public URL when unset (host pnpm mode, production).
const serverApiUrl = process.env.INTERNAL_API_URL?.trim() || apiUrl;

export const env = { apiUrl, iiifUpstream, siteUrl, serverApiUrl } as const;
