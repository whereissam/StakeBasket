// Simple logger utility for development and production
class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  error(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, ...args)
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, ...args)
    }
  }

  info(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, ...args)
    }
  }

  debug(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args)
    }
  }
}

export const logger = new Logger()