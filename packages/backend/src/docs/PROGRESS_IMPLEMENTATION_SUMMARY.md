# Progress API Implementation Summary

## Overview

The Progress API enables comprehensive tracking of user learning activities, including video watching, asset completion, pronunciation practice, and overall unit progress. It automatically updates daily plan entries when units are completed.

## Key Features

✅ **Unit Progress Tracking**
- Start and complete units
- Track timestamps (startedAt, completedAt)
- Store unit scores

✅ **Asset Progress Tracking**
- Track individual asset progress (videos, audio, screenshots)
- Record watch time and progress percentage
- Automatic completion at 90% progress

✅ **Pronunciation Attempts**
- Record multiple pronunciation practice attempts
- Store audio file references (MinIO keys)
- Track scores and optional feedback

✅ **Score Calculation**
- Automatic score calculation from asset progress and pronunciation attempts
- Weighted average: combines asset completion and pronunciation scores
- Manual score override option when completing units

✅ **Daily Plan Integration**
- Automatic update of DailyPlanEntry records when units are completed
- Syncs completion status and scores

✅ **Progress Summaries**
- User-wide progress summary with statistics
- Story-level progress with per-unit details
- Recent activity tracking

## Files Created

### Database Schema
- **Updated**: `prisma/schema.prisma`
  - Added `UnitAssetProgress` model for tracking individual asset progress
  - Added relations to User, Unit, and UnitAsset models

### Service Layer
- `src/services/progress.ts` - Core business logic for progress tracking
  - `startUnit()` - Initialize or update unit start time
  - `updateAssetProgress()` - Track asset viewing progress
  - `recordPronunciationAttempt()` - Save pronunciation attempts
  - `calculateUnitScore()` - Compute unit score from assets and pronunciation
  - `completeUnit()` - Mark unit complete and update daily plans
  - `getUnitProgress()` - Retrieve progress for a specific unit
  - `getUserProgressSummary()` - Get comprehensive user progress statistics
  - `getStoryProgress()` - Get detailed progress for a story
  - `getPronunciationAttempts()` - Get all pronunciation attempts for a unit
  - `getAssetProgress()` - Get asset progress for a unit

### API Routes
- `src/routes/progress.ts` - RESTful endpoints for progress tracking
  - `POST /progress/units/:unitId/start` - Start a unit
  - `POST /progress/assets/:assetId/update` - Update asset progress
  - `POST /progress/units/:unitId/pronunciation` - Record pronunciation attempt
  - `POST /progress/units/:unitId/complete` - Complete a unit
  - `GET /progress/units/:unitId` - Get unit progress
  - `GET /progress/summary` - Get user progress summary
  - `GET /progress/stories/:storyId` - Get story progress
  - `GET /progress/units/:unitId/pronunciation` - Get pronunciation attempts
  - `GET /progress/units/:unitId/assets` - Get asset progress

### Type Definitions
- `src/types/progress.ts` - TypeScript interfaces for progress types

### Tests
- `src/services/progress.test.ts` - Unit tests for progress service (14 test cases)
- `src/routes/progress.test.ts` - Integration tests for progress routes (13 test cases)

### Documentation
- `src/docs/PROGRESS_API.md` - Comprehensive API documentation with examples
- `src/docs/PROGRESS_IMPLEMENTATION_SUMMARY.md` - This file

### Integration
- **Updated**: `src/index.ts` - Mounted progress router at `/progress`

## Database Models

### UnitAssetProgress (New)
```prisma
model UnitAssetProgress {
  id                 String    @id @default(cuid())
  userId             String
  unitId             String
  assetId            String
  completed          Boolean   @default(false)
  progressPercentage Float     @default(0)
  secondsWatched     Int       @default(0)
  durationSeconds    Int?
  completedAt        DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  
  user  User      @relation(fields: [userId], references: [id])
  unit  Unit      @relation(fields: [unitId], references: [id])
  asset UnitAsset @relation(fields: [assetId], references: [id])
  
  @@unique([userId, assetId])
  @@map("unit_asset_progress")
}
```

### UserProgress (Existing - Used)
- Tracks overall unit completion and scores
- Contains startedAt and completedAt timestamps

### PronunciationAttempt (Existing - Used)
- Records each pronunciation practice attempt
- Stores score and optional feedback

### DailyPlanEntry (Existing - Updated by API)
- Automatically updated when units are completed
- Completion status and score synchronized

## Score Calculation Algorithm

The unit score is calculated as a weighted average of:

1. **Asset Completion Score** (if assets exist):
   - Average progress percentage across all unit assets
   - Range: 0-100

2. **Pronunciation Score** (if attempts exist):
   - Average score across all pronunciation attempts
   - Range: 0-100

3. **Final Calculation**:
   - If only assets exist: uses asset score
   - If only pronunciation exists: uses pronunciation score
   - If both exist: average of both components
   - If neither exists: returns 0

Example:
```
Assets: [100%, 90%, 80%] → Average: 90%
Pronunciation: [85, 90, 95] → Average: 90
Final Score: (90 + 90) / 2 = 90
```

## Authentication & Authorization

All endpoints require:
- Valid JWT token in `Authorization: Bearer <token>` header
- User context automatically injected by `authMiddleware`
- `requireAuth` guard ensures authenticated access

## Validation

### Input Validation
- Unit/Asset/Story existence validated before operations
- Score ranges validated (0-100)
- Required fields checked (secondsWatched, progressPercentage, audioKey, score)
- Progress percentage capped at 0-100

### Business Logic Validation
- Assets automatically marked complete at ≥90% progress
- Unit completion creates UserProgress if none exists
- Pronunciation scores averaged for unit score calculation

## Error Handling

Consistent error responses across all endpoints:
- `400 Bad Request` - Invalid input or validation errors
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server errors

All errors include descriptive messages:
```json
{
  "error": "Descriptive error message"
}
```

## Testing Coverage

### Service Tests (14 cases)
- ✅ Start unit (new and existing)
- ✅ Create and update asset progress
- ✅ Auto-completion at 90% progress
- ✅ Record pronunciation attempts with average calculation
- ✅ Calculate unit score (with/without attempts)
- ✅ Complete unit with daily plan updates
- ✅ Override final score
- ✅ Get user progress summary
- ✅ Get story progress
- ✅ Get pronunciation attempts

### Route Tests (13 cases)
- ✅ All POST endpoints with valid/invalid data
- ✅ All GET endpoints with valid/invalid IDs
- ✅ Authentication checks
- ✅ Error responses
- ✅ Score validation

## API Usage Examples

### Complete Learning Flow

```javascript
// 1. Start the unit
await fetch('/progress/units/unit-123/start', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer token' }
})

// 2. Track video watching
await fetch('/progress/assets/asset-456/update', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    secondsWatched: 150,
    progressPercentage: 50,
    durationSeconds: 300
  })
})

// 3. Record pronunciation attempts
await fetch('/progress/units/unit-123/pronunciation', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    audioKey: 'pronunciation/user-1/attempt-1.mp3',
    score: 85,
    feedback: 'Good job!'
  })
})

// 4. Complete the unit (auto-calculates score)
await fetch('/progress/units/unit-123/complete', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer token' }
})

// 5. View progress summary
const response = await fetch('/progress/summary', {
  headers: { 'Authorization': 'Bearer token' }
})
const summary = await response.json()
```

## Migration

Migration created: `20251113132413_add_unit_asset_progress`

To apply:
```bash
cd packages/backend
npx prisma migrate dev
```

## Dependencies

No new dependencies required. Uses existing:
- Hono (API framework)
- Prisma (ORM)
- JWT authentication (existing auth middleware)

## Integration Points

### With Auth API
- Uses existing `authMiddleware` and `requireAuth` guards
- Automatically gets user context from JWT token
- All endpoints protected by authentication

### With Courses API
- References Unit, Story, and UnitAsset models
- Validates resource existence before operations

### With Daily Plans
- Automatically updates DailyPlanEntry when units are completed
- Syncs completion status and scores

## Performance Considerations

- **Batch queries**: Progress summary uses Promise.all() for parallel queries
- **Indexes**: Unique constraints on [userId, unitId] and [userId, assetId] for fast lookups
- **Pagination**: Recent activity limited to 10 items in summary
- **Eager loading**: Includes related data to minimize N+1 queries

## Future Enhancements

Potential improvements:
- Real-time progress updates via WebSockets
- Progress analytics and insights
- Achievement/badge system integration
- Progress export (CSV, PDF)
- Time spent tracking per unit
- Learning streak calculations
- Personalized recommendations based on progress
