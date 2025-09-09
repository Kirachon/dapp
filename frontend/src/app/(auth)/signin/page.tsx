'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { validateEmail } from '@/lib/utils';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const router = useRouter();
  const { signIn, loading, hasProfile } = useAuth();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) return;

    try {
      const success = await signIn(email, password);
      if (success) {
        // Redirect to main app; onboarding entry points handle their own gating
        router.push('/discover');
      } else {
        setErrors({ general: 'Invalid email or password' });
      }
    } catch (error: any) {
      console.error('Signin error:', error);
      setErrors({ general: 'Sign in failed. Please try again.' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex flex-col relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 text-6xl animate-pulse">💖</div>
        <div className="absolute top-32 right-16 text-4xl animate-bounce">💕</div>
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
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-sm">
          {/* Enhanced Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-white/15 rounded-full mx-auto mb-6 flex items-center justify-center backdrop-blur-md border-2 border-white/20">
              <span className="text-4xl">💖</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome Back
            </h1>
            <p className="text-white/80 text-base">
              Sign in to your account
            </p>
          </div>

          {/* Enhanced Form */}
          <div className="glass-card-light p-6 rounded-2xl backdrop-blur-lg border border-white/30 mb-6">

            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.general && (
                <div className="p-3 bg-red-500/20 border border-red-400/30 rounded-lg backdrop-blur-sm">
                  <p className="text-sm text-red-200">{errors.general}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/90">Email or Phone</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@university.edu"
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent backdrop-blur-sm"
                  autoComplete="email"
                  data-testid="signin-email"
                  required
                />
                {errors.email && (
                  <p className="text-sm text-red-300">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/90">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent backdrop-blur-sm"
                    autoComplete="current-password"
                    data-testid="signin-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white/80"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-300">{errors.password}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-500 bg-white/10 border-white/30 rounded focus:ring-white/50 focus:ring-2"
                  />
                  <span className="text-sm text-white/80">Remember me</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-white underline hover:text-white/80"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7043] text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="signin-submit"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Signing In...
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/30" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-transparent text-white/80">OR</span>
                </div>
              </div>

              <button
                type="button"
                className="w-full glass-card text-white py-3 px-6 rounded-xl font-medium hover:bg-white/15 transition-all duration-200 flex items-center justify-center gap-3"
              >
                <span className="text-lg">🔐</span>
                Use Biometric Login
              </button>
            </form>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-white/80 text-sm">
              Don't have an account?{' '}
              <Link
                href="/signup"
                className="text-white font-medium underline hover:text-white/80"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

