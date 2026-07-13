#!/bin/sh
# Dev-container entrypoint: forward container-localhost ports to backend
# services on the shared Docker network, so the same .env used for host-run
# `pnpm dev` (http://localhost:8000 API, http://localhost:1024 IIIF) works
# unchanged inside the container — correct Host header, correct absolute
# URLs in API payloads, no split public/internal env vars.
#
# BACKEND_FORWARDS is a comma-separated list of localport:host:port triples,
# e.g. "8000:api:80,1024:image_server:1024" (set in compose.yml). No-op when
# unset, so the image still runs standalone.
if [ -n "$BACKEND_FORWARDS" ]; then
  for fwd in $(echo "$BACKEND_FORWARDS" | tr ',' ' '); do
    socat "TCP-LISTEN:${fwd%%:*},fork,reuseaddr,bind=127.0.0.1" "TCP:${fwd#*:}" &
  done
fi

exec "$@"
