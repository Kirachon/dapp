'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { onboardingService, OnboardingAbout } from '@/services/onboarding';
import { markOnboardingStep } from '@/lib/onboardingProgress';

const INTERESTS = [
  { id: 'music', label: '🎵 Music', category: 'entertainment' },
  { id: 'fitness', label: '🏃‍♀️ Fitness', category: 'lifestyle' },
  { id: 'food', label: '🍕 Food', category: 'lifestyle' },
  { id: 'reading', label: '📚 Reading', category: 'entertainment' },
  { id: 'art', label: '🎨 Art', category: 'creative' },
  { id: 'travel', label: '✈️ Travel', category: 'lifestyle' },
  { id: 'gaming', label: '🎮 Gaming', category: 'entertainment' },
  { id: 'tech', label: '📱 Tech', category: 'professional' },
  { id: 'nature', label: '🌱 Nature', category: 'lifestyle' },
  { id: 'movies', label: '🎬 Movies', category: 'entertainment' },
  { id: 'cooking', label: '👨‍🍳 Cooking', category: 'lifestyle' },
  { id: 'photography', label: '📸 Photography', category: 'creative' },
  { id: 'sports', label: '⚽ Sports', category: 'lifestyle' },
  { id: 'dancing', label: '💃 Dancing', category: 'entertainment' },
  { id: 'yoga', label: '🧘‍♀️ Yoga', category: 'lifestyle' },
  { id: 'pets', label: '🐕 Pets', category: 'lifestyle' },
  { id: 'wine', label: '🍷 Wine', category: 'lifestyle' },
  { id: 'coffee', label: '☕ Coffee', category: 'lifestyle' },
];

const LIFESTYLE_OPTIONS = {
  drinking: [
    { value: 'never', label: 'Never' },
    { value: 'rarely', label: 'Rarely' },
    { value: 'socially', label: 'Socially' },
    { value: 'regularly', label: 'Regularly' },
  ],
  smoking: [
    { value: 'never', label: 'Never' },
    { value: 'rarely', label: 'Rarely' },
    { value: 'socially', label: 'Socially' },
    { value: 'regularly', label: 'Regularly' },
  ],
  exercise: [
    { value: 'never', label: 'Never' },
    { value: 'rarely', label: 'Rarely' },
    { value: 'sometimes', label: 'Sometimes' },
    { value: 'regularly', label: 'Regularly' },
    { value: 'daily', label: 'Daily' },
  ],
};

const EDUCATION_OPTIONS = [
  { value: 'high-school', label: 'High School' },
  { value: 'some-college', label: 'Some College' },
  { value: 'bachelors', label: "Bachelor's Degree" },
  { value: 'masters', label: "Master's Degree" },
  { value: 'phd', label: 'PhD' },
  { value: 'trade-school', label: 'Trade School' },
  { value: 'other', label: 'Other' },
];

export default function OnboardingAboutPage() {
  const [bio, setBio] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [lifestyle, setLifestyle] = useState({
    drinking: '',
    smoking: '',
    exercise: '',
  });
  const [education, setEducation] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Load existing data on mount
  useEffect(() => {
    const existingData = onboardingService.getStep('about');
    if (existingData) {
      setBio(existingData.bio || '');
      setSelectedInterests(existingData.interests || []);
      setEducation(existingData.education || '');
      if (existingData.lifestyle) {
        setLifestyle(existingData.lifestyle);
      }
    }
  }, []);

  // Auto-save changes for persistence across refreshes
  useEffect(() => {
    const data: OnboardingAbout = {
      bio,
      interests: selectedInterests,
      education: education || undefined,
    };
    try {
      onboardingService.saveStep('about', data);
    } catch (e) {
      // ignore
    }
  }, [bio, selectedInterests, education]);

  // Redirect if not authenticated (SSR-safe)
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, router]);

  const handleInterestToggle = (interestId: string) => {
    setSelectedInterests((prev) => {
      if (prev.includes(interestId)) {
        return prev.filter((id) => id !== interestId);
      } else if (prev.length < 10) {
        return [...prev, interestId];
      }
      return prev;
    });
  };

  const handleLifestyleChange = (category: keyof typeof lifestyle, value: string) => {
    setLifestyle((prev) => ({
      ...prev,
      [category]: prev[category] === value ? '' : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Temporarily disabled for testing
    // if (selectedInterests.length < 3) {
    //   alert('Please select at least 3 interests');
    //   return;
    // }

    // Temporarily disabled for testing
    // if (bio.trim().length < 10) {
    //   alert('Please write a bio with at least 10 characters');
    //   return;
    // }

    setLoading(true);

    try {
      const aboutData: OnboardingAbout = {
        bio: bio.trim(),
        interests: selectedInterests,
        education: education || undefined,
      };

      // Validate with service
      const validationErrors = onboardingService.validateAbout(aboutData);
      if (validationErrors.length > 0) {
        alert(validationErrors[0]);
        return;
      }

      // Save to onboarding service
      onboardingService.saveStep('about', aboutData);

      // Persist progress and navigate to next step
      await markOnboardingStep('about');
      router.push('/onboarding-v2/preferences');
    } catch (error) {
      console.error('Error saving about data:', error);
      alert('Failed to save information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">3/5</span>
      </div>

      {/* Progress Bar */}
      <div className="px-4 mb-8">
        <div className="w-full bg-[var(--color-gray-200)] rounded-full h-2">
          <div
            className="bg-[var(--color-primary-500)] h-2 rounded-full transition-all duration-300"
            style={{ width: '60%' }}
          ></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-8 overflow-y-auto">
        <div className="max-w-sm mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-[var(--text-2xl)] font-bold text-[var(--color-text-primary)] font-[var(--font-display)] mb-2">
              About yourself
            </h1>
            <p className="text-[var(--text-base)] text-[var(--color-text-secondary)]">
              Share what makes you unique
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Bio (Optional)
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people about yourself..."
                maxLength={500}
                rows={4}
                className="w-full px-4 py-3 border-2 border-[var(--color-border)] rounded-lg focus:border-[var(--color-border-focus)] focus:outline-none resize-none"
              />
              <p className="mt-1 text-xs text-[var(--color-text-muted)] text-right">
                {bio.length}/500 characters
              </p>
            </div>

            {/* Interests */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-3">
                Interests
              </label>
              <div className="grid grid-cols-2 gap-2">
                {INTERESTS.map((interest) => (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => handleInterestToggle(interest.id)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      selectedInterests.includes(interest.id)
                        ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-gray-300)]'
                    }`}
                    disabled={
                      !selectedInterests.includes(interest.id) && selectedInterests.length >= 10
                    }
                  >
                    {interest.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                {selectedInterests.length}/10 selected
              </p>
            </div>

            {/* Lifestyle */}
            <div className="space-y-6">
              <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                Lifestyle (Optional)
              </h3>

              {Object.entries(LIFESTYLE_OPTIONS).map(([category, options]) => (
                <div key={category}>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2 capitalize">
                    {category}
                  </label>
                  <div className="flex gap-2">
                    {options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          handleLifestyleChange(category as keyof typeof lifestyle, option.value)
                        }
                        className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          lifestyle[category as keyof typeof lifestyle] === option.value
                            ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                            : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-gray-300)]'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Education */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-3">
                Education (Optional)
              </label>
              <div className="grid grid-cols-1 gap-2">
                {EDUCATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setEducation(education === option.value ? '' : option.value)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                      education === option.value
                        ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-gray-300)]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <Button type="submit" loading={loading} className="w-full">
                Continue
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
