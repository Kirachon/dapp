import { FastifyRequest } from 'fastify';
import { randomUUID } from 'crypto';

// Enhanced logging utility with correlation IDs and structured logging
export interface LogContext {
  correlationId?: string;
  userId?: string;
  operation?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  correlationId?: string;
  userId?: string;
  operation?: string;
  duration?: number;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';
  private logLevel = process.env.LOG_LEVEL || (this.isProduction ? 'info' : 'debug');

  private shouldLog(level: string): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level as keyof typeof levels] >= levels[this.logLevel as keyof typeof levels];
  }

  private formatLog(level: 'info' | 'warn' | 'error' | 'debug', message: string, context?: LogContext, error?: Error): LogEntry {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: this.isProduction ? undefined : error.stack
      };
    }

    return logEntry;
  }

  private output(logEntry: LogEntry): void {
    if (!this.shouldLog(logEntry.level)) return;

    if (this.isProduction) {
      // Structured JSON logging for production
      console.log(JSON.stringify(logEntry));
    } else {
      // Human-readable logging for development
      const { timestamp, level, message, correlationId, userId, operation, duration, error } = logEntry;
      const prefix = `[${timestamp}] ${level.toUpperCase()}`;
      const context = [
        correlationId && `correlationId=${correlationId}`,
        userId && `userId=${userId}`,
        operation && `operation=${operation}`,
        duration && `duration=${duration}ms`
      ].filter(Boolean).join(' ');
      
      const logMessage = context ? `${prefix} ${message} (${context})` : `${prefix} ${message}`;
      
      if (error) {
        console.log(`${logMessage}\nError: ${error.message}\n${error.stack || ''}`);
      } else {
        console.log(logMessage);
      }
    }
  }

  info(message: string, context?: LogContext): void {
    this.output(this.formatLog('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    this.output(this.formatLog('warn', message, context));
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.output(this.formatLog('error', message, context, error));
  }

  debug(message: string, context?: LogContext): void {
    this.output(this.formatLog('debug', message, context));
  }

  // Performance logging helper
  time(operation: string, context?: Omit<LogContext, 'operation' | 'duration'>): () => void {
    const startTime = Date.now();
    const correlationId = context?.correlationId || randomUUID();
    
    this.debug(`Starting operation: ${operation}`, { ...context, operation, correlationId });
    
    return () => {
      const duration = Date.now() - startTime;
      this.info(`Completed operation: ${operation}`, { ...context, operation, duration, correlationId });
    };
  }

  // Security event logging
  security(event: string, details: Record<string, any>, request?: FastifyRequest): void {
    const context: LogContext = {
      correlationId: request?.headers['x-correlation-id'] as string || randomUUID(),
      operation: 'security_event',
      metadata: {
        event,
        details,
        ip: request?.ip,
        userAgent: request?.headers['user-agent'],
        url: request?.url,
        method: request?.method
      }
    };

    this.warn(`Security event: ${event}`, context);
  }

  // API request logging
  apiRequest(request: FastifyRequest, response: { statusCode: number }, duration: number): void {
    const context: LogContext = {
      correlationId: request.headers['x-correlation-id'] as string || randomUUID(),
      operation: 'api_request',
      duration,
      metadata: {
        method: request.method,
        url: request.url,
        statusCode: response.statusCode,
        ip: request.ip,
        userAgent: request.headers['user-agent']
      }
    };

    if (response.statusCode >= 400) {
      this.warn(`API request failed: ${request.method} ${request.url}`, context);
    } else {
      this.info(`API request: ${request.method} ${request.url}`, context);
    }
  }

  // Database operation logging
  database(operation: string, table: string, duration: number, context?: LogContext): void {
    this.debug(`Database operation: ${operation} on ${table}`, {
      ...context,
      operation: 'database',
      duration,
      metadata: { table, dbOperation: operation }
    });
  }

  // GraphQL operation logging
  graphql(operationName: string, operationType: 'query' | 'mutation' | 'subscription', duration: number, context?: LogContext): void {
    this.info(`GraphQL ${operationType}: ${operationName}`, {
      ...context,
      operation: 'graphql',
      duration,
      metadata: { operationName, operationType }
    });
  }
}

// Singleton logger instance
export const logger = new Logger();

// Correlation ID middleware for Fastify
export function correlationIdMiddleware() {
  return async (request: FastifyRequest, reply: any) => {
    const correlationId = request.headers['x-correlation-id'] as string || randomUUID();
    request.headers['x-correlation-id'] = correlationId;
    reply.header('x-correlation-id', correlationId);
  };
}

// Request/Response logging hooks
export function requestLoggingMiddleware() {
  return async (request: FastifyRequest) => {
    // Mark start time on request object; used by onResponse hook
    (request as any)._startTime = Date.now();
  };
}

export function responseLoggingHook() {
  return async (request: FastifyRequest, reply: any) => {
    const startTime = (request as any)._startTime as number | undefined;
    const duration = typeof startTime === 'number' ? Date.now() - startTime : undefined;
    logger.apiRequest(request, { statusCode: reply.statusCode }, duration ?? 0);
  };
}

// Error logging helper
export function logError(error: Error, context?: LogContext): void {
  logger.error(error.message, context, error);
}

// Performance monitoring helper
export function withPerformanceLogging<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const endTimer = logger.time(operation, context);
  
  return fn()
    .then(result => {
      endTimer();
      return result;
    })
    .catch(error => {
      endTimer();
      logger.error(`Operation failed: ${operation}`, context, error);
      throw error;
    });
}

export default logger;
