# Docker Development Setup Guide

This guide explains how to set up and use the Docker Compose development environment for the monorepo.

## Overview

The Docker Compose setup provides:

- **SQLite Database**: Persistent local database with mounted volume
- **MinIO Object Storage**: S3-compatible storage for media assets

## Quick Start

### 1. First Time Setup

```bash
# Install dependencies and initialize environment files
pnpm install
pnpm init-env

# Start Docker services
pnpm docker:up

# In another terminal, start the development servers
pnpm dev
```

### 2. Access Services

After running `pnpm docker:up`, services are available at:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **MinIO Console**: http://localhost:9001
  - Username: `minioadmin`
  - Password: `minioadmin123`
- **MinIO API**: http://localhost:9000

### 3. Database Connection

Backend connects to SQLite using Prisma ORM:

- Database file: `./data/sqlite/app.db`
- Connection string in `.env`: `DATABASE_URL=file:./dev.db`

### 4. MinIO Buckets

Automatically created buckets:

- `assets` - Public learning materials
- `uploads` - User uploaded files
- `temp` - Temporary storage

## Available Commands

### Using npm scripts

```bash
# Start Docker services
pnpm docker:up

# Stop Docker services
pnpm docker:down

# View service logs
pnpm docker:logs

# Check service status
pnpm docker:status

# Remove containers and volumes
pnpm docker:clean

# Initialize environment files
pnpm init-env

# Full setup (env + docker)
pnpm setup
```

### Using Make (alternative)

```bash
make setup          # Initialize env and start Docker
make dev            # Start development servers
make docker-up      # Start Docker services
make docker-down    # Stop Docker services
make docker-logs    # View logs
make docker-clean   # Clean up everything
```

## Troubleshooting

### Services won't start

Check Docker is running:

```bash
docker ps
```

Check logs:

```bash
pnpm docker:logs
docker compose logs -f sqlite
docker compose logs -f minio
```

### Port conflicts

If ports 9000/9001 are already in use, edit `docker-compose.yml`:

```yaml
ports:
  - '9000:9000' # Change first port if needed
  - '9001:9001'
```

### MinIO not initialized

The `minio-init` service creates buckets automatically. If it fails:

```bash
# Restart services
pnpm docker:clean
pnpm docker:up
```

### Database file not created

Ensure `./data/sqlite/` directory is writable:

```bash
chmod -R 755 data/
```

### Permission denied errors

If you get permission errors, try:

```bash
# Stop services
docker compose down

# Fix permissions
sudo chown -R $USER:$USER data/

# Start again
pnpm docker:up
```

## MinIO CLI Management

### Access MinIO from host machine

```bash
# Install mc (MinIO client)
curl https://dl.min.io/client/mc/release/linux-amd64/mc -o mc
chmod +x mc

# Configure alias
./mc alias set minio http://localhost:9000 minioadmin minioadmin123

# List buckets
./mc ls minio/

# Upload file
./mc cp myfile.txt minio/uploads/

# List objects
./mc ls minio/assets/
```

### Access MinIO from backend

In your Node.js/Hono backend:

```typescript
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER || 'minioadmin',
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin123',
  },
  endpoint: `http://${process.env.MINIO_ENDPOINT || 'localhost:9000'}`,
  forcePathStyle: true,
})

const result = await s3Client.send(new ListBucketsCommand({}))
console.log(result.Buckets)
```

## Environment Variables

Backend `.env` variables for Docker services:

```env
# MinIO Configuration
MINIO_ENDPOINT=localhost:9000
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_BUCKET_ASSETS=assets
MINIO_BUCKET_UPLOADS=uploads
MINIO_BUCKET_TEMP=temp

# Database
DATABASE_URL=file:./dev.db
```

## Docker Compose Services

### SQLite Service

- **Image**: `alpine:latest`
- **Purpose**: Data persistence
- **Volumes**: `./data/sqlite:/data`
- **Health Check**: Validates `app.db` file exists

### MinIO Service

- **Image**: `minio/minio:latest`
- **Purpose**: S3-compatible object storage
- **API Port**: 9000
- **Console Port**: 9001
- **Volumes**: `./data/minio:/data`
- **Health Check**: Validates MinIO health endpoint

### MinIO Init Service

- **Image**: `minio/mc:latest`
- **Purpose**: Initializes MinIO buckets on startup
- **Action**: Creates `assets`, `uploads`, `temp` buckets

## Data Persistence

Data is stored in mounted volumes:

- Database: `./data/sqlite/app.db`
- MinIO objects: `./data/minio/`

To preserve data:

- Do NOT use `docker-compose down -v` unless you want to delete data
- Use `docker-compose down` to keep data between sessions
- Use `pnpm docker:clean` only when you want a fresh start

## Production Considerations

This setup is for **local development only**. For production:

- Use managed database services (RDS, etc.)
- Use managed object storage (S3, Azure Blob, etc.)
- Configure proper secrets management
- Enable SSL/TLS
- Set up proper networking and security groups
- Use environment-specific credentials

## Next Steps

1. Set up Prisma ORM for database management
2. Add AWS SDK for MinIO/S3 integration
3. Create database migrations
4. Implement file upload endpoints
5. Add authentication to backend
