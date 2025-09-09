'use client';

import { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { 
  UserIcon, 
  ShieldCheckIcon, 
  BellIcon, 
  PaintBrushIcon,
  Cog6ToothIcon 
} from '@heroicons/react/24/outline';

interface SettingsTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  content: ReactNode;
}

interface SettingsLayoutProps {
  tabs: SettingsTab[];
  defaultTab?: string;
}

export function SettingsLayout({ tabs, defaultTab }: SettingsLayoutProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="lg:grid lg:grid-cols-12">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3 bg-gray-50 dark:bg-gray-900">
            <nav className="space-y-1 p-4" aria-label="Settings navigation">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            <div className="p-6">
              {activeTabContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Pre-configured settings tabs
export const defaultSettingsTabs = [
  {
    id: 'account',
    label: 'Account',
    icon: UserIcon,
  },
  {
    id: 'privacy',
    label: 'Privacy',
    icon: ShieldCheckIcon,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: BellIcon,
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: PaintBrushIcon,
  },
];
