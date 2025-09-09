'use client';

import { useTheme } from '@/components/providers/ThemeProvider';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toast';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

const themes = [
  {
    value: 'light' as const,
    label: 'Light',
    description: 'Light mode with bright colors',
    icon: SunIcon,
  },
  {
    value: 'dark' as const,
    label: 'Dark',
    description: 'Dark mode with muted colors',
    icon: MoonIcon,
  },
  {
    value: 'system' as const,
    label: 'System',
    description: 'Follow your system preference',
    icon: ComputerDesktopIcon,
  },
];

const fontSizes = [
  { value: 'small', label: 'Small', description: 'Compact text size' },
  { value: 'medium', label: 'Medium', description: 'Default text size' },
  { value: 'large', label: 'Large', description: 'Larger text for better readability' },
];

const languages = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'ja', label: '日本語', flag: '🇯🇵' },
];

export function AppearanceSettings() {
  const { theme, setTheme, actualTheme } = useTheme();

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    toast.success(`Theme changed to ${newTheme}`);
  };

  const handleFontSizeChange = (fontSize: string) => {
    // TODO: Implement font size preference
    toast.info('Font size preferences coming soon');
  };

  const handleLanguageChange = (language: string) => {
    // TODO: Implement language preference
    toast.info('Language preferences coming soon');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Appearance Settings</h2>
      </div>

      {/* Theme Selection */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Theme</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Choose how the interface looks. Your preference will be saved and applied across all devices.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {themes.map((themeOption) => {
            const Icon = themeOption.icon;
            const isSelected = theme === themeOption.value;
            
            return (
              <button
                key={themeOption.value}
                onClick={() => handleThemeChange(themeOption.value)}
                className={cn(
                  'relative p-4 border-2 rounded-lg text-left transition-all hover:border-blue-300 dark:hover:border-blue-600',
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                )}
                aria-pressed={isSelected}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={cn(
                    'h-6 w-6',
                    isSelected 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-400 dark:text-gray-500'
                  )} />
                  <div>
                    <div className={cn(
                      'font-medium',
                      isSelected 
                        ? 'text-blue-900 dark:text-blue-100' 
                        : 'text-gray-900 dark:text-white'
                    )}>
                      {themeOption.label}
                    </div>
                    <div className={cn(
                      'text-sm',
                      isSelected 
                        ? 'text-blue-700 dark:text-blue-300' 
                        : 'text-gray-500 dark:text-gray-400'
                    )}>
                      {themeOption.description}
                    </div>
                  </div>
                </div>
                
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Current theme:</strong> {theme} 
            {theme === 'system' && ` (${actualTheme} detected)`}
          </p>
        </div>
      </div>

      {/* Font Size */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Font Size</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Adjust the text size for better readability.
        </p>
        
        <div className="space-y-3">
          {fontSizes.map((fontSize) => (
            <label key={fontSize.value} className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="fontSize"
                value={fontSize.value}
                defaultChecked={fontSize.value === 'medium'}
                onChange={() => handleFontSizeChange(fontSize.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{fontSize.label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{fontSize.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Language</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Choose your preferred language for the interface.
        </p>
        
        <div className="max-w-xs">
          <select
            defaultValue="en"
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {languages.map((language) => (
              <option key={language.value} value={language.value}>
                {language.flag} {language.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Preview */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Preview</h3>
        <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Sample Content</h4>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This is how your content will appear with the current theme and settings.
          </p>
          <Button>Sample Button</Button>
        </div>
      </div>
    </div>
  );
}
