# Quick Start Guide

Get up and running in 5 minutes!

## For First Time

```bash
# 1. Clone and install
git clone <repo>
cd monorepo
pnpm install

# 2. Initialize services
pnpm setup

# 3. In another terminal, start dev servers
pnpm dev
```

## Access Everything

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **MinIO UI**: http://localhost:9001 (minioadmin / minioadmin123)

## Common Commands

```bash
# Start/stop Docker services
pnpm docker:up
pnpm docker:down

# View logs
pnpm docker:logs

# Stop everything and clean
pnpm docker:clean
```

## Using Make (Optional)

```bash
make setup      # Setup + start Docker
make dev        # Start dev servers
make docker-up  # Start Docker
make docker-down # Stop Docker
```

## What's Running?

- **SQLite**: Database at `./data/sqlite/app.db`
- **MinIO**: Object storage on 9000/9001
  - Buckets: `assets`, `uploads`, `temp`
  - Root user: `minioadmin`
  - Root password: `minioadmin123`

## Next

Read `README.md` for detailed documentation or `DOCKER_SETUP.md` for Docker specifics.
