'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toast';
import { ShieldCheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface PrivacyPreferences {
  profileVisible: boolean;
  showOnlineStatus: boolean;
  allowDirectMessages: boolean;
  dataSharing: boolean;
  analyticsTracking: boolean;
  marketingEmails: boolean;
}

export function PrivacySettings() {
  const { data: session, update } = useSession();
  const [preferences, setPreferences] = useState<PrivacyPreferences>({
    profileVisible: true,
    showOnlineStatus: false,
    allowDirectMessages: true,
    dataSharing: false,
    analyticsTracking: true,
    marketingEmails: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load current preferences from session
    if (session?.user?.profile?.preferences) {
      const privacy = (session.user.profile.preferences as any).privacy || {};
      setPreferences(prev => ({
        ...prev,
        ...privacy,
      }));
    }
  }, [session]);

  const handlePreferenceChange = (key: keyof PrivacyPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: {
            privacy: preferences,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Privacy settings updated successfully');
        
        // Update session
        await update({
          ...session,
          user: {
            ...session?.user,
            profile: result.data.profile,
          },
        });
      } else {
        toast.error(result.error.message);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Privacy Settings</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Control how your information is shared and who can see your activity.
        </p>
      </div>

      {/* Profile Visibility */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <ShieldCheckIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Profile Visibility
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Make profile searchable
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Allow others to find your profile in search results
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePreferenceChange('profileVisible', !preferences.profileVisible)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    preferences.profileVisible ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  role="switch"
                  aria-checked={preferences.profileVisible}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      preferences.profileVisible ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Show online status
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Let others see when you're online
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePreferenceChange('showOnlineStatus', !preferences.showOnlineStatus)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    preferences.showOnlineStatus ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  role="switch"
                  aria-checked={preferences.showOnlineStatus}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      preferences.showOnlineStatus ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Allow direct messages
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Let other users send you direct messages
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePreferenceChange('allowDirectMessages', !preferences.allowDirectMessages)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    preferences.allowDirectMessages ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  role="switch"
                  aria-checked={preferences.allowDirectMessages}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      preferences.allowDirectMessages ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data & Analytics */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Data & Analytics
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Share usage data
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Help improve the platform by sharing anonymous usage data
              </p>
            </div>
            <button
              type="button"
              onClick={() => handlePreferenceChange('dataSharing', !preferences.dataSharing)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                preferences.dataSharing ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
              role="switch"
              aria-checked={preferences.dataSharing}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  preferences.dataSharing ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Analytics tracking
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Allow analytics to track your activity for personalized insights
              </p>
            </div>
            <button
              type="button"
              onClick={() => handlePreferenceChange('analyticsTracking', !preferences.analyticsTracking)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                preferences.analyticsTracking ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
              role="switch"
              aria-checked={preferences.analyticsTracking}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  preferences.analyticsTracking ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Marketing emails
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Receive emails about new features, tips, and platform updates
              </p>
            </div>
            <button
              type="button"
              onClick={() => handlePreferenceChange('marketingEmails', !preferences.marketingEmails)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                preferences.marketingEmails ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
              role="switch"
              aria-checked={preferences.marketingEmails}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  preferences.marketingEmails ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Privacy Settings'}
        </Button>
      </div>
    </div>
  );
}
