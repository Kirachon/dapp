import { Metadata } from 'next';
import Link from 'next/link';
import { SettingsLayout, defaultSettingsTabs } from '@/components/features/settings/SettingsLayout';
import { AccountSettings } from '@/components/features/settings/AccountSettings';
import { AppearanceSettings } from '@/components/features/settings/AppearanceSettings';
import { PrivacySettings } from '@/components/features/settings/PrivacySettings';
import { NotificationSettings } from '@/components/features/settings/NotificationSettings';

export const metadata: Metadata = {
  title: 'Settings | User Onboarding Platform',
  description: 'Manage your account settings, preferences, and privacy controls',
};

export default async function SettingsPage() {
  const settingsTabs = [
    {
      ...defaultSettingsTabs[0],
      content: <AccountSettings />,
    },
    {
      ...defaultSettingsTabs[1],
      content: <PrivacySettings />,
    },
    {
      ...defaultSettingsTabs[2],
      content: <NotificationSettings />,
    },
    {
      ...defaultSettingsTabs[3],
      content: <AppearanceSettings />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" data-tour="settings">
      <SettingsLayout tabs={settingsTabs} defaultTab="account" />
    </div>
  );
}
