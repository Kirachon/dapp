'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Floating hearts component
const FloatingHearts = () => {
  const [hearts, setHearts] = useState<Array<{ id: number; emoji: string; delay: number; duration: number; left: number }>>([]);

  useEffect(() => {
    const createHeart = () => {
      const newHeart = {
        id: Date.now() + Math.random(),
        emoji: Math.random() > 0.5 ? '💕' : '💖',
        delay: Math.random() * 6,
        duration: Math.random() * 3 + 4,
        left: Math.random() * 100
      };
      
      setHearts(prev => [...prev, newHeart]);
      
      setTimeout(() => {
        setHearts(prev => prev.filter(heart => heart.id !== newHeart.id));
      }, 8000);
    };

    // Create initial hearts
    for (let i = 0; i < 5; i++) {
      setTimeout(createHeart, i * 1000);
    }

    // Create hearts periodically
    const interval = setInterval(createHeart, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <AnimatePresence>
        {hearts.map((heart) => (
          <motion.div
            key={heart.id}
            className="absolute text-xl opacity-10"
            style={{ left: `${heart.left}%` }}
            initial={{ y: '100vh', rotate: 0, opacity: 0 }}
            animate={{ 
              y: -20, 
              rotate: 180, 
              opacity: [0, 0.3, 0.3, 0],
              transition: {
                duration: heart.duration,
                delay: heart.delay,
                ease: 'easeInOut'
              }
            }}
            exit={{ opacity: 0 }}
          >
            {heart.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Stats component with animation
const AnimatedStats = () => {
  const [stats, setStats] = useState({
    activeUsers: 50000,
    dailyMatches: 2500,
    safetyRating: 89
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 10),
        dailyMatches: prev.dailyMatches + Math.floor(Math.random() * 5),
        safetyRating: prev.safetyRating
      }));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="text-2xl font-bold text-white">
          {Math.floor(stats.activeUsers / 1000)}K+
        </div>
        <div className="text-xs opacity-80">Active Users</div>
      </motion.div>
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="text-2xl font-bold text-white">
          {(stats.dailyMatches / 1000).toFixed(1)}K
        </div>
        <div className="text-xs opacity-80">Daily Matches</div>
      </motion.div>
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="text-2xl font-bold text-white">{stats.safetyRating}%</div>
        <div className="text-xs opacity-80">Safety Rating</div>
      </motion.div>
    </div>
  );
};

export default function HomePage() {
  const { isAuthenticated, hasProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      if (hasProfile) {
        router.push('/discover');
      } else {
        router.push('/onboarding');
      }
    }
  }, [isAuthenticated, hasProfile, router]);

  return (
    <div className="min-h-screen relative">
      {/* Floating hearts background */}
      <FloatingHearts />
      
      {/* Mobile Layout */}
      <div className="lg:hidden relative z-10">
        <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white">
          <div className="max-w-sm mx-auto min-h-screen flex flex-col relative">
            
            {/* Header */}
            <motion.div 
              className="pt-16 pb-10 px-5 text-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div 
                className="w-20 h-20 bg-white/15 rounded-full mx-auto mb-5 flex items-center justify-center backdrop-blur-md border-2 border-white/20"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-4xl">💖</span>
              </motion.div>
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-gray-100 bg-clip-text text-transparent">
                LoveConnect
              </h1>
              <p className="text-base opacity-90 font-normal leading-relaxed">
                Find genuine connections in your community
              </p>
            </motion.div>

            {/* Main Content */}
            <div className="flex-1 px-5">
              <motion.div 
                className="bg-white/10 rounded-2xl p-6 mb-10 backdrop-blur-lg border border-white/20"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <AnimatedStats />
                
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    '✅ Photo Verified',
                    '🔒 100% Private', 
                    '💬 Video Calls',
                    '🎉 Group Events',
                    '🆓 Completely Free'
                  ].map((feature, index) => (
                    <motion.span
                      key={feature}
                      className="bg-white/20 px-3 py-1.5 rounded-full text-xs font-medium"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                    >
                      {feature}
                    </motion.span>
                  ))}
                </div>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div 
                className="flex justify-center gap-6 mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                {[
                  { icon: '✓', label: 'ID Verified' },
                  { icon: '🔒', label: 'Encrypted' },
                  { icon: '🛡️', label: 'Safe Dating' }
                ].map((item, index) => (
                  <div key={item.label} className="text-center">
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <span className="text-xs opacity-80">{item.label}</span>
                  </div>
                ))}
              </motion.div>

              {/* CTA Section */}
              <div className="px-5 pb-8">
                <motion.div 
                  className="space-y-3 mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 }}
                >
                  <Link href="/signup" className="block">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button className="w-full bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7043] shadow-lg hover:shadow-xl transition-all duration-300 py-4 text-base font-semibold">
                        <span className="mr-2">🎓</span>
                        Get Started
                      </Button>
                    </motion.div>
                  </Link>
                  <Link href="/signin" className="block">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button 
                        variant="secondary" 
                        className="w-full bg-white/15 border-2 border-white/30 text-white hover:bg-white/20 backdrop-blur-md py-4 text-base font-semibold"
                      >
                        Already have an account? Sign In
                      </Button>
                    </motion.div>
                  </Link>
                </motion.div>

                {/* Privacy Note */}
                <motion.p 
                  className="text-center text-xs opacity-80 leading-relaxed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.4 }}
                >
                  By continuing, you agree to our{' '}
                  <Link href="/terms" className="underline hover:opacity-100">Terms</Link> and{' '}
                  <Link href="/privacy" className="underline hover:opacity-100">Privacy Policy</Link>.<br />
                  We're open source and your data stays private.
                </motion.p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Simplified for now */}
      <div className="hidden lg:block relative z-10 bg-[var(--color-background)]">
        <div className="flex items-center justify-between px-10 py-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--color-primary-500)] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">💖</span>
            </div>
            <span className="font-bold text-2xl text-[var(--color-text-primary)]">LoveConnect</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/signin">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>

        <div className="flex items-center min-h-[80vh] px-10">
          <div className="flex-1 max-w-2xl">
            <h1 className="text-6xl font-extrabold text-[var(--color-text-primary)] font-[var(--font-display)] mb-6">
              Find Your Perfect{' '}
              <span className="bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
                Match
              </span>
            </h1>
            <p className="text-lg text-[var(--color-text-secondary)] mb-8 leading-relaxed max-w-lg">
              Connect with people who share your interests and values. Start your journey to meaningful relationships today.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#5a67d8] hover:to-[#6b46c1]">
                  Get Started
                </Button>
              </Link>
              <Link href="/signin">
                <Button variant="outline" size="lg">Sign In</Button>
              </Link>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="w-96 h-96 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-3xl flex items-center justify-center">
              <div className="text-8xl">💕</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
