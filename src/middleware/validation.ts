import { FastifyRequest, FastifyReply } from 'fastify';

// Input sanitization helpers
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  
  const sanitized = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(sanitized) ? sanitized : '';
}

export function sanitizeAge(age: any): number {
  const parsed = parseInt(age);
  if (isNaN(parsed) || parsed < 18 || parsed > 99) {
    throw new Error('Age must be between 18 and 99');
  }
  return parsed;
}

export function sanitizeArray(arr: any, maxLength: number = 50): string[] {
  if (!Array.isArray(arr)) return [];
  
  return arr
    .filter(item => typeof item === 'string')
    .map(item => sanitizeString(item))
    .filter(item => item.length > 0)
    .slice(0, maxLength);
}

export function sanitizeUrls(urls: any): string[] {
  if (!Array.isArray(urls)) return [];

  const filtered = urls
    .filter(url => typeof url === 'string')
    .map(url => {
      try {
        const parsed = new URL(url);
        // Only allow http/https and data URLs
        if (!['http:', 'https:', 'data:'].includes(parsed.protocol)) {
          return null;
        }
        return url;
      } catch {
        return null;
      }
    })
    .filter(url => url !== null) as string[];

  return filtered.slice(0, 10); // Max 10 URLs
}

// Validation middleware for GraphQL inputs
export function validateProfileInput(input: any) {
  const errors: string[] = [];
  
  if (!input.name || typeof input.name !== 'string') {
    errors.push('Name is required');
  } else if (input.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  } else if (input.name.trim().length > 50) {
    errors.push('Name must be less than 50 characters');
  }
  
  if (input.age !== undefined) {
    try {
      sanitizeAge(input.age);
    } catch (error) {
      errors.push((error as Error).message);
    }
  }
  
  if (input.bio && typeof input.bio === 'string' && input.bio.length > 500) {
    errors.push('Bio must be less than 500 characters');
  }
  
  if (input.interests && Array.isArray(input.interests) && input.interests.length > 20) {
    errors.push('Maximum 20 interests allowed');
  }
  
  if (input.photos && Array.isArray(input.photos) && input.photos.length > 9) {
    errors.push('Maximum 9 photos allowed');
  }
  
  return errors;
}

export function validatePreferencesInput(input: any) {
  const errors: string[] = [];
  
  if (input.minAge !== undefined) {
    try {
      const minAge = sanitizeAge(input.minAge);
      if (input.maxAge !== undefined) {
        const maxAge = sanitizeAge(input.maxAge);
        if (minAge >= maxAge) {
          errors.push('Maximum age must be greater than minimum age');
        }
      }
    } catch (error) {
      errors.push(`Minimum age: ${(error as Error).message}`);
    }
  }
  
  if (input.maxAge !== undefined) {
    try {
      sanitizeAge(input.maxAge);
    } catch (error) {
      errors.push(`Maximum age: ${(error as Error).message}`);
    }
  }
  
  if (input.distanceKm !== undefined) {
    const distance = parseInt(input.distanceKm);
    if (isNaN(distance) || distance < 1 || distance > 500) {
      errors.push('Distance must be between 1 and 500 km');
    }
  }
  
  return errors;
}

// Rate limiting for specific operations
export const swipeRateLimit = {
  max: 100, // 100 swipes per hour
  timeWindow: '1 hour',
  errorResponseBuilder: () => ({
    code: 429,
    error: 'Too Many Swipes',
    message: 'You have reached the swipe limit. Please try again later.',
  }),
};

export const messageRateLimit = {
  max: 200, // 200 messages per hour
  timeWindow: '1 hour',
  errorResponseBuilder: () => ({
    code: 429,
    error: 'Too Many Messages',
    message: 'You have reached the message limit. Please try again later.',
  }),
};

export const photoUploadRateLimit = {
  max: 20, // 20 photo uploads per hour
  timeWindow: '1 hour',
  errorResponseBuilder: () => ({
    code: 429,
    error: 'Too Many Uploads',
    message: 'You have reached the photo upload limit. Please try again later.',
  }),
};

// Security headers middleware
export async function securityHeaders(request: FastifyRequest, reply: FastifyReply) {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove server information
  reply.removeHeader('x-powered-by');
  reply.removeHeader('server');
}

// Request logging for security monitoring
export function logSecurityEvent(event: string, details: any, request: FastifyRequest) {
  const logData = {
    timestamp: new Date().toISOString(),
    event,
    details,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    url: request.url,
    method: request.method,
  };
  
  console.log('SECURITY_EVENT:', JSON.stringify(logData));
}

// SQL injection prevention (for raw queries)
export function sanitizeForSQL(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remove or escape potentially dangerous characters
  return input
    .replace(/['"\\;]/g, '') // Remove quotes and semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL block comments start
    .replace(/\*\//g, '') // Remove SQL block comments end
    .trim();
}
