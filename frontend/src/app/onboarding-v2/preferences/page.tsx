'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { onboardingService, OnboardingPreferences } from '@/services/onboarding';
import { markOnboardingStep } from '@/lib/onboardingProgress';

const SHOW_ME_OPTIONS = [
  { value: 'woman', label: 'Women' },
  { value: 'man', label: 'Men' },
  { value: '', label: 'Everyone' }
];

export default function OnboardingPreferencesPage() {
  const [ageRange, setAgeRange] = useState([22, 30]);
  const [maxDistance, setMaxDistance] = useState(25);
  const [showMe, setShowMe] = useState('woman');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const { isAuthenticated, refetch } = useAuth();

  // Load existing data on mount
  useEffect(() => {
    const existingData = onboardingService.getStep('preferences');
    if (existingData) {
      setAgeRange([existingData.minAge || 22, existingData.maxAge || 30]);
      setMaxDistance(existingData.distanceKm || 25);
      setShowMe(existingData.showMe || 'woman');
    }
  }, []);

  // Auto-save changes for persistence across refreshes
  useEffect(() => {
    const data: OnboardingPreferences = {
      minAge: ageRange[0],
      maxAge: ageRange[1],
      distanceKm: maxDistance,
      showMe: showMe || undefined,
    };
    try {
      onboardingService.saveStep('preferences', data);
    } catch (e) {
      // ignore
    }
  }, [ageRange, maxDistance, showMe]);

  // Redirect if not authenticated (SSR-safe)
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const preferencesData: OnboardingPreferences = {
        minAge: ageRange[0],
        maxAge: ageRange[1],
        distanceKm: maxDistance,
        showMe: showMe || undefined,
      };

      // Validate with service
      const validationErrors = onboardingService.validatePreferences(preferencesData);
      if (validationErrors.length > 0) {
        setError(validationErrors[0]);
        return;
      }

      // Save to onboarding service
      onboardingService.saveStep('preferences', preferencesData);

      // Persist progress and navigate to next step
      await markOnboardingStep('preferences');
      router.push('/onboarding-v2/prompts');
    } catch (error) {
      console.error('Error saving preferences:', error);
      setError('Failed to save preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex flex-col relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 text-6xl animate-pulse">💕</div>
        <div className="absolute top-32 right-16 text-4xl animate-bounce">💖</div>
        <div className="absolute bottom-20 left-20 text-5xl animate-pulse">✨</div>
        <div className="absolute bottom-40 right-10 text-3xl animate-bounce">🌟</div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 relative z-10">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <span className="text-sm font-medium text-white/80">4/5</span>
      </div>

      {/* Progress Bar */}
      <div className="px-4 mb-8 relative z-10">
        <div className="w-full bg-white/20 rounded-full h-3 backdrop-blur-sm">
          <div className="bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] h-3 rounded-full transition-all duration-500 shadow-lg" style={{ width: '80%' }}></div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-white/70">
          <span>Basics</span>
          <span>Photos</span>
          <span>About</span>
          <span>Preferences</span>
          <span>Prompts</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-8 relative z-10">
        <div className="max-w-sm mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/15 rounded-full mx-auto mb-4 flex items-center justify-center backdrop-blur-md border-2 border-white/20">
              <span className="text-2xl">💕</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Dating preferences
            </h1>
            <p className="text-white/80 text-base">
              Help us find your perfect matches
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg backdrop-blur-sm">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Form Container */}
          <div className="glass-card-light p-6 rounded-2xl backdrop-blur-lg border border-white/30">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Show Me */}
              <div>
                <label className="block text-sm font-medium text-white/90 mb-3">
                  Show me
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {SHOW_ME_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setShowMe(option.value)}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all backdrop-blur-sm ${
                        showMe === option.value
                          ? 'border-white/50 bg-white/20 text-white'
                          : 'border-white/30 bg-white/10 text-white/80 hover:bg-white/15 hover:border-white/40'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Range */}
              <div>
                <label className="block text-sm font-medium text-white/90 mb-3">
                  Age range: {ageRange[0]} - {ageRange[1]}
                </label>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-white/70 mb-2">Minimum age: {ageRange[0]}</label>
                    <input
                      type="range"
                      min="18"
                      max="65"
                      value={ageRange[0]}
                      onChange={(e) => setAgeRange([parseInt(e.target.value), Math.max(parseInt(e.target.value) + 1, ageRange[1])])}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/70 mb-2">Maximum age: {ageRange[1]}</label>
                    <input
                      type="range"
                      min="18"
                      max="65"
                      value={ageRange[1]}
                      onChange={(e) => setAgeRange([Math.min(ageRange[0], parseInt(e.target.value) - 1), parseInt(e.target.value)])}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                </div>
              </div>

              {/* Distance */}
              <div>
                <label className="block text-sm font-medium text-white/90 mb-3">
                  Maximum distance: {maxDistance} km
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-white/60 mt-1">
                  <span>1 km</span>
                  <span>100 km</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7043] text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </div>
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
