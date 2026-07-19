# Archetype frontend — local development recipes, all running in Docker.
#
# Nothing here touches a host Node toolchain: every recipe executes inside the
# dev image (dev.Dockerfile) via docker compose. Source is bind-mounted, deps
# and build cache live in named volumes. Staging/production run from the
# infrastructure repo — nothing here deploys anywhere.
#
# First run: just up — no env setup needed; compose.yml carries the
# container-topology env (a .env is only needed for host-native `pnpm dev`).

# Default recipe: list everything (run `just` with no arguments).
default:
    @just --list

# --- Dev server ---------------------------------------------------------------

# Start the dev server on http://localhost:3000 (foreground, live reload)
up:
    docker compose up

alias dev := up

# Start the dev server detached. bg stands for background.
up-bg:
    docker compose up -d

down:
    docker compose down --remove-orphans

# Rebuild the dev image (after dev.Dockerfile or base-image changes)
build-image:
    docker compose build

# Refresh dependencies in the shared volume (after package.json/lockfile changes)
install:
    docker compose run --rm frontend pnpm install --frozen-lockfile

# --- Quality checks -----------------------------------------------------------

# ESLint
lint:
    docker compose run --rm frontend pnpm lint

lint-fix:
    docker compose run --rm frontend pnpm lint:fix

# Prettier check
format:
    docker compose run --rm frontend pnpm format

format-fix:
    docker compose run --rm frontend pnpm format:fix

# Vitest
test:
    docker compose run --rm frontend pnpm test

test-watch:
    docker compose run --rm frontend pnpm test:watch

# --- Build / bundle -----------------------------------------------------------

# Production build (.next stays inside the container, not the host checkout)
build:
    docker compose run --rm frontend pnpm build

# Bundle analysis
analyze:
    docker compose run --rm -e ANALYZE=true frontend pnpm build

# CI bundle-size gate against .bundle-budget.json (builds first — the gate
# reads .next, which is per-container, so both steps share one container)
bundle-budget:
    docker compose run --rm frontend sh -c "pnpm build && pnpm bundle-budget"

# Regenerate .bundle-budget.json after intentional growth (builds first)
bundle-budget-update:
    docker compose run --rm frontend sh -c "pnpm build && pnpm bundle-budget:update"

# Shell inside the dev container
bash:
    docker compose run --rm frontend sh

