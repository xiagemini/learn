# Progress API Documentation

The Progress API provides endpoints to track and retrieve user learning progress across units, stories, and pronunciation practice.

## Base URL

All endpoints are prefixed with `/progress`

## Authentication

All endpoints require authentication via JWT token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Start a Unit

**POST** `/progress/units/:unitId/start`

Records when a user starts working on a unit. Sets the `startedAt` timestamp.

**Path Parameters:**
- `unitId` (string, required) - The ID of the unit to start

**Response: 200 OK**
```json
{
  "progress": {
    "id": "clh5xyz...",
    "userId": "clh5abc...",
    "unitId": "clh5def...",
    "completed": false,
    "score": 0,
    "startedAt": "2024-01-15T10:30:00.000Z",
    "completedAt": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - No valid authentication token
- `404 Not Found` - Unit does not exist

---

### 2. Update Asset Progress

**POST** `/progress/assets/:assetId/update`

Updates progress for a specific asset (video, audio, screenshot, etc.). Tracks watch time, progress percentage, and completion status.

**Path Parameters:**
- `assetId` (string, required) - The ID of the asset

**Request Body:**
```json
{
  "secondsWatched": 150,
  "progressPercentage": 50.5,
  "durationSeconds": 300,
  "completed": false
}
```

**Body Parameters:**
- `secondsWatched` (number, required) - Total seconds watched/viewed
- `progressPercentage` (number, required) - Progress percentage (0-100)
- `durationSeconds` (number, optional) - Total duration of the asset in seconds
- `completed` (boolean, optional) - Manually mark as completed (auto-set to true if progressPercentage >= 90)

**Response: 200 OK**
```json
{
  "assetProgress": {
    "id": "clh5xyz...",
    "userId": "clh5abc...",
    "unitId": "clh5def...",
    "assetId": "clh5ghi...",
    "completed": false,
    "progressPercentage": 50.5,
    "secondsWatched": 150,
    "durationSeconds": 300,
    "completedAt": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `401 Unauthorized` - No valid authentication token
- `404 Not Found` - Asset does not exist

---

### 3. Record Pronunciation Attempt

**POST** `/progress/units/:unitId/pronunciation`

Records a pronunciation practice attempt with score and optional feedback.

**Path Parameters:**
- `unitId` (string, required) - The ID of the unit

**Request Body:**
```json
{
  "audioKey": "pronunciation-attempts/user-1/unit-1/attempt-123.mp3",
  "score": 85.5,
  "feedback": "Good pronunciation! Watch the 'th' sound."
}
```

**Body Parameters:**
- `audioKey` (string, required) - MinIO key for the recorded audio file
- `score` (number, required) - Pronunciation score (0-100)
- `feedback` (string, optional) - Feedback text

**Response: 201 Created**
```json
{
  "attempt": {
    "id": "clh5xyz...",
    "userId": "clh5abc...",
    "unitId": "clh5def...",
    "audioKey": "pronunciation-attempts/user-1/unit-1/attempt-123.mp3",
    "score": 85.5,
    "feedback": "Good pronunciation! Watch the 'th' sound.",
    "createdAt": "2024-01-15T10:45:00.000Z"
  },
  "averageScore": 87.3,
  "attemptCount": 5
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields or score out of range
- `401 Unauthorized` - No valid authentication token
- `404 Not Found` - Unit does not exist

---

### 4. Complete a Unit

**POST** `/progress/units/:unitId/complete`

Marks a unit as completed. Automatically calculates score from pronunciation attempts if not provided. Updates associated daily plan entries.

**Path Parameters:**
- `unitId` (string, required) - The ID of the unit to complete

**Request Body (Optional):**
```json
{
  "finalScore": 92
}
```

**Body Parameters:**
- `finalScore` (number, optional) - Override the calculated score (0-100)

**Response: 200 OK**
```json
{
  "progress": {
    "id": "clh5xyz...",
    "userId": "clh5abc...",
    "unitId": "clh5def...",
    "completed": true,
    "score": 92,
    "startedAt": "2024-01-15T10:30:00.000Z",
    "completedAt": "2024-01-15T11:00:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  },
  "dailyPlanUpdated": true
}
```

**Error Responses:**
- `400 Bad Request` - Invalid final score
- `401 Unauthorized` - No valid authentication token
- `404 Not Found` - Unit does not exist

---

### 5. Get Unit Progress

**GET** `/progress/units/:unitId`

Retrieves detailed progress information for a specific unit, including overall progress, pronunciation attempts, and asset progress.

**Path Parameters:**
- `unitId` (string, required) - The ID of the unit

**Response: 200 OK**
```json
{
  "progress": {
    "id": "clh5xyz...",
    "userId": "clh5abc...",
    "unitId": "clh5def...",
    "completed": false,
    "score": 0,
    "startedAt": "2024-01-15T10:30:00.000Z",
    "completedAt": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  },
  "pronunciationAttempts": [
    {
      "id": "clh5xyz...",
      "userId": "clh5abc...",
      "unitId": "clh5def...",
      "audioKey": "pronunciation-attempts/user-1/unit-1/attempt-123.mp3",
      "score": 85.5,
      "feedback": "Good pronunciation!",
      "createdAt": "2024-01-15T10:45:00.000Z"
    }
  ],
  "assetProgress": [
    {
      "id": "clh5pqr...",
      "userId": "clh5abc...",
      "unitId": "clh5def...",
      "assetId": "clh5ghi...",
      "completed": true,
      "progressPercentage": 100,
      "secondsWatched": 300,
      "durationSeconds": 300,
      "completedAt": "2024-01-15T10:40:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:40:00.000Z",
      "asset": {
        "id": "clh5ghi...",
        "type": "VIDEO",
        "minioKey": "units/unit-1/video.mp4"
      }
    }
  ]
}
```

**Note:** If the user hasn't started the unit, `progress` will be `null`.

**Error Responses:**
- `401 Unauthorized` - No valid authentication token
- `404 Not Found` - Unit does not exist

---

### 6. Get User Progress Summary

**GET** `/progress/summary`

Retrieves a comprehensive progress summary for the authenticated user, including statistics across all units and stories.

**Response: 200 OK**
```json
{
  "userId": "clh5abc...",
  "totalUnits": 25,
  "completedUnits": 12,
  "inProgressUnits": 5,
  "averageScore": 87,
  "totalPronunciationAttempts": 48,
  "averagePronunciationScore": 85.3,
  "recentActivity": [
    {
      "id": "clh5xyz...",
      "userId": "clh5abc...",
      "unitId": "clh5def...",
      "completed": true,
      "score": 92,
      "startedAt": "2024-01-15T10:30:00.000Z",
      "completedAt": "2024-01-15T11:00:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z",
      "unit": {
        "id": "clh5def...",
        "title": "Basic Greetings",
        "storyId": "clh5stu...",
        "story": {
          "id": "clh5stu...",
          "title": "Meeting People",
          "level": {
            "name": "Beginner"
          }
        }
      }
    }
  ],
  "stories": [
    {
      "storyId": "clh5stu...",
      "storyTitle": "Meeting People",
      "levelName": "Beginner",
      "completedUnits": 8,
      "totalUnits": 10,
      "averageScore": 88
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - No valid authentication token

---

### 7. Get Story Progress

**GET** `/progress/stories/:storyId`

Retrieves detailed progress for all units within a specific story.

**Path Parameters:**
- `storyId` (string, required) - The ID of the story

**Response: 200 OK**
```json
{
  "storyId": "clh5stu...",
  "storyTitle": "Meeting People",
  "levelName": "Beginner",
  "totalUnits": 10,
  "completedUnits": 8,
  "averageScore": 88,
  "units": [
    {
      "unitId": "clh5def...",
      "unitTitle": "Basic Greetings",
      "storyId": "clh5stu...",
      "storyTitle": "Meeting People",
      "completed": true,
      "score": 92,
      "startedAt": "2024-01-15T10:30:00.000Z",
      "completedAt": "2024-01-15T11:00:00.000Z",
      "pronunciationAttempts": 5,
      "averagePronunciationScore": 87.5
    },
    {
      "unitId": "clh5ghi...",
      "unitTitle": "Introductions",
      "storyId": "clh5stu...",
      "storyTitle": "Meeting People",
      "completed": false,
      "score": 0,
      "startedAt": null,
      "completedAt": null,
      "pronunciationAttempts": 0,
      "averagePronunciationScore": 0
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - No valid authentication token
- `404 Not Found` - Story does not exist

---

### 8. Get Pronunciation Attempts

**GET** `/progress/units/:unitId/pronunciation`

Retrieves all pronunciation attempts for a specific unit.

**Path Parameters:**
- `unitId` (string, required) - The ID of the unit

**Response: 200 OK**
```json
{
  "attempts": [
    {
      "id": "clh5xyz...",
      "userId": "clh5abc...",
      "unitId": "clh5def...",
      "audioKey": "pronunciation-attempts/user-1/unit-1/attempt-123.mp3",
      "score": 85.5,
      "feedback": "Good pronunciation! Watch the 'th' sound.",
      "createdAt": "2024-01-15T10:45:00.000Z"
    },
    {
      "id": "clh5abc...",
      "userId": "clh5abc...",
      "unitId": "clh5def...",
      "audioKey": "pronunciation-attempts/user-1/unit-1/attempt-124.mp3",
      "score": 90.0,
      "feedback": "Excellent!",
      "createdAt": "2024-01-15T11:15:00.000Z"
    }
  ],
  "averageScore": 87.75,
  "count": 2
}
```

**Error Responses:**
- `401 Unauthorized` - No valid authentication token
- `404 Not Found` - Unit does not exist

---

### 9. Get Asset Progress

**GET** `/progress/units/:unitId/assets`

Retrieves progress for all assets within a specific unit.

**Path Parameters:**
- `unitId` (string, required) - The ID of the unit

**Response: 200 OK**
```json
{
  "assetProgress": [
    {
      "id": "clh5pqr...",
      "userId": "clh5abc...",
      "unitId": "clh5def...",
      "assetId": "clh5ghi...",
      "completed": true,
      "progressPercentage": 100,
      "secondsWatched": 300,
      "durationSeconds": 300,
      "completedAt": "2024-01-15T10:40:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:40:00.000Z",
      "asset": {
        "id": "clh5ghi...",
        "type": "VIDEO",
        "minioKey": "units/unit-1/video.mp4",
        "duration": 300
      }
    },
    {
      "id": "clh5rst...",
      "userId": "clh5abc...",
      "unitId": "clh5def...",
      "assetId": "clh5jkl...",
      "completed": false,
      "progressPercentage": 60,
      "secondsWatched": 120,
      "durationSeconds": 200,
      "completedAt": null,
      "createdAt": "2024-01-15T10:42:00.000Z",
      "updatedAt": "2024-01-15T10:50:00.000Z",
      "asset": {
        "id": "clh5jkl...",
        "type": "AUDIO",
        "minioKey": "units/unit-1/audio.mp3",
        "duration": 200
      }
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - No valid authentication token
- `404 Not Found` - Unit does not exist

---

## Progress Tracking Flow

### Typical Learning Flow

1. **Start a unit**: `POST /progress/units/:unitId/start`
2. **Watch video content**: `POST /progress/assets/:assetId/update` (multiple times as progress is made)
3. **Complete audio/screenshot segments**: `POST /progress/assets/:assetId/update`
4. **Practice pronunciation**: `POST /progress/units/:unitId/pronunciation` (multiple attempts allowed)
5. **Complete the unit**: `POST /progress/units/:unitId/complete`

### Score Calculation

- **Asset Completion**: Automatically marked complete when `progressPercentage >= 90%`
- **Unit Score**: Calculated as the average of all pronunciation attempt scores
- **Final Score**: Can be overridden when completing a unit via the `finalScore` parameter

### Daily Plan Integration

When a unit is completed:
- The system automatically updates any `DailyPlanEntry` records that reference the completed unit
- Both the `completed` flag and `score` are updated in the daily plan

---

## Example Usage

### Starting and Completing a Unit

```javascript
// 1. Start the unit
const startResponse = await fetch('/progress/units/unit-123/start', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  }
});

// 2. Update video progress periodically
const videoProgress = await fetch('/progress/assets/asset-456/update', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-jwt-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    secondsWatched: 150,
    progressPercentage: 50,
    durationSeconds: 300
  })
});

// 3. Record pronunciation attempt
const pronunciation = await fetch('/progress/units/unit-123/pronunciation', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-jwt-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    audioKey: 'pronunciation-attempts/user-1/unit-123/attempt-1.mp3',
    score: 85,
    feedback: 'Good job!'
  })
});

// 4. Complete the unit
const completion = await fetch('/progress/units/unit-123/complete', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  }
});

// 5. Get overall progress summary
const summary = await fetch('/progress/summary', {
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  }
});
```

---

## Data Models

### UserProgress
- Tracks overall unit progress
- Records start and completion timestamps
- Stores final unit score

### UnitAssetProgress
- Tracks progress for individual assets (videos, audio, screenshots)
- Records watch time and progress percentage
- Automatically marks complete at 90% progress

### PronunciationAttempt
- Records each pronunciation practice attempt
- Stores audio file reference and score
- Optional feedback field for AI-generated or manual feedback

### DailyPlanEntry
- Automatically updated when units are completed
- Links learning activities to scheduled daily plans

---

## Error Handling

All endpoints return standard HTTP status codes:

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Requested resource does not exist
- `500 Internal Server Error` - Server error

Error responses follow this format:
```json
{
  "error": "Error message describing what went wrong"
}
```
