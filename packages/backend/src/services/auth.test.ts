import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  createUser,
  findUserByUsername,
  findUserById,
  authenticateUser,
  updateUserSelectedLevel,
} from './auth'
import { PrismaClient } from '../generated/client.js'

// Mock Prisma
vi.mock('../generated/client.js', () => {
  const mockPrisma = {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  }
  return {
    PrismaClient: vi.fn(() => mockPrisma),
  }
})

describe('Auth Service', () => {
  describe('Password hashing and comparison', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)
      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
    })

    it('should compare password with hash correctly', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)
      const isValid = await comparePassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      const password = 'testPassword123'
      const wrongPassword = 'wrongPassword456'
      const hash = await hashPassword(password)
      const isValid = await comparePassword(wrongPassword, hash)
      expect(isValid).toBe(false)
    })
  })

  describe('JWT token generation and verification', () => {
    it('should generate a valid JWT token', async () => {
      const payload = {
        userId: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
      }
      const token = await generateToken(payload)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT format
    })

    it('should verify a valid token', async () => {
      const payload = {
        userId: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
      }
      const token = await generateToken(payload)
      const verified = await verifyToken(token)
      expect(verified).toBeDefined()
      expect(verified?.userId).toBe('test-user-id')
      expect(verified?.username).toBe('testuser')
      expect(verified?.email).toBe('test@example.com')
    })

    it('should return null for invalid token', async () => {
      const invalidToken = 'invalid.token.here'
      const verified = await verifyToken(invalidToken)
      expect(verified).toBeNull()
    })

    it('should generate tokens with different expirations', async () => {
      const payload = {
        userId: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
      }
      const token1 = await generateToken(payload, 3600)
      const token2 = await generateToken(payload, 7200)
      
      expect(token1).not.toBe(token2)
      
      const verified1 = await verifyToken(token1)
      const verified2 = await verifyToken(token2)
      
      if (verified1 && verified2) {
        expect(verified2.exp! - verified1.exp!).toBe(3600)
      }
    })
  })

  describe('User operations', () => {
    let mockPrisma: any

    beforeEach(() => {
      mockPrisma = (PrismaClient as any)()
      vi.clearAllMocks()
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('should create a new user', async () => {
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        username: 'newuser',
        email: 'new@example.com',
        createdAt: new Date('2024-01-01'),
      })

      const user = await createUser('newuser', 'new@example.com', 'password123')
      expect(user).toBeDefined()
      expect(user.username).toBe('newuser')
      expect(user.email).toBe('new@example.com')
      expect(mockPrisma.user.create).toHaveBeenCalled()
    })

    it('should find user by username', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'John',
        lastName: 'Doe',
        selectedLevelId: null,
        createdAt: new Date('2024-01-01'),
      })

      const user = await findUserByUsername('testuser')
      expect(user).toBeDefined()
      expect(user?.username).toBe('testuser')
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        select: expect.any(Object),
      })
    })

    it('should find user by ID with selected level', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        profilePictureUrl: null,
        selectedLevelId: 'level-1',
        createdAt: new Date('2024-01-01'),
        selectedLevel: {
          id: 'level-1',
          name: 'Beginner',
          order: 1,
        },
      })

      const user = await findUserById('user-1')
      expect(user).toBeDefined()
      expect(user?.selectedLevel).toBeDefined()
      expect(user?.selectedLevel?.name).toBe('Beginner')
    })

    it('should update user selected level', async () => {
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        selectedLevelId: 'level-2',
        selectedLevel: {
          id: 'level-2',
          name: 'Intermediate',
          order: 2,
        },
      })

      const user = await updateUserSelectedLevel('user-1', 'level-2')
      expect(user).toBeDefined()
      expect(user?.selectedLevelId).toBe('level-2')
      expect(user?.selectedLevel?.name).toBe('Intermediate')
    })

    it('should authenticate user with correct password', async () => {
      const password = 'testPassword123'
      const passwordHash = await hashPassword(password)

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash,
        firstName: 'John',
        lastName: 'Doe',
        selectedLevelId: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        profilePictureUrl: null,
      })

      const result = await authenticateUser('testuser', password)
      expect(result).toBeDefined()
      expect(result?.token).toBeDefined()
      expect(result?.user.username).toBe('testuser')
    })

    it('should return null for authentication with wrong password', async () => {
      const password = 'testPassword123'
      const wrongPassword = 'wrongPassword456'
      const passwordHash = await hashPassword(password)

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash,
        firstName: 'John',
        lastName: 'Doe',
        selectedLevelId: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        profilePictureUrl: null,
      })

      const result = await authenticateUser('testuser', wrongPassword)
      expect(result).toBeNull()
    })

    it('should return null for authentication with non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await authenticateUser('nonexistent', 'password123')
      expect(result).toBeNull()
    })
  })
})
