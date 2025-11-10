import { sign, verify } from 'hono/jwt'
import { hash, compare } from 'bcryptjs'
import { PrismaClient } from '../generated/client.js'

const prisma = new PrismaClient()

/**
 * JWT Payload structure
 */
export interface JWTPayload {
  userId: string
  username: string
  email: string
  iat?: number
  exp?: number
}

/**
 * Generate a JWT token
 */
export async function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn: number = 24 * 60 * 60): Promise<string> {
  const secret = process.env.JWT_SECRET || 'default-secret-change-in-production'
  const now = Math.floor(Date.now() / 1000)
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  }
  return await sign(tokenPayload, secret)
}

/**
 * Verify a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = process.env.JWT_SECRET || 'default-secret-change-in-production'
    const payload = await verify(token, secret) as unknown as JWTPayload
    return payload
  } catch {
    return null
  }
}

/**
 * Hash a password using bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await hash(password, 10)
  return salt
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash)
}

/**
 * Create a new user
 */
export async function createUser(username: string, email: string, password: string) {
  const passwordHash = await hashPassword(password)
  
  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
    },
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
    },
  })
  
  return user
}

/**
 * Find user by username
 */
export async function findUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      email: true,
      passwordHash: true,
      firstName: true,
      lastName: true,
      selectedLevelId: true,
      createdAt: true,
    },
  })
}

/**
 * Find user by ID (for fetching user profile)
 */
export async function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      profilePictureUrl: true,
      selectedLevelId: true,
      selectedLevel: {
        select: {
          id: true,
          name: true,
          order: true,
        },
      },
      createdAt: true,
    },
  })
}

/**
 * Update user's selected level
 */
export async function updateUserSelectedLevel(userId: string, levelId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { selectedLevelId: levelId },
    select: {
      id: true,
      username: true,
      email: true,
      selectedLevelId: true,
      selectedLevel: {
        select: {
          id: true,
          name: true,
          order: true,
        },
      },
    },
  })
}

/**
 * Authenticate user and return token
 */
export async function authenticateUser(username: string, password: string) {
  const user = await findUserByUsername(username)
  
  if (!user) {
    return null
  }
  
  const isPasswordValid = await comparePassword(password, user.passwordHash)
  
  if (!isPasswordValid) {
    return null
  }
  
  const token = await generateToken({
    userId: user.id,
    username: user.username,
    email: user.email,
  })
  
  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      selectedLevelId: user.selectedLevelId,
      createdAt: user.createdAt,
    },
  }
}
