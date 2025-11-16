/**
 * Azure Speech Pronunciation Assessment API Types
 */

export interface PronunciationAssessmentRequest {
  /** Reference text that the user should pronounce */
  referenceText: string
  /** Audio data in base64 format */
  audioData: string
  /** Language code (e.g., 'en-US') */
  language: string
  /** Assessment granularity */
  granularity?: 'Phoneme' | 'Word' | 'FullText'
  /** Enable pronunciation score */
  enableMiscue?: boolean
  /** Enable prosody assessment */
  enableProsodyAssessment?: boolean
}

export interface PronunciationAssessmentResult {
  /** Overall pronunciation score (0-100) */
  accuracyScore: number
  /** Fluency score (0-100) */
  fluencyScore?: number
  /** Completeness score (0-100) */
  completenessScore?: number
  /** Pronunciation score (0-100) */
  pronunciationScore?: number
  /** Overall prosody score (0-100) */
  prosodyScore?: number
  /** Word-level assessment results */
  words: WordAssessmentResult[]
  /** Assessment duration in milliseconds */
  duration: number
  /** Number of syllables in the reference text */
  syllableCount?: number
}

export interface WordAssessmentResult {
  /** The word text */
  word: string
  /** Accuracy score for this word (0-100) */
  accuracyScore: number
  /** Error type if any */
  errorType?: 'None' | 'Mispronunciation' | 'Omission' | 'Insertion'
  /** Phoneme-level results */
  phonemes?: PhonemeAssessmentResult[]
  /** Syllable-level results */
  syllables?: SyllableAssessmentResult[]
}

export interface PhonemeAssessmentResult {
  /** The phoneme symbol */
  phoneme: string
  /** Accuracy score for this phoneme (0-100) */
  accuracyScore: number
  /** Error type if any */
  errorType?: 'None' | 'Mispronunciation' | 'Omission' | 'Insertion'
}

export interface SyllableAssessmentResult {
  /** The syllable text */
  syllable: string
  /** Accuracy score for this syllable (0-100) */
  accuracyScore: number
  /** Error type if any */
  errorType?: 'None' | 'Mispronunciation' | 'Omission' | 'Insertion'
}

export interface PronunciationAssessmentError {
  /** Error code */
  code: string
  /** Error message */
  message: string
  /** HTTP status code if applicable */
  statusCode?: number
  /** Additional error details */
  details?: any
}

export interface AssessmentConfig {
  /** Azure Speech service key */
  speechKey: string
  /** Azure Speech service region */
  speechRegion: string
  /** Maximum retry attempts */
  maxRetries?: number
  /** Initial retry delay in milliseconds */
  retryDelayMs?: number
  /** Request timeout in milliseconds */
  timeoutMs?: number
}

export interface AudioProcessingOptions {
  /** Audio format (default: 'audio/wav') */
  audioFormat?: string
  /** Sample rate (default: 16000) */
  sampleRate?: number
  /** Audio duration limit in seconds */
  maxDurationSeconds?: number
  /** Minimum audio duration in seconds */
  minDurationSeconds?: number
}