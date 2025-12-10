import { env } from '@config/env.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const COLORS = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  reset: '\x1b[0m'
};

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class Logger {
  private minLevel: number;

  constructor(logLevel: string = 'info') {
    this.minLevel = LOG_LEVELS[logLevel as LogLevel] || LOG_LEVELS.info;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.minLevel;
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const color = COLORS[level];
    const levelStr = level.toUpperCase().padEnd(5);

    let formatted = `${color}[${timestamp}] ${levelStr}${COLORS.reset} ${message}`;

    if (meta) {
      formatted += '\n' + JSON.stringify(meta, null, 2);
    }

    return formatted;
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, meta));
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, meta));
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  error(message: string, error?: Error | any): void {
    if (this.shouldLog('error')) {
      const meta = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error;
      console.error(this.formatMessage('error', message, meta));
    }
  }
}

export const logger = new Logger(env.app.logLevel);
