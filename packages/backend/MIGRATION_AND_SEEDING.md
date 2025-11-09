# Database Migrations and Seeding

This document provides instructions for managing database migrations and seeding data in the backend.

## Overview

The backend uses **Prisma ORM** with **SQLite** as the database. The database schema is defined in `prisma/schema.prisma` and is managed through migrations.

### Key Components

- **Prisma Schema** (`prisma/schema.prisma`): Defines all database models and their relationships
- **Migrations** (`prisma/migrations/`): Version-controlled database schema changes
- **Seed Script** (`prisma/seed.ts`): Populates the database with sample data

## Database Schema

The schema includes the following models:

### Core Models
- **User**: User accounts with authentication fields
- **Level**: Difficulty levels (Beginner, Intermediate, Advanced)
- **Story**: Learning contexts within levels
- **Unit**: Individual learning modules within stories
- **UnitAsset**: Media files (video, audio, subtitles, screenshots, JSON metadata) with MinIO references

### Tracking Models
- **UserProgress**: User completion and scores per unit
- **DailyPlan**: Scheduled learning activities for users
- **DailyPlanEntry**: Individual units within a daily plan
- **PronunciationAttempt**: Voice recording practice with scores and feedback
- **AggregateScore**: Performance metrics across different time periods (daily, weekly, monthly, overall)

## Setup Instructions

### 1. Initial Setup

```bash
# Navigate to backend directory
cd packages/backend

# Install dependencies (if not already done)
npm install

# Create .env file (copy from .env.example if it doesn't exist)
cp .env.example .env
```

### 2. Generate Prisma Client

```bash
npm run db:generate
```

This command generates the Prisma client based on the schema definition. The client is generated to `src/generated/` and provides type-safe database access.

### 3. Create Initial Migration

```bash
npm run db:migrate --  --name init
```

Or if you're setting up for the first time:

```bash
npm run db:migrate
```

This will:
- Apply any pending migrations to the SQLite database
- Create the database file if it doesn't exist (default: `prisma/dev.db`)
- Generate an updated Prisma client

## Available Commands

### Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Generate Prisma Client from schema |
| `npm run db:migrate` | Run pending migrations and create new ones |
| `npm run db:reset` | Reset database and re-run all migrations |
| `npm run db:seed` | Populate database with sample data |
| `npm run db:studio` | Open Prisma Studio (interactive DB browser) |

### Detailed Command Usage

#### Generate Prisma Client
```bash
npm run db:generate
```
Run this whenever you change the schema definition. It regenerates the TypeScript types and client.

#### Create and Apply Migrations
```bash
# Create a new migration and apply it
npm run db:migrate -- --name <migration_name>

# Example: Add a new field to users
npm run db:migrate -- --name add_bio_to_users
```

#### Reset Database
```bash
npm run db:reset
```
This command will:
1. Delete the SQLite database file
2. Re-run all migrations from scratch
3. Run the seed script to populate sample data

**Warning**: This will delete all data in the database!

#### Seed Database
```bash
npm run db:seed
```
Populates the database with sample data. This includes:
- 2 sample users
- 3 difficulty levels (Beginner, Intermediate, Advanced)
- 4 sample stories
- 5 sample units with assets
- Sample user progress records
- Sample daily plans
- Sample pronunciation attempts
- Sample aggregate scores

All assets reference placeholder MinIO keys (e.g., `placeholder/videos/...`) for easy identification during development.

#### Browse Database
```bash
npm run db:studio
```
Opens Prisma Studio, a visual database browser where you can:
- View all records
- Add, edit, and delete data
- Export data as JSON

## Workflow Examples

### Fresh Start (First Time)
```bash
cd packages/backend
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

### After Schema Changes
```bash
# Update schema in prisma/schema.prisma
npm run db:generate
npm run db:migrate -- --name describe_your_changes
npm run db:seed  # Optional: re-seed if needed
```

### Reset Everything
```bash
npm run db:reset
```

### Inspect Database
```bash
npm run db:studio
```
Then open http://localhost:5555 in your browser.

## Migration Files

Migrations are stored in `prisma/migrations/` and are named with timestamps:
- `<timestamp>_<name>/migration.sql`: The SQL statements to apply

Each migration is:
1. **Reversible**: Contains up/down SQL
2. **Version-controlled**: Tracked in git
3. **Testable**: Can be applied to any clean database

## Sample Data

The seed script creates sample data for testing:

### Users
- `john@example.com` / `johndoe`
- `jane@example.com` / `janedoe`

### Content Hierarchy
```
Beginner Level
├── Meeting Basics Story
│   ├── Greeting Phrases Unit
│   │   └── Video, Audio, Subtitle, Screenshot, Metadata Assets
│   └── Name Introduction Unit
│       └── Video Asset
└── Everyday Conversations Story
    └── Shopping Vocabulary Unit
        └── Video Asset

Intermediate Level
└── Business Communication Story
    └── Meeting Scheduling Unit
        └── Video Asset

Advanced Level
└── Advanced Discussions Story
    └── Abstract Concepts Unit
        └── Video Asset
```

### MinIO Asset Placeholders
All assets use placeholder MinIO keys:
- `placeholder/videos/lesson-name-v1.mp4`
- `placeholder/audio/pronunciation-lesson-name-en.mp3`
- `placeholder/subtitles/lesson-name-en.vtt`
- `placeholder/screenshots/lesson-name-screenshot-1.jpg`
- `placeholder/metadata/lesson-name-metadata.json`
- `placeholder/pronunciation/user-attempt-audio.wav`

## Troubleshooting

### Database File Not Found
```
Error: open /home/.../prisma/dev.db: no such file or directory
```
**Solution**: Run `npm run db:migrate` to create the database.

### Prisma Client Not Found
```
Error: @prisma/client did not initialize yet.
```
**Solution**: Run `npm run db:generate` to regenerate the client.

### Port Already in Use (Prisma Studio)
```
Error: listen EADDRINUSE :::5555
```
**Solution**: Kill the process on port 5555 or specify a different port:
```bash
npx prisma studio --port 5556
```

### Migration Conflicts
If multiple migrations conflict, reset and recreate:
```bash
npm run db:reset
```

## Development Tips

1. **Always test migrations**: Create a fresh database and apply migrations
2. **Keep migrations small**: One logical change per migration
3. **Document schema changes**: Add comments in schema.prisma for clarity
4. **Use Prisma Studio**: Visually inspect data while developing
5. **Seed test data**: Run `npm run db:seed` before testing features

## Production Considerations

For production deployments:

1. Use a persistent database location (not in prisma/ directory)
2. Set `DATABASE_URL` environment variable appropriately
3. Run migrations before deploying application code
4. Consider using Prisma's managed database (Prisma Data Platform)
5. Keep database backups
6. Test migration rollback procedures

## References

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
