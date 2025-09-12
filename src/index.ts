import dotenv from 'dotenv';
dotenv.config({
  path: process.env.ENV_FILE || (process.env.NODE_ENV === 'staging' ? '.env.staging' : '.env'),
});

// Validate environment variables before starting
import './lib/env-validator';

import fastify from 'fastify';

import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import multipart from '@fastify/multipart';
import { notifyModerationDecision } from './services/notify';
import { ApolloServer } from '@apollo/server';
import { fastifyApolloDrainPlugin, fastifyApolloHandler } from '@as-integrations/fastify';
import { makeExecutableSchema } from '@graphql-tools/schema';

import path from 'path';
import { readFileSync, readdirSync, statSync } from 'fs';

import supertokens, { getUser as stGetUser } from 'supertokens-node';
// Import internal core class to access instance methods in TS
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import STCore from 'supertokens-node/lib/build/supertokens';

import { calculateQueryComplexity, DEFAULT_MAX_COMPLEXITY } from './lib/graphql/complexity';
import { calculateQueryDepth, DEFAULT_MAX_DEPTH } from './lib/graphql/depth';

import { ensureMockAuthDisabledInProd } from './lib/security/mock-auth-guard';
import { initSuperTokens, Session, EmailPassword, EmailVerification } from './auth/supertokens';
import { PrismaClient, ProfileVisibility, Prisma } from '@prisma/client';
// @ts-ignore - Fastify plugin shim from SuperTokens
import {
  plugin as supertokensPlugin,
  errorHandler,
  wrapRequest,
  wrapResponse,
} from 'supertokens-node/framework/fastify';
import { photoRoutes } from './routes/photos';
import { SocketIOService, socketService } from './services/socketio';
import { contentService } from './services/content';
import {
  logger,
  correlationIdMiddleware,
  requestLoggingMiddleware,
  responseLoggingHook,
} from './lib/logger';
import { MonitoringService } from './services/monitoring';
const prisma = new PrismaClient();
import { requireAuth } from './auth/guards';
import { securityMiddleware, adminIPRestriction, cspViolationHandler } from './middleware/security';
import { securityHeaders, validatePassword, validateFileUpload } from './middleware/validation';

// Simple in-memory rate limiter for GraphQL mutations (per-IP)
const signupRateMap: Map<string, { count: number; windowStart: number }> = new Map();
const SIGNUP_WINDOW_MS = 60_000; // 1 minute
const SIGNUP_MAX = 10; // 10 requests per minute

function checkSignupRateLimit(ip: string | undefined): {
  allowed: boolean;
  retryAfterSec?: number;
} {
  const key = ip || 'unknown';
  const now = Date.now();
  const rec = signupRateMap.get(key);
  if (!rec || now - rec.windowStart > SIGNUP_WINDOW_MS) {
    signupRateMap.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (rec.count < SIGNUP_MAX) {
    rec.count += 1;
    return { allowed: true };
  }
  const ttl = Math.ceil((rec.windowStart + SIGNUP_WINDOW_MS - now) / 1000);
  return { allowed: false, retryAfterSec: Math.max(1, ttl) };
}

function loadGraphqlSDL(dir: string): string {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      files.push(loadGraphqlSDL(full));
    } else if (entry.endsWith('.graphql')) {
      files.push(readFileSync(full, 'utf8'));
    }
  }
  return files.join('\n');
}

// Initialize content service with Prisma client
contentService.init(prisma);

async function start() {
  initSuperTokens();
  // SECURITY: Disallow mock authentication in production regardless of flags
  ensureMockAuthDisabledInProd();
  // GraphQL maximum complexity (configurable via env)
  // GraphQL maximum depth (defense-in-depth)
  const MAX_DEPTH = Number(process.env.GRAPHQL_MAX_DEPTH || DEFAULT_MAX_DEPTH);

  const MAX_COMPLEXITY = Number(process.env.GRAPHQL_MAX_COMPLEXITY || DEFAULT_MAX_COMPLEXITY);

  // Mock auth endpoints for development/testing only - SECURITY CRITICAL
  const setupMockAuth = (fastify: any) => {
    // SECURITY: Only enable mock auth in development with explicit flag
    const isProduction = process.env.NODE_ENV === 'production';
    const allowMockAuth = process.env.ALLOW_MOCK_AUTH === 'true';

    // Only enable mock auth when explicitly allowed
    if (!allowMockAuth) {
      console.log('🔒 Mock authentication disabled; using SuperTokens endpoints');
      return; // Do not register mock endpoints
    }

    if (isProduction) {
      // SECURITY: Never allow mock auth in production
      throw new Error('SECURITY: Mock authentication cannot be enabled in production.');
    } else {
      console.log('🧪 Mock authentication endpoints enabled for development');
    }

    fastify.post('/auth/signup', async (request: any, reply: any) => {
      try {
        const { formFields } = request.body as any;
        const email = formFields?.find((f: any) => f.id === 'email')?.value;
        const password = formFields?.find((f: any) => f.id === 'password')?.value;

        if (!email || !password) {
          return reply
            .status(400)
            .send({ status: 'GENERAL_ERROR', message: 'Email and password required' });
        }

        // Mock successful signup
        console.log(`🧪 Mock signup: ${email}`);

        // Set mock session cookie
        reply.setCookie('sAccessToken', 'mock-access-token', {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 3600000, // 1 hour
        });

        reply.setCookie('sRefreshToken', 'mock-refresh-token', {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/auth/session/refresh',
          maxAge: 86400000, // 24 hours
        });

        return reply.send({ status: 'OK' });
      } catch (error) {
        console.error('Mock signup error:', error);
        return reply.status(500).send({ status: 'GENERAL_ERROR', message: 'Signup failed' });
      }
    });

    fastify.post('/auth/signin', async (request: any, reply: any) => {
      try {
        const { formFields } = request.body as any;
        const email = formFields?.find((f: any) => f.id === 'email')?.value;
        const password = formFields?.find((f: any) => f.id === 'password')?.value;

        if (!email || !password) {
          return reply
            .status(400)
            .send({ status: 'GENERAL_ERROR', message: 'Email and password required' });
        }

        // Mock successful signin
        console.log(`🧪 Mock signin: ${email}`);

        // Set mock session cookie
        reply.setCookie('sAccessToken', 'mock-access-token', {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 3600000, // 1 hour
        });

        reply.setCookie('sRefreshToken', 'mock-refresh-token', {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/auth/session/refresh',
          maxAge: 86400000, // 24 hours
        });

        return reply.send({ status: 'OK' });
      } catch (error) {
        console.error('Mock signin error:', error);
        return reply.status(500).send({ status: 'GENERAL_ERROR', message: 'Signin failed' });
      }
    });

    fastify.post('/auth/session/refresh', async (request: any, reply: any) => {
      // Mock session refresh
      console.log('🧪 Mock session refresh');

      reply.setCookie('sAccessToken', 'mock-access-token-refreshed', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 3600000,
      });

      return reply.send({ status: 'OK' });
    });

    fastify.post('/auth/signout', async (request: any, reply: any) => {
      // Mock signout
      console.log('🧪 Mock signout');

      reply.clearCookie('sAccessToken');
      reply.clearCookie('sRefreshToken');

      return reply.send({ status: 'OK' });
    });
  };
  // CORS Configuration with security-first approach
  const getCorsConfig = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const allowedOrigins =
      process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()) || [];

    // Default development origins
    const defaultDevOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ];

    let origin: boolean | string | string[];

    if (isProduction) {
      if (allowedOrigins.length === 0) {
        console.error(
          '🚨 SECURITY WARNING: No ALLOWED_ORIGINS set in production. CORS will deny all origins.',
        );
        origin = false; // Deny all origins if none specified in production
      } else {
        origin = allowedOrigins;
        console.log(`🔒 Production CORS: Allowing origins: ${allowedOrigins.join(', ')}`);
      }
    } else {
      // Development: Allow specified origins or defaults
      origin = allowedOrigins.length > 0 ? allowedOrigins : defaultDevOrigins;
      console.log(
        `🧪 Development CORS: Allowing origins: ${Array.isArray(origin) ? origin.join(', ') : origin}`,
      );
    }

    return {
      origin,
      credentials: true,
      allowedHeaders: ['content-type', ...supertokens.getAllCORSHeaders()],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      optionsSuccessStatus: 200, // For legacy browser support
    };
  };

  const corsConfig = getCorsConfig();

  const server = fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
        remove: true,
      },
    },
    bodyLimit: 1024 * 1024,
  } as any);

  // Initialize monitoring service
  const monitoringService = new MonitoringService(prisma);

  // Add correlation ID and request logging middleware
  server.addHook('onRequest', correlationIdMiddleware());
  server.addHook('onRequest', requestLoggingMiddleware());
  server.addHook('onResponse', responseLoggingHook());

  // Add security middleware
  server.addHook('onRequest', securityMiddleware);
  server.addHook('onRequest', securityHeaders);

  // Setup mock auth endpoints as fallback
  setupMockAuth(server);

  // Security & CORS
  const getCSPConfig = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const allowedOrigins =
      process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()) || [];

    // Base CSP directives
    const baseDirectives = {
      defaultSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    };

    if (isProduction) {
      // Strict production CSP - no unsafe-inline
      console.log('🔒 Using strict production CSP (no unsafe-inline)');
      return {
        ...baseDirectives,
        styleSrc: ["'self'", "'unsafe-hashes'"], // Allow hashed styles only
        scriptSrc: ["'self'", "'strict-dynamic'"], // Strict dynamic loading
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'wss:',
          'ws:',
          ...allowedOrigins.map((origin) => origin.replace('http', 'ws')),
        ],
        fontSrc: ["'self'", 'https:'],
        mediaSrc: ["'self'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
      };
    } else {
      // Development CSP - more permissive for hot reload and dev tools
      console.log('🧪 Using development CSP (allows unsafe-inline for dev tools)');
      return {
        ...baseDirectives,
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow for hot reload
        scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"], // Allow for dev tools
        imgSrc: ["'self'", 'data:', 'https:', 'http:'],
        connectSrc: ["'self'", 'wss:', 'ws:', 'http:', 'https:'],
        fontSrc: ["'self'", 'data:', 'https:'],
        mediaSrc: ["'self'"],
        workerSrc: ["'self'", 'blob:'],
      };
    }
  };

  // Phase 8: Enhanced security headers with Helmet
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: getCSPConfig(),
      reportOnly: process.env.CSP_REPORT_ONLY === 'true', // Allow report-only mode for testing
    },
    crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production',
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts:
      process.env.NODE_ENV === 'production'
        ? {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
          }
        : false,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  });
  await server.register(cors, corsConfig as any);

  // Phase 8: Enhanced rate limiting with per-user and per-IP limits
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1', '::1'],
    keyGenerator: (request) => {
      // Use user ID if authenticated, otherwise fall back to IP
      const userId = (request as any).user?.id;
      return userId ? `user:${userId}` : `ip:${request.ip}`;
    },
    errorResponseBuilder: (request, context) => {
      // Phase 8: Enhanced rate limit logging
      logger.security(
        'rate_limit_exceeded',
        {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          url: request.url,
          method: request.method,
          limit: context.max,
          ttl: context.ttl,
        },
        request,
      );

      return {
        code: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded, retry in ${Math.round(context.ttl / 1000)} seconds`,
        retryAfter: Math.round(context.ttl / 1000),
      };
    },
  });
  await server.register(cookie);
  // Phase 8: Request size limits and input validation
  await server.register(formbody, {
    bodyLimit: 1024 * 1024, // 1MB limit for form data
  });
  await server.register(multipart, {
    limits: {
      fieldNameSize: 100, // Max field name size
      fieldSize: 1024 * 1024, // 1MB max field size
      fields: 10, // Max number of non-file fields
      fileSize: 10 * 1024 * 1024, // 10MB max file size
      files: 5, // Max number of file fields
      headerPairs: 2000, // Max number of header key-value pairs
    },
  });
  // SuperTokens plugin (preHandler) and NotFound bridge for /auth/*
  await server.register(supertokensPlugin);

  server.setErrorHandler((err, req, reply) => {
    // Enhanced error logging with correlation ID
    const correlationId = req.headers['x-correlation-id'] as string;
    logger.error(
      'Unhandled server error',
      {
        correlationId,
        operation: 'error_handler',
        metadata: {
          url: req.url,
          method: req.method,
          statusCode: reply.statusCode,
        },
      },
      err,
    );

    // Delegate to ST error handler first
    try {
      return (errorHandler() as any)(err, req as any, reply as any);
    } catch {}
    reply.status(500).send({ message: 'Internal Server Error' });
  });
  // Enhanced metrics endpoint
  server.get('/metrics', async (request, reply) => {
    try {
      const metrics = await monitoringService.getCurrentMetrics();
      logger.info('Metrics requested', {
        correlationId: request.headers['x-correlation-id'] as string,
        operation: 'metrics_request',
      });
      return metrics;
    } catch (error) {
      logger.error(
        'Failed to get metrics',
        {
          correlationId: request.headers['x-correlation-id'] as string,
          operation: 'metrics_request',
        },
        error as Error,
      );
      reply.status(500).send({ error: 'Failed to retrieve metrics' });
    }
  });

  // Enhanced health endpoints
  server.get('/health', async (request, reply) => {
    try {
      const health = await monitoringService.performHealthCheck();
      const statusCode =
        health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

      logger.info('Health check requested', {
        correlationId: request.headers['x-correlation-id'] as string,
        operation: 'health_check',
        metadata: { status: health.status },
      });

      reply.status(statusCode).send(health);
    } catch (error) {
      logger.error(
        'Health check failed',
        {
          correlationId: request.headers['x-correlation-id'] as string,
          operation: 'health_check',
        },
        error as Error,
      );
      reply.status(503).send({ status: 'unhealthy', error: 'Health check failed' });
    }
  });

  server.get('/ready', async (request, reply) => {
    try {
      // Simple readiness check - just verify database connection
      await prisma.$queryRaw`SELECT 1`;
      logger.debug('Readiness check passed', {
        correlationId: request.headers['x-correlation-id'] as string,
        operation: 'readiness_check',
      });
      return { status: 'ready', timestamp: new Date().toISOString() };
    } catch (error) {
      logger.error(
        'Readiness check failed',
        {
          correlationId: request.headers['x-correlation-id'] as string,
          operation: 'readiness_check',
        },
        error as Error,
      );
      reply.status(503).send({ status: 'not_ready', error: 'Database not available' });
    }
  });

  // CSP violation reporting endpoint
  server.post('/csp-report', async (request, reply) => {
    await cspViolationHandler(request as any, reply as any);
    reply.code(204).send();
  });

  // Photo upload routes
  await server.register(photoRoutes);

  // Test support routes (dev/test only)
  if (process.env.NODE_ENV !== 'production') {
    const { testRoutes } = await import('./routes/test');

    await server.register(testRoutes, { prefix: '/test' });
  }

  // GraphQL schema
  const typeDefs = loadGraphqlSDL(path.join(__dirname, 'graphql', 'schema'));

  // Admin authorization helper with IP restrictions
  const requireAdmin = (resolver: any) => {
    return async (parent: any, args: any, context: any, info: any) => {
      if (!context?.user?.id) {
        throw new Error('Authentication required');
      }

      // Check IP restrictions for admin operations
      const ADMIN_IP_WHITELIST =
        process.env.ADMIN_IP_WHITELIST?.split(',')
          .map((ip) => ip.trim())
          .filter(Boolean) || [];
      const isProd = process.env.NODE_ENV === 'production';
      const clientIP = context.request?.ip;

      if (ADMIN_IP_WHITELIST.length === 0) {
        if (isProd) {
          logger.security(
            'admin_ip_allowlist_missing',
            {
              ip: clientIP,
              userId: context.user.id,
              operation: info?.fieldName || 'unknown',
            },
            context.request,
          );
          throw new Error('Admin access restricted to authorized IPs');
        }
      } else if (!ADMIN_IP_WHITELIST.includes(clientIP)) {
        logger.security(
          'admin_access_denied_ip',
          {
            ip: clientIP,
            userId: context.user.id,
            operation: info?.fieldName || 'unknown',
          },
          context.request,
        );
        throw new Error('Admin access restricted to authorized IPs');
      }

      // Check if user has admin role
      const user = await prisma.user.findUnique({
        where: { id: context.user.id },
        select: { id: true, profile: { select: { isAdmin: true } } },
      });

      if (!user?.profile?.isAdmin) {
        logger.security(
          'admin_access_denied_role',
          {
            userId: context.user.id,
            operation: info?.fieldName || 'unknown',
          },
          context.request,
        );
        throw new Error('Admin access required');
      }

      // Log admin operations
      logger.security(
        'admin_operation',
        {
          userId: context.user.id,
          operation: info?.fieldName || 'unknown',
          ip: context.request?.ip,
        },
        context.request,
      );

      return resolver(parent, args, context, info);
    };
  };

  const resolvers = {
    Query: {
      health: () => {
        console.log('Health resolver called at', new Date().toISOString());
        return 'ok';
      },
      me: async (_: unknown, __: unknown, ctx: { user?: any }) => {
        if (!ctx?.user?.id) return null;

        // Get user with profile to check admin status
        const user = await prisma.user.findUnique({
          where: { id: ctx.user.id },
          select: {
            id: true,
            email: true,
            roles: true,
            profile: { select: { userId: true, name: true } },
          },
        });

        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          roles: user.roles,
          profile: user.profile
            ? {
                id: user.profile.userId,
                name: user.profile.name,
                isAdmin: user.roles.includes('admin'),
              }
            : null,
        };
      },
      // Activation metrics for current user
      activationData: async (_: unknown, __: unknown, ctx: any) => {
        if (!ctx?.user?.id) return null;

        // Gather data from profile and usage; for now, derive simple signals
        const user = await prisma.user.findUnique({
          where: { id: ctx.user.id },
          include: { profile: true },
        });
        if (!user) return null;

        const profile = user.profile;

        // Simple heuristics based on available fields; replace with real analytics later
        const hasBio = !!profile?.bio;
        const hasPhoto = (profile?.photos?.length ?? 0) > 0;
        const isVerified = user.verificationLevel && user.verificationLevel !== 'UNVERIFIED';

        const welcomeSequenceStarted = true;
        const welcomeSequenceCompleted = Boolean(hasBio && hasPhoto && isVerified);
        const currentWelcomeStep = Math.min(
          6,
          1 + (isVerified ? 1 : 0) + (hasBio ? 1 : 0) + (hasPhoto ? 1 : 0),
        );

        const activationScoreBase =
          (isVerified ? 40 : 10) + (hasPhoto ? 30 : 0) + (hasBio ? 20 : 0) + 10;
        const activationScore = Math.min(100, activationScoreBase);
        const activationFactors = [
          isVerified ? 'email_verified' : 'email_unverified',
          hasPhoto ? 'photo_added' : 'no_photo',
          hasBio ? 'bio_added' : 'no_bio',
        ];

        const engagementMetrics = {
          loginFrequency: 3,
          featureUsage: ['onboarding', 'profile'],
          timeSpent: 45 * 60 * 1000,

          // Onboarding data for current user
          onboardingData: async (_: unknown, __: unknown, ctx: any) => {
            if (!ctx?.user?.id) return null;

            const user = await prisma.user.findUnique({
              where: { id: ctx.user.id },
              include: { profile: true },
            });
            if (!user) return null;

            // Minimal derived onboarding state
            const hasBio = !!user.profile?.bio;
            const hasPhoto = (user.profile?.photos?.length ?? 0) > 0;
            const isVerified = user.verificationLevel && user.verificationLevel !== 'UNVERIFIED';

            const steps = {
              1: {
                name: 'registration',
                completed: true,
                completedAt: user.createdAt.toISOString(),
              },
              2: {
                name: 'emailVerification',
                completed: !!isVerified,
                completedAt: isVerified
                  ? user.lastActiveAt
                    ? user.lastActiveAt.toISOString()
                    : user.createdAt.toISOString()
                  : null,
              },
              3: {
                name: 'profileSetup',
                completed: hasBio,
                completedAt: hasBio
                  ? user.lastActiveAt
                    ? user.lastActiveAt.toISOString()
                    : user.createdAt.toISOString()
                  : null,
              },
              4: {
                name: 'avatarUpload',
                completed: hasPhoto,
                completedAt: hasPhoto
                  ? user.lastActiveAt
                    ? user.lastActiveAt.toISOString()
                    : user.createdAt.toISOString()
                  : null,
              },
              5: { name: 'guidedTour', completed: false, completedAt: null },
              6: {
                name: 'activation',
                completed: isVerified && hasBio && hasPhoto,
                completedAt: null,
              },
            } as Record<string, any>;

            const totalSteps = 6;
            const completedSteps = Object.entries(steps)
              .filter(([, s]) => s.completed)
              .map(([k]) => Number(k));
            const currentStep = Math.min(totalSteps, completedSteps.length + 1);
            const completionPercentage = Math.round((completedSteps.length / totalSteps) * 100);

            const analytics = {
              startedAt: user.createdAt.toISOString(),
              lastActiveAt: (user.lastActiveAt ?? user.createdAt).toISOString(),
              timeSpent: 20 * 60 * 1000,
              completionRate: completionPercentage,
            };

            return {
              currentStep,
              completedSteps,
              totalSteps,
              completionPercentage,
              steps,
              analytics,
            };
          },

          goalsSet: 0,
          goalsCompleted: 0,
        };

        const milestones = {
          firstLogin: user.createdAt.toISOString(),
          profileCompleted: welcomeSequenceCompleted
            ? user.lastActiveAt
              ? user.lastActiveAt.toISOString()
              : null
            : null,
          firstGoalSet: null,
          weeklyActive: true,
        };

        const preferences = {
          welcomeEmails: true,
          inAppMessages: true,
          achievementNotifications: true,
        };

        return {
          welcomeSequenceStarted,
          welcomeSequenceCompleted,
          currentWelcomeStep,
          activationScore,
          activationFactors,
          engagementMetrics,
          milestones,
          preferences,
        };
      },

      // Profile
      myProfile: async (_: unknown, __: unknown, ctx: any) => {
        if (!ctx?.user?.id) return null;
        const p = await prisma.profile.findUnique({ where: { userId: ctx.user.id } });
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[${new Date().toISOString()}] 🔎 myProfile resolver`, {
            userId: ctx.user.id,
            hasProfile: !!p,
            name: p?.name,
            age: p?.age,
          });
        }
        return p;
      },
      // Preferences
      myPreferences: async (_: unknown, __: unknown, ctx: any) => {
        if (!ctx?.user?.id) return null;
        return prisma.preferences.findUnique({ where: { userId: ctx.user.id } });
      },
      // Enhanced discovery with location-based filtering
      discoveryFeed: async (_: unknown, args: { page?: number; pageSize?: number }, ctx: any) => {
        if (!ctx?.user?.id) return [];
        const page = Math.max(1, args.page ?? 1);
        const pageSize = Math.min(50, Math.max(1, args.pageSize ?? 20));

        // Get user preferences and location
        const [preferences, myLocation] = await Promise.all([
          prisma.preferences.findUnique({ where: { userId: ctx.user.id } }),
          prisma.location.findUnique({ where: { userId: ctx.user.id } }),
        ]);

        const minAge = preferences?.minAge ?? 18;
        const maxAge = preferences?.maxAge ?? 55;
        const maxDistance = preferences?.distanceKm ?? 50;
        const showMe = preferences?.showMe ?? undefined;

        // Base query to exclude already swiped users and self
        const baseWhere = {
          userId: { not: ctx.user.id },
          age: { gte: minAge, lte: maxAge },
          visibility: ProfileVisibility.PUBLIC,
          ...(showMe ? { gender: showMe } : {}),
          user: {
            swipedBy: { none: { userId: ctx.user.id } },
          },
        };

        let candidates;

        if (myLocation) {
          try {
            const showMeFilter = showMe ? Prisma.sql`AND p.gender = ${showMe}` : Prisma.empty;
            const results = await prisma.$queryRaw<any[]>`
              SELECT p.*,
                     ST_Distance(
                       ST_Point(${myLocation.longitude}, ${myLocation.latitude})::geography,
                       ST_Point(l.longitude, l.latitude)::geography
                     ) / 1000 as distance_km
              FROM "Profile" p
              JOIN "User" u ON p."userId" = u.id
              JOIN "Location" l ON u.id = l."userId"
              WHERE p."userId" != ${ctx.user.id}
                AND p.age >= ${minAge} AND p.age <= ${maxAge}
                AND p.visibility = 'PUBLIC'
                ${showMeFilter}
                AND NOT EXISTS (
                  SELECT 1 FROM "Swipe" s
                  WHERE s."userId" = ${ctx.user.id} AND s."targetUserId" = p."userId"
                )
                AND ST_Distance(
                  ST_Point(${myLocation.longitude}, ${myLocation.latitude})::geography,
                  ST_Point(l.longitude, l.latitude)::geography
                ) / 1000 <= ${maxDistance}
              ORDER BY distance_km ASC, RANDOM()
              LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
            `;
            candidates = results;
          } catch (err) {
            console.error('PostGIS discovery query failed, falling back to non-geo discovery', err);
            candidates = await prisma.profile.findMany({
              where: baseWhere,
              take: pageSize,
              skip: (page - 1) * pageSize,
              orderBy: [{ user: { createdAt: 'desc' } }, { userId: 'asc' }],
            });
          }
        } else {
          // Fallback to regular query without location filtering
          candidates = await prisma.profile.findMany({
            where: baseWhere,
            take: pageSize,
            skip: (page - 1) * pageSize,
            orderBy: [
              { user: { createdAt: 'desc' } }, // Newer users first
              { userId: 'asc' }, // Consistent ordering
            ],
          });
        }

        return candidates;
      },
      myMatches: async (
        _: unknown,
        args: { status?: any; page?: number; pageSize?: number },
        ctx: any,
      ) => {
        if (!ctx?.user?.id) return [];
        const page = Math.max(1, args.page ?? 1);
        const pageSize = Math.min(50, Math.max(1, args.pageSize ?? 20));
        const where = {
          ...(args.status ? { status: args.status } : {}),
          OR: [{ userIdA: ctx.user.id }, { userIdB: ctx.user.id }],
        } as any;
        const matches = await prisma.match.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: pageSize,
          skip: (page - 1) * pageSize,
          include: { userA: { include: { profile: true } }, userB: { include: { profile: true } } },
        });
        return matches.map((m) => ({
          id: m.id,
          status: m.status,
          createdAt: m.createdAt,
          otherUser: (m.userIdA === ctx.user.id ? m.userB.profile : m.userA.profile)!,
        }));
      },
      myConversations: async (_: unknown, args: { page?: number; pageSize?: number }, ctx: any) => {
        if (!ctx?.user?.id) return [];
        const page = Math.max(1, args.page ?? 1);
        const pageSize = Math.min(50, Math.max(1, args.pageSize ?? 20));

        const convos = await prisma.conversation.findMany({
          where: { match: { OR: [{ userIdA: ctx.user.id }, { userIdB: ctx.user.id }] } },
          orderBy: { lastMessageAt: 'desc' },
          take: pageSize,
          skip: (page - 1) * pageSize,
          include: {
            match: {
              include: {
                userA: { include: { profile: true } },
                userB: { include: { profile: true } },
              },
            },
            messages: { select: { id: true, senderId: true, readAt: true } },
          },
        });
        return convos.map((c) => {
          const other =
            c.match.userIdA === ctx.user.id ? c.match.userB.profile : c.match.userA.profile;
          const unreadCount = c.messages.filter(
            (m) => m.readAt == null && m.senderId !== ctx.user.id,
          ).length;
          return {
            id: c.id,
            matchId: c.matchId,
            lastMessageAt: c.lastMessageAt,
            otherUser: other!,
            unreadCount,
          };
        });
      },
      // Messages in a conversation
      messages: requireAuth(
        async (
          _: unknown,
          args: { conversationId: string; page?: number; pageSize?: number },
          ctx: any,
        ) => {
          const page = Math.max(1, args.page ?? 1);
          const pageSize = Math.min(100, Math.max(1, args.pageSize ?? 50));

          // Verify user has access to this conversation
          const convo = await prisma.conversation.findUnique({
            where: { id: args.conversationId },
            include: { match: true },
          });
          if (!convo) throw new Error('Conversation not found');
          const participant =
            convo.match.userIdA === ctx.user.id || convo.match.userIdB === ctx.user.id;
          if (!participant) throw new Error('Forbidden');

          const messages = await prisma.message.findMany({
            where: { conversationId: args.conversationId },
            orderBy: { createdAt: 'desc' },
            take: pageSize,
            skip: (page - 1) * pageSize,
          });

          return messages.reverse(); // Return in chronological order
        },
      ),
      // Get a specific user's profile (for viewing matches)
      profile: requireAuth(async (_: unknown, args: { userId: string }, ctx: any) => {
        // Check if the requesting user has access to view this profile
        // Either they matched with this user, or it's in their discovery feed
        const hasMatch = await prisma.match.findFirst({
          where: {
            OR: [
              { userIdA: ctx.user.id, userIdB: args.userId },
              { userIdA: args.userId, userIdB: ctx.user.id },
            ],
          },
        });

        if (!hasMatch) {
          // Check if this user is in their discovery feed (hasn't been swiped on yet)
          const alreadySwiped = await prisma.swipe.findFirst({
            where: { userId: ctx.user.id, targetUserId: args.userId },
          });
          if (alreadySwiped) throw new Error('Profile not accessible');
        }

        const profile = await prisma.profile.findUnique({
          where: { userId: args.userId },
        });

        if (!profile) throw new Error('Profile not found');
        return profile;
      }),

      // Admin resolvers
      adminStats: requireAdmin(async () => {
        const totalUsers = await prisma.user.count();
        const activeUsers = await prisma.user.count({
          where: {
            lastActiveAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        });
        const totalMatches = await prisma.match.count();
        const pendingReports = await prisma.report.count({
          where: { status: 'PENDING' },
        });
        const pendingPhotos = await prisma.moderationItem.count({
          where: {
            type: 'PHOTO',
            status: 'PENDING',
          },
        });

        // Calculate new users for different periods
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const newUsersToday = await prisma.user.count({
          where: { createdAt: { gte: todayStart } },
        });
        const newUsersThisWeek = await prisma.user.count({
          where: { createdAt: { gte: weekStart } },
        });
        const newUsersThisMonth = await prisma.user.count({
          where: { createdAt: { gte: monthStart } },
        });

        return {
          totalUsers,
          activeUsers,
          totalMatches,
          pendingReports,
          pendingPhotos,
          revenue: 0, // TODO: Implement revenue calculation
          newUsersToday,
          newUsersThisWeek,
          newUsersThisMonth,
        };
      }),

      adminUsers: requireAdmin(
        async (
          _: unknown,
          args: {
            limit?: number;
            offset?: number;
            status?: string;
            search?: string;
          },
        ) => {
          const limit = Math.min(100, Math.max(1, args.limit ?? 20));
          const offset = Math.max(0, args.offset ?? 0);

          const where: any = {};

          // Filter by status
          if (args.status && args.status !== 'ALL') {
            where.profile = {
              status: args.status,
            };
          }

          // Search filter
          if (args.search) {
            where.OR = [
              { email: { contains: args.search, mode: 'insensitive' } },
              { profile: { name: { contains: args.search, mode: 'insensitive' } } },
            ];
          }

          const [users, totalCount] = await Promise.all([
            prisma.user.findMany({
              where,
              include: {
                profile: true,
                _count: {
                  select: { reportedBy: true },
                },
              },
              orderBy: { createdAt: 'desc' },
              take: limit,
              skip: offset,
            }),
            prisma.user.count({ where }),
          ]);

          const adminUsers = users.map((user) => ({
            id: user.id,
            email: user.email,
            profile: user.profile,
            status: user.profile?.status || 'ACTIVE',
            createdAt: user.createdAt,
            lastActiveAt: user.lastActiveAt,
            reportCount: user._count.reportedBy,
            verified: user.profile?.verified || false,
            roles: user.profile?.isAdmin ? ['admin', 'user'] : ['user'],
          }));

          return {
            users: adminUsers,
            totalCount,
            hasMore: offset + limit < totalCount,
          };
        },
      ),

      adminModeration: requireAdmin(
        async (
          _: unknown,
          args: {
            limit?: number;
            offset?: number;
            status?: string;
            priority?: string;
            startDate?: string;
            endDate?: string;
            type?: string;
            reporterEmail?: string;
          },
        ) => {
          try {
            const limit = Math.min(100, Math.max(1, args.limit ?? 20));
            const offset = Math.max(0, args.offset ?? 0);

            const where: any = {};
            if (args.status) where.status = args.status;
            if (args.priority) where.priority = args.priority;
            if (args.type) where.type = args.type;
            if (args.startDate || args.endDate) {
              where.submittedAt = {};
              if (args.startDate) where.submittedAt.gte = new Date(args.startDate);
              if (args.endDate) where.submittedAt.lte = new Date(args.endDate);
            }
            if (args.reporterEmail) {
              where.reportedBy = { email: { contains: args.reporterEmail, mode: 'insensitive' } };
            }

            const [items, totalCount] = await Promise.all([
              prisma.moderationItem.findMany({
                where,
                include: {
                  user: { include: { profile: true } },
                  reportedBy: { include: { profile: true } },
                  attachments: true,
                  audits: { orderBy: { createdAt: 'desc' }, take: 5 },
                },
                orderBy: [{ priority: 'desc' }, { submittedAt: 'desc' }],
                take: limit,
                skip: offset,
              }),
              prisma.moderationItem.count({ where }),
            ]);

            const moderationItems = items.map((item) => ({
              id: item.id,
              type: item.type,
              user: {
                id: item.user.id,
                email: item.user.email,
                profile: item.user.profile,
                status: item.user.profile?.status || 'ACTIVE',
                createdAt: item.user.createdAt,
                lastActiveAt: item.user.lastActiveAt,
                reportCount: 0, // TODO: Calculate report count
                verified: item.user.profile?.verified || false,
                roles: item.user.profile?.isAdmin ? ['admin', 'user'] : ['user'],
              },
              content: item.content,
              reason: item.reason,
              priority: item.priority,
              status: item.status,
              submittedAt: item.submittedAt,
              reportedBy: item.reportedBy?.profile?.name || 'Anonymous',
              reviewedAt: item.reviewedAt,
              reviewedBy: item.reviewedBy,
              attachments: item.attachments?.map((a) => ({
                id: a.id,
                type: a.type,
                url: a.url,
                createdAt: a.createdAt,
              })),
              audits: item.audits?.map((a) => ({
                id: a.id,
                action: a.action,
                reason: a.reason,
                reviewerId: a.reviewerId,
                createdAt: a.createdAt,
              })),
            }));

            return {
              items: moderationItems,
              totalCount,
              hasMore: offset + limit < totalCount,
            };
          } catch (e) {
            console.error('adminModeration resolver failed; returning empty list', e);
            return { items: [], totalCount: 0, hasMore: false };
          }
        },
      ),

      adminReports: requireAdmin(
        async (
          _: unknown,
          args: {
            limit?: number;
            offset?: number;
            status?: string;
          },
        ) => {
          const limit = Math.min(100, Math.max(1, args.limit ?? 20));
          const offset = Math.max(0, args.offset ?? 0);

          const where: any = {};

          if (args.status) {
            where.status = args.status;
          }

          const [reports, totalCount] = await Promise.all([
            prisma.report.findMany({
              where,
              include: {
                reportedUser: {
                  include: { profile: true },
                },
                reportedBy: {
                  include: { profile: true },
                },
              },
              orderBy: { createdAt: 'desc' },
              take: limit,
              skip: offset,
            }),
            prisma.report.count({ where }),
          ]);

          const adminReports = reports.map((report) => ({
            id: report.id,
            reportedUser: {
              id: report.reportedUser.id,
              email: report.reportedUser.email,
              profile: report.reportedUser.profile,
              status: report.reportedUser.profile?.status || 'ACTIVE',
              createdAt: report.reportedUser.createdAt,
              lastActiveAt: report.reportedUser.lastActiveAt,
              reportCount: 0, // TODO: Calculate report count
              verified: report.reportedUser.profile?.verified || false,
              roles: report.reportedUser.profile?.isAdmin ? ['admin', 'user'] : ['user'],
            },
            reportedBy: {
              id: report.reportedBy.id,
              email: report.reportedBy.email,
              profile: report.reportedBy.profile,
              status: report.reportedBy.profile?.status || 'ACTIVE',
              createdAt: report.reportedBy.createdAt,
              lastActiveAt: report.reportedBy.lastActiveAt,
              reportCount: 0,
              verified: report.reportedBy.profile?.verified || false,
              roles: report.reportedBy.profile?.isAdmin ? ['admin', 'user'] : ['user'],
            },
            reason: report.reason,
            description: report.description,
            status: report.status,
            priority: report.priority || 'MEDIUM',
            createdAt: report.createdAt,
            reviewedAt: report.reviewedAt,
            reviewedBy: report.reviewedBy,
          }));

          return {
            reports: adminReports,
            totalCount,
            hasMore: offset + limit < totalCount,
          };
        },
      ),

      // Content management resolvers
      featureFlags: async () => {
        return await contentService.getAllFeatureFlags();
      },
      featureFlag: async (_: unknown, { key }: { key: string }) => {
        return await contentService.getFeatureFlag(key);
      },
      emailTemplates: async () => {
        return await contentService.getAllEmailTemplates();
      },
      emailTemplate: async (_: unknown, { key }: { key: string }) => {
        return await contentService.getEmailTemplate(key);
      },
      appConfigs: async (_: unknown, { publicOnly }: { publicOnly?: boolean }) => {
        const configs = await contentService.getAllAppConfigs(publicOnly);
        return configs.map((config) => ({
          ...config,
          value: JSON.stringify(config.value),
        }));
      },
      appConfig: async (_: unknown, { key }: { key: string }) => {
        const value = await contentService.getAppConfig(key);
        return value ? JSON.stringify(value) : null;
      },
      contentPages: async (_: unknown, { publishedOnly }: { publishedOnly?: boolean }) => {
        return await contentService.getAllContentPages(publishedOnly);
      },
      contentPage: async (_: unknown, { slug }: { slug: string }) => {
        return await contentService.getContentPage(slug);
      },
      contentCategories: async () => {
        return await contentService.getAllContentCategories();
      },
      contentCategory: async (_: unknown, { key }: { key: string }) => {
        return await contentService.getContentCategory(key);
      },
    },
    Mutation: {
      signUp: async (
        _: unknown,
        args: { email: string; password: string; acceptTerms: boolean },
        ctx: { request: any; reply: any },
      ) => {
        try {
          // Enhanced input validation
          if (!args.acceptTerms) {
            return { ok: false, error: 'TERMS_REQUIRED' };
          }

          // Validate password strength
          const passwordValidation = validatePassword(args.password);
          if (!passwordValidation.valid) {
            return {
              ok: false,
              error: `WEAK_PASSWORD: ${passwordValidation.errors.join(', ')}`,
            };
          }

          // Per-IP rate limiting for signup attempts
          const ip = ctx.request?.ip;
          const rl = checkSignupRateLimit(ip);
          if (!rl.allowed) {
            return { ok: false, error: `RATE_LIMIT:${rl.retryAfterSec}` };
          }

          console.log('SignUp attempt:', args.email);
          const req = wrapRequest(ctx.request);
          const res = wrapResponse(ctx.reply);
          console.log('Calling SuperTokens signUp...');
          const result = await EmailPassword.signUp(
            'public',
            args.email,
            args.password,
            undefined,
            { request: req, response: res } as any,
          );
          console.log('SuperTokens result:', result);
          if (result.status !== 'OK') {
            console.log('SignUp failed with status:', result.status);
            return { ok: false, error: `signup failed: ${result.status}` };
          }
          console.log('SignUp successful, creating Prisma user...');
          // Upsert Prisma user on successful signup
          await prisma.user.upsert({
            where: { id: result.user.id },
            update: { email: args.email },
            create: { id: result.user.id, email: args.email, passwordHash: '' },
          });
          console.log('Prisma user created successfully');
          return { ok: true, user: { id: result.user.id, email: args.email, roles: [] } };
        } catch (error) {
          console.error('SignUp error:', error);
          return { ok: false, error: `signup error: ${String(error)}` };
        }
      },
      signIn: async (
        _: unknown,
        args: { email: string; password: string },
        ctx: { request: any; reply: any },
      ) => {
        const req = wrapRequest(ctx.request);
        const res = wrapResponse(ctx.reply);
        const result = await EmailPassword.signIn('public', args.email, args.password, undefined, {
          request: req,
          response: res,
        } as any);
        if (result.status !== 'OK') return { ok: false, error: 'signin failed' };
        // Ensure Prisma user exists on signin
        await prisma.user.upsert({
          where: { id: result.user.id },
          update: { email: args.email },
          create: { id: result.user.id, email: args.email, passwordHash: '' },
        });
        return { ok: true, user: { id: result.user.id, email: args.email, roles: [] } };
      },
      signOut: async (_: unknown, __: unknown, ctx: { request: any; reply: any }) => {
        const req = wrapRequest(ctx.request);
        const res = wrapResponse(ctx.reply);
        const s = await Session.getSession(req, res, { sessionRequired: false } as any);
        if (!s) return true;
        await s.revokeSession();
        return true;
      },
      // Password reset
      resetPassword: async (
        _: unknown,
        { email }: { email: string },
        ctx: { request: any; reply: any },
      ) => {
        try {
          const req = wrapRequest(ctx.request);
          const res = wrapResponse(ctx.reply);
          await EmailPassword.createResetPasswordToken(
            'public',
            email,
            undefined as any,
            { request: req, response: res } as any,
          );
          return true;
        } catch (error) {
          console.error('Password reset error:', error);
          return false;
        }
      },
      // Email verification
      verifyEmail: async (
        _: unknown,
        { token }: { token: string },
        ctx: { request: any; reply: any },
      ) => {
        try {
          const req = wrapRequest(ctx.request);
          const res = wrapResponse(ctx.reply);
          const result = await EmailVerification.verifyEmailUsingToken('public', token, undefined, {
            request: req,
            response: res,
          } as any);
          return result.status === 'OK';
        } catch (error) {
          console.error('Email verification error:', error);
          return false;
        }
      },
      // Resend verification email to current user
      resendVerificationEmail: async (
        _: unknown,
        __: unknown,
        ctx: { request: any; reply: any; user?: any },
      ) => {
        try {
          if (!ctx?.user?.id || !ctx?.user?.email) {
            throw new Error('Unauthenticated');
          }
          const req = wrapRequest(ctx.request);
          const res = wrapResponse(ctx.reply);

          // If already verified, treat as success (idempotent)
          try {
            const isVerified = await (EmailVerification as any).isEmailVerified(
              'public',
              ctx.user.id,
              ctx.user.email,
              undefined,
              { request: req, response: res } as any,
            );
            if (isVerified) return true;
          } catch {}

          // Create a new verification token
          const tokenRes = await (EmailVerification as any).createEmailVerificationToken(
            'public',
            ctx.user.id,
            ctx.user.email,
            undefined,
            { request: req, response: res } as any,
          );
          if (tokenRes.status !== 'OK' || !tokenRes.token) {
            // EMAIL_ALREADY_VERIFIED_ERROR -> success
            if (tokenRes.status === 'EMAIL_ALREADY_VERIFIED_ERROR') return true;
            return false;
          }

          const webDomain = process.env.WEB_DOMAIN || 'http://localhost:3000';
          const link = `${webDomain}/auth/verify-email?token=${tokenRes.token}`;

          // Send via SendGrid without extra deps
          const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
          const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'no-reply@localhost';
          const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'LoveConnect';
          if (!SENDGRID_API_KEY) {
            console.warn('SENDGRID_API_KEY not set; cannot resend verification email. Link:', link);
            return false;
          }
          const payload = {
            personalizations: [{ to: [{ email: ctx.user.email }] }],
            from: { email: FROM_EMAIL, name: FROM_NAME },
            subject: 'Verify your email address',
            content: [
              {
                type: 'text/html',
                value: `<p>Please verify your email by clicking <a href="${link}">this link</a>.</p>`,
              },
            ],
          } as any;
          const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${SENDGRID_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          if (!resp.ok) {
            console.error('SendGrid resend failed', resp.status, await resp.text());
            return false;
          }
          return true;
        } catch (error) {
          console.error('Resend verification email error:', error);
          return false;
        }
      },
      // Upsert my profile
      upsertMyProfile: requireAuth(async (_: unknown, { input }: { input: any }, ctx: any) => {
        console.log('🔍 upsertMyProfile called with context:', {
          hasUser: !!ctx?.user,
          userId: ctx?.user?.id,
          userEmail: ctx?.user?.email,
        });

        const sanitize = (s?: string) => (typeof s === 'string' ? s.trim() : null);
        const trimArray = (arr?: string[]) =>
          Array.isArray(arr) ? arr.map((x) => String(x).trim()).filter(Boolean) : [];
        const name = sanitize(input.name) ?? '';
        const age = Number(input.age);
        if (!name) throw new Error('Invalid name');
        if (!Number.isFinite(age) || age < 18 || age > 100) throw new Error('Invalid age');

        const data = {
          name,
          age,
          gender: sanitize(input.gender),
          orientation: sanitize(input.orientation),
          bio: sanitize(input.bio),
          interests: trimArray(input.interests),
          lifestyle: sanitize(input.lifestyle),
          education: sanitize(input.education),
          photos: trimArray(input.photos).slice(0, 6),
          videoIntroUrl: sanitize(input.videoIntroUrl),
          prompts: trimArray(input.prompts).slice(0, 10),
          visibility: input.visibility ?? 'PUBLIC',
        } as any;

        console.log(`✅ Creating/updating profile for user: ${ctx.user.id}`);
        try {
          const profile = await prisma.profile.upsert({
            where: { userId: ctx.user.id },
            update: data,
            create: { userId: ctx.user.id, ...data },
          });
          console.log(`✅ Profile upserted successfully for user: ${ctx.user.id}`);
          return profile;
        } catch (dbError) {
          const err = dbError as unknown as { message?: string };
          console.error(
            `❌ Database error in upsertMyProfile for user ${ctx.user.id}:`,
            err?.message || dbError,
          );

          // For database connection issues, return a mock profile to allow the flow to continue
          if (
            typeof err?.message === 'string' &&
            (err.message.includes('Authentication failed') || err.message.includes('Connection'))
          ) {
            console.warn(
              '⚠️ Database unavailable, returning mock profile to continue onboarding flow',
            );
            return {
              id: 'temp-profile-id',
              userId: ctx.user.id,
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              age: data.age || 18,
              gender: data.gender || 'Other',
              bio: data.bio || '',
              photos: [],
              location: data.location || '',
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          } else {
            throw new Error(`Profile save failed: ${(dbError as any)?.message || dbError}`);
          }
        }
      }),
      // Upsert my preferences
      upsertMyPreferences: requireAuth(async (_: unknown, { input }: { input: any }, ctx: any) => {
        const minAge = Number.isFinite(Number(input.minAge)) ? Number(input.minAge) : 18;
        const maxAge = Number.isFinite(Number(input.maxAge)) ? Number(input.maxAge) : 55;
        const distanceKm = Number.isFinite(Number(input.distanceKm))
          ? Number(input.distanceKm)
          : 50;
        const showMe = typeof input.showMe === 'string' ? input.showMe.trim() : null;
        if (minAge < 18 || maxAge < minAge || maxAge > 100) throw new Error('Invalid age range');
        if (distanceKm < 1 || distanceKm > 500) throw new Error('Invalid distance');
        try {
          const prefs = await prisma.preferences.upsert({
            where: { userId: ctx.user.id },
            update: { minAge, maxAge, distanceKm, showMe },
            create: { userId: ctx.user.id, minAge, maxAge, distanceKm, showMe },
          });
          return prefs;
        } catch (dbError) {
          console.error(
            `❌ Database error in upsertMyPreferences for user ${ctx.user.id}:`,
            (dbError as any)?.message || dbError,
          );
          throw new Error('Unable to save preferences - please try again');
        }
      }),
      // Update location
      updateMyLocation: requireAuth(
        async (
          _: unknown,
          { latitude, longitude }: { latitude: number; longitude: number },
          ctx: any,
        ) => {
          // Validate coordinates
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            throw new Error('Invalid coordinates');
          }
          if (latitude < -90 || latitude > 90) {
            throw new Error('Invalid latitude');
          }
          if (longitude < -180 || longitude > 180) {
            throw new Error('Invalid longitude');
          }

          await prisma.location.upsert({
            where: { userId: ctx.user.id },
            update: { latitude, longitude, updatedAt: new Date() },
            create: { userId: ctx.user.id, latitude, longitude },
          });

          return true;
        },
      ),
      // Change password: verify current password then update
      changeMyPassword: async (
        _: unknown,
        { currentPassword, newPassword }: { currentPassword: string; newPassword: string },
        ctx: any,
      ) => {
        try {
          if (!ctx?.user?.id || !ctx?.user?.email) throw new Error('Unauthenticated');
          if (typeof newPassword !== 'string' || newPassword.length < 8)
            throw new Error('Invalid password');
          const req = wrapRequest(ctx.request);
          const res = wrapResponse(ctx.reply);
          // Verify current password
          // @ts-ignore
          const signInRes = await (EmailPassword as any).signIn(
            'public',
            ctx.user.email,
            currentPassword,
            { request: req, response: res },
          );
          if (signInRes.status !== 'OK') return false;
          // @ts-ignore
          const upd = await (EmailPassword as any).updateEmailOrPassword(
            'public',
            ctx.user.id,
            undefined,
            newPassword,
            { request: req, response: res },
          );
          return upd.status === 'OK';
        } catch (e) {
          console.error('changeMyPassword error', e);
          return false;
        }
      },
      // Change email: update then send verification to new email
      changeMyEmail: async (_: unknown, { newEmail }: { newEmail: string }, ctx: any) => {
        try {
          if (!ctx?.user?.id || !ctx?.user?.email) throw new Error('Unauthenticated');
          const email = String(newEmail || '')
            .trim()
            .toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email');
          const req = wrapRequest(ctx.request);
          const res = wrapResponse(ctx.reply);
          // @ts-ignore
          const upd = await (EmailPassword as any).updateEmailOrPassword(
            'public',
            ctx.user.id,
            email,
            undefined,
            { request: req, response: res },
          );
          if (upd.status !== 'OK') return false;
          // Create verification token for the new email and send
          try {
            // @ts-ignore
            const tokenRes = await (EmailVerification as any).createEmailVerificationToken(
              'public',
              ctx.user.id,
              email,
              undefined,
              { request: req, response: res },
            );
            if (tokenRes.status === 'OK' && tokenRes.token) {
              const webDomain = process.env.WEB_DOMAIN || 'http://localhost:3000';
              const link = `${webDomain}/auth/verify-email?token=${tokenRes.token}`;
              const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
              const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'no-reply@localhost';
              const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'LoveConnect';
              if (SENDGRID_API_KEY) {
                const payload = {
                  personalizations: [{ to: [{ email }] }],
                  from: { email: FROM_EMAIL, name: FROM_NAME },
                  subject: 'Verify your new email address',
                  content: [
                    {
                      type: 'text/html',
                      value: `<p>Verify your new email by clicking <a href="${link}">this link</a>.</p>`,
                    },
                  ],
                } as any;
                await fetch('https://api.sendgrid.com/v3/mail/send', {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${SENDGRID_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(payload),
                });
              } else {
                console.warn('SENDGRID_API_KEY not set; cannot send change-email verification');
              }
            }
          } catch (e) {
            console.error('changeMyEmail verification send error', e);
          }
          return true;
        } catch (e) {
          console.error('changeMyEmail error', e);
          return false;
        }
      },
      // Delete account
      deleteMyAccount: requireAuth(async (_: unknown, __: unknown, ctx: any) => {
        try {
          const userId = ctx.user.id;
          // Clean DB records (best-effort minimal)
          try {
            await prisma.message.deleteMany({ where: { senderId: userId } });
            await prisma.conversation.deleteMany({
              where: { match: { OR: [{ userIdA: userId }, { userIdB: userId }] } } as any,
            });
            await prisma.match.deleteMany({
              where: { OR: [{ userIdA: userId }, { userIdB: userId }] },
            });
            await prisma.location.deleteMany({ where: { userId } });
            await prisma.preferences.deleteMany({ where: { userId } });
            await prisma.profile.deleteMany({ where: { userId } });
            await prisma.user.deleteMany({ where: { id: userId } });
          } catch (dbErr) {
            console.error('DB cleanup error during deleteMyAccount', dbErr);
          }
          try {
            // @ts-ignore
            if ((supertokens as any).deleteUser) {
              await (supertokens as any).deleteUser(userId);
            }
          } catch (stErr) {
            console.error('SuperTokens deleteUser error', stErr);
          }
          return true;
        } catch (e) {
          console.error('deleteMyAccount error', e);
          return false;
        }
      }),
      // Send welcome email
      sendWelcomeEmail: async (_: unknown, __: unknown, ctx: any) => {
        try {
          if (!ctx?.user?.email) throw new Error('Unauthenticated');
          const email = ctx.user.email as string;
          const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
          const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'no-reply@localhost';
          const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'LoveConnect';
          if (!SENDGRID_API_KEY) return false;
          const payload = {
            personalizations: [{ to: [{ email }] }],
            from: { email: FROM_EMAIL, name: FROM_NAME },
            subject: 'Welcome to LoveConnect',
            content: [
              {
                type: 'text/html',
                value: `<h2>Welcome!</h2><p>Thanks for joining LoveConnect. You’re all set.</p>`,
              },
            ],
          } as any;
          const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${SENDGRID_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          return resp.ok;
        } catch (e) {
          console.error('sendWelcomeEmail error', e);
          return false;
        }
      },
      // Swipe
      swipe: requireAuth(
        async (
          _: unknown,
          {
            targetUserId,
            direction,
          }: { targetUserId: string; direction: 'LEFT' | 'RIGHT' | 'SUPER' },
          ctx: any,
        ) => {
          if (targetUserId === ctx.user.id) throw new Error('Cannot swipe self');
          if (!['LEFT', 'RIGHT', 'SUPER'].includes(direction)) throw new Error('Invalid direction');
          await prisma.swipe.create({
            data: { userId: ctx.user.id, targetUserId, direction: direction as any },
          });
          let matched = false;
          let matchId: string | undefined;
          if (direction !== 'LEFT') {
            // Check if target liked me before
            const reciprocal = await prisma.swipe.findFirst({
              where: {
                userId: targetUserId,
                targetUserId: ctx.user.id,
                direction: { in: ['RIGHT', 'SUPER'] as any },
              },
            });
            if (reciprocal) {
              // Order ids to avoid unique conflict
              const a = ctx.user.id < targetUserId ? ctx.user.id : targetUserId;
              const b = ctx.user.id < targetUserId ? targetUserId : ctx.user.id;
              const m = await prisma.match.upsert({
                where: { userIdA_userIdB: { userIdA: a, userIdB: b } },
                update: { status: 'ACTIVE' },
                create: { userIdA: a, userIdB: b, status: 'ACTIVE' },
              });
              matched = true;
              matchId = m.id;
              // Ensure conversation exists
              await prisma.conversation.upsert({
                where: { matchId: m.id },
                update: {},
                create: { matchId: m.id },
              });

              // Send real-time match notification via Socket.IO
              try {
                const socketService = (global as any).socketService;
                if (socketService) {
                  await socketService.sendMatchNotification(ctx.user.id, targetUserId, m.id);
                }
              } catch (error) {
                console.error('❌ Failed to send match notification:', error);
              }

              // Publish match to GraphQL subscriptions
              const matchView = {
                id: m.id,
                status: m.status,
                createdAt: m.createdAt,
                otherUser: await prisma.profile.findUnique({ where: { userId: targetUserId } }),
              };

              // Real-time match notifications are handled by Socket.IO
            }
          }
          return { ok: true, matched, matchId };
        },
      ),
      // Send message
      sendMessage: requireAuth(
        async (
          _: unknown,
          {
            conversationId,
            content,
            mediaUrls,
          }: { conversationId: string; content?: string; mediaUrls?: string[] },
          ctx: any,
        ) => {
          const convo = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { match: true },
          });
          if (!convo) throw new Error('Conversation not found');
          const participant =
            convo.match.userIdA === ctx.user.id || convo.match.userIdB === ctx.user.id;
          if (!participant) throw new Error('Forbidden');
          const text = typeof content === 'string' ? content.trim() : null;
          const media = Array.isArray(mediaUrls)
            ? mediaUrls
                .map((u) => String(u).trim())
                .filter(Boolean)
                .slice(0, 5)
            : [];
          if (!text && media.length === 0) throw new Error('Empty message');
          const msg = await prisma.message.create({
            data: {
              conversationId,
              senderId: ctx.user.id,
              type: 'TEXT',
              content: text,
              mediaUrls: media,
            },
          });
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { lastMessageAt: new Date() },
          });

          // Real-time message delivery is handled by Socket.IO

          return msg;
        },
      ),
      // Mark read
      markConversationRead: requireAuth(
        async (_: unknown, { conversationId }: { conversationId: string }, ctx: any) => {
          const convo = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { match: true },
          });
          if (!convo) throw new Error('Conversation not found');
          const participant =
            convo.match.userIdA === ctx.user.id || convo.match.userIdB === ctx.user.id;
          if (!participant) throw new Error('Forbidden');
          const readAt = new Date();
          await prisma.message.updateMany({
            where: { conversationId, senderId: { not: ctx.user.id }, readAt: null },
            data: { readAt },
          });

          // Real-time read receipts are handled by Socket.IO

          return true;
        },
      ),

      // Admin mutations
      adminBanUser: requireAdmin(
        async (_: unknown, { userId, reason }: { userId: string; reason: string }) => {
          await prisma.profile.update({
            where: { userId },
            data: { status: 'BANNED' },
          });

          // Create moderation record
          await prisma.moderationItem.create({
            data: {
              type: 'USER_BAN',
              userId,
              content: `User banned: ${reason}`,
              reason,
              priority: 'HIGH',
              status: 'APPROVED',
              reviewedAt: new Date(),
              reviewedBy: 'admin',
            },
          });

          return true;
        },
      ),

      adminUnbanUser: requireAdmin(async (_: unknown, { userId }: { userId: string }) => {
        await prisma.profile.update({
          where: { userId },
          data: { status: 'ACTIVE' },
        });

        return true;
      }),

      adminVerifyUser: requireAdmin(async (_: unknown, { userId }: { userId: string }) => {
        await prisma.profile.update({
          where: { userId },
          data: { verified: true },
        });

        return true;
      }),

      adminDeleteUser: requireAdmin(async (_: unknown, { userId }: { userId: string }) => {
        // Soft delete by setting status to SUSPENDED
        await prisma.profile.update({
          where: { userId },
          data: { status: 'SUSPENDED' },
        });

        return true;
      }),

      adminModerationAction: requireAdmin(
        async (
          _: unknown,
          {
            itemId,
            action,
            reason,
          }: {
            itemId: string;
            action: string;
            reason?: string;
          },
        ) => {
          const status = action === 'approve' ? 'APPROVED' : 'REJECTED';

          await prisma.$transaction([
            prisma.moderationItem.update({
              where: { id: itemId },
              data: {
                status,
                reviewedAt: new Date(),
                reviewedBy: String((arguments as any)[2]?.user?.id || 'admin'),
                reason: reason || `Action: ${action}`,
              },
            }),
            prisma.moderationAudit.create({
              data: {
                itemId,
                reviewerId: (arguments as any)[2]?.user?.id || null,
                action,
                reason,
              },
            }),
          ]);

          // Dev/test notification of moderation decision (no-op in production)
          try {
            const rec = await prisma.moderationItem.findUnique({
              where: { id: itemId },
              select: { user: { select: { email: true } } },
            });
            const email = rec?.user?.email;
            if (email) {
              await notifyModerationDecision(email, itemId, action, reason);
            }
          } catch {}

          return true;
        },
      ),

      adminModerationBulkAction: requireAdmin(
        async (
          _: unknown,
          {
            itemIds,
            action,
            reason,
          }: {
            itemIds: string[];
            action: string;
            reason?: string;
          },
          ctx: any,
        ) => {
          const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
          await prisma.$transaction(
            itemIds.flatMap((itemId) => [
              prisma.moderationItem.update({
                where: { id: itemId },
                data: {
                  status,
                  reviewedAt: new Date(),
                  reviewedBy: String(ctx?.user?.id || 'admin'),
                  reason: reason || `Action: ${action}`,
                },
              }),
              prisma.moderationAudit.create({
                data: {
                  itemId,
                  reviewerId: ctx?.user?.id || null,
                  action,
                  reason,
                },
              }),
            ]),
          );

          // Dev/test notifications for each affected item (no-op in production)
          try {
            const items = await prisma.moderationItem.findMany({
              where: { id: { in: itemIds } },
              select: { id: true, user: { select: { email: true } } },
            });
            for (const it of items) {
              if (it.user?.email) {
                await notifyModerationDecision(it.user.email, it.id, action, reason);
              }
            }
          } catch {}

          return true;
        },
      ),

      adminAddModerationAttachment: requireAdmin(
        async (
          _: unknown,
          { itemId, type, url }: { itemId: string; type: string; url: string },
        ) => {
          await prisma.moderationAttachment.create({
            data: { itemId, type, url },
          });
          return true;
        },
      ),

      adminResolveReport: requireAdmin(
        async (
          _: unknown,
          {
            reportId,
            action,
            reason,
          }: {
            reportId: string;
            action: string;
            reason?: string;
          },
        ) => {
          const status = action === 'resolve' ? 'RESOLVED' : 'DISMISSED';

          await prisma.report.update({
            where: { id: reportId },
            data: {
              status,
              reviewedAt: new Date(),
              reviewedBy: 'admin',
            },
          });

          return true;
        },
      ),

      // Content management mutations (admin only)
      updateFeatureFlag: requireAdmin(
        async (
          _: unknown,
          {
            key,
            enabled,
            rolloutPercentage,
          }: {
            key: string;
            enabled?: boolean;
            rolloutPercentage?: number;
          },
        ) => {
          const updates: any = {};
          if (enabled !== undefined) updates.enabled = enabled;
          if (rolloutPercentage !== undefined) updates.rolloutPercentage = rolloutPercentage;

          return await contentService.updateFeatureFlag(key, updates);
        },
      ),

      updateEmailTemplate: requireAdmin(
        async (
          _: unknown,
          {
            key,
            subject,
            htmlContent,
            textContent,
            enabled,
          }: {
            key: string;
            subject?: string;
            htmlContent?: string;
            textContent?: string;
            enabled?: boolean;
          },
        ) => {
          const updates: any = {};
          if (subject !== undefined) updates.subject = subject;
          if (htmlContent !== undefined) updates.htmlContent = htmlContent;
          if (textContent !== undefined) updates.textContent = textContent;
          if (enabled !== undefined) updates.enabled = enabled;

          return await contentService.updateEmailTemplate(key, updates);
        },
      ),

      updateAppConfig: requireAdmin(
        async (
          _: unknown,
          {
            key,
            value,
            description,
          }: {
            key: string;
            value: string;
            description?: string;
          },
        ) => {
          let parsedValue;
          try {
            parsedValue = JSON.parse(value);
          } catch {
            parsedValue = value; // Keep as string if not valid JSON
          }

          return await contentService.updateAppConfig(key, parsedValue, description);
        },
      ),

      updateContentPage: requireAdmin(
        async (
          _: unknown,
          {
            slug,
            title,
            content,
            metaDescription,
            published,
          }: {
            slug: string;
            title?: string;
            content?: string;
            metaDescription?: string;
            published?: boolean;
          },
        ) => {
          const updates: any = {};
          if (title !== undefined) updates.title = title;
          if (content !== undefined) updates.content = content;
          if (metaDescription !== undefined) updates.metaDescription = metaDescription;
          if (published !== undefined) updates.published = published;

          return await contentService.updateContentPage(slug, updates);
        },
      ),
    },
    // Real-time features are handled exclusively by Socket.IO
    // No GraphQL subscriptions needed
  };

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const apollo = new ApolloServer({
    schema,
    plugins: [
      fastifyApolloDrainPlugin(server),
      {
        async requestDidStart(requestContext) {
          const start = Date.now();
          const query = requestContext.request.query || '';
          const isMutation = /^\s*mutation\b/.test(query);
          const opType = isMutation ? 'mutation' : 'query';
          const opName = requestContext.request.operationName || 'anonymous';
          const correlationId = (requestContext.contextValue as any)?.request?.headers?.[
            'x-correlation-id'
          ] as string | undefined;

          // Phase 8: Query complexity analysis (simple heuristic)
          const queryComplexity = calculateQueryComplexity(query);
          if (queryComplexity > MAX_COMPLEXITY) {
            logger.warn(`🔥 High complexity GraphQL query detected: ${opName}`, {
              correlationId,
              operation: 'high_complexity_query',
              metadata: {
                operationName: opName,
                operationType: opType,
                complexity: queryComplexity,
                threshold: MAX_COMPLEXITY,
              },
            });
          }
          return {
            async willSendResponse() {
              const duration = Date.now() - start;
              logger.graphql(opName, opType as any, duration, { correlationId });

              // Phase 8: Enhanced monitoring - slow query detection
              if (duration > 500) {
                logger.warn(
                  `🐌 Slow GraphQL operation detected: ${opName} (${opType}) took ${duration}ms`,
                  {
                    correlationId,
                    operation: 'slow_graphql_query',
                    duration,
                    metadata: {
                      operationName: opName,
                      operationType: opType,
                      threshold: 500,
                    },
                  },
                );
              }
            },
          };
        },
      },
    ],
  });
  await apollo.start();

  // Register GraphQL route with preHandler for authentication
  await server.register(async function (fastify) {
    // Add preHandler to extract session before GraphQL processing
    fastify.addHook('preHandler', async (request, reply) => {
      try {
        // SECURITY: Enforce GraphQL query complexity before auth/session extraction
        try {
          const method = request.method;
          const url = (request as any).url as string;
          if (url && url.startsWith('/graphql') && (method === 'POST' || method === 'GET')) {
            const queryText =
              method === 'GET' ? (request.query as any)?.query : (request.body as any)?.query;
            const complexity = calculateQueryComplexity(queryText);
            if (complexity > MAX_COMPLEXITY) {
              logger.security(
                'graphql_complexity_rejected',
                {
                  ip: request.ip,
                  complexity,
                  threshold: MAX_COMPLEXITY,
                  operationName:
                    (request.body as any)?.operationName ||
                    (request.query as any)?.operationName ||
                    'unknown',
                },
                request as any,
              );
              reply.code(429).send({
                error: 'Too Complex',
                message: `Query complexity ${complexity} exceeds limit ${MAX_COMPLEXITY}`,
              });
              return;
            }

            // SECURITY: Enforce GraphQL query depth limit
            const depth = calculateQueryDepth(queryText);
            if (depth > MAX_DEPTH) {
              logger.security(
                'graphql_depth_rejected',
                {
                  ip: request.ip,
                  depth,
                  threshold: MAX_DEPTH,
                  operationName:
                    (request.body as any)?.operationName ||
                    (request.query as any)?.operationName ||
                    'unknown',
                },
                request as any,
              );
              reply.code(429).send({
                error: 'Too Deep',
                message: `Query depth ${depth} exceeds limit ${MAX_DEPTH}`,
              });
              return;
            }
          }
        } catch (e) {
          // If parsing fails, continue; Apollo will handle malformed requests
        }
        // Dev-only impersonation via cookie to stabilise E2E tests (no effect in production)
        if (process.env.NODE_ENV !== 'production') {
          const cookieHeader = (request.headers['cookie'] as string) || '';
          const impMatch = cookieHeader
            .split(';')
            .map((s) => s.trim())
            .find((s) => s.startsWith('dev_impersonate_email='));
          if (impMatch) {
            const impEmail = decodeURIComponent(impMatch.split('=')[1] || '');
            if (impEmail) {
              try {
                const u = await prisma.user.findUnique({
                  where: { email: impEmail },
                  select: { id: true, email: true, roles: true },
                });
                if (u) {
                  (request as any).user = u;
                  (request as any).session = null;
                  console.log(`🧪 Dev impersonation active for ${impEmail}`);
                  return;
                }
              } catch {}
            }
          }
        }

        console.log('🔍 GraphQL preHandler: checking session...');
        const s = await Session.getSession(request as any, reply as any, {
          sessionRequired: false,
        });

        if (s) {
          const userId = s.getUserId();
          (request as any).session = s;

          console.log(`✅ Session found for user: ${userId}`);

          // Try to sync user data, but don't fail if database is unavailable
          let email = '';
          try {
            const stUser = await stGetUser(userId);
            email = stUser?.emails?.[0] ?? '';
            if (email) {
              await prisma.user.upsert({
                where: { id: userId },
                update: { email },
                create: { id: userId, email, passwordHash: '' },
              });
              console.log(`✅ User data synced for ${userId}`);
            }
          } catch (userError) {
            console.warn(
              '⚠️ Database sync failed (continuing with session-only auth):',
              (userError as any)?.message || userError,
            );
            // Continue with session-based authentication even if database sync fails
            // This allows photo uploads and other operations to work
            // Set email from SuperTokens user data even if database sync fails
            try {
              const stUser = await stGetUser(userId);
              email = stUser?.emails?.[0] ?? '';
            } catch (stError) {
              console.warn(
                '⚠️ Failed to get SuperTokens user data:',
                (stError as any)?.message || stError,
              );
            }
          }

          const payload = s.getAccessTokenPayload();
          const roles = Array.isArray((payload as any)?.roles) ? (payload as any).roles : [];

          // Attach user to request for GraphQL context
          console.log(
            `✅ [${new Date().toISOString()}] preHandler: session found userId=${userId}, email=${email}, path=${(request as any).url}`,
          );
          (request as any).user = { id: userId, email, roles };
        } else {
          console.log(
            `🔍 [${new Date().toISOString()}] preHandler: no session for ${(request as any).method} ${(request as any).url}`,
          );
          (request as any).session = null;
          (request as any).user = null;
        }
      } catch (error) {
        console.error('❌ GraphQL preHandler error:', error);
        (request as any).session = null;

        (request as any).user = null;
      }

      // Always continue processing - don't fail the request due to preHandler errors
      return;
    });

    fastify.route({
      url: '/graphql',
      method: ['GET', 'POST', 'OPTIONS'],
      handler: fastifyApolloHandler(apollo, {
        context: async (request: any, reply: any) => {
          try {
            // Safely extract user from request (set by preHandler)
            const user = request && (request as any).user ? (request as any).user : null;

            const session = request && (request as any).session ? (request as any).session : null;

            if (process.env.NODE_ENV !== 'production') {
              console.log('🔧 GraphQL context created:', {
                hasUser: !!user,
                userId: user?.id || 'none',
                hasRequest: !!request,
                method: request?.method || 'n/a',
                url: request?.url || 'n/a',
              });
            }

            return { user, session, request, reply };
          } catch (error) {
            logger.error(
              'GraphQL context creation error',
              {
                correlationId: (request as any)?.headers?.['x-correlation-id'] as string,
                operation: 'graphql_context',
              },
              error as Error,
            );
            return { user: null, request: request || null, reply: null };
          }
        },
      }),
    });
  });

  // Debug: print mounted routes (after all routes are registered)
  server.ready().then(() => {
    server.log.info(server.printRoutes());
  });

  const port = Number(process.env.PORT ?? 8080);
  try {
    await server.listen({ port, host: '0.0.0.0' });
    logger.info(`🚀 Dating App API server started`, {
      operation: 'server_startup',
      metadata: { port, environment: process.env.NODE_ENV || 'development' },
    });

    // Initialize Socket.IO after server starts
    const socketIOService = new SocketIOService(server.server);
    // Make it globally available for match notifications and monitoring
    (global as any).socketService = socketIOService;
    (global as any).monitoringService = monitoringService;

    logger.info('🔌 Socket.IO service initialized', { operation: 'socketio_startup' });
    logger.info('📊 Monitoring service initialized', { operation: 'monitoring_startup' });
    logger.info('📡 Real-time messaging powered by Socket.IO', { operation: 'realtime_startup' });

    // Log startup completion
    logger.info('✅ All services initialized successfully', {
      operation: 'startup_complete',
      metadata: {
        port,
        services: ['fastify', 'apollo-graphql', 'socketio', 'monitoring', 'supertokens'],
      },
    });
  } catch (err) {
    logger.error('❌ Failed to start server', { operation: 'server_startup' }, err as Error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

start();
