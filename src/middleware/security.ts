import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../lib/logger';

// IP whitelist for admin operations (evaluated dynamically from env)
function getAdminIPWhitelist(): string[] {
  return (
    process.env.ADMIN_IP_WHITELIST?.split(',')
      .map((ip) => ip.trim())
      .filter(Boolean) || []
  );
}

// Suspicious activity detection
const suspiciousPatterns = [
  /union.*select/i,
  /script.*alert/i,
  /<script/i,
  /javascript:/i,
  /vbscript:/i,
  /onload=/i,
  /onerror=/i,
  /eval\(/i,
  /document\.cookie/i,
  /\.\.\/\.\.\//,
  /etc\/passwd/i,
  /proc\/self\/environ/i,
];

export interface SecurityContext {
  ip: string;
  userAgent: string;
  timestamp: number;
  userId?: string;
  riskScore: number;
}

export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private suspiciousActivity: Map<string, SecurityContext[]> = new Map();
  private blockedIPs: Set<string> = new Set();
  private readonly MAX_RISK_SCORE = 100;
  private readonly BLOCK_THRESHOLD = 80;

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  analyzeRequest(request: FastifyRequest): SecurityContext {
    const ip = request.ip;
    const userAgent = request.headers['user-agent'] || '';
    const timestamp = Date.now();
    const userId = (request as any).user?.id;

    let riskScore = 0;

    // Check for suspicious patterns in URL and headers
    const url = request.url;
    const referer = request.headers.referer || '';

    suspiciousPatterns.forEach((pattern) => {
      if (pattern.test(url) || pattern.test(referer) || pattern.test(userAgent)) {
        riskScore += 25;
      }
    });

    // Check for unusual request patterns
    if (request.method === 'POST' && !request.headers['content-type']) {
      riskScore += 10;
    }

    // Check for missing or suspicious user agent
    if (!userAgent || userAgent.length < 10) {
      riskScore += 15;
    }

    // Check for rapid requests from same IP
    const recentActivity = this.suspiciousActivity.get(ip) || [];
    const recentRequests = recentActivity.filter(
      (activity) => timestamp - activity.timestamp < 60000, // Last minute
    );

    if (recentRequests.length > 50) {
      riskScore += 30;
    }

    // Check for blocked IP
    if (this.blockedIPs.has(ip)) {
      riskScore = this.MAX_RISK_SCORE;
    }

    const context: SecurityContext = {
      ip,
      userAgent,
      timestamp,
      userId,
      riskScore: Math.min(riskScore, this.MAX_RISK_SCORE),
    };

    // Store activity
    recentActivity.push(context);
    this.suspiciousActivity.set(ip, recentActivity.slice(-100)); // Keep last 100 requests

    // Auto-block if risk score is too high
    if (riskScore >= this.BLOCK_THRESHOLD) {
      this.blockedIPs.add(ip);
      logger.security(
        'ip_auto_blocked',
        {
          ip,
          riskScore,
          userAgent,
          url: request.url,
          method: request.method,
        },
        request,
      );
    }

    return context;
  }

  isBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  blockIP(ip: string, reason: string): void {
    this.blockedIPs.add(ip);
    logger.security('ip_manually_blocked', { ip, reason });
  }

  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    logger.security('ip_unblocked', { ip });
  }

  getBlockedIPs(): string[] {
    return Array.from(this.blockedIPs);
  }

  // Clean up old activity data
  cleanup(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    for (const [ip, activities] of this.suspiciousActivity.entries()) {
      const filtered = activities.filter((activity) => activity.timestamp > cutoff);
      if (filtered.length === 0) {
        this.suspiciousActivity.delete(ip);
      } else {
        this.suspiciousActivity.set(ip, filtered);
      }
    }
  }
}

// Security middleware
export async function securityMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const monitor = SecurityMonitor.getInstance();
  const context = monitor.analyzeRequest(request);

  // Block high-risk requests
  if (context.riskScore >= 80) {
    logger.security(
      'request_blocked',
      {
        ip: context.ip,
        riskScore: context.riskScore,
        url: request.url,
        method: request.method,
        userAgent: context.userAgent,
      },
      request,
    );

    reply.code(403).send({
      error: 'Forbidden',
      message: 'Request blocked due to security policy',
    });
    return;
  }

  // Log medium-risk requests
  if (context.riskScore >= 40) {
    logger.security(
      'suspicious_request',
      {
        ip: context.ip,
        riskScore: context.riskScore,
        url: request.url,
        method: request.method,
        userAgent: context.userAgent,
      },
      request,
    );
  }

  // Add security context to request
  (request as any).securityContext = context;
}

// Admin IP restriction middleware
export async function adminIPRestriction(request: FastifyRequest, reply: FastifyReply) {
  const ADMIN_IP_WHITELIST = getAdminIPWhitelist();
  const isProd = process.env.NODE_ENV === 'production';
  const clientIP = request.ip;

  if (ADMIN_IP_WHITELIST.length === 0) {
    if (isProd) {
      logger.security(
        'admin_ip_allowlist_missing',
        {
          ip: clientIP,
          url: request.url,
          userAgent: request.headers['user-agent'],
        },
        request,
      );
      reply.code(403).send({
        error: 'Forbidden',
        message: 'Admin access restricted to authorized IPs',
      });
      return;
    }
    // In non-production, allow by default for developer convenience
    return;
  }

  if (!ADMIN_IP_WHITELIST.includes(clientIP)) {
    logger.security(
      'admin_access_denied',
      {
        ip: clientIP,
        url: request.url,
        userAgent: request.headers['user-agent'],
      },
      request,
    );
    reply.code(403).send({
      error: 'Forbidden',
      message: 'Admin access restricted to authorized IPs',
    });
    return;
  }
}

// Content Security Policy violation handler
export async function cspViolationHandler(request: FastifyRequest, reply: FastifyReply) {
  const violation = request.body as any;

  logger.security(
    'csp_violation',
    {
      ip: request.ip,
      violation: {
        documentURI: violation['document-uri'],
        violatedDirective: violation['violated-directive'],
        blockedURI: violation['blocked-uri'],
        sourceFile: violation['source-file'],
        lineNumber: violation['line-number'],
      },
    },
    request,
  );

  reply.code(204).send();
}

// Initialize security monitor cleanup
setInterval(
  () => {
    SecurityMonitor.getInstance().cleanup();
  },
  60 * 60 * 1000,
); // Run cleanup every hour
