# Monorepo: Hono + React + Vite

A modern monorepo setup with a Hono backend and React frontend, managed with pnpm workspaces.

## 📁 Project Structure

```
monorepo-hono-react/
├── packages/
│   ├── backend/          # Hono API server
│   │   ├── src/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env.example
│   └── frontend/         # React + Vite app
│       ├── src/
│       ├── public/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── .env.example
├── package.json          # Root package manager
├── pnpm-workspace.yaml   # Workspace configuration
├── tsconfig.json         # Shared TypeScript config
├── .eslintrc.json        # ESLint configuration
├── .prettierrc          # Prettier configuration
└── .gitignore           # Git ignore rules
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- Docker & Docker Compose (for local development with database and object storage)

### Installation

```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Install all dependencies
pnpm install
```

### Development Setup

#### Option 1: Using Docker Compose (Recommended)

```bash
# Initialize environment files and start Docker services
pnpm setup

# In another terminal, start the development servers
pnpm dev

# Services are now available at:
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:3001
# - MinIO UI: http://localhost:9001 (minioadmin / minioadmin123)
# - SQLite: ./data/sqlite/app.db
```

#### Option 2: Without Docker (Manual Setup)

```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Install all dependencies
pnpm install

# Initialize environment files
pnpm init-env

# Start both frontend and backend in parallel
pnpm dev

# Or start individually:
pnpm --filter backend dev      # Backend on http://localhost:3001
pnpm --filter frontend dev     # Frontend on http://localhost:5173
```

### Build

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter backend build
pnpm --filter frontend build
```

### Linting & Type Checking

```bash
# Lint all packages
pnpm lint

# Type check all packages
pnpm typecheck

# Format code
pnpm format
```

### Docker Compose Commands

The project includes Docker Compose configuration for local development with SQLite and MinIO:

```bash
# Start Docker services (SQLite + MinIO)
pnpm docker:up
# or
make docker-up

# Stop Docker services
pnpm docker:down
# or
make docker-down

# View logs
pnpm docker:logs
# or
make docker-logs

# Check status
pnpm docker:status
# or
make docker-status

# Clean up (stop and remove volumes)
pnpm docker:clean
# or
make docker-clean
```

## 📦 Packages

### Backend (Hono)

- **Framework**: Hono
- **Runtime**: Node.js
- **Port**: 3001 (configurable via `PORT` env var)
- **Database**: SQLite with Prisma ORM
- **Features**: CORS, logging, health check endpoint, type-safe database access

#### Setup

1. Copy environment file:

   ```bash
   cp packages/backend/.env.example packages/backend/.env
   ```

2. Generate Prisma Client:
   ```bash
   pnpm --filter backend db:generate
   ```

3. Initialize and seed the database:
   ```bash
   pnpm --filter backend db:migrate
   pnpm --filter backend db:seed
   ```

4. Start development server:
   ```bash
   pnpm --filter backend dev
   ```

#### Database Management

The backend includes comprehensive database tools:

- `pnpm --filter backend db:generate` - Generate Prisma Client
- `pnpm --filter backend db:migrate` - Create and apply migrations
- `pnpm --filter backend db:reset` - Reset database and re-seed
- `pnpm --filter backend db:seed` - Populate database with sample data
- `pnpm --filter backend db:studio` - Open Prisma Studio (database browser)

For detailed database documentation, see:
- [Database Schema](packages/backend/DATABASE_SCHEMA.md)
- [Migrations & Seeding](packages/backend/MIGRATION_AND_SEEDING.md)

#### API Endpoints

- `GET /` - Hello message
- `GET /health` - Health check with status and uptime

#### Docker Compose & Local Development

The project includes Docker Compose configuration to run SQLite and MinIO locally:

**Start Services:**

```bash
pnpm docker:up
# or
make docker-up
```

**Services Configuration:**

- **SQLite Database**: Stores application data with persistent volume at `./data/sqlite/`
- **MinIO Object Storage**: Provides S3-compatible storage for media files
  - API: `http://localhost:9000`
  - Console UI: `http://localhost:9001`
  - Root credentials: `minioadmin` / `minioadmin123`

**MinIO Buckets (automatically created):**

- `assets` - Learning material assets (public read access)
- `uploads` - User uploaded files
- `temp` - Temporary/cache storage

**Backend Environment Variables:**
The `.env.example` includes all required MinIO connection settings:

```
MINIO_ENDPOINT=localhost:9000
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_BUCKET_ASSETS=assets
MINIO_BUCKET_UPLOADS=uploads
MINIO_BUCKET_TEMP=temp
```

**Azure API Placeholders:**

```
AZURE_SPEECH_KEY=your-azure-speech-key
AZURE_SPEECH_REGION=eastus
AZURE_BLOB_STORAGE_ACCOUNT=your-storage-account
AZURE_BLOB_STORAGE_KEY=your-storage-key
AZURE_BLOB_STORAGE_CONTAINER=your-container
```

**Connect via MinIO CLI:**

```bash
# Access MinIO container
docker exec -it minio-server bash

# Or use mc client from host
mc alias set minio http://localhost:9000 minioadmin minioadmin123
mc ls minio/assets
```

### Frontend (React + Vite)

- **Framework**: React 18 + TypeScript
- **Bundler**: Vite
- **Port**: 5173 (configurable via `FRONTEND_PORT` env var)
- **Features**: Hot reload, proxy to backend API

#### Setup

1. Copy environment file:

   ```bash
   cp packages/frontend/.env.example packages/frontend/.env
   ```

2. Start development server:
   ```bash
   pnpm --filter frontend dev
   ```

The frontend is configured to proxy API requests to the backend during development:

- Frontend: http://localhost:5173
- Backend API: http://localhost:5173/api/_ → http://localhost:3001/_

## 🛠️ Development Workflow

### Adding New Dependencies

```bash
# Add to specific package
pnpm --filter backend add <package>
pnpm --filter frontend add <package>

# Add dev dependency to specific package
pnpm --filter backend add -D <package>
pnpm --filter frontend add -D <package>

# Add to root (shared dependencies)
pnpm add -D -w <package>
```

### Environment Variables

- Backend: Copy `packages/backend/.env.example` to `packages/backend/.env`
- Frontend: Copy `packages/frontend/.env.example` to `packages/frontend/.env`

### Scripts

Available at root level:

- `pnpm dev` - Start all packages in development mode
- `pnpm build` - Build all packages
- `pnpm lint` - Lint all packages
- `pnpm typecheck` - Type check all packages
- `pnpm format` - Format code with Prettier

## 🏗️ Architecture

This monorepo uses:

- **pnpm workspaces** for package management
- **TypeScript project references** for shared configuration
- **ESLint + Prettier** for code quality
- **Environment variables** for configuration
- **Proxy configuration** for seamless frontend-backend communication
- **Prisma ORM** for type-safe database access
- **SQLite** for development and testing databases

### Database

The backend includes a comprehensive SQLite database with Prisma ORM. The schema covers:

- **Users**: User accounts with authentication
- **Learning Content**: Levels, Stories, Units, and Unit Assets (video, audio, subtitles, screenshots, metadata)
- **User Tracking**: Progress per unit, daily plans, pronunciation attempts, and aggregate scores
- **MinIO Integration**: All media assets reference placeholder MinIO keys

See [Database Schema Documentation](packages/backend/DATABASE_SCHEMA.md) for detailed model descriptions.
- **Docker Compose** for local development services (SQLite + MinIO)
- **MinIO** for S3-compatible object storage (media assets)

## 🐳 Docker & Development Services

### Quick Start with Docker

```bash
# 1. Initialize environment and start services
pnpm setup

# 2. In another terminal, start the dev servers
pnpm dev

# 3. Access the services:
# Frontend:    http://localhost:5173
# Backend API: http://localhost:3001
# MinIO UI:    http://localhost:9001 (minioadmin/minioadmin123)
```

### Using Makefile

Alternative to npm scripts, you can use Make commands:

```bash
make setup          # Initialize env and start Docker
make dev            # Start development servers
make docker-up      # Start Docker services only
make docker-down    # Stop Docker services
make docker-logs    # View service logs
make docker-clean   # Remove containers and volumes
make build          # Build all packages
make lint           # Lint code
make format         # Format code
```

### Docker Services

**SQLite Database:**

- Persistent volume: `./data/sqlite/app.db`
- Access via Prisma ORM in backend
- Database path in `.env`: `DATABASE_URL=file:./dev.db`

**MinIO Object Storage:**

- S3-compatible API
- Root user: `minioadmin`
- Root password: `minioadmin123`
- Auto-created buckets:
  - `assets` - Public learning materials
  - `uploads` - User files
  - `temp` - Temporary storage
- Access from code using AWS SDK with custom endpoint

### Troubleshooting Docker

**Logs:**

```bash
pnpm docker:logs
# or
docker-compose logs -f minio
docker-compose logs -f sqlite
```

**Port conflicts:**

- If ports are in use, update `docker-compose.yml`
- MinIO API: 9000, Console: 9001
- SQLite health check: 8888

**Permissions:**

- Data volumes in `./data/` should be writable
- Run `docker-compose down` if you get permission errors

**Clean rebuild:**

```bash
pnpm docker:clean  # Remove containers and volumes
pnpm docker:up     # Recreate everything fresh
```

## 📝 Next Steps

1. Customize the backend API routes in `packages/backend/src/`
2. Build your React components in `packages/frontend/src/`
3. Configure your environment variables for different deployment targets
4. Add additional packages to the workspace as needed

## 🤝 Contributing

1. Follow the existing code style and conventions
2. Run `pnpm lint` and `pnpm typecheck` before committing
3. Use `pnpm format` to format your code
4. Add tests for new features (when test framework is added)
