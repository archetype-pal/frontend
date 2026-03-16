(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

if (!process.env.NEXT_PUBLIC_API_URL) {
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
}

if (!process.env.NEXT_PUBLIC_IIIF_UPSTREAM) {
  process.env.NEXT_PUBLIC_IIIF_UPSTREAM = 'http://localhost:8182';
}

if (!process.env.NEXT_PUBLIC_SITE_URL) {
  process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
}
