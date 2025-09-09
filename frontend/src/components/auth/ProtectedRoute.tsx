'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireProfile?: boolean;
  requiredRoles?: string[];
  fallbackPath?: string;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requireProfile = false,
  requiredRoles = [],
  fallbackPath = '/signin'
}: ProtectedRouteProps) {
  const { isAuthenticated, hasProfile, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Wait for auth state to load

    // Check authentication requirement
    if (requireAuth && !isAuthenticated) {
      router.push(fallbackPath);
      return;
    }

    // Check profile requirement
    if (requireProfile && !hasProfile) {
      router.push('/onboarding');
      return;
    }

    // Check role requirements
    if (requiredRoles.length > 0 && user) {
      const userRoles = user.roles || [];
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        // Redirect to appropriate page based on auth status
        if (isAuthenticated) {
          router.push('/discover'); // Authenticated but insufficient permissions
        } else {
          router.push(fallbackPath);
        }
        return;
      }
    }
  }, [isAuthenticated, hasProfile, user, loading, requireAuth, requireProfile, requiredRoles, router, fallbackPath]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-[var(--color-text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if requirements not met
  if (requireAuth && !isAuthenticated) return null;
  if (requireProfile && !hasProfile) return null;
  if (requiredRoles.length > 0 && user) {
    const userRoles = user.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    if (!hasRequiredRole) return null;
  }

  return <>{children}</>;
}

// Convenience components for common use cases
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute
      requireAuth={true}
      requireProfile={false}
      requiredRoles={['admin']}
      fallbackPath="/admin/login"
    >
      {children}
    </ProtectedRoute>
  );
}

export function AuthenticatedRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAuth={true} requireProfile={true}>
      {children}
    </ProtectedRoute>
  );
}
