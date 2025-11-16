import type { GetDailyPlansResponse, GetStoriesByLevelResponse } from '../types/api'
import { ApiClient } from './api'

interface CoursesServiceConfig {
  getToken: () => string | null
}

export class CoursesService {
  private client: ApiClient

  constructor(config: CoursesServiceConfig) {
    this.client = new ApiClient({
      getToken: config.getToken,
    })
  }

  getStoriesByLevel(levelId: string) {
    return this.client.get<GetStoriesByLevelResponse>(`/courses/levels/${levelId}/stories`)
  }

  getDailyPlans(params?: {
    startDate?: string
    endDate?: string
    overdueOnly?: boolean
  }) {
    const searchParams = new URLSearchParams()

    if (params?.startDate) {
      searchParams.set('startDate', params.startDate)
    }

    if (params?.endDate) {
      searchParams.set('endDate', params.endDate)
    }

    if (params?.overdueOnly !== undefined) {
      searchParams.set('overdueOnly', String(params.overdueOnly))
    }

    const query = searchParams.toString()
    const endpoint = `/courses/daily-plans${query ? `?${query}` : ''}`

    return this.client.get<GetDailyPlansResponse>(endpoint)
  }
}
