# Database Schema Documentation

## Overview

The backend uses Prisma ORM with SQLite for data persistence. This document describes all database models and their relationships.

## Data Models

### User
Represents a user account in the system.

```prisma
model User {
  id                   String
  email                String    @unique
  username             String    @unique
  passwordHash         String
  firstName            String?
  lastName             String?
  profilePictureUrl    String?
  createdAt            DateTime
  updatedAt            DateTime
}
```

**Relationships**:
- Has many `UserProgress` records (one per unit)
- Has many `PronunciationAttempt` records
- Has many `DailyPlan` records
- Has many `AggregateScore` records

**Fields**:
- `email`: Email address (unique)
- `username`: Display name (unique)
- `passwordHash`: Hashed password for authentication
- `firstName`, `lastName`: Optional user information
- `profilePictureUrl`: Optional URL to user's profile picture

---

### Level
Represents difficulty levels in the learning hierarchy.

```prisma
model Level {
  id        String
  name      String    @unique
  order     Int       @unique
  createdAt DateTime
  updatedAt DateTime
}
```

**Relationships**:
- Has many `Story` records

**Fields**:
- `name`: Level name (e.g., "Beginner", "Intermediate", "Advanced")
- `order`: Sort order for display (1, 2, 3, etc.)

**Example Data**:
- Level 1: Beginner
- Level 2: Intermediate
- Level 3: Advanced

---

### Story
A thematic collection of learning units within a level.

```prisma
model Story {
  id          String
  title       String
  description String?
  order       Int
  levelId     String
  createdAt   DateTime
  updatedAt   DateTime
}
```

**Relationships**:
- Belongs to `Level`
- Has many `Unit` records

**Fields**:
- `title`: Story title (e.g., "Meeting Basics")
- `description`: Optional longer description
- `order`: Sort order within the level
- `levelId`: Foreign key to parent level

**Constraints**:
- `(levelId, order)` must be unique to ensure proper ordering

---

### Unit
Individual learning modules that users progress through.

```prisma
model Unit {
  id          String
  title       String
  description String?
  order       Int
  storyId     String
  createdAt   DateTime
  updatedAt   DateTime
}
```

**Relationships**:
- Belongs to `Story`
- Has many `UnitAsset` records
- Has many `UserProgress` records
- Has many `PronunciationAttempt` records

**Fields**:
- `title`: Unit title (e.g., "Greeting Phrases")
- `description`: Optional description of learning objectives
- `order`: Sort order within the story
- `storyId`: Foreign key to parent story

**Constraints**:
- `(storyId, order)` must be unique to ensure proper ordering

---

### UnitAsset
Media files associated with units. Supports multiple asset types per unit.

```prisma
model UnitAsset {
  id        String
  unitId    String
  type      AssetType  // VIDEO, AUDIO, SUBTITLE, SCREENSHOT, METADATA
  minioKey  String
  duration  Int?       // In seconds
  metadata  String?    // JSON string
  createdAt DateTime
  updatedAt DateTime
}

enum AssetType {
  VIDEO
  AUDIO
  SUBTITLE
  SCREENSHOT
  METADATA
}
```

**Relationships**:
- Belongs to `Unit`

**Fields**:
- `unitId`: Foreign key to parent unit
- `type`: Type of asset (enum)
- `minioKey`: Path/key in MinIO storage (e.g., "placeholder/videos/lesson-v1.mp4")
- `duration`: Optional duration in seconds (useful for video/audio)
- `metadata`: Optional JSON metadata (e.g., resolution, language, difficulty)

**Example Metadata**:
```json
{
  "resolution": "1080p",
  "language": "en",
  "difficulty": "beginner",
  "vocabulary_count": 15
}
```

**Asset Types**:
- **VIDEO**: Learning video content
- **AUDIO**: Pronunciation guides or audio lessons
- **SUBTITLE**: Subtitles/captions (VTT format)
- **SCREENSHOT**: Image thumbnails or diagrams
- **METADATA**: JSON metadata about the unit content

---

### UserProgress
Tracks user completion and performance for each unit.

```prisma
model UserProgress {
  id          String
  userId      String
  unitId      String
  completed   Boolean   @default(false)
  score       Int       @default(0)    // 0-100
  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime
  updatedAt   DateTime
}
```

**Relationships**:
- Belongs to `User`
- Belongs to `Unit`

**Fields**:
- `userId`: Foreign key to user
- `unitId`: Foreign key to unit
- `completed`: Whether the user completed the unit
- `score`: Score out of 100 (0 if not started)
- `startedAt`: When the user first started this unit
- `completedAt`: When the user completed this unit

**Constraints**:
- `(userId, unitId)` must be unique (one progress record per user per unit)

---

### DailyPlan
Represents a daily learning schedule for a user.

```prisma
model DailyPlan {
  id          String
  userId      String
  plannedDate DateTime
  createdAt   DateTime
  updatedAt   DateTime
}
```

**Relationships**:
- Belongs to `User`
- Has many `DailyPlanEntry` records

**Fields**:
- `userId`: Foreign key to user
- `plannedDate`: Date of the plan (date only, no time)
- `createdAt`: When the plan was created
- `updatedAt`: When the plan was last modified

**Constraints**:
- `(userId, plannedDate)` must be unique (one plan per user per day)

---

### DailyPlanEntry
Individual units assigned within a daily plan.

```prisma
model DailyPlanEntry {
  id          String
  dailyPlanId String
  unitId      String
  completed   Boolean   @default(false)
  score       Int       @default(0)
  createdAt   DateTime
  updatedAt   DateTime
}
```

**Relationships**:
- Belongs to `DailyPlan`

**Fields**:
- `dailyPlanId`: Foreign key to daily plan
- `unitId`: Unit assigned for this day
- `completed`: Whether the user completed this unit on this day
- `score`: Score for this day's attempt at this unit

**Notes**:
- Multiple entries per plan (multiple units per day)
- Separate from `UserProgress` - tracks daily plan completion
- Can be used for gamification and habit tracking

---

### PronunciationAttempt
Tracks pronunciation practice attempts with scoring.

```prisma
model PronunciationAttempt {
  id        String
  userId    String
  unitId    String
  audioKey  String      // MinIO key to audio file
  score     Float       // 0.0 - 1.0
  feedback  String?     // Text feedback on pronunciation
  createdAt DateTime
}
```

**Relationships**:
- Belongs to `User`
- Belongs to `Unit`

**Fields**:
- `userId`: Foreign key to user
- `unitId`: Foreign key to unit (where the pronunciation practice is)
- `audioKey`: MinIO path to the recorded audio (e.g., "placeholder/pronunciation/user-attempt-1.wav")
- `score`: Pronunciation quality score (0.0 = bad, 1.0 = perfect)
- `feedback`: Optional AI-generated feedback on pronunciation quality

**Notes**:
- Multiple attempts per user per unit allowed
- Immutable once created (no updatedAt field)
- Used for tracking speaking practice and improvement

---

### AggregateScore
Aggregated performance metrics across time periods.

```prisma
model AggregateScore {
  id        String
  userId    String
  period    ScorePeriod  // DAILY, WEEKLY, MONTHLY, OVERALL
  score     Float        // 0.0 - 100.0
  createdAt DateTime
  updatedAt DateTime
}

enum ScorePeriod {
  DAILY
  WEEKLY
  MONTHLY
  OVERALL
}
```

**Relationships**:
- Belongs to `User`

**Fields**:
- `userId`: Foreign key to user
- `period`: Time period for aggregation
- `score`: Aggregated score for this period (0-100)

**Constraints**:
- `(userId, period)` must be unique (one aggregate score per user per period)

**Score Periods**:
- **DAILY**: Today's cumulative score
- **WEEKLY**: Current week's cumulative score
- **MONTHLY**: Current month's cumulative score
- **OVERALL**: All-time cumulative score

**Calculation** (suggested):
- Average of all `UserProgress.score` values completed in the period
- Weighted by unit difficulty/duration
- Could include bonus points from daily streaks

---

## Entity Relationship Diagram

```
User (1) ──→ (∞) UserProgress
  ├─→ (∞) PronunciationAttempt
  ├─→ (∞) DailyPlan
  └─→ (∞) AggregateScore

Level (1) ──→ (∞) Story
Story (1) ──→ (∞) Unit
Unit (1) ──→ (∞) UnitAsset
  ├─→ (∞) UserProgress
  └─→ (∞) PronunciationAttempt

DailyPlan (1) ──→ (∞) DailyPlanEntry
```

## Database Constraints

### Unique Constraints
- `User.email` - No duplicate emails
- `User.username` - No duplicate usernames
- `Level.name` - No duplicate level names
- `Level.order` - No duplicate level ordering
- `Story.(levelId, order)` - Unique story order per level
- `Unit.(storyId, order)` - Unique unit order per story
- `UserProgress.(userId, unitId)` - One progress record per user-unit pair
- `DailyPlan.(userId, plannedDate)` - One plan per user per day
- `AggregateScore.(userId, period)` - One aggregate score per user-period pair

### Foreign Key Constraints
All foreign key relationships have `onDelete: Cascade` to maintain referential integrity:
- Deleting a Level cascades to Stories, Units, UnitAssets, UserProgress, etc.
- Deleting a User cascades to all their records
- Deleting a Unit cascades to Assets and Progress

## Indexing Strategy

Current indexes (automatically created by Prisma):
- Primary keys on all `id` fields
- Unique indexes on constrained fields
- Foreign key indexes

**Recommended additional indexes for production** (consider adding via migration):
- `User.email` (for login queries)
- `UserProgress.userId` (for user dashboard)
- `DailyPlan.plannedDate` (for date-based queries)
- `PronunciationAttempt.userId` (for user statistics)

## Query Examples

### Get user's learning progress
```
SELECT u.id, u.username, up.score, up.completed
FROM user_progress up
JOIN units u ON up.unitId = u.id
WHERE up.userId = ?
ORDER BY u.created_at
```

### Get today's plan for a user
```
SELECT dpe.id, dpe.unitId, dpe.completed, dpe.score
FROM daily_plan_entries dpe
JOIN daily_plans dp ON dpe.dailyPlanId = dp.id
WHERE dp.userId = ? AND DATE(dp.plannedDate) = DATE('now')
```

### Get user's pronunciation attempts for a unit
```
SELECT score, feedback, createdAt
FROM pronunciation_attempts
WHERE userId = ? AND unitId = ?
ORDER BY createdAt DESC
```

### Get user's overall stats
```
SELECT 
  COUNT(DISTINCT up.id) as units_completed,
  AVG(up.score) as avg_score,
  SUM(CASE WHEN up.completed THEN 1 ELSE 0 END) as total_completed
FROM user_progress up
WHERE up.userId = ?
```

## Best Practices

1. **Always query with relationships**: Use Prisma's include/select for efficient queries
2. **Batch operations**: Use deleteMany/updateMany for bulk changes
3. **Use transactions**: For operations involving multiple tables
4. **Index frequently queried fields**: Especially user and date-based queries
5. **Archive old data**: Consider archiving PronunciationAttempt records for storage efficiency
6. **Backup regularly**: Especially before migrations
7. **Test queries**: Verify performance with Prisma Studio before optimizations
