function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (value) return value;
  throw new Error(`Missing required environment variable: ${key}`);
}

export const env = {
  apiUrl: requireEnv('NEXT_PUBLIC_API_URL'),
  iiifUpstream: requireEnv('NEXT_PUBLIC_IIIF_UPSTREAM'),
  siteUrl: requireEnv('NEXT_PUBLIC_SITE_URL'),
} as const;
