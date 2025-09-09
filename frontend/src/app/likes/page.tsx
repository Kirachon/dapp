'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';

export default function LikesPage() {
  const router = useRouter();
  const { isAuthenticated, hasProfile } = useAuth();

  // Redirect if not authenticated or no profile
  if (!isAuthenticated) {
    router.push('/signin');
    return null;
  }

  if (!hasProfile) {
    router.push('/onboarding');
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Likes</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">⭐</div>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
            See who likes you
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-6">
            Upgrade to premium to see everyone who has already liked your profile
          </p>
          <Button className="w-full mb-4">
            Upgrade to Premium
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.push('/discover')}
            className="w-full"
          >
            Keep Discovering
          </Button>
        </div>
      </div>
    </div>
  );
}
