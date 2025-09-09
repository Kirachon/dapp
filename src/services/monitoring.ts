import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';
import { FastifyInstance } from 'fastify';
import { createClient as createRedisClient } from 'redis';
import { Client as MinioClient } from 'minio';

export interface SystemMetrics {
  timestamp: string;
  system: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
  };
  database: {
    users: number;
    profiles: number;
    matches: number;
    conversations: number;
    messages: number;
    activeUsers24h: number;
    newUsersToday: number;
  };
  api: {
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
  };
  realtime: {
    activeConnections: number;
    messagesPerMinute: number;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'up' | 'down' | 'degraded';
    redis: 'up' | 'down' | 'degraded';
    minio: 'up' | 'down' | 'degraded';
    socketio: 'up' | 'down' | 'degraded';
  };
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    duration: number;
  }[];
}

class MonitoringService {
  private prisma: PrismaClient;
  private metrics: Map<string, any> = new Map();
  private requestCount = 0;
  private errorCount = 0;
  private responseTimes: number[] = [];
  private activeConnections = 0;
  private messagesPerMinute = 0;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.startMetricsCollection();
  }

  private startMetricsCollection(): void {
    // Collect metrics every minute
    setInterval(() => {
      this.collectMetrics().catch(error => {
        logger.error('Failed to collect metrics', { operation: 'metrics_collection' }, error);
      });
    }, 60000);

    // Reset per-minute counters
    setInterval(() => {
      this.messagesPerMinute = 0;
      this.responseTimes = this.responseTimes.slice(-100); // Keep last 100 response times
    }, 60000);
  }

  // Record API request metrics
  recordRequest(duration: number, statusCode: number): void {
    this.requestCount++;
    this.responseTimes.push(duration);
    
    if (statusCode >= 400) {
      this.errorCount++;
    }
  }

  // Record real-time metrics
  recordConnection(connected: boolean): void {
    if (connected) {
      this.activeConnections++;
    } else {
      this.activeConnections = Math.max(0, this.activeConnections - 1);
    }
  }

  recordMessage(): void {
    this.messagesPerMinute++;
  }

  // Collect comprehensive system metrics
  private async collectMetrics(): Promise<SystemMetrics> {
    const startTime = Date.now();
    
    try {
      // System metrics
      const memUsage = process.memoryUsage();
      const systemMetrics = {
        uptime: process.uptime(),
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
        },
        cpu: {
          usage: process.cpuUsage().user / 1000000 // Convert to seconds
        }
      };

      // Database metrics
      const [
        userCount,
        profileCount,
        matchCount,
        conversationCount,
        messageCount,
        activeUsers24h,
        newUsersToday
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.profile.count(),
        this.prisma.match.count(),
        this.prisma.conversation.count(),
        this.prisma.message.count(),
        this.prisma.user.count({
          where: {
            lastActiveAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        }),
        this.prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        })
      ]);

      // API metrics
      const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
      const avgResponseTime = this.responseTimes.length > 0 
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
        : 0;

      const metrics: SystemMetrics = {
        timestamp: new Date().toISOString(),
        system: systemMetrics,
        database: {
          users: userCount,
          profiles: profileCount,
          matches: matchCount,
          conversations: conversationCount,
          messages: messageCount,
          activeUsers24h,
          newUsersToday
        },
        api: {
          totalRequests: this.requestCount,
          errorRate: Math.round(errorRate * 100) / 100,
          averageResponseTime: Math.round(avgResponseTime * 100) / 100
        },
        realtime: {
          activeConnections: this.activeConnections,
          messagesPerMinute: this.messagesPerMinute
        }
      };

      // Store metrics for trending
      this.metrics.set(Date.now().toString(), metrics);
      
      // Keep only last 24 hours of metrics
      const cutoff = Date.now() - (24 * 60 * 60 * 1000);
      for (const [timestamp] of this.metrics) {
        if (parseInt(timestamp) < cutoff) {
          this.metrics.delete(timestamp);
        }
      }

      const duration = Date.now() - startTime;
      logger.debug('Metrics collected', { operation: 'metrics_collection', duration });

      return metrics;
    } catch (error) {
      logger.error('Failed to collect metrics', { operation: 'metrics_collection' }, error as Error);
      throw error;
    }
  }

  // Get current metrics
  async getCurrentMetrics(): Promise<SystemMetrics> {
    return this.collectMetrics();
  }

  // Get metrics history
  getMetricsHistory(hours: number = 24): SystemMetrics[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return Array.from(this.metrics.entries())
      .filter(([timestamp]) => parseInt(timestamp) >= cutoff)
      .map(([, metrics]) => metrics)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Comprehensive health check
  async performHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    const checks: HealthStatus['checks'] = [];
    
    // Database health check
    const dbCheck = await this.checkDatabase();
    checks.push(dbCheck);

    // Redis health check (if available)
    const redisCheck = await this.checkRedis();
    checks.push(redisCheck);

    // MinIO health check (if available)
    const minioCheck = await this.checkMinIO();
    checks.push(minioCheck);

    // Socket.IO health check
    const socketCheck = await this.checkSocketIO();
    checks.push(socketCheck);

    // Determine overall status
    const failedChecks = checks.filter(check => check.status === 'fail');
    const warnChecks = checks.filter(check => check.status === 'warn');
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (failedChecks.length > 0) {
      overallStatus = 'unhealthy';
    } else if (warnChecks.length > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: dbCheck.status === 'pass' ? 'up' : dbCheck.status === 'warn' ? 'degraded' : 'down',
        redis: redisCheck.status === 'pass' ? 'up' : redisCheck.status === 'warn' ? 'degraded' : 'down',
        minio: minioCheck.status === 'pass' ? 'up' : minioCheck.status === 'warn' ? 'degraded' : 'down',
        socketio: socketCheck.status === 'pass' ? 'up' : socketCheck.status === 'warn' ? 'degraded' : 'down'
      },
      checks
    };

    const duration = Date.now() - startTime;
    logger.info('Health check completed', { 
      operation: 'health_check', 
      duration,
      metadata: { status: overallStatus, failedChecks: failedChecks.length }
    });

    return healthStatus;
  }

  private async checkDatabase(): Promise<HealthStatus['checks'][0]> {
    const startTime = Date.now();

    const op = async (): Promise<HealthStatus['checks'][0]> => {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        const duration = Date.now() - startTime;

        if (duration > 1000) {
          return {
            name: 'database',
            status: 'warn',
            message: `Database responding slowly (${duration}ms)`,
            duration
          };
        }

        return {
          name: 'database',
          status: 'pass',
          message: 'Database connection healthy',
          duration
        };
      } catch (error) {
        return {
          name: 'database',
          status: 'fail',
          message: `Database connection failed: ${(error as Error).message}`,
          duration: Date.now() - startTime
        };
      }
    };

    return await Promise.race([
      op(),
      new Promise<HealthStatus['checks'][0]>((resolve) =>
        setTimeout(() =>
          resolve({
            name: 'database',
            status: 'warn',
            message: 'Database check timed out after 2000ms',
            duration: Date.now() - startTime
          })
        , 2000)
      )
    ]);
  }

  private async checkRedis(): Promise<HealthStatus['checks'][0]> {
    const startTime = Date.now();
    const url = process.env.REDIS_URL || 'redis://redis:6379';
    let client: ReturnType<typeof createRedisClient> | undefined;

    const op = async (): Promise<HealthStatus['checks'][0]> => {
      try {
        client = createRedisClient({ url, socket: { connectTimeout: 3000 } });
        await client.connect();
        const pong = await client.ping();
        await client.quit();
        return {
          name: 'redis',
          status: pong === 'PONG' ? 'pass' : 'warn',
          message: pong === 'PONG' ? 'Redis connection healthy' : `Unexpected PING response: ${pong}`,
          duration: Date.now() - startTime
        };
      } catch (error) {
        try { await client?.quit(); } catch {}
        return {
          name: 'redis',
          status: 'fail',
          message: `Redis check failed: ${(error as Error).message}`,
          duration: Date.now() - startTime
        };
      }
    };

    return await Promise.race([
      op(),
      new Promise<HealthStatus['checks'][0]>((resolve) =>
        setTimeout(async () => {
          try { await client?.quit(); } catch {}
          resolve({
            name: 'redis',
            status: 'warn',
            message: 'Redis check timed out after 3000ms',
            duration: Date.now() - startTime
          });
        }, 3000)
      )
    ]);
  }

  private async checkMinIO(): Promise<HealthStatus['checks'][0]> {
    const startTime = Date.now();
    const endPoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = parseInt(process.env.MINIO_PORT || '9000', 10);
    const useSSL = process.env.MINIO_USE_SSL === 'true';
    const accessKey = process.env.MINIO_ROOT_USER || 'minio';
    const secretKey = process.env.MINIO_ROOT_PASSWORD || 'minio123';

    const op = async (): Promise<HealthStatus['checks'][0]> => {
      try {
        const client = new MinioClient({ endPoint, port, useSSL, accessKey, secretKey });
        // Connectivity test: list buckets (minimal call)
        await client.listBuckets();
        return {
          name: 'minio',
          status: 'pass',
          message: 'MinIO connection healthy',
          duration: Date.now() - startTime
        };
      } catch (error) {
        return {
          name: 'minio',
          status: 'fail',
          message: `MinIO check failed: ${(error as Error).message}`,
          duration: Date.now() - startTime
        };
      }
    };

    return await Promise.race([
      op(),
      new Promise<HealthStatus['checks'][0]>((resolve) =>
        setTimeout(() =>
          resolve({
            name: 'minio',
            status: 'warn',
            message: 'MinIO check timed out after 3000ms',
            duration: Date.now() - startTime
          })
        , 3000)
      )
    ]);
  }

  private async checkSocketIO(): Promise<HealthStatus['checks'][0]> {
    const startTime = Date.now();

    const op = async (): Promise<HealthStatus['checks'][0]> => {
      try {
        // Check if Socket.IO service is available
        const socketService = (global as any).socketService;
        if (socketService) {
          return {
            name: 'socketio',
            status: 'pass',
            message: 'Socket.IO service running',
            duration: Date.now() - startTime
          };
        } else {
          return {
            name: 'socketio',
            status: 'warn',
            message: 'Socket.IO service not initialized',
            duration: Date.now() - startTime
          };
        }
      } catch (error) {
        return {
          name: 'socketio',
          status: 'fail',
          message: `Socket.IO check failed: ${(error as Error).message}`,
          duration: Date.now() - startTime
        };
      }
    };

    return await Promise.race([
      op(),
      new Promise<HealthStatus['checks'][0]>((resolve) =>
        setTimeout(() =>
          resolve({
            name: 'socketio',
            status: 'warn',
            message: 'Socket.IO check timed out after 1000ms',
            duration: Date.now() - startTime
          })
        , 1000)
      )
    ]);
  }
}

export { MonitoringService };
