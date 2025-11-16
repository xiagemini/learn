import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AzureSpeechService } from './azure-speech.js'
import type { 
  PronunciationAssessmentRequest, 
  PronunciationAssessmentResult,
  AssessmentConfig
} from '../types/azure-speech.js'

// Mock the Azure Speech SDK
vi.mock('microsoft-cognitiveservices-speech-sdk', () => ({
  default: {
    SpeechConfig: {
      fromSubscription: vi.fn()
    },
    PronunciationAssessmentConfig: vi.fn().mockImplementation((referenceText, gradingSystem, granularity, enableMiscue) => ({
      applyTo: vi.fn(),
      enableProsodyAssessment: vi.fn()
    })),
    AudioConfig: {
      fromWavFileInput: vi.fn()
    },
    SpeechRecognizer: vi.fn().mockImplementation(() => ({
      recognizeOnceAsync: vi.fn(),
      close: vi.fn()
    })),
    ResultReason: {
      RecognizedSpeech: 'RecognizedSpeech'
    },
    PropertyId: {
      SpeechServiceResponse_JsonResult: 'SpeechServiceResponse_JsonResult',
      SpeechServiceConnection_EndSilenceTimeoutMs: 'SpeechServiceConnection_EndSilenceTimeoutMs'
    }
  }
}))

// Import the mocked module
import * as sdk from 'microsoft-cognitiveservices-speech-sdk'

describe('AzureSpeechService', () => {
  let service: AzureSpeechService
  let mockConfig: AssessmentConfig

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockConfig = {
      speechKey: 'test-key',
      speechRegion: 'eastus',
      maxRetries: 2,
      retryDelayMs: 100,
      timeoutMs: 5000
    }

    // Mock successful SpeechConfig creation
    const mockSpeechConfig = {
      speechRecognitionLanguage: '',
      setProperty: vi.fn()
    }
    vi.mocked(sdk.SpeechConfig.fromSubscription).mockReturnValue(mockSpeechConfig as any)
    
    service = new AzureSpeechService(mockConfig)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Constructor', () => {
    it('should create service with valid config', () => {
      expect(service).toBeInstanceOf(AzureSpeechService)
    })

    it('should use default config values', () => {
      const minimalConfig = {
        speechKey: 'test-key',
        speechRegion: 'eastus'
      }
      const serviceWithDefaults = new AzureSpeechService(minimalConfig)
      expect(serviceWithDefaults).toBeInstanceOf(AzureSpeechService)
    })

    it('should throw error with invalid config', () => {
      vi.mocked(sdk.SpeechConfig.fromSubscription).mockImplementationOnce(() => {
        throw new Error('Invalid config')
      })

      expect(() => {
        new AzureSpeechService(mockConfig)
      }).toThrow('Azure Speech configuration failed')
    })
  })

  describe('validateRequest', () => {
    it('should validate correct request', () => {
      const request: PronunciationAssessmentRequest = {
        referenceText: 'Hello world',
        audioData: 'base64-audio-data',
        language: 'en-US'
      }

      const result = service.validateRequest(request)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject request with empty reference text', () => {
      const request: PronunciationAssessmentRequest = {
        referenceText: '',
        audioData: 'base64-audio-data',
        language: 'en-US'
      }

      const result = service.validateRequest(request)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Reference text is required')
    })

    it('should reject request with empty audio data', () => {
      const request: PronunciationAssessmentRequest = {
        referenceText: 'Hello world',
        audioData: '',
        language: 'en-US'
      }

      const result = service.validateRequest(request)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Audio data is required')
    })

    it('should reject request with empty language', () => {
      const request: PronunciationAssessmentRequest = {
        referenceText: 'Hello world',
        audioData: 'base64-audio-data',
        language: ''
      }

      const result = service.validateRequest(request)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Language is required')
    })

    it('should reject request with too long reference text', () => {
      const longText = 'a'.repeat(501)
      const request: PronunciationAssessmentRequest = {
        referenceText: longText,
        audioData: 'base64-audio-data',
        language: 'en-US'
      }

      const result = service.validateRequest(request)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Reference text too long (max 500 characters)')
    })
  })

  describe('isConfigured', () => {
    it('should return true when properly configured', () => {
      expect(service.isConfigured()).toBe(true)
    })
  })

  describe('getConfigStatus', () => {
    it('should return configured status', () => {
      const status = service.getConfigStatus()
      expect(status.configured).toBe(true)
      expect(status.region).toBe('eastus')
      expect(status.errors).toBeUndefined()
    })
  })

  describe('evaluatePronunciation', () => {
    const mockRequest: PronunciationAssessmentRequest = {
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
            },
            {
              phoneme: 'ə',
              accuracyScore: 88,
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
            },
            {
              phoneme: 'ɜːr',
              accuracyScore: 78,
              errorType: 'None'
            }
          ]
        }
      ],
      duration: 2500
    }

    it('should successfully evaluate pronunciation', async () => {
      // Mock successful recognition
      const mockRecognizer = {
        recognizeOnceAsync: vi.fn().mockImplementation((callback) => {
          const mockSpeechResult = {
            reason: sdk.ResultReason.RecognizedSpeech,
            duration: 2500,
            properties: {
              getProperty: vi.fn().mockReturnValue(JSON.stringify({
                PronunciationAssessment: {
                  AccuracyScore: 85,
                  FluencyScore: 78,
                  CompletenessScore: 92,
                  PronunciationScore: 85
                },
                NBest: [{
                  Words: mockResult.words.map(word => ({
                    Word: word.word,
                    PronunciationAssessment: {
                      AccuracyScore: word.accuracyScore,
                      ErrorType: word.errorType
                    },
                    Phonemes: word.phonemes?.map(phoneme => ({
                      Phoneme: phoneme.phoneme,
                      PronunciationAssessment: {
                        AccuracyScore: phoneme.accuracyScore,
                        ErrorType: phoneme.errorType
                      }
                    }))
                  }))
                }]
              }))
            }
          }
          callback(mockSpeechResult)
        }),
        close: vi.fn()
      }

      vi.mocked(sdk.SpeechRecognizer).mockImplementationOnce(() => mockRecognizer as any)

      const result = await service.evaluatePronunciation(mockRequest)

      expect(result.accuracyScore).toBe(85)
      expect(result.fluencyScore).toBe(78)
      expect(result.words).toHaveLength(2)
      expect(result.words[0].word).toBe('Hello')
      expect(result.words[0].accuracyScore).toBe(90)
    })

    it('should handle recognition failure', async () => {
      const mockRecognizer = {
        recognizeOnceAsync: vi.fn().mockImplementation((callback, errorCallback) => {
          const mockError = new Error('Recognition failed')
          errorCallback(mockError)
        }),
        close: vi.fn()
      }

      vi.mocked(sdk.SpeechRecognizer).mockImplementationOnce(() => mockRecognizer as any)

      await expect(service.evaluatePronunciation(mockRequest)).rejects.toThrow('Speech recognition error')
    })

    it('should handle timeout', async () => {
      const mockRecognizer = {
        recognizeOnceAsync: vi.fn().mockImplementation(() => {
          // Don't call callback to simulate timeout
        }),
        close: vi.fn()
      }

      vi.mocked(sdk.SpeechRecognizer).mockImplementationOnce(() => mockRecognizer as any)

      await expect(service.evaluatePronunciation(mockRequest)).rejects.toThrow('Pronunciation assessment timeout')
    })

    it('should retry on failure', async () => {
      let attemptCount = 0
      const mockRecognizer = {
        recognizeOnceAsync: vi.fn().mockImplementation((callback, errorCallback) => {
          attemptCount++
          if (attemptCount < 2) {
            errorCallback(new Error('Temporary failure'))
          } else {
            const mockSpeechResult = {
              reason: sdk.ResultReason.RecognizedSpeech,
              duration: 2500,
              properties: {
                getProperty: vi.fn().mockReturnValue(JSON.stringify({
                  PronunciationAssessment: {
                    AccuracyScore: 85,
                    FluencyScore: 78,
                    CompletenessScore: 92,
                    PronunciationScore: 85
                  },
                  NBest: [{
                    Words: mockResult.words.map(word => ({
                      Word: word.word,
                      PronunciationAssessment: {
                        AccuracyScore: word.accuracyScore,
                        ErrorType: word.errorType
                      }
                    }))
                  }]
                }))
              }
            }
            callback(mockSpeechResult)
          }
        }),
        close: vi.fn()
      }

      vi.mocked(sdk.SpeechRecognizer).mockImplementation(() => mockRecognizer as any)

      const result = await service.evaluatePronunciation(mockRequest)

      expect(result.accuracyScore).toBe(85)
      expect(attemptCount).toBe(2)
    })

    it('should fail after max retries', async () => {
      const mockRecognizer = {
        recognizeOnceAsync: vi.fn().mockImplementation((callback, errorCallback) => {
          errorCallback(new Error('Persistent failure'))
        }),
        close: vi.fn()
      }

      vi.mocked(sdk.SpeechRecognizer).mockImplementation(() => mockRecognizer as any)

      await expect(service.evaluatePronunciation(mockRequest)).rejects.toThrow('Pronunciation assessment failed after all retries')
    })
  })

  describe('base64ToBuffer', () => {
    it('should convert base64 to buffer', () => {
      const base64 = 'SGVsbG8gd29ybGQ='
      const buffer = (service as any).base64ToBuffer(base64)
      expect(buffer.toString()).toBe('Hello world')
    })

    it('should handle data URL prefix', () => {
      const dataUrl = 'data:audio/wav;base64,SGVsbG8gd29ybGQ='
      const buffer = (service as any).base64ToBuffer(dataUrl)
      expect(buffer.toString()).toBe('Hello world')
    })

    it('should throw error for invalid base64', () => {
      const invalidBase64 = 'invalid-base64!'
      expect(() => {
        (service as any).base64ToBuffer(invalidBase64)
      }).toThrow('Invalid audio data format')
    })
  })

  describe('sanitizeError', () => {
    it('should redact sensitive data from error strings', () => {
      const sensitiveError = 'Authentication failed with key abc123def456ghi789jkl012mno345pqr678stu890vwx123yz'
      const sanitized = (service as any).sanitizeError(sensitiveError)
      expect(sanitized).not.toContain('abc123def456ghi789jkl012mno345pqr678stu890vwx123yz')
      expect(sanitized).toContain('[REDACTED]')
    })

    it('should redact key patterns', () => {
      const keyError = 'Invalid key: my-secret-key-here'
      const sanitized = (service as any).sanitizeError(keyError)
      expect(sanitized).not.toContain('my-secret-key-here')
      expect(sanitized).toContain('key=[REDACTED]')
    })

    it('should handle Error objects', () => {
      const error = new Error('Authentication failed with key abc123def456')
      const sanitized = (service as any).sanitizeError(error)
      expect(sanitized).not.toContain('abc123def456')
      expect(sanitized).toContain('[REDACTED]')
    })

    it('should handle non-string, non-error objects', () => {
      const obj = { some: 'object' }
      const sanitized = (service as any).sanitizeError(obj)
      expect(sanitized).toBe('[Error object]')
    })
  })
})