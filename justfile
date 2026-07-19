# Archetype frontend — local development recipes.
#
# Canonical local mode is pnpm on the host; the docker recipes drive the
# optional containerized dev mode (compose.yml). Staging/production run from
# the infrastructure repo — nothing here deploys anywhere.

# Default recipe: list everything (run `just` with no arguments).
default:
    @just --list

# --- pnpm (canonical local dev) ----------------------------------------------

# Install dependencies
install:
    pnpm install

# Start the dev server on http://localhost:3000
dev:
    pnpm dev

# Production build (overwrites .next — restart `just dev` afterwards)
build:
    pnpm build

# ESLint
lint:
    pnpm lint

lint-fix:
    pnpm lint:fix

# Prettier check
format:
    pnpm format

format-fix:
    pnpm format:fix

# Vitest
test:
    pnpm test

test-watch:
    pnpm test:watch

# Bundle analysis / CI bundle-size gate
analyze:
    pnpm analyze

bundle-budget:
    pnpm bundle-budget

# Regenerate .bundle-budget.json after intentional growth (runs a build first)
bundle-budget-update:
    pnpm build
    pnpm bundle-budget:update

# --- docker compose (containerized dev mode) ---------------------------------

# Start the containerized dev server (foreground)
up: _check-env
    docker compose up

# Start the containerized dev server detached. bg stands for background.
up-bg: _check-env
    docker compose up -d

down:
    docker compose down --remove-orphans

# Rebuild the dev image (after dependency or dev.Dockerfile changes)
docker-build:
    docker compose build

_check-env:
    @test -f .env || { echo "No .env — run: cp .env.dev-compose .env (container mode) or cp .env.example .env (pnpm mode)"; exit 1; }
