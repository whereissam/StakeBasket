/**
 * Global request limiter to prevent API rate limiting
 */

class RequestLimiter {
  private queue: Array<() => Promise<any>> = []
  private activeRequests = 0
  private maxConcurrent = 3 // Max 3 concurrent requests
  private minDelay = 200 // 200ms between requests
  private lastRequestTime = 0

  async addRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await requestFn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
      return
    }

    // Ensure minimum delay between requests
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.minDelay) {
      setTimeout(() => this.processQueue(), this.minDelay - timeSinceLastRequest)
      return
    }

    const request = this.queue.shift()
    if (!request) return

    this.activeRequests++
    this.lastRequestTime = Date.now()

    try {
      await request()
    } catch (error) {
      console.warn('Request failed:', error)
    } finally {
      this.activeRequests--
      // Process next request after a small delay
      setTimeout(() => this.processQueue(), this.minDelay)
    }
  }
}

export const requestLimiter = new RequestLimiter()

// Wrapper for fetch requests
export const limitedFetch = (url: string, options?: RequestInit): Promise<Response> => {
  return requestLimiter.addRequest(() => fetch(url, options))
}