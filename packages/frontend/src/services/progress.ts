import type { GetProgressSummaryResponse, GetStoryProgressResponse } from '../types/api'
import { ApiClient } from './api'

interface ProgressServiceConfig {
  getToken: () => string | null
}

export class ProgressService {
  private client: ApiClient

  constructor(config: ProgressServiceConfig) {
    this.client = new ApiClient({
      getToken: config.getToken,
    })
  }

  getProgressSummary() {
    return this.client.get<GetProgressSummaryResponse>('/progress/summary')
  }

  getStoryProgress(storyId: string) {
    return this.client.get<GetStoryProgressResponse>(`/progress/stories/${storyId}`)
  }
}
