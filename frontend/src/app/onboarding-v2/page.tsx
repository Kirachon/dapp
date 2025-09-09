'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function OnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, hasProfile } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin');
      return;
    }

    if (hasProfile) {
      router.push('/discover');
      return;
    }

    // Redirect to first step
    router.push('/onboarding-v2/basics');
  }, [isAuthenticated, hasProfile, router]);

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary-500)] border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-[var(--color-text-secondary)]">Setting up your profile...</p>
      </div>
    </div>
  );
}
