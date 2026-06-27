# Nexus5Proxy — imported source

These files are imported from https://github.com/novainintelligence-tech/Nexus5Proxy_copy
for reference only. They do **not** run inside Lovable.

Why: the repo is a pnpm workspace of Node services (Dockerfiles, native deps,
long-running processes). Lovable's app runs on Cloudflare Workers via TanStack
Start — no pnpm workspaces, no Docker, no `child_process`, no long-running
processes. The Vite build also ignores this folder (it only builds `src/`).

To actually run it, deploy elsewhere (Fly.io, Railway, Render, or a VPS) using
the included `Dockerfile`. The Lovable app here can then be wired to call it
over HTTP.