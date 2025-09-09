import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export interface QueryPerformanceMetrics {
  query: string;
  duration: number;
  timestamp: string;
  parameters?: any;
  rowCount?: number;
}

export interface DatabaseOptimizationReport {
  timestamp: string;
  connectionPool: {
    active: number;
    idle: number;
    total: number;
  };
  slowQueries: QueryPerformanceMetrics[];
  indexUsage: {
    table: string;
    index: string;
    usage: number;
  }[];
  recommendations: string[];
}

class DatabaseOptimizer {
  private prisma: PrismaClient;
  private queryMetrics: QueryPerformanceMetrics[] = [];
  private slowQueryThreshold = 1000; // 1 second

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.setupQueryLogging();
  }

  private setupQueryLogging(): void {
    // Enable query logging for performance monitoring
    this.prisma.$on('query' as any, (e: any) => {
      const duration = e.duration;
      const query = e.query;
      const params = e.params;

      const metric: QueryPerformanceMetrics = {
        query,
        duration,
        timestamp: new Date().toISOString(),
        parameters: params
      };

      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        logger.warn('Slow database query detected', {
          operation: 'slow_query',
          duration,
          metadata: { query: query.substring(0, 200), duration }
        });
      }

      // Store metrics for analysis
      this.queryMetrics.push(metric);
      
      // Keep only last 1000 queries
      if (this.queryMetrics.length > 1000) {
        this.queryMetrics = this.queryMetrics.slice(-1000);
      }
    });
  }

  // Optimize discovery queries for matching algorithm
  async optimizeDiscoveryQueries(): Promise<void> {
    logger.info('Optimizing discovery queries', { operation: 'db_optimization' });

    try {
      // Create composite indexes for common discovery patterns
      await this.prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profile_discovery 
        ON "Profile" (age, gender, visibility, status) 
        WHERE visibility = 'PUBLIC' AND status = 'ACTIVE'
      `;

      await this.prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_proximity 
        ON "Location" (latitude, longitude)
      `;

      await this.prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_swipe_history 
        ON "Swipe" (userId, targetUserId, createdAt)
      `;

      logger.info('Discovery query optimization completed', { operation: 'db_optimization' });
    } catch (error) {
      logger.error('Failed to optimize discovery queries', { operation: 'db_optimization' }, error as Error);
    }
  }

  // Optimize messaging queries
  async optimizeMessagingQueries(): Promise<void> {
    logger.info('Optimizing messaging queries', { operation: 'db_optimization' });

    try {
      // Optimize conversation and message queries
      await this.prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_last_message 
        ON "Conversation" (lastMessageAt DESC)
      `;

      await this.prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_conversation_time 
        ON "Message" (conversationId, createdAt DESC)
      `;

      await this.prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_unread 
        ON "Message" (conversationId, readAt) 
        WHERE readAt IS NULL
      `;

      logger.info('Messaging query optimization completed', { operation: 'db_optimization' });
    } catch (error) {
      logger.error('Failed to optimize messaging queries', { operation: 'db_optimization' }, error as Error);
    }
  }

  // Analyze query performance
  async analyzeQueryPerformance(): Promise<DatabaseOptimizationReport> {
    const startTime = Date.now();

    try {
      // Get slow queries from the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const slowQueries = this.queryMetrics.filter(
        metric => metric.timestamp > oneHourAgo && metric.duration > this.slowQueryThreshold
      );

      // Get database statistics
      const dbStats = await this.getDatabaseStatistics();
      
      // Generate recommendations
      const recommendations = this.generateOptimizationRecommendations(slowQueries, dbStats);

      const report: DatabaseOptimizationReport = {
        timestamp: new Date().toISOString(),
        connectionPool: {
          active: 0, // Would need to implement connection pool monitoring
          idle: 0,
          total: 0
        },
        slowQueries: slowQueries.slice(0, 10), // Top 10 slow queries
        indexUsage: dbStats.indexUsage,
        recommendations
      };

      const duration = Date.now() - startTime;
      logger.info('Database performance analysis completed', {
        operation: 'db_analysis',
        duration,
        metadata: { 
          slowQueriesCount: slowQueries.length,
          recommendationsCount: recommendations.length
        }
      });

      return report;
    } catch (error) {
      logger.error('Failed to analyze query performance', { operation: 'db_analysis' }, error as Error);
      throw error;
    }
  }

  private async getDatabaseStatistics(): Promise<any> {
    try {
      // Get index usage statistics
      const indexUsage = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'public'
        ORDER BY idx_tup_read DESC
        LIMIT 20
      `;

      // Get table sizes
      const tableSizes = await this.prisma.$queryRaw`
        SELECT 
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `;

      return {
        indexUsage: indexUsage as any[],
        tableSizes: tableSizes as any[]
      };
    } catch (error) {
      logger.error('Failed to get database statistics', { operation: 'db_stats' }, error as Error);
      return { indexUsage: [], tableSizes: [] };
    }
  }

  private generateOptimizationRecommendations(
    slowQueries: QueryPerformanceMetrics[],
    dbStats: any
  ): string[] {
    const recommendations: string[] = [];

    // Analyze slow queries
    if (slowQueries.length > 0) {
      const avgSlowQueryTime = slowQueries.reduce((sum, q) => sum + q.duration, 0) / slowQueries.length;
      recommendations.push(`Found ${slowQueries.length} slow queries with average duration ${avgSlowQueryTime.toFixed(2)}ms`);
      
      // Check for common patterns
      const selectQueries = slowQueries.filter(q => q.query.toLowerCase().includes('select'));
      if (selectQueries.length > slowQueries.length * 0.8) {
        recommendations.push('Consider adding indexes for frequently queried columns');
      }

      const joinQueries = slowQueries.filter(q => q.query.toLowerCase().includes('join'));
      if (joinQueries.length > 0) {
        recommendations.push('Review JOIN operations and ensure proper indexing on join columns');
      }
    }

    // Check for missing indexes on large tables
    const largeTables = dbStats.tableSizes?.filter((table: any) => 
      table.size && (table.size.includes('MB') || table.size.includes('GB'))
    );
    
    if (largeTables?.length > 0) {
      recommendations.push('Consider partitioning large tables for better performance');
    }

    // General recommendations
    if (this.queryMetrics.length > 500) {
      const avgQueryTime = this.queryMetrics.reduce((sum, q) => sum + q.duration, 0) / this.queryMetrics.length;
      if (avgQueryTime > 100) {
        recommendations.push('Overall query performance could be improved with better indexing strategy');
      }
    }

    return recommendations;
  }

  // Get current query metrics
  getQueryMetrics(): QueryPerformanceMetrics[] {
    return [...this.queryMetrics];
  }

  // Clear query metrics
  clearMetrics(): void {
    this.queryMetrics = [];
    logger.info('Query metrics cleared', { operation: 'db_metrics' });
  }

  // Set slow query threshold
  setSlowQueryThreshold(milliseconds: number): void {
    this.slowQueryThreshold = milliseconds;
    logger.info('Slow query threshold updated', { 
      operation: 'db_config',
      metadata: { threshold: milliseconds }
    });
  }

  // Vacuum and analyze tables for performance
  async performMaintenance(): Promise<void> {
    logger.info('Starting database maintenance', { operation: 'db_maintenance' });

    try {
      // Update table statistics
      await this.prisma.$executeRaw`ANALYZE`;
      
      logger.info('Database maintenance completed', { operation: 'db_maintenance' });
    } catch (error) {
      logger.error('Database maintenance failed', { operation: 'db_maintenance' }, error as Error);
      throw error;
    }
  }
}

export { DatabaseOptimizer };
