compose := "docker compose"

# Run the dev server in a container (reachable from Windows over WSL).
# Open http://localhost:3000 once it's ready.
up:
    {{compose}} up

# bg stands for background
up-bg:
    {{compose}} up -d

down:
    {{compose}} down

# Build the dev image without starting it.
build:
    {{compose}} build

# Rebuild the image and re-seed the node_modules/.next volumes. Needed after
# dependency changes: plain `up --build` reattaches the OLD anonymous volumes,
# so newly installed packages would be missing from the running container.
rebuild:
    {{compose}} up --build --renew-anon-volumes

# Tail the dev server logs (useful after `just up-bg`).
logs:
    {{compose}} logs -f

# Open a shell inside the running dev container.
shell:
    {{compose}} exec frontend sh
