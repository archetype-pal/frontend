# syntax=docker.io/docker/dockerfile:1

FROM node:25-alpine
ENV NODE_ENV=development

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm (corepack is unreliable on Alpine)
RUN npm install -g pnpm@10.28.2
COPY . .
RUN pnpm i --frozen-lockfile

EXPOSE 3000

CMD ["pnpm", "run", "dev", "--hostname", "0.0.0.0", "--port", "3000"]
