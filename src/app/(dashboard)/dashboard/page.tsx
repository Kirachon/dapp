import { Metadata } from 'next';
import Link from 'next/link';
import { ActivationDashboard } from '@/components/features/activation/ActivationDashboard';
import { OnboardingProgress } from '@/components/features/onboarding/OnboardingProgress';

export const metadata: Metadata = {
  title: 'Dashboard | User Onboarding Platform',
  description: 'Your personal dashboard with activation metrics and progress tracking',
};

export default async function DashboardPage() {
  // This page no longer performs server-side auth via NextAuth.
  // Client-side protects via AuthContext + SuperTokens; show a link if unauthenticated.
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">If you are not signed in, please <Link className="text-blue-600" href="/auth/login">sign in</Link>.</p>
      </div>
      <OnboardingProgress />
      <ActivationDashboard />
    </div>
  );
}

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tour target elements */}
        <div data-tour="dashboard" className="mb-8">
          <ActivationDashboard />
        </div>

        <div className="mt-8">
          <OnboardingProgress />
        </div>
      </div>
    </div>
  );
}
