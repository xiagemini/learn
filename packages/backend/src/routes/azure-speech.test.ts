import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import azureSpeechRouter from './azure-speech.js'
import { AzureSpeechService } from '../services/azure-speech.js'
import type { PronunciationAssessmentResult } from '../types/azure-speech.js'

// Mock the Azure Speech Service
vi.mock('../services/azure-speech.js', () => ({
  AzureSpeechService: vi.fn().mockImplementation(() => ({
    validateRequest: vi.fn(),
    evaluatePronunciation: vi.fn(),
    getConfigStatus: vi.fn(),
    isConfigured: vi.fn()
  }))
}))

// Mock the database configuration
vi.mock('../db.js', () => ({
  getAzureConfig: vi.fn(() => ({
    speechKey: 'test-key',
    speechRegion: 'eastus',
    blobStorage: {
      account: 'test-account',
      key: 'test-key',
      container: 'test-container'
    }
  }))
}))

describe('Azure Speech Routes', () => {
  let app: Hono
  let mockService: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create mock service instance
    mockService = new AzureSpeechService({
      speechKey: 'test-key',
      speechRegion: 'eastus'
    })
    
    // Create Hono app and mount routes
    app = new Hono()
    app.route('/azure-speech', azureSpeechRouter)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /azure-speech/assess', () => {
    const validRequest = {
      referenceText: 'Hello world',
      audioData: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUant7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
      language: 'en-US'
    }

    const mockResult: PronunciationAssessmentResult = {
      accuracyScore: 85,
      fluencyScore: 78,
      completenessScore: 92,
      pronunciationScore: 85,
      words: [
        {
          word: 'Hello',
          accuracyScore: 90,
          errorType: 'None',
          phonemes: [
            {
              phoneme: 'h',
              accuracyScore: 95,
              errorType: 'None'
            }
          ]
        },
        {
          word: 'world',
          accuracyScore: 80,
          errorType: 'None',
          phonemes: [
            {
              phoneme: 'w',
              accuracyScore: 85,
              errorType: 'None'
            }
          ]
        }
      ],
      duration: 2500
    }

    it('should return 401 without authentication', async () => {
      const response = await app.request('/azure-speech/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validRequest)
      })

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('should successfully assess pronunciation with valid request', async () => {
      mockService.validateRequest.mockReturnValue({ valid: true })
      mockService.evaluatePronunciation.mockResolvedValue(mockResult)

      const response = await app.request('/azure-speech/assess', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(validRequest)
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.result.accuracyScore).toBe(85)
      expect(body.result.words).toHaveLength(2)
      expect(body.metadata.referenceText).toBe('Hello world')
      expect(body.metadata.language).toBe('en-US')
    })

    it('should return 400 for invalid request', async () => {
      mockService.validateRequest.mockReturnValue({ 
        valid: false, 
        error: 'Reference text is required' 
      })

      const response = await app.request('/azure-speech/assess', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({ ...validRequest, referenceText: '' })
      })

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Validation failed')
      expect(body.details).toBe('Reference text is required')
    })

    it('should handle service configuration errors', async () => {
      mockService.validateRequest.mockReturnValue({ valid: true })
      mockService.evaluatePronunciation.mockRejectedValue(
        new Error('Azure Speech service not configured')
      )

      const response = await app.request('/azure-speech/assess', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(validRequest)
      })

      expect(response.status).toBe(503)
      const body = await response.json()
      expect(body.error).toBe('Service not available')
    })

    it('should handle invalid audio data errors', async () => {
      mockService.validateRequest.mockReturnValue({ valid: true })
      mockService.evaluatePronunciation.mockRejectedValue(
        new Error('Invalid audio data')
      )

      const response = await app.request('/azure-speech/assess', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(validRequest)
      })

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid audio data')
    })

    it('should handle timeout errors', async () => {
      mockService.validateRequest.mockReturnValue({ valid: true })
      mockService.evaluatePronunciation.mockRejectedValue(
        new Error('Pronunciation assessment timeout')
      )

      const response = await app.request('/azure-speech/assess', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(validRequest)
      })

      expect(response.status).toBe(408)
      const body = await response.json()
      expect(body.error).toBe('Assessment timeout')
    })

    it('should use default values for optional fields', async () => {
      mockService.validateRequest.mockReturnValue({ valid: true })
      mockService.evaluatePronunciation.mockResolvedValue(mockResult)

      const requestWithDefaults = {
        referenceText: 'Hello world',
        audioData: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUant7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
        language: 'en-US'
      }

      const response = await app.request('/azure-speech/assess', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(requestWithDefaults)
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.metadata.language).toBe('en-US')
      expect(body.metadata.granularity).toBe('Phoneme')
    })
  })

  describe('POST /azure-speech/assess/multipart', () => {
    it('should return 401 without authentication', async () => {
      const formData = new FormData()
      formData.append('referenceText', 'Hello world')

      const response = await app.request('/azure-speech/assess/multipart', {
        method: 'POST',
        body: formData
      })

      expect(response.status).toBe(401)
    })

    it('should successfully assess pronunciation with multipart data', async () => {
      mockService.validateRequest.mockReturnValue({ valid: true })
      mockService.evaluatePronunciation.mockResolvedValue({
        accuracyScore: 85,
        fluencyScore: 78,
        completenessScore: 92,
        pronunciationScore: 85,
        words: [],
        duration: 2500
      })

      // Create mock audio file
      const audioData = new Uint8Array([1, 2, 3, 4, 5])
      const audioFile = new File([audioData], 'test.wav', { type: 'audio/wav' })

      const formData = new FormData()
      formData.append('referenceText', 'Hello world')
      formData.append('audio', audioFile)

      const response = await app.request('/azure-speech/assess/multipart', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-token' },
        body: formData
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.result.accuracyScore).toBe(85)
      expect(body.metadata.fileName).toBe('test.wav')
      expect(body.metadata.fileSize).toBe(5)
    })

    it('should return 400 when reference text is missing', async () => {
      const formData = new FormData()
      formData.append('audio', new File([''], 'test.wav', { type: 'audio/wav' }))

      const response = await app.request('/azure-speech/assess/multipart', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-token' },
        body: formData
      })

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Validation failed')
      expect(body.details).toBe('referenceText field is required')
    })

    it('should return 400 when audio file is missing', async () => {
      const formData = new FormData()
      formData.append('referenceText', 'Hello world')

      const response = await app.request('/azure-speech/assess/multipart', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-token' },
        body: formData
      })

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Validation failed')
      expect(body.details).toBe('audio file is required')
    })

    it('should return 400 for invalid file type', async () => {
      const formData = new FormData()
      formData.append('referenceText', 'Hello world')
      formData.append('audio', new File([''], 'test.txt', { type: 'text/plain' }))

      const response = await app.request('/azure-speech/assess/multipart', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-token' },
        body: formData
      })

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid file type')
      expect(body.details).toContain('Supported formats')
    })

    it('should return 400 for file too large', async () => {
      const largeData = new Uint8Array(11 * 1024 * 1024) // 11MB
      const largeFile = new File([largeData], 'large.wav', { type: 'audio/wav' })

      const formData = new FormData()
      formData.append('referenceText', 'Hello world')
      formData.append('audio', largeFile)

      const response = await app.request('/azure-speech/assess/multipart', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-token' },
        body: formData
      })

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('File too large')
      expect(body.details).toBe('Maximum file size is 10MB')
    })

    it('should use default values for optional form fields', async () => {
      mockService.validateRequest.mockReturnValue({ valid: true })
      mockService.evaluatePronunciation.mockResolvedValue({
        accuracyScore: 85,
        words: [],
        duration: 2500
      })

      const formData = new FormData()
      formData.append('referenceText', 'Hello world')
      formData.append('audio', new File([new Uint8Array([1, 2, 3])], 'test.wav', { type: 'audio/wav' }))

      const response = await app.request('/azure-speech/assess/multipart', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-token' },
        body: formData
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.metadata.language).toBe('en-US')
      expect(body.metadata.granularity).toBe('Phoneme')
    })
  })

  describe('GET /azure-speech/status', () => {
    it('should return service status when configured', async () => {
      mockService.getConfigStatus.mockReturnValue({
        configured: true,
        region: 'eastus'
      })

      const response = await app.request('/azure-speech/status')

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.configured).toBe(true)
      expect(body.region).toBe('eastus')
      expect(body.errors).toBeUndefined()
    })

    it('should return 503 when not configured', async () => {
      mockService.getConfigStatus.mockReturnValue({
        configured: false,
        errors: ['Speech key not configured']
      })

      const response = await app.request('/azure-speech/status')

      expect(response.status).toBe(503)
      const body = await response.json()
      expect(body.configured).toBe(false)
      expect(body.errors).toContain('Speech key not configured')
    })

    it('should handle service errors', async () => {
      mockService.getConfigStatus.mockImplementation(() => {
        throw new Error('Service unavailable')
      })

      const response = await app.request('/azure-speech/status')

      expect(response.status).toBe(503)
      const body = await response.json()
      expect(body.configured).toBe(false)
      expect(body.errors).toContain('Service unavailable')
    })
  })

  describe('GET /azure-speech/health', () => {
    it('should return healthy status when configured', async () => {
      const response = await app.request('/azure-speech/health')

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.service).toBe('azure-speech')
      expect(body.status).toBe('healthy')
      expect(body.configuration.speechConfigured).toBe(true)
      expect(body.configuration.region).toBe('eastus')
    })

    it('should return misconfigured status when not configured', async () => {
      // Mock the config to return missing values
      vi.doMock('../../db.js', () => ({
        getAzureConfig: () => ({
          speechKey: null,
          speechRegion: null,
          blobStorage: {}
        })
      }))

      const response = await app.request('/azure-speech/health')

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.status).toBe('misconfigured')
      expect(body.configuration.speechConfigured).toBe(false)
      expect(body.configuration.region).toBe('not-configured')
    })
  })
})