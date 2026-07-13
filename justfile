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

# Tail the dev server logs (useful after `just up-bg`).
logs:
    {{compose}} logs -f

# Open a shell inside the running dev container.
shell:
    {{compose}} exec frontend sh
