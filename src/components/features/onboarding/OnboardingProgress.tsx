'use client';

import { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { cn } from '@/lib/utils';
import {
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  EnvelopeIcon,
  PhotoIcon,
  AcademicCapIcon,
  SparklesIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

  const ONBOARDING_QUERY = gql`
    query OnboardingData {
      onboardingData {
        currentStep
        completedSteps
        totalSteps
        completionPercentage
        steps
        analytics { startedAt lastActiveAt timeSpent completionRate }
      }
    }
  `;


interface OnboardingStep {
  id: number;
  name: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  completed: boolean;
  completedAt: string | null;
  href?: string;
}

interface OnboardingData {
  currentStep: number;
  completedSteps: number[];
  totalSteps: number;
  completionPercentage: number;
  steps: Record<string, any>;
  analytics: {
    startedAt: string;
    lastActiveAt: string;
    timeSpent: number;
    completionRate: number;
  };
}

const stepConfig: Record<string, { title: string; description: string; icon: any; href?: string }> = {
  registration: {
    title: 'Account Created',
    description: 'Your account has been successfully created',
    icon: UserIcon,
  },
  emailVerification: {
    title: 'Email Verified',
    description: 'Confirm your email address to secure your account',
    icon: EnvelopeIcon,
    href: '/auth/verify-email',
  },
  profileSetup: {
    title: 'Profile Setup',
    description: 'Add your personal information and bio',
    icon: UserIcon,
    href: '/onboarding/profile',
  },
  avatarUpload: {
    title: 'Profile Photo',
    description: 'Upload a profile photo to personalize your account',
    icon: PhotoIcon,
    href: '/onboarding/avatar',
  },
  guidedTour: {
    title: 'Platform Tour',
    description: 'Take a guided tour to learn about key features',
    icon: AcademicCapIcon,
    href: '/onboarding/tour',
  },
  activation: {
    title: 'Account Activated',
    description: 'Your account is fully set up and ready to use',
    icon: SparklesIcon,
  },
};

export function OnboardingProgress() {
  const { data, loading, error } = useQuery<{ onboardingData: OnboardingData }>(ONBOARDING_QUERY);
  const onboardingData = data?.onboardingData ?? null;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-red-600">Failed to load onboarding data.</p>
      </div>
    );
  }

  if (!onboardingData) {
    return null;
  }

  const steps: OnboardingStep[] = Object.entries(onboardingData.steps).map(([key, stepData]) => {
    const config = stepConfig[stepData.name] || stepConfig.registration;
    return {
      id: parseInt(key),
      name: stepData.name,
      title: config.title,
      description: config.description,
      icon: config.icon,
      completed: stepData.completed,
      completedAt: stepData.completedAt,
      href: config.href,
    };
  });

  const formatTimeSpent = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Onboarding Progress
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Complete your setup to get the most out of the platform
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {onboardingData.completionPercentage}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {onboardingData.completedSteps.length} of {onboardingData.totalSteps} steps
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${onboardingData.completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="p-6">
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = onboardingData.currentStep === step.id;
            const isCompleted = step.completed;
            const isUpcoming = step.id > onboardingData.currentStep;

            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-center space-x-4 p-3 rounded-lg transition-all',
                  isActive && 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800',
                  isCompleted && !isActive && 'bg-green-50 dark:bg-green-900/20',
                  isUpcoming && 'opacity-60'
                )}
              >
                {/* Step Icon */}
                <div className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                  isCompleted
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : isActive
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                )}>
                  {isCompleted ? (
                    <CheckCircleIconSolid className="h-6 w-6" />
                  ) : isActive ? (
                    <ClockIcon className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className={cn(
                      'font-medium',
                      isCompleted
                        ? 'text-green-900 dark:text-green-100'
                        : isActive
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-gray-900 dark:text-white'
                    )}>
                      {step.title}
                    </h3>
                    {isCompleted && step.completedAt && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        ✓ {new Date(step.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    'text-sm mt-1',
                    isCompleted
                      ? 'text-green-700 dark:text-green-300'
                      : isActive
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400'
                  )}>
                    {step.description}
                  </p>
                </div>

                {/* Action Button */}
                {isActive && step.href && (
                  <a
                    href={step.href}
                    className="flex-shrink-0 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    Continue
                    <ChevronRightIcon className="ml-1 h-3 w-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {/* Analytics Summary */}
        {onboardingData.analytics && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Time spent:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {formatTimeSpent(onboardingData.analytics.timeSpent)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Started:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {new Date(onboardingData.analytics.startedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
