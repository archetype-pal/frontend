# syntax=docker.io/docker/dockerfile:1

FROM node:alpine
ENV NODE_ENV=development

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY . .
RUN corepack enable pnpm && pnpm i --frozen-lockfile

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["pnpm", "run", "dev"]
