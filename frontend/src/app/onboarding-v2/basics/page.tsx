'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { onboardingService, OnboardingBasics } from '@/services/onboarding';
import { markOnboardingStep } from '@/lib/onboardingProgress';

const GENDER_OPTIONS = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' }
];

const ORIENTATION_OPTIONS = [
  { value: 'straight', label: 'Straight' },
  { value: 'gay', label: 'Gay' },
  { value: 'lesbian', label: 'Lesbian' },
  { value: 'bisexual', label: 'Bisexual' },
  { value: 'pansexual', label: 'Pansexual' },
  { value: 'asexual', label: 'Asexual' },
  { value: 'other', label: 'Other' }
];

export default function OnboardingBasicsPage() {
  const stored = typeof window !== 'undefined' ? onboardingService.getStep('basics') : null;
  const [name, setName] = useState(stored?.name ?? '');
  const [age, setAge] = useState(stored?.age ? String(stored.age) : '');
  const [gender, setGender] = useState(stored?.gender ?? '');
  const [orientation, setOrientation] = useState(stored?.orientation ?? '');
  const [errors, setErrors] = useState<{ name?: string; age?: string }>({});
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Load existing data on mount
  useEffect(() => {
    const existingData = onboardingService.getStep('basics');
    if (existingData) {
      setName(existingData.name || '');
      setAge(existingData.age?.toString() || '');
      setGender(existingData.gender || '');
      setOrientation(existingData.orientation || '');
    }
  }, []);

  // Auto-save changes for persistence across refreshes (temporary for tests)
  useEffect(() => {
    const data: OnboardingBasics = {
      name,
      age: age ? parseInt(age) : (undefined as any),
      gender: gender || undefined,
      orientation: orientation || undefined,
    } as any;
    try {
      onboardingService.saveStep('basics', data);
    } catch (e) {
      // ignore
    }
  }, [name, age, gender, orientation]);

  // Redirect if not authenticated (SSR-safe)
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, router]);

  const validateForm = () => {
    const newErrors: { name?: string; age?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (name.trim().length > 50) {
      newErrors.name = 'Name must be less than 50 characters';
    }

    const ageNum = parseInt(age);
    if (!age) {
      newErrors.age = 'Age is required';
    } else if (isNaN(ageNum) || ageNum < 18) {
      newErrors.age = 'You must be at least 18 years old';
    } else if (ageNum > 99) {
      newErrors.age = 'Please enter a valid age';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const basicInfo: OnboardingBasics = {
        name: name.trim(),
        age: parseInt(age),
        gender: gender || undefined,
        orientation: orientation || undefined
      };

      // Validate with service
      const validationErrors = onboardingService.validateBasics(basicInfo);
      if (validationErrors.length > 0) {
        setErrors({ name: validationErrors[0] });
        return;
      }

      // Save to onboarding service
      onboardingService.saveStep('basics', basicInfo);

      // Mark step and navigate to next
      await markOnboardingStep('basics');
      router.push('/onboarding-v2/photos');
    } catch (error) {
      console.error('Error saving basic info:', error);
      setErrors({ name: 'Failed to save information. Please try again.' });
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
        <div className="absolute top-10 left-10 text-6xl animate-pulse">💖</div>
        <div className="absolute top-32 right-16 text-4xl animate-bounce">💕</div>
        <div className="absolute bottom-20 left-20 text-5xl animate-pulse">💫</div>
        <div className="absolute bottom-40 right-10 text-3xl animate-bounce">✨</div>
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
        <span className="text-sm font-medium text-white/80">1/5</span>
      </div>

      {/* Progress Bar */}
      <div className="px-4 mb-8 relative z-10">
        <div className="w-full bg-white/20 rounded-full h-3 backdrop-blur-sm">
          <div className="bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] h-3 rounded-full transition-all duration-500 shadow-lg" style={{ width: '20%' }}></div>
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
              <span className="text-2xl">👋</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Tell us about you
            </h1>
            <p className="text-white/80 text-base">
              This helps us find your perfect matches
            </p>
          </div>

          {/* Enhanced Form Container */}
          <div className="glass-card-light p-6 rounded-2xl backdrop-blur-lg border border-white/30">

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/90">
                  First name <span className="text-red-300">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const v = e.target.value;
                    setName(v);
                    try {
                      onboardingService.saveStep('basics', {
                        name: v,
                        age: age ? parseInt(age) : (undefined as any),
                        gender: gender || undefined,
                        orientation: orientation || undefined,
                      } as any);
                    } catch {}
                  }}
                  placeholder="Enter your first name..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent backdrop-blur-sm"
                  required
                />
                {errors.name && (
                  <p className="text-sm text-red-300">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Age <span className="text-red-300">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAge(String(Math.max(18, parseInt(age || '18') - 1)))}
                    className="w-12 h-12 rounded-lg bg-white/10 border border-white/30 flex items-center justify-center text-xl font-semibold text-white hover:bg-white/20 transition-all backdrop-blur-sm"
                  >
                    −
                  </button>
                  <div className="flex-1">
                    <input
                      type="number"
                      min="18"
                      max="99"
                      value={age}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAge(v);
                        try {
                          onboardingService.saveStep('basics', {
                            name: name || undefined,
                            age: v ? parseInt(v) : (undefined as any),
                            gender: gender || undefined,
                            orientation: orientation || undefined,
                          } as any);
                        } catch {}
                      }}
                      className="w-full text-center text-2xl font-bold py-3 bg-white/10 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent backdrop-blur-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setAge(String(Math.min(99, parseInt(age || '18') + 1)))}
                    className="w-12 h-12 rounded-lg bg-white/10 border border-white/30 flex items-center justify-center text-xl font-semibold text-white hover:bg-white/20 transition-all backdrop-blur-sm"
                  >
                    +
                  </button>
                </div>
                {errors.age && (
                  <p className="mt-2 text-sm text-red-300">{errors.age}</p>
                )}
                <p className="mt-1 text-xs text-white/60">Must be 18 or older</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-3">
                  Gender (Optional)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {GENDER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setGender(gender === option.value ? '' : option.value)}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all backdrop-blur-sm ${
                        gender === option.value
                          ? 'border-white/50 bg-white/20 text-white'
                          : 'border-white/30 bg-white/10 text-white/80 hover:bg-white/15 hover:border-white/40'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-3">
                  Sexual Orientation (Optional)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {ORIENTATION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setOrientation(orientation === option.value ? '' : option.value)}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all backdrop-blur-sm ${
                        orientation === option.value
                          ? 'border-white/50 bg-white/20 text-white'
                          : 'border-white/30 bg-white/10 text-white/80 hover:bg-white/15 hover:border-white/40'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
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
