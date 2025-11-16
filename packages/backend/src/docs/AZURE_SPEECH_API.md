# Azure Speech Pronunciation Assessment API

This document describes the Azure Speech Pronunciation Assessment integration in the language learning platform.

## Overview

The Azure Speech Pronunciation Assessment API provides real-time evaluation of users' pronunciation accuracy, fluency, and completeness. This integration allows learners to practice pronunciation and receive immediate feedback on their performance.

## Features

- **Real-time pronunciation assessment** with detailed scoring
- **Multi-level analysis**: phoneme, word, and full-text assessment
- **Comprehensive metrics**: accuracy, fluency, completeness, and prosody scores
- **Retry and backoff strategy** for reliable operation
- **Secure credential management** via environment variables
- **Log redaction** for sensitive data protection
- **Multiple input formats**: base64 audio and multipart file uploads
- **Comprehensive error handling** and validation

## API Endpoints

### 1. POST `/azure-speech/assess`

Evaluate pronunciation from base64-encoded audio data.

**Authentication**: Required (JWT Bearer token)

**Request Body**:
```json
{
  "referenceText": "Hello world, how are you today?",
  "audioData": "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
  "language": "en-US",
  "granularity": "Phoneme",
  "enableMiscue": true,
  "enableProsodyAssessment": false
}
```

**Parameters**:
- `referenceText` (required): The text that should be pronounced
- `audioData` (required): Base64-encoded audio data (with data URL prefix)
- `language` (optional): Language code (default: "en-US")
- `granularity` (optional): Assessment granularity - "Phoneme", "Word", or "FullText" (default: "Phoneme")
- `enableMiscue` (optional): Enable miscue detection (default: true)
- `enableProsodyAssessment` (optional): Enable prosody assessment (default: false)

**Response**:
```json
{
  "success": true,
  "result": {
    "accuracyScore": 85,
    "fluencyScore": 78,
    "completenessScore": 92,
    "pronunciationScore": 85,
    "prosodyScore": 80,
    "words": [
      {
        "word": "Hello",
        "accuracyScore": 90,
        "errorType": "None",
        "phonemes": [
          {
            "phoneme": "h",
            "accuracyScore": 95,
            "errorType": "None"
          },
          {
            "phoneme": "ə",
            "accuracyScore": 88,
            "errorType": "None"
          }
        ],
        "syllables": []
      }
    ],
    "duration": 2500,
    "syllableCount": 5
  },
  "metadata": {
    "referenceText": "Hello world, how are you today?",
    "language": "en-US",
    "granularity": "Phoneme",
    "assessedAt": "2025-11-16T03:45:00.000Z"
  }
}
```

### 2. POST `/azure-speech/assess/multipart`

Evaluate pronunciation from multipart form data file upload.

**Authentication**: Required (JWT Bearer token)

**Form Fields**:
- `referenceText` (required): The text that should be pronounced
- `audio` (required): Audio file (WAV, MP3, OGG, WebM formats, max 10MB)
- `language` (optional): Language code (default: "en-US")
- `granularity` (optional): Assessment granularity (default: "Phoneme")
- `enableMiscue` (optional): Enable miscue detection (default: true)
- `enableProsodyAssessment` (optional): Enable prosody assessment (default: false)

**Response**: Same format as `/assess` endpoint, with additional file metadata.

### 3. GET `/azure-speech/status`

Check Azure Speech service configuration status.

**Authentication**: Not required

**Response**:
```json
{
  "configured": true,
  "region": "eastus",
  "errors": null
}
```

### 4. GET `/azure-speech/health`

Health check endpoint for monitoring.

**Authentication**: Not required

**Response**:
```json
{
  "service": "azure-speech",
  "status": "healthy",
  "timestamp": "2025-11-16T03:45:00.000Z",
  "configuration": {
    "speechConfigured": true,
    "region": "eastus"
  }
}
```

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Azure Speech Service Configuration
AZURE_SPEECH_KEY=your-azure-speech-service-key
AZURE_SPEECH_REGION=eastus

# Optional: Azure Blob Storage (for future use)
AZURE_BLOB_STORAGE_ACCOUNT=your-storage-account
AZURE_BLOB_STORAGE_KEY=your-storage-key
AZURE_BLOB_STORAGE_CONTAINER=your-container
```

### Azure Setup Instructions

1. **Create Azure Cognitive Services Resource**:
   - Go to Azure Portal
   - Create a new "Speech Services" resource
   - Choose your preferred region and pricing tier
   - Wait for deployment to complete

2. **Get API Keys**:
   - Navigate to your Speech Services resource
   - Go to "Keys and Endpoint" section
   - Copy the "Key 1" value to `AZURE_SPEECH_KEY`
   - Copy the "Location/Region" value to `AZURE_SPEECH_REGION`

3. **Configure Pricing Tier**:
   - **Free Tier (F0)**: 5 hours per month, suitable for development
   - **Standard Tier (S0)**: Pay-as-you-go, suitable for production
   - Consider your expected usage when choosing a tier

4. **Region Selection**:
   - Choose a region close to your users for better latency
   - Ensure the region supports pronunciation assessment features
   - Common regions: `eastus`, `westus`, `westeurope`, `southeastasia`

## Audio Requirements

### Supported Formats
- **WAV**: 16-bit PCM, mono or stereo
- **MP3**: Various bitrates supported
- **OGG**: Vorbis encoding
- **WebM**: Opus or Vorbis encoding

### Recommended Settings
- **Sample Rate**: 16kHz (optimal for speech recognition)
- **Bit Depth**: 16-bit
- **Channels**: Mono (recommended)
- **Duration**: 0.5-30 seconds per assessment
- **File Size**: Maximum 10MB

### Audio Quality Tips
- Use a quiet environment for recording
- Speak clearly at a normal pace
- Maintain consistent distance from microphone
- Avoid background noise and echo
- Use appropriate microphone placement

## Error Handling

### Common Error Responses

**400 Bad Request**:
```json
{
  "error": "Validation failed",
  "details": "Reference text is required"
}
```

**401 Unauthorized**:
```json
{
  "error": "Unauthorized"
}
```

**408 Request Timeout**:
```json
{
  "error": "Assessment timeout",
  "details": "The pronunciation assessment took too long to complete"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Pronunciation assessment failed",
  "details": "Service temporarily unavailable"
}
```

**503 Service Unavailable**:
```json
{
  "error": "Service not available",
  "details": "Azure Speech service not configured"
}
```

### Retry Strategy

The service implements automatic retry with exponential backoff:
- **Maximum Retries**: 3 attempts
- **Initial Delay**: 1 second
- **Backoff Factor**: 2x (1s, 2s, 4s)
- **Timeout**: 30 seconds per attempt

## Integration Examples

### JavaScript/TypeScript Client

```typescript
async function assessPronunciation(audioBlob: string, referenceText: string) {
  const response = await fetch('/azure-speech/assess', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      referenceText,
      audioData: audioBlob,
      language: 'en-US',
      granularity: 'Phoneme',
      enableMiscue: true,
      enableProsodyAssessment: true
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.details || 'Assessment failed')
  }

  return await response.json()
}

// Usage
try {
  const result = await assessPronunciation(audioData, "Hello world")
  console.log(`Accuracy: ${result.result.accuracyScore}%`)
  console.log(`Fluency: ${result.result.fluencyScore}%`)
} catch (error) {
  console.error('Assessment error:', error.message)
}
```

### Multipart Upload Example

```javascript
async function uploadAndAssess(audioFile, referenceText) {
  const formData = new FormData()
  formData.append('referenceText', referenceText)
  formData.append('audio', audioFile)
  formData.append('language', 'en-US')
  formData.append('granularity', 'Word')
  formData.append('enableMiscue', 'true')

  const response = await fetch('/azure-speech/assess/multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`
    },
    body: formData
  })

  return await response.json()
}
```

## Testing

### Unit Tests

Run the service tests:
```bash
cd packages/backend
npm test -- azure-speech
```

### Integration Testing

Test with real Azure credentials:
```bash
# Set real Azure credentials in .env
npm run dev
# Send test requests to the endpoints
```

### Mock Testing

The test suite includes comprehensive mocks for Azure SDK calls:
- Mock successful assessments
- Test error scenarios
- Validate retry behavior
- Test input validation

## Security Considerations

### Credential Management
- Azure Speech keys are stored in environment variables
- Keys are never logged or exposed in error messages
- Sensitive data is redacted from logs
- Use different keys for development and production

### Data Privacy
- Audio data is processed but not stored permanently
- Assessment results are stored in the database as part of user progress
- Consider data retention policies for compliance
- Implement proper access controls for user data

### Rate Limiting
- Monitor Azure usage to stay within plan limits
- Implement client-side rate limiting if needed
- Consider caching for repeated assessments
- Set up alerts for unusual usage patterns

## Monitoring and Logging

### Health Checks
- `/azure-speech/health` endpoint for monitoring
- Main `/health` endpoint includes Azure status
- Configure monitoring tools to check service availability

### Logging
- Successful assessments are logged with user context
- Errors are logged with sanitized messages
- Sensitive data (API keys, audio content) is redacted
- Performance metrics (duration, retry count) are tracked

### Metrics to Monitor
- Request success rate
- Average response time
- Error rates by type
- Azure API usage and costs
- User engagement with pronunciation features

## Troubleshooting

### Common Issues

1. **"Service not configured" Error**:
   - Check `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` environment variables
   - Verify Azure Speech Service is running and accessible

2. **Invalid Audio Data**:
   - Ensure audio is properly base64-encoded
   - Check audio format compatibility
   - Verify file size limits (10MB max)

3. **Timeout Errors**:
   - Check audio duration (should be < 30 seconds)
   - Verify network connectivity to Azure
   - Consider adjusting timeout values

4. **High Error Rates**:
   - Monitor Azure service status
   - Check API key permissions and quotas
   - Review recent changes to audio format or processing

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
LOG_LEVEL=debug
```

## Future Enhancements

### Planned Features
- **Real-time streaming assessment** for interactive practice
- **Custom pronunciation models** for specific domains
- **Advanced prosody analysis** including intonation patterns
- **Multi-language support** with language-specific models
- **Batch assessment** for multiple recordings

### Performance Optimizations
- **Audio compression** to reduce bandwidth
- **Result caching** for repeated assessments
- **Regional deployment** for better latency
- **Load balancing** for high-traffic scenarios

## Support

For issues related to:
- **Azure Speech Service**: Contact Azure Support
- **Integration Issues**: Check documentation and create GitHub issues
- **Authentication**: Verify JWT token configuration
- **Network Issues**: Check firewall and proxy settings