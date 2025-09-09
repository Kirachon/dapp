'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toast';
import { BellIcon, EnvelopeIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

interface NotificationPreferences {
  email: {
    marketing: boolean;
    updates: boolean;
    security: boolean;
    achievements: boolean;
    reminders: boolean;
  };
  push: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
    achievements: boolean;
    reminders: boolean;
    messages: boolean;
  };
  inApp: {
    enabled: boolean;
    achievements: boolean;
    tips: boolean;
    updates: boolean;
  };
}

export function NotificationSettings() {
  const { data: session, update } = useSession();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: {
      marketing: false,
      updates: true,
      security: true,
      achievements: true,
      reminders: true,
    },
    push: {
      enabled: true,
      frequency: 'immediate',
      achievements: true,
      reminders: true,
      messages: true,
    },
    inApp: {
      enabled: true,
      achievements: true,
      tips: true,
      updates: true,
    },
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load current preferences from session
    if (session?.user?.profile?.preferences) {
      const notifications = (session.user.profile.preferences as any).notifications || {};
      setPreferences(prev => ({
        email: { ...prev.email, ...notifications.email },
        push: { ...prev.push, ...notifications.push },
        inApp: { ...prev.inApp, ...notifications.inApp },
      }));
    }
  }, [session]);

  const handleEmailChange = (key: keyof NotificationPreferences['email'], value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      email: {
        ...prev.email,
        [key]: value,
      },
    }));
  };

  const handlePushChange = (key: keyof NotificationPreferences['push'], value: boolean | string) => {
    setPreferences(prev => ({
      ...prev,
      push: {
        ...prev.push,
        [key]: value,
      },
    }));
  };

  const handleInAppChange = (key: keyof NotificationPreferences['inApp'], value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      inApp: {
        ...prev.inApp,
        [key]: value,
      },
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
            notifications: preferences,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Notification settings updated successfully');
        
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Notification Settings</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Choose how and when you want to be notified about platform activity.
        </p>
      </div>

      {/* Email Notifications */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <EnvelopeIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Email Notifications
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Security alerts
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Important security notifications and account changes
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleEmailChange('security', !preferences.email.security)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    preferences.email.security ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  role="switch"
                  aria-checked={preferences.email.security}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      preferences.email.security ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Platform updates
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    New features, improvements, and important announcements
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleEmailChange('updates', !preferences.email.updates)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    preferences.email.updates ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  role="switch"
                  aria-checked={preferences.email.updates}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      preferences.email.updates ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Achievement notifications
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Celebrate your milestones and accomplishments
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleEmailChange('achievements', !preferences.email.achievements)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    preferences.email.achievements ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  role="switch"
                  aria-checked={preferences.email.achievements}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      preferences.email.achievements ? 'translate-x-5' : 'translate-x-0'
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
                    Tips, best practices, and promotional content
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleEmailChange('marketing', !preferences.email.marketing)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    preferences.email.marketing ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  role="switch"
                  aria-checked={preferences.email.marketing}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      preferences.email.marketing ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* In-App Notifications */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
        <div className="flex items-start space-x-4">
          <BellIcon className="h-6 w-6 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              In-App Notifications
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable in-app notifications
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Show notifications within the platform interface
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleInAppChange('enabled', !preferences.inApp.enabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    preferences.inApp.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  role="switch"
                  aria-checked={preferences.inApp.enabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      preferences.inApp.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {preferences.inApp.enabled && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Achievement celebrations
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Show celebrations when you reach milestones
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInAppChange('achievements', !preferences.inApp.achievements)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        preferences.inApp.achievements ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                      role="switch"
                      aria-checked={preferences.inApp.achievements}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          preferences.inApp.achievements ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Helpful tips
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Show contextual tips and suggestions
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInAppChange('tips', !preferences.inApp.tips)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        preferences.inApp.tips ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                      role="switch"
                      aria-checked={preferences.inApp.tips}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          preferences.inApp.tips ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Notification Settings'}
        </Button>
      </div>
    </div>
  );
}
