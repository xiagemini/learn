# Docker Compose & Development Tooling Implementation

## Summary

This implementation adds Docker Compose orchestration for local development with SQLite database and MinIO object storage service.

## Files Created/Modified

### New Files Created

1. **docker-compose.yml**
   - Orchestrates SQLite and MinIO services
   - Includes automatic bucket initialization via minio-init service
   - Persistent volumes for data storage
   - Health checks for service availability
   - Custom network for inter-service communication

2. **Makefile**
   - Simple commands for Docker and development operations
   - `make docker-up` - Start services
   - `make docker-down` - Stop services
   - `make setup` - Full initialization
   - And more for build, lint, format operations

3. **Documentation Files**
   - **DOCKER_SETUP.md** - Comprehensive Docker setup guide with troubleshooting
   - **QUICK_START.md** - 5-minute quick start guide
   - **IMPLEMENTATION_SUMMARY.md** - This file

4. **.dockerignore**
   - Excludes unnecessary files from Docker build context

5. **Scripts Directory** (scripts/)
   - **init-minio.sh** - MinIO bucket initialization
   - **wait-and-init-minio.sh** - Wait for MinIO with retry logic
   - **setup-backend.sh** - Backend setup helper script

6. **Backend Database Module** (packages/backend/src/db.ts)
   - `checkDatabaseConnection()` - Verifies SQLite database access
   - `getMinIOConfig()` - Returns MinIO configuration
   - `getAzureConfig()` - Returns Azure API configuration

### Modified Files

1. **package.json**
   - Added Docker npm scripts:
     - `docker:up` - Start Docker services
     - `docker:down` - Stop services
     - `docker:logs` - View logs
     - `docker:status` - Check status
     - `docker:clean` - Remove containers and volumes
     - `init-env` - Initialize environment files
     - `setup` - Full setup (env + docker)

2. **README.md**
   - Updated with Docker prerequisites
   - Added Docker Compose section
   - Enhanced backend setup documentation
   - Added comprehensive Docker & Development Services section
   - Included troubleshooting guide
   - Added service access information

3. **packages/backend/.env.example**
   - Added DATABASE_URL for SQLite
   - Added MinIO configuration:
     - MINIO_ENDPOINT
     - MINIO_PORT
     - MINIO_USE_SSL
     - MINIO_ROOT_USER
     - MINIO_ROOT_PASSWORD
     - MINIO*BUCKET*\* settings
   - Added Azure API placeholders:
     - AZURE_SPEECH_KEY
     - AZURE_SPEECH_REGION
     - AZURE*BLOB_STORAGE*\* settings

4. **packages/backend/src/index.ts**
   - Enhanced health check endpoint with database and service status
   - Added `/api/status` endpoint for status queries
   - Imported database configuration helpers
   - Added startup logging for services

5. **.gitignore**
   - Excluded Docker data directories (data/, .docker/)
   - Excluded database files (_.db, _.db-shm, \*.db-wal)

## How It Works

### Docker Services

**SQLite Database:**

- Uses Alpine Linux image for lightweight setup
- Persistent storage in `./data/sqlite/app.db`
- Health check validates database file exists
- Automatically creates database on startup

**MinIO Object Storage:**

- Official MinIO image for S3-compatible storage
- API available on port 9000
- Console UI available on port 9001
- Persistent storage in `./data/minio/`
- Health checks validate service availability

**MinIO Initialization:**

- Separate minio-init service using minio/mc
- Automatically creates required buckets:
  - `assets` - Learning materials (public read)
  - `uploads` - User uploads
  - `temp` - Temporary storage
- Runs once after MinIO starts

### Environment Configuration

All services configured via environment variables in `.env` file:

```env
# Database
DATABASE_URL=file:./dev.db

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123

# Azure (placeholders)
AZURE_SPEECH_KEY=your-azure-speech-key
AZURE_SPEECH_REGION=eastus
```

### Backend Integration

Backend now provides:

1. **Health check with service status** - `/health` endpoint shows:
   - Database connection status
   - MinIO configuration
   - Azure configuration status

2. **Database connection checker** - Verifies SQLite is accessible
3. **Service configuration helpers** - Easy access to MinIO and Azure settings
4. **Status endpoint** - `/api/status` for detailed diagnostics

## Quick Start

```bash
# 1. Install and initialize
pnpm install
pnpm setup              # Creates env files and starts Docker

# 2. In another terminal, start dev servers
pnpm dev

# 3. Access services
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
# MinIO UI: http://localhost:9001 (minioadmin/minioadmin123)
# Health check: http://localhost:3001/health
```

## Usage Examples

### Check System Health

```bash
curl http://localhost:3001/health | jq
```

Response shows:

- Backend status
- Database connection status and path
- MinIO configuration
- Azure service configuration

### Access MinIO Console

- URL: http://localhost:9001
- Username: minioadmin
- Password: minioadmin123

### View Service Logs

```bash
# All services
pnpm docker:logs

# Specific service
docker compose logs -f minio
docker compose logs -f sqlite
```

### Clean Up

```bash
# Stop services but keep data
pnpm docker:down

# Remove everything (destructive)
pnpm docker:clean
```

## Database Persistence

Data is stored in mounted volumes:

- SQLite: `./data/sqlite/app.db`
- MinIO: `./data/minio/`

These directories are:

- Created automatically by Docker
- Excluded from git via .gitignore
- Persisted between container restarts
- Accessible from host machine

## Future Setup Steps

1. **Prisma ORM Integration**
   - Create database schema
   - Generate Prisma client
   - Set up migrations

2. **AWS SDK Integration**
   - Add @aws-sdk/client-s3
   - Implement S3 client with custom MinIO endpoint
   - Create upload/download handlers

3. **Database Seeding**
   - Add seed data scripts
   - Set up database initialization

4. **Authentication**
   - Add JWT or session-based auth
   - Implement user management

5. **API Routes**
   - File upload endpoints
   - Asset management endpoints
   - User endpoints

## Troubleshooting

### Port Conflicts

Update `docker-compose.yml` if ports 9000/9001 are in use:

```yaml
ports:
  - '8000:9000' # Change host port
  - '8001:9001'
```

### Permission Denied

```bash
# Fix permissions on data directory
chmod -R 755 data/
```

### Services Won't Start

```bash
# Check logs
docker compose logs

# Verify Docker is running
docker ps

# Clean and restart
pnpm docker:clean
pnpm docker:up
```

### Database Not Found

The database is created automatically on first run. If issues persist:

```bash
# Ensure data directory exists and is writable
mkdir -p data/sqlite
chmod 755 data/sqlite
```

## Notes

- This setup is for **local development only**
- Production should use managed services (RDS, S3, etc.)
- MinIO credentials are not secure - update for production
- Database runs locally - no replication or backups configured
- SSL is disabled locally - enable in production
- Services are accessible via localhost - use private networks in production
