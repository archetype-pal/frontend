# syntax=docker.io/docker/dockerfile:1

# Dev-only image for the containerized local mode (see compose.yml).
# Deployment images are built from Dockerfile — never from this file.
# No baked NODE_ENV: `next dev` sets development itself, and recipes like
# `just build` need production semantics in this same image.
FROM node:26-alpine

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# corepack is unreliable on Alpine; pin the pnpm from package.json's packageManager
RUN npm install -g pnpm@11.9.0

# Manifests only: source arrives via the compose bind-mount, and node_modules
# lives in an anonymous volume seeded from this layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

EXPOSE 3000

CMD ["pnpm", "run", "dev", "--hostname", "0.0.0.0", "--port", "3000"]
