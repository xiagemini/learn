import { describe, it, expect, vi } from 'vitest'
import { Context } from 'hono'
import { authMiddleware, requireAuth } from './auth'
import * as authService from '../services/auth'

// Mock the auth service
vi.mock('../services/auth', () => ({
  verifyToken: vi.fn(),
}))

describe('Auth Middleware', () => {
  describe('authMiddleware', () => {
    it('should attach user to context when valid token is provided', async () => {
      const mockUser = {
        userId: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }

      vi.mocked(authService.verifyToken).mockResolvedValue(mockUser)

      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue('Bearer valid-token'),
        },
        set: vi.fn(),
        get: vi.fn(),
      } as unknown as Context

      const nextFn = vi.fn()

      await authMiddleware(mockContext, nextFn)

      expect(mockContext.set).toHaveBeenCalledWith('user', mockUser)
      expect(nextFn).toHaveBeenCalled()
    })

    it('should call next without setting user when no Authorization header', async () => {
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue(undefined),
        },
        set: vi.fn(),
        get: vi.fn(),
      } as unknown as Context

      const nextFn = vi.fn()

      await authMiddleware(mockContext, nextFn)

      expect(mockContext.set).not.toHaveBeenCalled()
      expect(nextFn).toHaveBeenCalled()
    })

    it('should call next without setting user when Authorization header is invalid format', async () => {
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue('InvalidFormat token'),
        },
        set: vi.fn(),
        get: vi.fn(),
      } as unknown as Context

      const nextFn = vi.fn()

      await authMiddleware(mockContext, nextFn)

      expect(mockContext.set).not.toHaveBeenCalled()
      expect(nextFn).toHaveBeenCalled()
    })

    it('should call next without setting user when token verification fails', async () => {
      vi.mocked(authService.verifyToken).mockResolvedValue(null)

      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue('Bearer invalid-token'),
        },
        set: vi.fn(),
        get: vi.fn(),
      } as unknown as Context

      const nextFn = vi.fn()

      await authMiddleware(mockContext, nextFn)

      expect(mockContext.set).not.toHaveBeenCalled()
      expect(nextFn).toHaveBeenCalled()
    })
  })

  describe('requireAuth middleware', () => {
    it('should call next when user is present', async () => {
      const mockUser = {
        userId: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
      }

      const mockContext = {
        get: vi.fn().mockReturnValue(mockUser),
        json: vi.fn(),
      } as unknown as Context

      const nextFn = vi.fn()

      await requireAuth(mockContext, nextFn)

      expect(nextFn).toHaveBeenCalled()
      expect(mockContext.json).not.toHaveBeenCalled()
    })

    it('should return 401 when user is not present', async () => {
      const mockContext = {
        get: vi.fn().mockReturnValue(undefined),
        json: vi.fn().mockReturnValue({ status: 401 }),
      } as unknown as Context

      const nextFn = vi.fn()

      await requireAuth(mockContext, nextFn)

      expect(nextFn).not.toHaveBeenCalled()
      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Unauthorized' },
        401
      )
    })
  })
})
