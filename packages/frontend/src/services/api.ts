/**
 * Base API client for making authenticated requests
 */

import type { ApiError } from '../types/api'

interface ApiClientConfig {
  baseUrl?: string
  getToken?: () => string | null
}

export class ApiClient {
  private baseUrl: string
  private getToken: () => string | null

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || '/api'
    this.getToken = config.getToken || (() => null)
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const url = `${this.baseUrl}${endpoint}`

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await this.extractError(response)
        throw new Error(errorData.error || `Request failed with status ${response.status}`)
      }

      return (await response.json()) as T
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('An unexpected error occurred')
    }
  }

  private async extractError(response: Response): Promise<ApiError> {
    try {
      const text = await response.text()
      if (!text) {
        return { error: response.statusText || `Request failed with status ${response.status}` }
      }

      const data = JSON.parse(text)
      return { error: data.error || data.message || 'An error occurred' }
    } catch {
      return { error: response.statusText || `Request failed with status ${response.status}` }
    }
  }

  public get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  public post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  public put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  public delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}
