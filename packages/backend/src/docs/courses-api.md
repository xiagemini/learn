# Courses API Documentation

This document describes the REST endpoints for the course management system.

## Base URL
```
http://localhost:3001/courses
```

## Authentication
All endpoints require authentication via JWT token in the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

## Data Models

### Level
```json
{
  "id": "string",
  "name": "string",
  "order": "number",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "_count": {
    "stories": "number"
  }
}
```

### Story
```json
{
  "id": "string",
  "title": "string",
  "description": "string|null",
  "order": "number",
  "levelId": "string",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "level": {
    "name": "string"
  },
  "_count": {
    "units": "number"
  }
}
```

### Unit
```json
{
  "id": "string",
  "title": "string",
  "description": "string|null",
  "order": "number",
  "storyId": "string",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "story": {
    "title": "string"
  },
  "_count": {
    "assets": "number"
  },
  "assets": [
    {
      "id": "string",
      "unitId": "string",
      "type": "VIDEO|AUDIO|SUBTITLE|SCREENSHOT|METADATA",
      "minioKey": "string",
      "duration": "number|null",
      "metadata": "string|null",
      "createdAt": "datetime",
      "updatedAt": "datetime",
      "presignedUrl": "string"
    }
  ]
}
```

### Asset
```json
{
  "id": "string",
  "unitId": "string",
  "type": "VIDEO|AUDIO|SUBTITLE|SCREENSHOT|METADATA",
  "minioKey": "string",
  "duration": "number|null",
  "metadata": "string|null",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "presignedUrl": "string"
}
```

### DailyPlan
```json
{
  "id": "string",
  "userId": "string",
  "plannedDate": "datetime",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "isOverdue": "boolean",
  "entries": [
    {
      "id": "string",
      "dailyPlanId": "string",
      "unitId": "string",
      "completed": "boolean",
      "score": "number",
      "createdAt": "datetime",
      "updatedAt": "datetime",
      "unit": {
        "id": "string",
        "title": "string",
        "story": {
          "title": "string",
          "level": {
            "name": "string"
          }
        }
      }
    }
  ]
}
```

## Endpoints

### GET /courses/levels
Get all levels with their stories and units.

**Response:**
```json
{
  "levels": [
    {
      "id": "clx123...",
      "name": "Beginner",
      "order": 1,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "_count": { "stories": 5 },
      "stories": [...]
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Success
- `500 Internal Server Error` - Server error

---

### GET /courses/stories
Get all stories grouped by level.

**Response:**
```json
{
  "levels": [
    {
      "id": "clx123...",
      "name": "Beginner",
      "order": 1,
      "stories": [...]
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Success
- `500 Internal Server Error` - Server error

---

### GET /courses/levels/:levelId/stories
Get stories for a specific level.

**Path Parameters:**
- `levelId` (string, required) - The ID of the level

**Response:**
```json
{
  "stories": [
    {
      "id": "clx456...",
      "title": "Basic Greetings",
      "description": "Learn basic greetings",
      "order": 1,
      "levelId": "clx123...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "level": { "name": "Beginner" },
      "_count": { "units": 3 },
      "units": [...]
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Success
- `500 Internal Server Error` - Server error

---

### GET /courses/stories/:storyId/units
Get units for a specific story.

**Path Parameters:**
- `storyId` (string, required) - The ID of the story

**Response:**
```json
{
  "units": [
    {
      "id": "clx789...",
      "title": "Hello",
      "description": "Learn to say hello",
      "order": 1,
      "storyId": "clx456...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "story": { "title": "Basic Greetings" },
      "_count": { "assets": 8 },
      "assets": [
        {
          "id": "clxabc...",
          "unitId": "clx789...",
          "type": "VIDEO",
          "minioKey": "units/clx789/video.mp4",
          "duration": 120,
          "metadata": null,
          "createdAt": "2024-01-01T00:00:00.000Z",
          "updatedAt": "2024-01-01T00:00:00.000Z",
          "presignedUrl": "https://minio.example.com/buckets/assets/units/clx789/video.mp4?X-Amz-Algorithm=..."
        }
      ]
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Success
- `500 Internal Server Error` - Server error

---

### GET /courses/units/:unitId
Get a specific unit with its assets.

**Path Parameters:**
- `unitId` (string, required) - The ID of the unit

**Response:**
```json
{
  "unit": {
    "id": "clx789...",
    "title": "Hello",
    "description": "Learn to say hello",
    "order": 1,
    "storyId": "clx456...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "story": { "title": "Basic Greetings" },
    "_count": { "assets": 8 },
    "assets": [...]
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Unit not found
- `500 Internal Server Error` - Server error

---

### GET /courses/daily-plans
Get daily plans for the authenticated user.

**Query Parameters:**
- `startDate` (string, optional) - Start date filter (ISO date string)
- `endDate` (string, optional) - End date filter (ISO date string)
- `overdueOnly` (boolean, optional) - Filter only overdue plans (default: false)

**Response:**
```json
{
  "dailyPlans": [
    {
      "id": "clxdef...",
      "userId": "user123...",
      "plannedDate": "2024-01-15T00:00:00.000Z",
      "createdAt": "2024-01-14T00:00:00.000Z",
      "updatedAt": "2024-01-14T00:00:00.000Z",
      "isOverdue": false,
      "entries": [
        {
          "id": "clxghi...",
          "dailyPlanId": "clxdef...",
          "unitId": "clx789...",
          "completed": false,
          "score": 0,
          "createdAt": "2024-01-14T00:00:00.000Z",
          "updatedAt": "2024-01-14T00:00:00.000Z",
          "unit": {
            "id": "clx789...",
            "title": "Hello",
            "story": {
              "title": "Basic Greetings",
              "level": { "name": "Beginner" }
            }
          }
        }
      ]
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - No authentication token provided
- `500 Internal Server Error` - Server error

---

### GET /courses/daily-plans/:date
Get a specific daily plan for the authenticated user.

**Path Parameters:**
- `date` (string, required) - Date in YYYY-MM-DD format

**Response:**
```json
{
  "dailyPlan": {
    "id": "clxdef...",
    "userId": "user123...",
    "plannedDate": "2024-01-15T00:00:00.000Z",
    "createdAt": "2024-01-14T00:00:00.000Z",
    "updatedAt": "2024-01-14T00:00:00.000Z",
    "isOverdue": false,
    "entries": [...]
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid date format
- `401 Unauthorized` - No authentication token provided
- `404 Not Found` - Daily plan not found
- `500 Internal Server Error` - Server error

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

## Asset Types

The following asset types are supported:

- `VIDEO` - Video files (mp4, webm, mkv)
- `AUDIO` - Audio files (mp3, wav, aac)
- `SUBTITLE` - Subtitle files (vtt, srt)
- `SCREENSHOT` - Image files (png, jpg, jpeg, gif, webp)
- `METADATA` - JSON metadata files

## Overdue Detection

Daily plans are marked as overdue when:
- The planned date is in the past
- At least one entry in the plan is not completed

The `isOverdue` field is automatically calculated for each daily plan.

## Examples

### Example 1: Get all levels with stories and units
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/courses/levels
```

### Example 2: Get units for a story
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/courses/stories/story123/units
```

### Example 3: Get overdue daily plans
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3001/courses/daily-plans?overdueOnly=true"
```

### Example 4: Get daily plan for specific date
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/courses/daily-plans/2024-01-15
```