import { PrismaClient } from '../generated/client.js'
import { listObjects, getPresignedUrl } from './minio.js'
import { getMinIOConfig } from '../db.js'

const prisma = new PrismaClient()

export interface AssetWithUrl {
  id: string
  unitId: string
  type: string
  minioKey: string
  duration?: number | null
  metadata?: string | null
  createdAt: Date
  updatedAt: Date
  presignedUrl: string
}

/**
 * List all assets for a specific unit with presigned URLs
 */
export async function listAssetsForUnit(unitId: string): Promise<AssetWithUrl[]> {
  try {
    // Fetch assets from database for this unit
    const assets = await prisma.unitAsset.findMany({
      where: { unitId },
      orderBy: { createdAt: 'asc' },
    })

    // Generate presigned URLs for each asset
    const assetsWithUrls: AssetWithUrl[] = await Promise.all(
      assets.map(async (asset) => {
        try {
          const config = getMinIOConfig()
          const presignedUrl = await getPresignedUrl({
            bucketName: config.buckets.assets,
            objectName: asset.minioKey,
            expirySeconds: 3600, // 1 hour
          })

          return {
            ...asset,
            presignedUrl,
          }
        } catch (error) {
          // If presigned URL generation fails, return empty string
          console.warn(`Failed to generate presigned URL for asset ${asset.id}:`, error)
          return {
            ...asset,
            presignedUrl: '',
          }
        }
      }),
    )

    return assetsWithUrls
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to list assets for unit ${unitId}: ${errorMessage}`)
  }
}

/**
 * List assets per unit for multiple units
 */
export async function listAssetsPerUnit(
  unitIds: string[],
): Promise<Map<string, AssetWithUrl[]>> {
  const result = new Map<string, AssetWithUrl[]>()

  try {
    for (const unitId of unitIds) {
      const assets = await listAssetsForUnit(unitId)
      result.set(unitId, assets)
    }
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to list assets per unit: ${errorMessage}`)
  }
}

/**
 * Get asset by ID with presigned URL
 */
export async function getAssetWithUrl(assetId: string): Promise<AssetWithUrl | null> {
  try {
    const asset = await prisma.unitAsset.findUnique({
      where: { id: assetId },
    })

    if (!asset) {
      return null
    }

    const config = getMinIOConfig()
    const presignedUrl = await getPresignedUrl({
      bucketName: config.buckets.assets,
      objectName: asset.minioKey,
      expirySeconds: 3600, // 1 hour
    })

    return {
      ...asset,
      presignedUrl,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to get asset ${assetId}: ${errorMessage}`)
  }
}

/**
 * Sync assets from MinIO based on stored keys
 * This lists all assets in a bucket prefix and compares with database
 */
export async function syncAssetsFromMinIO(bucketPrefix: string = 'units/'): Promise<{
  synced: number
  skipped: number
}> {
  try {
    const config = getMinIOConfig()
    const objects = await listObjects(config.buckets.assets, bucketPrefix)

    let synced = 0
    let skipped = 0

    for (const obj of objects) {
      // Check if asset already exists in database
      const existing = await prisma.unitAsset.findFirst({
        where: { minioKey: obj.name },
      })

      if (!existing) {
        // Extract unit ID from object name (assuming format: units/{unitId}/...)
        const match = obj.name.match(/units\/([^/]+)\//)
        if (match && match[1]) {
          const unitId = match[1]
          // Determine asset type from file extension
          const ext = obj.name.split('.').pop()?.toLowerCase() || ''
          let assetType = 'METADATA'

          if (['mp4', 'webm', 'mkv'].includes(ext)) {
            assetType = 'VIDEO'
          } else if (['mp3', 'wav', 'aac'].includes(ext)) {
            assetType = 'AUDIO'
          } else if (['vtt', 'srt'].includes(ext)) {
            assetType = 'SUBTITLE'
          } else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
            assetType = 'SCREENSHOT'
          } else if (['json'].includes(ext)) {
            assetType = 'METADATA'
          }

          try {
            await prisma.unitAsset.create({
              data: {
                unitId,
                type: assetType as any,
                minioKey: obj.name,
              },
            })
            synced++
          } catch {
            // Silently skip if unit doesn't exist or other database error
            skipped++
          }
        }
      }
    }

    return { synced, skipped }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to sync assets from MinIO: ${errorMessage}`)
  }
}
