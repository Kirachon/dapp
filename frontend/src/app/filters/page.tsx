'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

interface FilterState {
  ageRange: [number, number];
  maxDistance: number;
  showMe: 'everyone' | 'men' | 'women' | 'non-binary';
  lookingFor: 'casual' | 'serious' | 'friends' | 'anything';
  education: string[];
  interests: string[];
  lifestyle: {
    smoking: 'any' | 'never' | 'sometimes' | 'regularly';
    drinking: 'any' | 'never' | 'sometimes' | 'regularly';
    exercise: 'any' | 'never' | 'sometimes' | 'regularly';
    pets: 'any' | 'love' | 'allergic' | 'none';
  };
  dealBreakers: string[];
}

const EDUCATION_OPTIONS = [
  'High School',
  'Some College',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'PhD/Doctorate',
  'Trade School',
  'Other'
];

const INTEREST_OPTIONS = [
  'Travel', 'Music', 'Sports', 'Art', 'Reading', 'Cooking', 'Gaming',
  'Photography', 'Dancing', 'Hiking', 'Movies', 'Fitness', 'Technology',
  'Fashion', 'Food', 'Nature', 'Animals', 'Writing', 'Yoga', 'Meditation'
];

export default function FiltersPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>({
    ageRange: [22, 35],
    maxDistance: 25,
    showMe: 'everyone',
    lookingFor: 'anything',
    education: [],
    interests: [],
    lifestyle: {
      smoking: 'any',
      drinking: 'any',
      exercise: 'any',
      pets: 'any'
    },
    dealBreakers: []
  });

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save filters to backend
      console.log('Saving filters:', filters);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.back();
    } catch (error) {
      console.error('Error saving filters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFilters({
      ageRange: [18, 50],
      maxDistance: 50,
      showMe: 'everyone',
      lookingFor: 'anything',
      education: [],
      interests: [],
      lifestyle: {
        smoking: 'any',
        drinking: 'any',
        exercise: 'any',
        pets: 'any'
      },
      dealBreakers: []
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 text-6xl animate-pulse">🔍</div>
        <div className="absolute top-32 right-16 text-4xl animate-bounce">⚙️</div>
        <div className="absolute bottom-20 left-20 text-5xl animate-pulse">💫</div>
        <div className="absolute bottom-40 right-10 text-3xl animate-bounce">✨</div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 relative z-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button
          onClick={handleReset}
          className="text-white/80 hover:text-white text-sm underline"
        >
          Reset All
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-8 relative z-10">
        <div className="max-w-sm mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/15 rounded-full mx-auto mb-4 flex items-center justify-center backdrop-blur-md border-2 border-white/20">
              <span className="text-2xl">🔍</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Discovery Filters
            </h1>
            <p className="text-white/80 text-base">
              Customize who you see
            </p>
          </div>

          {/* Filters Container */}
          <div className="space-y-6">
            {/* Age Range */}
            <motion.div 
              className="glass-card-light p-6 rounded-2xl backdrop-blur-lg border border-white/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span>🎂</span> Age Range
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/80 text-sm">
                    {filters.ageRange[0]} - {filters.ageRange[1]} years old
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="18"
                    max="65"
                    value={filters.ageRange[0]}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      ageRange: [parseInt(e.target.value), prev.ageRange[1]]
                    }))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <input
                    type="range"
                    min="18"
                    max="65"
                    value={filters.ageRange[1]}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      ageRange: [prev.ageRange[0], parseInt(e.target.value)]
                    }))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider absolute top-0"
                  />
                </div>
              </div>
            </motion.div>

            {/* Distance */}
            <motion.div 
              className="glass-card-light p-6 rounded-2xl backdrop-blur-lg border border-white/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span>📍</span> Maximum Distance
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/80 text-sm">
                    {filters.maxDistance === 100 ? '100+ miles' : `${filters.maxDistance} miles`}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={filters.maxDistance}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    maxDistance: parseInt(e.target.value)
                  }))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </motion.div>

            {/* Show Me */}
            <motion.div 
              className="glass-card-light p-6 rounded-2xl backdrop-blur-lg border border-white/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span>👥</span> Show Me
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'everyone', label: 'Everyone' },
                  { value: 'men', label: 'Men' },
                  { value: 'women', label: 'Women' },
                  { value: 'non-binary', label: 'Non-binary' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilters(prev => ({ ...prev, showMe: option.value as any }))}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all backdrop-blur-sm ${
                      filters.showMe === option.value
                        ? 'border-white/50 bg-white/20 text-white'
                        : 'border-white/30 bg-white/10 text-white/80 hover:bg-white/15 hover:border-white/40'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Looking For */}
            <motion.div 
              className="glass-card-light p-6 rounded-2xl backdrop-blur-lg border border-white/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span>💕</span> Looking For
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'anything', label: 'Anything' },
                  { value: 'casual', label: 'Casual' },
                  { value: 'serious', label: 'Serious' },
                  { value: 'friends', label: 'Friends' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilters(prev => ({ ...prev, lookingFor: option.value as any }))}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all backdrop-blur-sm ${
                      filters.lookingFor === option.value
                        ? 'border-white/50 bg-white/20 text-white'
                        : 'border-white/30 bg-white/10 text-white/80 hover:bg-white/15 hover:border-white/40'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Lifestyle Preferences */}
            <motion.div
              className="glass-card-light p-6 rounded-2xl backdrop-blur-lg border border-white/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span>🌱</span> Lifestyle
              </h3>
              <div className="space-y-4">
                {[
                  { key: 'smoking', label: 'Smoking', icon: '🚭' },
                  { key: 'drinking', label: 'Drinking', icon: '🍷' },
                  { key: 'exercise', label: 'Exercise', icon: '💪' },
                  { key: 'pets', label: 'Pets', icon: '🐕' }
                ].map((item) => (
                  <div key={item.key} className="space-y-2">
                    <label className="text-white/90 text-sm font-medium flex items-center gap-2">
                      <span>{item.icon}</span>
                      {item.label}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {['any', 'never', 'sometimes', 'regularly'].map((option) => (
                        <button
                          key={option}
                          onClick={() => setFilters(prev => ({
                            ...prev,
                            lifestyle: {
                              ...prev.lifestyle,
                              [item.key]: option
                            }
                          }))}
                          className={`p-2 rounded-lg border text-xs font-medium transition-all backdrop-blur-sm ${
                            filters.lifestyle[item.key as keyof typeof filters.lifestyle] === option
                              ? 'border-white/50 bg-white/20 text-white'
                              : 'border-white/30 bg-white/10 text-white/70 hover:bg-white/15 hover:border-white/40'
                          }`}
                        >
                          {option === 'any' ? 'Any' :
                           option === 'never' ? 'Never' :
                           option === 'sometimes' ? 'Sometimes' : 'Regularly'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Interests */}
            <motion.div
              className="glass-card-light p-6 rounded-2xl backdrop-blur-lg border border-white/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span>🎯</span> Interests
              </h3>
              <p className="text-white/70 text-sm mb-4">
                Select interests you'd like to see in potential matches
              </p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => {
                      setFilters(prev => ({
                        ...prev,
                        interests: prev.interests.includes(interest)
                          ? prev.interests.filter(i => i !== interest)
                          : [...prev.interests, interest]
                      }));
                    }}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all backdrop-blur-sm ${
                      filters.interests.includes(interest)
                        ? 'border-white/50 bg-white/20 text-white'
                        : 'border-white/30 bg-white/10 text-white/70 hover:bg-white/15 hover:border-white/40'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              {filters.interests.length > 0 && (
                <p className="text-white/60 text-xs mt-3">
                  {filters.interests.length} interests selected
                </p>
              )}
            </motion.div>
          </div>

          {/* Save Button */}
          <motion.div 
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7043] text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving Filters...
                </div>
              ) : (
                'Save Filters'
              )}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
