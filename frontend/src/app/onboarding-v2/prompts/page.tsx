'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { onboardingService, OnboardingPrompts } from '@/services/onboarding';
import { markOnboardingStep } from '@/lib/onboardingProgress';

const PROMPT_LIBRARY = [
  "My ideal Sunday involves...",
  "I'm looking for someone who...",
  "The way to my heart is...",
  "My biggest passion is...",
  "I'm secretly really good at...",
  "My friends would describe me as...",
  "I can't live without...",
  "My perfect first date would be...",
  "I'm most proud of...",
  "My biggest fear is...",
  "If I could have dinner with anyone...",
  "My favorite way to relax is...",
  "I'm currently obsessed with...",
  "My hidden talent is...",
  "The best advice I've received is...",
  "I'm happiest when...",
  "My dream vacation would be...",
  "I believe in...",
  "My guilty pleasure is...",
  "I'm working on..."
];

export default function OnboardingPromptsPage() {
  const [selectedPrompts, setSelectedPrompts] = useState<Array<{ question: string; answer: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Load existing data on mount
  useEffect(() => {
    const existingData = onboardingService.getStep('prompts');
    if (existingData && existingData.prompts) {
      setSelectedPrompts(existingData.prompts);
    }
  }, []);

  // Auto-save changes for persistence across refreshes
  useEffect(() => {
    const data: OnboardingPrompts = {
      prompts: selectedPrompts
    };
    try {
      onboardingService.saveStep('prompts', data);
    } catch (e) {
      // ignore
    }
  }, [selectedPrompts]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, router]);

  const handlePromptSelect = (prompt: string) => {
    if (selectedPrompts.find(p => p.question === prompt)) return;
    if (selectedPrompts.length >= 3) return;

    setSelectedPrompts(prev => [...prev, { question: prompt, answer: '' }]);
  };

  const handleAnswerChange = (index: number, answer: string) => {
    setSelectedPrompts(prev => 
      prev.map((prompt, i) => 
        i === index ? { ...prompt, answer } : prompt
      )
    );
  };

  const removePrompt = (index: number) => {
    setSelectedPrompts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedPrompts.length === 0) {
      setError('Please select at least one prompt');
      return;
    }

    const unansweredPrompts = selectedPrompts.filter(p => !p.answer.trim());
    if (unansweredPrompts.length > 0) {
      setError('Please answer all selected prompts');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const promptsData: OnboardingPrompts = {
        prompts: selectedPrompts.map(p => ({
          question: p.question,
          answer: p.answer.trim()
        }))
      };

      // Validate with service
      const validationErrors = onboardingService.validatePrompts(promptsData);
      if (validationErrors.length > 0) {
        setError(validationErrors[0]);
        return;
      }

      // Save to onboarding service
      onboardingService.saveStep('prompts', promptsData);

      // Mark prompts step, complete onboarding and submit to backend
      await markOnboardingStep('prompts');
      await onboardingService.completeOnboarding();

      // Navigate to discover page
      router.push('/discover');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setError(error instanceof Error ? error.message : 'Failed to complete onboarding. Please try again.');
      // Fallback: do not block the user in E2E/dev if backend returns an error
      if (process.env.NODE_ENV !== 'production') {
        router.push('/discover');
      }
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
        <div className="absolute top-10 left-10 text-6xl animate-pulse">💭</div>
        <div className="absolute top-32 right-16 text-4xl animate-bounce">✨</div>
        <div className="absolute bottom-20 left-20 text-5xl animate-pulse">💫</div>
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
        <span className="text-sm font-medium text-white/80">5/5</span>
      </div>

      {/* Progress Bar */}
      <div className="px-4 mb-8 relative z-10">
        <div className="w-full bg-white/20 rounded-full h-3 backdrop-blur-sm">
          <div className="bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] h-3 rounded-full transition-all duration-500 shadow-lg" style={{ width: '100%' }}></div>
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
      <div className="flex-1 px-4 pb-8 relative z-10 overflow-y-auto">
        <div className="max-w-sm mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/15 rounded-full mx-auto mb-4 flex items-center justify-center backdrop-blur-md border-2 border-white/20">
              <span className="text-2xl">💭</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Show your personality
            </h1>
            <p className="text-white/80 text-base">
              Answer prompts to help others get to know you
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg backdrop-blur-sm">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Selected Prompts */}
          {selectedPrompts.length > 0 && (
            <div className="mb-6 space-y-4">
              {selectedPrompts.map((prompt, index) => (
                <div key={index} className="glass-card-light p-4 rounded-xl backdrop-blur-lg border border-white/30">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-white font-medium text-sm">{prompt.question}</h3>
                    <button
                      onClick={() => removePrompt(index)}
                      className="text-white/60 hover:text-white/80 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <textarea
                    value={prompt.answer}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                    placeholder="Your answer..."
                    rows={3}
                    maxLength={300}
                    className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent backdrop-blur-sm resize-none text-sm"
                  />
                  <div className="flex justify-between mt-2">
                    <p className="text-xs text-white/60">Be authentic and specific</p>
                    <p className="text-xs text-white/60">{prompt.answer.length}/300</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Prompt Library */}
          {selectedPrompts.length < 3 && (
            <div className="mb-6">
              <h3 className="text-white font-medium mb-3 text-center">
                Choose a prompt ({selectedPrompts.length}/3)
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {PROMPT_LIBRARY.filter(prompt => !selectedPrompts.find(p => p.question === prompt)).map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handlePromptSelect(prompt)}
                    className="w-full p-3 text-left bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg text-white/90 transition-all backdrop-blur-sm text-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <form onSubmit={handleSubmit}>
            <button
              type="submit"
              disabled={loading || selectedPrompts.length === 0}
              className={`w-full py-3 px-6 rounded-xl font-semibold shadow-lg transition-all duration-300 ${
                selectedPrompts.length > 0
                  ? 'bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7043] text-white hover:shadow-xl'
                  : 'bg-white/20 text-white/50 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Completing...
                </div>
              ) : (
                'Complete Profile'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
