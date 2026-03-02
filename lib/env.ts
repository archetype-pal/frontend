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

export const env = { apiUrl, iiifUpstream, siteUrl } as const;
