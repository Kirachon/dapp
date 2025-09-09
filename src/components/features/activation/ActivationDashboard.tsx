'use client';

import { useState, useEffect } from 'react';
import { useQuery, gql } from '@apollo/client';
import { cn } from '@/lib/utils';
import {
  ChartBarIcon,
  TrophyIcon,
  FireIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
  const ACTIVATION_QUERY = gql`
    query ActivationData {
      activationData {
        welcomeSequenceStarted
        welcomeSequenceCompleted
        currentWelcomeStep
        activationScore
        activationFactors
        engagementMetrics { loginFrequency featureUsage timeSpent goalsSet goalsCompleted }
        milestones { firstLogin profileCompleted firstGoalSet weeklyActive }
        preferences { welcomeEmails inAppMessages achievementNotifications }
      }
    }
  `;

interface ActivationData {
  welcomeSequenceStarted: boolean;
  welcomeSequenceCompleted: boolean;
  currentWelcomeStep: number;
  activationScore: number;
  activationFactors: string[];
  engagementMetrics: {
    loginFrequency: number;
    featureUsage: string[];
    timeSpent: number;
    goalsSet: number;
    goalsCompleted: number;
  };
  milestones: {
    firstLogin: string;
    profileCompleted: string | null;
    firstGoalSet: string | null;
    weeklyActive: boolean;
  };
  preferences: {
    welcomeEmails: boolean;
    inAppMessages: boolean;
    achievementNotifications: boolean;
  };
}

export function ActivationDashboard() {
  const { data, loading, error } = useQuery<{ activationData: ActivationData }>(ACTIVATION_QUERY);
  const activationData = data?.activationData ?? null;

  if (loading) {

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-red-600">Failed to load activation data.</p>
        </div>
      </div>
    );
  }

  if (!activationData) {
    return null;
  }

  const getActivationLevel = (score: number) => {
    if (score >= 80) return { level: 'Expert', color: 'text-purple-600', bg: 'bg-purple-100' };
    if (score >= 60) return { level: 'Advanced', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 40) return { level: 'Intermediate', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 20) return { level: 'Beginner', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { level: 'Getting Started', color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  const activationLevel = getActivationLevel(activationData.activationScore);

  const formatTimeSpent = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome to Your Dashboard!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track your progress and discover new features
            </p>
          </div>
          <div className="text-right">
            <div className={cn(
              'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
              activationLevel.bg,
              activationLevel.color
            )}>
              <TrophyIcon className="h-4 w-4 mr-1" />
              {activationLevel.level}
            </div>
          </div>
        </div>
      </div>

      {/* Activation Score */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Activation Score
          </h2>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {activationData.activationScore}%
          </div>
        </div>

        <div className="mb-4">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${activationData.activationScore}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Contributing Factors:
          </h3>
          <div className="flex flex-wrap gap-2">
            {activationData.activationFactors.map((factor, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              >
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                {factor}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Login Frequency */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FireIcon className="h-8 w-8 text-orange-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Login Streak
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {activationData.engagementMetrics.loginFrequency}
              </p>
            </div>
          </div>
        </div>

        {/* Features Used */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Features Explored
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {activationData.engagementMetrics.featureUsage.length}
              </p>
            </div>
          </div>
        </div>

        {/* Time Spent */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Time Spent
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {formatTimeSpent(activationData.engagementMetrics.timeSpent)}
              </p>
            </div>
          </div>
        </div>

        {/* Goals */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrophyIcon className="h-8 w-8 text-purple-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Goals Completed
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {activationData.engagementMetrics.goalsCompleted}/{activationData.engagementMetrics.goalsSet}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Your Milestones
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <UserGroupIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                First Login
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(activationData.milestones.firstLogin).toLocaleDateString()}
              </p>
            </div>
          </div>

          {activationData.milestones.profileCompleted && (
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Profile Completed
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(activationData.milestones.profileCompleted).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {activationData.milestones.weeklyActive && (
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <ArrowTrendingUpIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Weekly Active User
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Achieved this week!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Suggested Next Steps
        </h2>

        <div className="space-y-3">
          {activationData.activationScore < 100 && (
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"></div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Complete your profile setup to unlock more features
              </p>
            </div>
          )}

          {activationData.engagementMetrics.goalsSet === 0 && (
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full"></div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Set your first goal to track your progress
              </p>
            </div>
          )}

          {!activationData.welcomeSequenceCompleted && (
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Complete the welcome sequence to learn about all features
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
