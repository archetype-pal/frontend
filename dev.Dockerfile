# syntax=docker.io/docker/dockerfile:1

FROM node:26-alpine
ENV NODE_ENV=development

ENV NEXT_TELEMETRY_DISABLED=1

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Keep in sync with "packageManager" in package.json and the production Dockerfile.
RUN npm install -g pnpm@11.9.0

# Manifests first so source edits don't invalidate the install layer (same
# pattern as the production Dockerfile). The cache mount persists the pnpm
# store across builds, so a lockfile change only downloads changed packages.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm i --frozen-lockfile --store-dir /pnpm/store
COPY . .

EXPOSE 3000

# Run next directly (not via `pnpm run dev`): pnpm swallows SIGTERM, turning
# every `docker stop` into a 10s hang + SIGKILL. The explicit --hostname
# forces an IPv4 wildcard bind (next's default resolves to `::`, which is
# unreachable over IPv4 loopback under some WSL2 networking modes).
CMD ["node", "node_modules/next/dist/bin/next", "dev", "--hostname", "0.0.0.0"]
