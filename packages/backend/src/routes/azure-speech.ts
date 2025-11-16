import { Hono } from 'hono'
import { authMiddleware, requireAuth } from '../middleware/auth.js'
import { AzureSpeechService } from '../services/azure-speech.js'
import { getAzureConfig } from '../db.js'
import type { 
  PronunciationAssessmentRequest, 
  PronunciationAssessmentResult,
  PronunciationAssessmentError,
  AudioProcessingOptions
} from '../types/azure-speech.js'

const router = new Hono<{ 
  Variables: { 
    user?: { 
      userId: string; 
      username: string; 
      email: string; 
      iat?: number; 
      exp?: number 
    } 
  } 
}>()

router.use('*', authMiddleware)

// Global Azure Speech service instance
let azureSpeechService: AzureSpeechService | null = null

/**
 * Get or create Azure Speech service instance
 */
function getAzureSpeechService(): AzureSpeechService {
  if (!azureSpeechService) {
    const azureConfig = getAzureConfig()
    
    if (!azureConfig.speechKey || !azureConfig.speechRegion) {
      throw new Error('Azure Speech service not configured. Check AZURE_SPEECH_KEY and AZURE_SPEECH_REGION environment variables.')
    }

    azureSpeechService = new AzureSpeechService({
      speechKey: azureConfig.speechKey,
      speechRegion: azureConfig.speechRegion,
      maxRetries: 3,
      retryDelayMs: 1000,
      timeoutMs: 30000
    })
  }

  return azureSpeechService
}

/**
 * POST /azure-speech/assess
 * Evaluate pronunciation from audio data
 * 
 * Request body:
 * {
 *   "referenceText": "Hello world",
 *   "audioData": "base64-encoded-audio-data",
 *   "language": "en-US",
 *   "granularity": "Phoneme" | "Word" | "FullText",
 *   "enableMiscue": true,
 *   "enableProsodyAssessment": false
 * }
 * 
 * Response: 200 OK
 * {
 *   "accuracyScore": 85,
 *   "fluencyScore": 78,
 *   "completenessScore": 92,
 *   "pronunciationScore": 85,
 *   "prosodyScore": 80,
 *   "words": [...],
 *   "duration": 2500,
 *   "syllableCount": 3
 * }
 * 
 * Response: 400 Bad Request - Invalid input
 * Response: 401 Unauthorized - Authentication required
 * Response: 500 Internal Server Error - Service error
 */
router.post('/assess', requireAuth, async (c) => {
  try {
    const body = await c.req.json() as Partial<PronunciationAssessmentRequest>
    
    // Validate required fields
    const validation = getAzureSpeechService().validateRequest(body as PronunciationAssessmentRequest)
    if (!validation.valid) {
      return c.json(
        { error: 'Validation failed', details: validation.error },
        400
      )
    }

    // Extract request data with defaults
    const request: PronunciationAssessmentRequest = {
      referenceText: body.referenceText!,
      audioData: body.audioData!,
      language: body.language || 'en-US',
      granularity: body.granularity || 'Phoneme',
      enableMiscue: body.enableMiscue ?? true,
      enableProsodyAssessment: body.enableProsodyAssessment ?? false
    }

    // Audio processing options
    const audioOptions: AudioProcessingOptions = {
      audioFormat: 'audio/wav',
      sampleRate: 16000,
      maxDurationSeconds: 30,
      minDurationSeconds: 0.5
    }

    // Perform pronunciation assessment
    const result = await getAzureSpeechService().evaluatePronunciation(request, audioOptions)
    
    // Log successful assessment (without sensitive data)
    const user = c.get('user')
    console.log(`Pronunciation assessment completed for user ${user?.username}: accuracy=${result.accuracyScore}, duration=${result.duration}ms`)
    
    return c.json({
      success: true,
      result,
      metadata: {
        referenceText: request.referenceText,
        language: request.language,
        granularity: request.granularity,
        assessedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Pronunciation assessment error:', error instanceof Error ? error.message : 'Unknown error')
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('not configured')) {
        return c.json(
          { error: 'Service not available', details: error.message },
          503
        )
      }
      
      if (error.message.includes('Invalid audio data')) {
        return c.json(
          { error: 'Invalid audio data', details: 'Audio data must be valid base64-encoded audio file' },
          400
        )
      }
      
      if (error.message.includes('timeout')) {
        return c.json(
          { error: 'Assessment timeout', details: 'The pronunciation assessment took too long to complete' },
          408
        )
      }
    }
    
    return c.json(
      { 
        error: 'Pronunciation assessment failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      500
    )
  }
})

/**
 * POST /azure-speech/assess/multipart
 * Evaluate pronunciation from multipart form data
 * 
 * Form fields:
 * - referenceText: string (required)
 * - language: string (optional, default: 'en-US')
 * - granularity: string (optional, default: 'Phoneme')
 * - enableMiscue: boolean (optional, default: true)
 * - enableProsodyAssessment: boolean (optional, default: false)
 * - audio: file (required, audio file)
 * 
 * Response: Same as /assess endpoint
 */
router.post('/assess/multipart', requireAuth, async (c) => {
  try {
    const formData = await c.req.formData()
    
    // Extract form fields
    const referenceText = formData.get('referenceText') as string
    const audioFile = formData.get('audio') as File
    const language = (formData.get('language') as string) || 'en-US'
    const granularity = (formData.get('granularity') as string) || 'Phoneme'
    const enableMiscue = formData.get('enableMiscue') !== 'false'
    const enableProsodyAssessment = formData.get('enableProsodyAssessment') === 'true'
    
    // Validate required fields
    if (!referenceText) {
      return c.json(
        { error: 'Validation failed', details: 'referenceText field is required' },
        400
      )
    }
    
    if (!audioFile) {
      return c.json(
        { error: 'Validation failed', details: 'audio file is required' },
        400
      )
    }
    
    // Validate file type and size
    const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/webm']
    if (!allowedTypes.includes(audioFile.type)) {
      return c.json(
        { error: 'Invalid file type', details: `Supported formats: ${allowedTypes.join(', ')}` },
        400
      )
    }
    
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (audioFile.size > maxSize) {
      return c.json(
        { error: 'File too large', details: 'Maximum file size is 10MB' },
        400
      )
    }
    
    // Convert file to base64
    const arrayBuffer = await audioFile.arrayBuffer()
    const base64Audio = Buffer.from(arrayBuffer).toString('base64')
    
    // Create assessment request
    const request: PronunciationAssessmentRequest = {
      referenceText,
      audioData: `data:${audioFile.type};base64,${base64Audio}`,
      language,
      granularity: granularity as any,
      enableMiscue,
      enableProsodyAssessment
    }
    
    // Validate request
    const validation = getAzureSpeechService().validateRequest(request)
    if (!validation.valid) {
      return c.json(
        { error: 'Validation failed', details: validation.error },
        400
      )
    }
    
    // Perform pronunciation assessment
    const result = await getAzureSpeechService().evaluatePronunciation(request)
    
    // Log successful assessment
    const user = c.get('user')
    console.log(`Multipart pronunciation assessment completed for user ${user?.username}: accuracy=${result.accuracyScore}, duration=${result.duration}ms`)
    
    return c.json({
      success: true,
      result,
      metadata: {
        referenceText: request.referenceText,
        language: request.language,
        granularity: request.granularity,
        fileName: audioFile.name,
        fileSize: audioFile.size,
        assessedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Multipart pronunciation assessment error:', error instanceof Error ? error.message : 'Unknown error')
    
    return c.json(
      { 
        error: 'Pronunciation assessment failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      500
    )
  }
})

/**
 * GET /azure-speech/status
 * Get Azure Speech service status
 * 
 * Response: 200 OK
 * {
 *   "configured": true,
 *   "region": "eastus",
 *   "errors": null
 * }
 * 
 * Response: 503 Service Unavailable - Service not configured
 */
router.get('/status', async (c) => {
  try {
    const service = getAzureSpeechService()
    const status = service.getConfigStatus()
    
    if (!status.configured) {
      return c.json(status, 503)
    }
    
    return c.json(status)
  } catch (error) {
    console.error('Azure Speech status check error:', error instanceof Error ? error.message : 'Unknown error')
    
    return c.json(
      { 
        configured: false, 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      },
      503
    )
  }
})

/**
 * GET /azure-speech/health
 * Health check endpoint for monitoring
 * Does not require authentication
 */
router.get('/health', async (c) => {
  try {
    const azureConfig = getAzureConfig()
    
    const isConfigured = !!(azureConfig.speechKey && azureConfig.speechRegion)
    
    return c.json({
      service: 'azure-speech',
      status: isConfigured ? 'healthy' : 'misconfigured',
      timestamp: new Date().toISOString(),
      configuration: {
        speechConfigured: isConfigured,
        region: azureConfig.speechRegion || 'not-configured'
      }
    })
  } catch (error) {
    return c.json({
      service: 'azure-speech',
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

export default router