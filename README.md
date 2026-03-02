# Archetype Frontend

Next.js frontend for the Archetype project.

## Prerequisites

- Node.js `>=22`
- pnpm `>=10`
- Docker (for containerized local runs)

## Environment Variables

Copy the sample file and adjust values as needed:

```bash
cp .env.example .env
```

Important variables:

- `NEXT_PUBLIC_API_URL` (required)
- `NEXT_PUBLIC_IIIF_UPSTREAM` (required)
- `NEXT_PUBLIC_SITE_URL` (required)
- `CORS_ALLOWED_ORIGINS` (required, used by `/api/*` headers)

## Local Development (pnpm)

Install dependencies:

```bash
pnpm install
```

Start the dev server:

```bash
pnpm dev
```

App URL: `http://localhost:3000`

## Quality Checks

```bash
pnpm lint
pnpm test
pnpm build
```

## Run With Docker (Local)

The `Dockerfile` builds a production image and runs Next.js in standalone mode on port `3000`.

### 1) Build the image

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 \
  --build-arg NEXT_PUBLIC_IIIF_UPSTREAM=http://localhost:1024 \
  --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
  --build-arg CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000 \
  --build-arg DOCKER_IMAGE_HASH=local-dev \
  -t archetype-frontend:local .
```

If your API is reachable on another host/IP, set that URL in `NEXT_PUBLIC_API_URL` during build.

### 2) Run the container

```bash
docker run --rm \
  --name archetype-frontend \
  -p 3000:3000 \
  archetype-frontend:local
```

The container listens on `0.0.0.0` internally (already configured in the image), and `-p 3000:3000` publishes it on your machine.
`NEXT_PUBLIC_*` values are set at image build time via `--build-arg`; passing them at `docker run` can override server-side behavior.

## Access Over Your Local Network

To open the app from another device on the same network:

1. Find your machine IP (example on macOS):
   ```bash
   ipconfig getifaddr en0
   ```
2. Ensure port `3000` is allowed by your firewall.
3. Open from another device:
   - `http://<YOUR_MACHINE_IP>:3000`

If backend/image services are on your machine, they must also be reachable from the container and from client devices (CORS and host/IP values in env vars may need to be updated).

## Useful Commands

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm lint:fix
pnpm test
```
