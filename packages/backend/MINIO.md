# MinIO Integration Guide

This document describes the MinIO client implementation in the backend API for managing media assets (videos, audio, images, metadata) stored in MinIO S3-compatible object storage.

## Overview

The MinIO integration provides:
- **Presigned URL Generation**: Generate time-limited URLs for accessing stored objects
- **Asset Management**: List, retrieve, and sync assets associated with learning units
- **Health Checks**: Monitor MinIO connectivity and availability
- **Multiple Buckets**: Support for assets, uploads, and temporary storage

## Architecture

### Services

#### `src/services/minio.ts`
Core MinIO client wrapper providing:
- `getMinioClient()`: Initialize and cache MinIO client
- `getPresignedUrl()`: Generate presigned GET URLs for object download
- `getPresignedPutUrl()`: Generate presigned PUT URLs for object upload
- `listObjects()`: List objects in a bucket with optional prefix filtering
- `checkMinIOHealth()`: Verify MinIO connectivity
- `getObjectMetadata()`: Retrieve object metadata (size, etag, last modified)

#### `src/services/assets.ts`
Unit asset management providing:
- `listAssetsForUnit()`: Get all assets for a specific learning unit with presigned URLs
- `listAssetsPerUnit()`: Get assets for multiple units
- `getAssetWithUrl()`: Get single asset with presigned URL
- `syncAssetsFromMinIO()`: Sync objects from MinIO bucket to database, detecting asset types from file extensions

### API Endpoints

#### Health Check
```
GET /api/minio/health
Response: { status, endpoint, buckets, timestamp }
```

#### List Unit Assets
```
GET /api/units/{unitId}/assets
Response: { unitId, count, assets }
```

#### Get Single Asset
```
GET /api/assets/{assetId}
Response: { id, unitId, type, minioKey, presignedUrl, ... }
```

#### Generate Presigned GET URL
```
POST /api/assets/{assetId}/presigned-url
Body: { expirySeconds?: number }
Response: { assetId, presignedUrl, expiresAt }
```

#### Generate Presigned PUT URL (for uploads)
```
POST /api/assets/presigned-upload-url
Body: { unitId, objectKey, expirySeconds?: number }
Response: { unitId, objectKey, presignedUrl, expiresAt }
```

#### Sync Assets
```
POST /api/minio/sync-assets
Body: { bucketPrefix?: string }
Response: { message, synced, skipped, timestamp }
```

## Configuration

Set environment variables in `.env`:

```env
# MinIO Configuration
MINIO_ENDPOINT=localhost:9000          # MinIO server endpoint
MINIO_PORT=9000                        # MinIO server port
MINIO_USE_SSL=false                    # Use SSL/TLS
MINIO_ROOT_USER=minioadmin             # Access key
MINIO_ROOT_PASSWORD=minioadmin123      # Secret key

# Bucket Names
MINIO_BUCKET_ASSETS=assets             # Bucket for learning assets
MINIO_BUCKET_UPLOADS=uploads           # Bucket for user uploads
MINIO_BUCKET_TEMP=temp                 # Bucket for temporary files
```

## Asset Types

Supported asset types detected by file extension:
- **VIDEO**: .mp4, .webm, .mkv
- **AUDIO**: .mp3, .wav, .aac
- **SUBTITLE**: .vtt, .srt
- **SCREENSHOT**: .png, .jpg, .jpeg, .gif, .webp
- **METADATA**: .json (and other unknown formats)

## Object Key Structure

Recommended object key structure for organization:

```
units/{unitId}/{assetType}/{fileName}
Example: units/unit-123/videos/lesson-intro.mp4
```

## Database Integration

Unit assets are stored in the `UnitAsset` model:

```prisma
model UnitAsset {
  id        String    @id @default(cuid())
  unitId    String
  type      AssetType
  minioKey  String    // MinIO object key
  duration  Int?      // Duration in seconds (for media)
  metadata  String?   // JSON metadata
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

## Usage Examples

### List assets for a unit
```typescript
const assets = await fetch('/api/units/unit-123/assets')
// Returns all assets with presigned URLs valid for 1 hour
```

### Generate custom presigned URL with longer expiry
```typescript
const response = await fetch('/api/assets/asset-456/presigned-url', {
  method: 'POST',
  body: JSON.stringify({ expirySeconds: 86400 }) // 24 hours
})
const { presignedUrl } = await response.json()
```

### Upload to MinIO
```typescript
const response = await fetch('/api/assets/presigned-upload-url', {
  method: 'POST',
  body: JSON.stringify({
    unitId: 'unit-123',
    objectKey: 'units/unit-123/videos/new-video.mp4'
  })
})
const { presignedUrl } = await response.json()

// Use presignedUrl to upload file directly to MinIO
await fetch(presignedUrl, {
  method: 'PUT',
  body: fileData,
  headers: { 'Content-Type': 'video/mp4' }
})
```

### Sync assets from MinIO
```typescript
const response = await fetch('/api/minio/sync-assets', {
  method: 'POST',
  body: JSON.stringify({ bucketPrefix: 'units/' })
})
const { synced, skipped } = await response.json()
```

## Testing

Run tests with:
```bash
npm run test
npm run test:ui
```

Tests are located in:
- `src/services/minio.test.ts`: MinIO client unit tests
- `src/services/assets.test.ts`: Asset service unit tests

Tests include:
- Presigned URL generation
- Stream-based object listing
- Error handling
- Asset type detection from file extensions
- Database synchronization

## Health Checks

The main health endpoint includes MinIO status:
```
GET /health
Response: { 
  status: 'ok',
  services: {
    minio: {
      endpoint: 'localhost:9000',
      configured: true,
      connected: true,
      buckets: { assets, uploads, temp }
    }
  }
}
```

## Error Handling

All errors are wrapped with descriptive messages:
- Connection failures
- Missing objects
- Permission denied
- Database errors

## Performance Considerations

- Presigned URLs are valid for 1 hour by default (configurable)
- Object metadata is fetched on demand
- Asset listing includes presigned URLs in a single database query
- Streaming is used for object list operations to handle large buckets

## Security Notes

- Presigned URLs are time-limited (default 1 hour)
- Access is controlled by MinIO IAM policies
- Unit existence is verified before allowing operations
- All endpoints require proper authentication (future implementation)
