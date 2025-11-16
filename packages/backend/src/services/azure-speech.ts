import * as sdk from 'microsoft-cognitiveservices-speech-sdk'
import type { 
  PronunciationAssessmentRequest, 
  PronunciationAssessmentResult, 
  PronunciationAssessmentError,
  AssessmentConfig,
  AudioProcessingOptions
} from '../types/azure-speech.js'

/**
 * Azure Speech Pronunciation Assessment Service
 * 
 * Provides integration with Azure Cognitive Services Speech SDK
 * for pronunciation assessment functionality.
 */
export class AzureSpeechService {
  private config: AssessmentConfig
  private speechConfig: sdk.SpeechConfig | null = null

  constructor(config: AssessmentConfig) {
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      timeoutMs: 30000,
      ...config
    }
    
    this.initializeSpeechConfig()
  }

  /**
   * Initialize Azure Speech configuration
   */
  private initializeSpeechConfig(): void {
    try {
      this.speechConfig = sdk.SpeechConfig.fromSubscription(
        this.config.speechKey,
        this.config.speechRegion
      )
      
      // Set speech recognition properties
      this.speechConfig.speechRecognitionLanguage = 'en-US'
      this.speechConfig.setProperty(
        sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, 
        '3000'
      )
    } catch (error) {
      console.error('Failed to initialize Azure Speech config:', error instanceof Error ? error.message : 'Unknown error')
      throw new Error('Azure Speech configuration failed')
    }
  }

  /**
   * Evaluate pronunciation from audio data
   */
  async evaluatePronunciation(
    request: PronunciationAssessmentRequest,
    audioOptions?: AudioProcessingOptions
  ): Promise<PronunciationAssessmentResult> {
    if (!this.speechConfig) {
      throw new Error('Speech configuration not initialized')
    }

    const maxRetries = this.config.maxRetries || 3
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.attemptEvaluation(request, audioOptions)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < maxRetries) {
          const delay = this.config.retryDelayMs! * Math.pow(2, attempt - 1)
          console.warn(`Pronunciation assessment attempt ${attempt} failed, retrying in ${delay}ms:`, 
            this.sanitizeError(lastError))
          await this.sleep(delay)
        }
      }
    }

    console.error('All pronunciation assessment attempts failed:', this.sanitizeError(lastError))
    throw lastError || new Error('Pronunciation assessment failed after all retries')
  }

  /**
   * Single attempt at pronunciation evaluation
   */
  private async attemptEvaluation(
    request: PronunciationAssessmentRequest,
    audioOptions?: AudioProcessingOptions
  ): Promise<PronunciationAssessmentResult> {
    return new Promise((resolve, reject) => {
      try {
        // Configure pronunciation assessment
        const pronunciationAssessmentConfig = new sdk.PronunciationAssessmentConfig(
          request.referenceText,
          sdk.PronunciationAssessmentGradingSystem.HundredMark,
          sdk.PronunciationAssessmentGranularity.Phoneme,
          request.enableMiscue || false
        )

        if (request.enableProsodyAssessment) {
          pronunciationAssessmentConfig.enableProsodyAssessment()
        }

        // Configure audio format
        const audioConfig = sdk.AudioConfig.fromWavFileInput(
          this.base64ToBuffer(request.audioData)
        )

        // Create speech recognizer
        const recognizer = new sdk.SpeechRecognizer(
          this.speechConfig!,
          audioConfig
        )

        // Apply pronunciation assessment configuration
        pronunciationAssessmentConfig.applyTo(recognizer)

        // Set up timeout
        const timeout = setTimeout(() => {
          recognizer.close()
          reject(new Error('Pronunciation assessment timeout'))
        }, this.config.timeoutMs)

        // Handle recognition result
        recognizer.recognizeOnceAsync(
          (result) => {
            clearTimeout(timeout)
            recognizer.close()

            if (result.reason === sdk.ResultReason.RecognizedSpeech) {
              const assessmentResult = this.parseAssessmentResult(result)
              resolve(assessmentResult)
            } else {
              const error = new Error(`Speech recognition failed: ${result.reason}`)
              if (result.errorDetails) {
                console.error('Azure Speech error details:', this.sanitizeError(result.errorDetails))
              }
              reject(error)
            }
          },
          (error) => {
            clearTimeout(timeout)
            recognizer.close()
            console.error('Azure Speech recognition error:', this.sanitizeError(error))
            reject(new Error(`Speech recognition error: ${error}`))
          }
        )
      } catch (error) {
        reject(new Error(`Failed to setup pronunciation assessment: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })
  }

  /**
   * Parse Azure Speech assessment result
   */
  private parseAssessmentResult(result: sdk.SpeechRecognitionResult): PronunciationAssessmentResult {
    try {
      // Get pronunciation assessment result from JSON property
      const assessmentJson = result.properties.getProperty(
        sdk.PropertyId.SpeechServiceResponse_JsonResult
      )
      
      if (!assessmentJson) {
        throw new Error('No assessment result found in response')
      }

      const assessmentData = JSON.parse(assessmentJson)
      const pronunciationAssessment = assessmentData.PronunciationAssessment

      if (!pronunciationAssessment) {
        throw new Error('Invalid assessment result format')
      }

      // Extract word-level results
      const words: any[] = assessmentData.NBest?.[0]?.Words || []
      
      return {
        accuracyScore: Math.round(pronunciationAssessment.AccuracyScore || 0),
        fluencyScore: pronunciationAssessment.FluencyScore ? Math.round(pronunciationAssessment.FluencyScore) : undefined,
        completenessScore: pronunciationAssessment.CompletenessScore ? Math.round(pronunciationAssessment.CompletenessScore) : undefined,
        pronunciationScore: pronunciationAssessment.PronunciationScore ? Math.round(pronunciationAssessment.PronunciationScore) : undefined,
        prosodyScore: pronunciationAssessment.ProsodyScore ? Math.round(pronunciationAssessment.ProsodyScore) : undefined,
        words: words.map(this.parseWordResult),
        duration: result.duration || 0,
        syllableCount: assessmentData.NBest?.[0]?.SyllableCount
      }
    } catch (error) {
      console.error('Failed to parse assessment result:', this.sanitizeError(error))
      throw new Error('Failed to parse pronunciation assessment result')
    }
  }

  /**
   * Parse individual word assessment result
   */
  private parseWordResult(word: any): any {
    return {
      word: word.Word || word.Lexical || '',
      accuracyScore: Math.round(word.PronunciationAssessment?.AccuracyScore || 0),
      errorType: word.PronunciationAssessment?.ErrorType || 'None',
      phonemes: word.Phonemes?.map((phoneme: any) => ({
        phoneme: phoneme.Phoneme || '',
        accuracyScore: Math.round(phoneme.PronunciationAssessment?.AccuracyScore || 0),
        errorType: phoneme.PronunciationAssessment?.ErrorType || 'None'
      })) || [],
      syllables: word.Syllables?.map((syllable: any) => ({
        syllable: syllable.Syllable || '',
        accuracyScore: Math.round(syllable.PronunciationAssessment?.AccuracyScore || 0),
        errorType: syllable.PronunciationAssessment?.ErrorType || 'None'
      })) || []
    }
  }

  /**
   * Convert base64 string to Buffer
   */
  private base64ToBuffer(base64: string): Buffer {
    try {
      // Remove data URL prefix if present
      const base64Data = base64.replace(/^data:audio\/[^;]+;base64,/, '')
      return Buffer.from(base64Data, 'base64')
    } catch (error) {
      throw new Error('Invalid audio data format')
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Sanitize error messages for logging (remove sensitive data)
   */
  private sanitizeError(error: any): string {
    if (typeof error === 'string') {
      return error.replace(/[A-Za-z0-9+/]{40,}/g, '[REDACTED]').replace(/key[=:]\s*[^\s]+/gi, 'key=[REDACTED]')
    }
    
    if (error instanceof Error) {
      return error.message.replace(/[A-Za-z0-9+/]{40,}/g, '[REDACTED]').replace(/key[=:]\s*[^\s]+/gi, 'key=[REDACTED]')
    }
    
    return '[Error object]'
  }

  /**
   * Validate pronunciation assessment request
   */
  validateRequest(request: PronunciationAssessmentRequest): { valid: boolean; error?: string } {
    if (!request.referenceText || request.referenceText.trim().length === 0) {
      return { valid: false, error: 'Reference text is required' }
    }

    if (!request.audioData || request.audioData.trim().length === 0) {
      return { valid: false, error: 'Audio data is required' }
    }

    if (!request.language || request.language.trim().length === 0) {
      return { valid: false, error: 'Language is required' }
    }

    if (request.referenceText.length > 500) {
      return { valid: false, error: 'Reference text too long (max 500 characters)' }
    }

    return { valid: true }
  }

  /**
   * Check if Azure Speech service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.speechKey && this.config.speechRegion && this.speechConfig)
  }

  /**
   * Get service configuration status (without exposing sensitive data)
   */
  getConfigStatus(): { configured: boolean; region?: string; errors?: string[] } {
    const errors: string[] = []

    if (!this.config.speechKey) {
      errors.push('Speech key not configured')
    }

    if (!this.config.speechRegion) {
      errors.push('Speech region not configured')
    }

    if (!this.speechConfig) {
      errors.push('Speech configuration initialization failed')
    }

    return {
      configured: errors.length === 0,
      region: this.config.speechRegion,
      errors: errors.length > 0 ? errors : undefined
    }
  }
}