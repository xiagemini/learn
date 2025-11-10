# Authentication API Documentation

## Overview

This document describes the Authentication API endpoints for the language learning platform. The API implements a simple username-based login flow with JWT token-based session management.

## Table of Contents

1. [Authentication Flow](#authentication-flow)
2. [Endpoints](#endpoints)
3. [Error Handling](#error-handling)
4. [Security Considerations](#security-considerations)

## Authentication Flow

### Registration and Login

1. **User Registration** - Create a new user account with username, email, and password
2. **User Login** - Authenticate with username and password to receive a JWT token
3. **Token Usage** - Include the token in the `Authorization` header for protected requests
4. **Token Verification** - Server validates the token and injects user context into requests

### JWT Token

- Format: Standard JWT (JSON Web Token)
- Encoding: HS256 (HMAC with SHA-256)
- Expiration: 24 hours by default
- Transmission: HTTP `Authorization` header with `Bearer <token>` format

## Endpoints

### 1. User Registration

**Endpoint:** `POST /auth/register`

Create a new user account.

#### Request

```json
{
  "username": "string (3-50 characters, unique)",
  "email": "string (valid email, unique)",
  "password": "string (minimum 8 characters)"
}
```

#### Response (201 Created)

```json
{
  "user": {
    "id": "cuid (unique identifier)",
    "username": "string",
    "email": "string",
    "createdAt": "ISO 8601 datetime"
  }
}
```

#### Error Responses

- **400 Bad Request** - Validation errors
  - Missing required fields
  - Username length not between 3-50 characters
  - Password less than 8 characters
  - Username or email already taken

```json
{
  "error": "string (error message)"
}
```

#### Example

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "securePassword123"
  }'
```

---

### 2. User Login

**Endpoint:** `POST /auth/login`

Authenticate a user and receive a JWT token.

#### Request

```json
{
  "username": "string",
  "password": "string"
}
```

#### Response (200 OK)

```json
{
  "token": "JWT token string (eyJhbGciOiJIUzI1NiIs...)",
  "user": {
    "id": "cuid",
    "username": "string",
    "email": "string",
    "firstName": "string or null",
    "lastName": "string or null",
    "selectedLevelId": "string or null",
    "createdAt": "ISO 8601 datetime"
  }
}
```

#### Error Responses

- **400 Bad Request** - Missing required fields

```json
{
  "error": "Missing required fields: username, password"
}
```

- **401 Unauthorized** - Invalid credentials

```json
{
  "error": "Invalid username or password"
}
```

#### Example

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "securePassword123"
  }'
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clh1qzfz00000000000000000",
    "username": "john_doe",
    "email": "john@example.com",
    "firstName": null,
    "lastName": null,
    "selectedLevelId": null,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 3. Get Current User Profile

**Endpoint:** `GET /auth/me`

Retrieve the current user's profile information. **Requires authentication.**

#### Request Headers

```
Authorization: Bearer <JWT token>
Content-Type: application/json
```

#### Response (200 OK)

```json
{
  "user": {
    "id": "cuid",
    "username": "string",
    "email": "string",
    "firstName": "string or null",
    "lastName": "string or null",
    "profilePictureUrl": "string or null",
    "selectedLevelId": "string or null",
    "selectedLevel": {
      "id": "cuid",
      "name": "string (e.g., 'Beginner', 'Intermediate', 'Advanced')",
      "order": "number"
    } | null,
    "createdAt": "ISO 8601 datetime"
  }
}
```

#### Error Responses

- **401 Unauthorized** - No token or invalid token

```json
{
  "error": "Unauthorized"
}
```

- **404 Not Found** - User not found

```json
{
  "error": "User not found"
}
```

#### Example

```bash
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 4. Update Selected Level

**Endpoint:** `PUT /auth/selected-level`

Update the user's selected learning level. **Requires authentication.**

#### Request Headers

```
Authorization: Bearer <JWT token>
Content-Type: application/json
```

#### Request Body

```json
{
  "levelId": "string (cuid of the level)"
}
```

#### Response (200 OK)

```json
{
  "user": {
    "id": "cuid",
    "username": "string",
    "email": "string",
    "selectedLevelId": "string",
    "selectedLevel": {
      "id": "cuid",
      "name": "string",
      "order": "number"
    }
  }
}
```

#### Error Responses

- **400 Bad Request** - Missing levelId

```json
{
  "error": "Missing required field: levelId"
}
```

- **401 Unauthorized** - No token or invalid token

```json
{
  "error": "Unauthorized"
}
```

- **404 Not Found** - Level not found

```json
{
  "error": "Level not found"
}
```

#### Example

```bash
curl -X PUT http://localhost:3001/auth/selected-level \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "levelId": "clh1qzfz00001000000000000"
  }'
```

---

## Error Handling

All error responses follow the standard format:

```json
{
  "error": "string (descriptive error message)"
}
```

### HTTP Status Codes

| Status | Meaning | Scenario |
|--------|---------|----------|
| 200 | OK | Successful request |
| 201 | Created | Resource successfully created |
| 400 | Bad Request | Validation error or missing fields |
| 401 | Unauthorized | Missing or invalid authentication token |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server-side error |

---

## Security Considerations

### Password Security

- Passwords are hashed using bcryptjs (bcrypt algorithm)
- Passwords are never stored in plain text
- Passwords are never returned in API responses

### JWT Security

- Tokens are signed with a secret key configured via `JWT_SECRET` environment variable
- Tokens are set to expire after 24 hours by default
- Tokens should be stored securely on the client (e.g., in memory or secure HTTP-only cookies)
- Never store sensitive information in JWT payload (use claims for user identification only)

### Transport Security

- Always use HTTPS in production
- Set `CORS_ORIGIN` environment variable to restrict cross-origin requests
- Include the `X-Content-Type-Options: nosniff` header

### Best Practices

1. **Token Storage** (Client-side)
   - Store tokens in memory or secure HTTP-only cookies
   - Never store tokens in localStorage for sensitive applications
   - Clear tokens on logout

2. **Token Refresh**
   - Current implementation: 24-hour expiration
   - Consider implementing a refresh token mechanism for longer sessions
   - Implement token rotation for enhanced security

3. **Rate Limiting**
   - Implement rate limiting on login and registration endpoints
   - Prevent brute force attacks

4. **Input Validation**
   - All inputs are validated on the server
   - Email format is validated
   - Password minimum length is enforced (8 characters)

---

## Environment Variables

### Required

- `JWT_SECRET` - Secret key for signing JWT tokens (minimum 32 characters recommended for production)

### Optional

- `PORT` - Server port (default: 3001)
- `CORS_ORIGIN` - CORS origin for frontend (default: http://localhost:5173)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_URL` - SQLite database URL (default: file:./dev.db)

### Example .env Configuration

```
PORT=3001
JWT_SECRET=your-super-secret-key-change-in-production
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
DATABASE_URL=file:./dev.db
```

---

## Implementation Notes

### Middleware

The authentication system includes two middleware functions:

1. **authMiddleware** - Automatically verifies tokens and injects user context
   - Applied to all routes that start with `/auth`
   - Passes if no token is provided (optional authentication)
   - Sets `user` context if valid token is found

2. **requireAuth** - Guard middleware for protected routes
   - Used on routes that require authentication
   - Returns 401 Unauthorized if no valid token is found
   - Must be applied after authMiddleware

### User Model

The User model includes fields for profile customization:

- `selectedLevelId` - Reference to the user's selected learning level
- `firstName`, `lastName` - User's name (optional)
- `profilePictureUrl` - URL to user's profile picture (optional)
- `username` - Unique login identifier
- `email` - Unique email address

---

## Testing

Comprehensive tests are provided for:

- **auth.service.test.ts** - Core authentication service tests
  - Password hashing and verification
  - JWT token generation and verification
  - User CRUD operations
  - Authentication flow

- **auth.route.test.ts** - API endpoint tests
  - Registration with validation
  - Login with various scenarios
  - User profile retrieval
  - Selected level updates

- **auth.middleware.test.ts** - Middleware tests
  - Token verification and context injection
  - Authorization guard
  - Error handling

Run tests with:

```bash
npm run test
```

---

## Future Enhancements

Potential improvements for the authentication system:

1. **Refresh Tokens** - Implement separate refresh tokens for extended sessions
2. **Email Verification** - Add email confirmation for new accounts
3. **Password Reset** - Implement password recovery flow
4. **Two-Factor Authentication** - Add 2FA support
5. **Social Login** - Integration with OAuth providers
6. **API Keys** - Support for service-to-service authentication
7. **Rate Limiting** - Prevent brute force attacks
8. **Activity Logging** - Track login history and security events
