'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

import { useAuth } from '@/contexts/AuthContext';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('admin@loveconnect.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, loading, user } = useAuth();

  const redirect = searchParams.get('redirect') || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const success = await signIn(email, password);
      if (success && user?.isAdmin) {
        // Redirect to admin dashboard for admin users
        router.push(redirect);
      } else if (success) {
        setError('Access denied. Admin privileges required.');
      } else {
        setError('Invalid email or password');
      }
    } catch (error: any) {
      console.error('Admin signin error:', error);
      setError('Sign in failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] relative overflow-hidden flex items-center justify-center">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 text-6xl animate-pulse">🛡️</div>
        <div className="absolute top-32 right-16 text-4xl animate-bounce">🔐</div>
        <div className="absolute bottom-20 left-20 text-5xl animate-pulse">⚙️</div>
        <div className="absolute bottom-40 right-10 text-3xl animate-bounce">🔑</div>
      </div>

      <motion.div 
        className="w-full max-w-md p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="glass-card-light p-8 rounded-2xl backdrop-blur-lg border border-white/30">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div 
              className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 mx-auto mb-4"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <span className="text-white font-bold text-2xl">🛡️</span>
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-2">Admin Panel</h1>
            <p className="text-white/70 text-sm">Secure access to platform administration</p>
          </div>

          {/* Demo Credentials Info */}
          <div className="mb-6 p-4 bg-blue-500/20 border border-blue-400/30 rounded-xl">
            <h3 className="text-blue-200 font-medium text-sm mb-2">Demo Credentials:</h3>
            <div className="text-blue-100 text-xs space-y-1">
              <div><strong>Admin:</strong> admin@loveconnect.com / admin123</div>
              <div><strong>User:</strong> user@example.com / user123</div>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div 
                className="p-3 bg-red-500/20 border border-red-400/30 rounded-xl text-red-200 text-sm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {error}
              </motion.div>
            )}

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
                placeholder="admin@loveconnect.com"
                required
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7043] text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Signing In...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  🔐 Secure Login
                </div>
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-white/60 text-xs">
              🔒 All admin actions are logged and monitored
            </p>
            <motion.button
              onClick={() => router.push('/')}
              className="mt-3 text-white/70 hover:text-white text-sm underline transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              ← Back to Main Site
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
