'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalMatches: number;
  pendingReports: number;
  pendingPhotos: number;
  revenue: number;
}

interface RecentActivity {
  id: string;
  type: 'user_signup' | 'match_created' | 'report_submitted' | 'photo_uploaded';
  description: string;
  timestamp: Date;
  user?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 12847,
    activeUsers: 3421,
    totalMatches: 8934,
    pendingReports: 23,
    pendingPhotos: 156,
    revenue: 45230
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'user_signup',
      description: 'New user registration',
      timestamp: new Date(Date.now() - 300000),
      user: 'Sarah Johnson'
    },
    {
      id: '2',
      type: 'match_created',
      description: 'New match created',
      timestamp: new Date(Date.now() - 600000),
      user: 'Emma Wilson & Mike Davis'
    },
    {
      id: '3',
      type: 'report_submitted',
      description: 'User report submitted',
      timestamp: new Date(Date.now() - 900000),
      user: 'Anonymous'
    },
    {
      id: '4',
      type: 'photo_uploaded',
      description: 'Photo pending approval',
      timestamp: new Date(Date.now() - 1200000),
      user: 'Jessica Chen'
    }
  ]);

  // Check admin access
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin?redirect=/admin');
      return;
    }

    // Check if user has admin role
    if (!user?.isAdmin && !user?.roles?.includes('admin')) {
      router.push('/');
      return;
    }
  }, [isAuthenticated, user, router]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_signup': return '👤';
      case 'match_created': return '💕';
      case 'report_submitted': return '⚠️';
      case 'photo_uploaded': return '📸';
      default: return '📊';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user_signup': return 'text-green-400';
      case 'match_created': return 'text-pink-400';
      case 'report_submitted': return 'text-red-400';
      case 'photo_uploaded': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white/80">Checking access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 text-6xl animate-pulse">⚙️</div>
        <div className="absolute top-32 right-16 text-4xl animate-bounce">📊</div>
        <div className="absolute bottom-20 left-20 text-5xl animate-pulse">💼</div>
        <div className="absolute bottom-40 right-10 text-3xl animate-bounce">🔧</div>
      </div>

      {/* Enhanced Header */}
      <div className="flex items-center justify-between p-4 relative z-10">
        <div className="flex items-center gap-3">
          <motion.div 
            className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20"
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-white font-bold text-xl">⚙️</span>
          </motion.div>
          <div>
            <h1 className="font-bold text-xl text-white">Admin Dashboard</h1>
            <p className="text-white/70 text-sm">LoveConnect Management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button 
            className="p-3 rounded-xl glass-card text-white/80 hover:text-white hover:bg-white/15 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 01-7.5-7.5H7.5a7.5 7.5 0 017.5 7.5v5z" />
            </svg>
          </motion.button>
          <motion.button 
            className="p-3 rounded-xl glass-card text-white/80 hover:text-white hover:bg-white/15 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-8 relative z-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total Users', value: formatNumber(stats.totalUsers), icon: '👥', color: 'from-blue-500 to-cyan-500' },
              { label: 'Active Users', value: formatNumber(stats.activeUsers), icon: '🟢', color: 'from-green-500 to-emerald-500' },
              { label: 'Total Matches', value: formatNumber(stats.totalMatches), icon: '💕', color: 'from-pink-500 to-rose-500' },
              { label: 'Pending Reports', value: formatNumber(stats.pendingReports), icon: '⚠️', color: 'from-red-500 to-orange-500' },
              { label: 'Pending Photos', value: formatNumber(stats.pendingPhotos), icon: '📸', color: 'from-purple-500 to-indigo-500' },
              { label: 'Revenue', value: formatCurrency(stats.revenue), icon: '💰', color: 'from-yellow-500 to-amber-500' }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                className="glass-card-light p-4 rounded-2xl backdrop-blur-lg border border-white/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/80 text-sm">{stat.label}</span>
                  <div className={`w-8 h-8 bg-gradient-to-r ${stat.color} rounded-lg flex items-center justify-center`}>
                    <span className="text-white text-sm">{stat.icon}</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
              </motion.div>
            ))}
          </div>

          {/* Quick Actions */}
          <motion.div 
            className="glass-card-light p-6 rounded-2xl backdrop-blur-lg border border-white/30 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span>⚡</span> Quick Actions
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'User Management', icon: '👥', href: '/admin/users' },
                { label: 'Content Moderation', icon: '🛡️', href: '/admin/moderation' },
                { label: 'Reports', icon: '📊', href: '/admin/reports' },
                { label: 'Settings', icon: '⚙️', href: '/admin/settings' }
              ].map((action) => (
                <motion.button
                  key={action.label}
                  onClick={() => router.push(action.href)}
                  className="glass-card p-4 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-all text-center"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-2xl mb-2">{action.icon}</div>
                  <div className="text-sm font-medium">{action.label}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div 
            className="glass-card-light p-6 rounded-2xl backdrop-blur-lg border border-white/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span>📈</span> Recent Activity
            </h3>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  className="flex items-center gap-3 p-3 glass-card rounded-xl"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                >
                  <div className={`text-xl ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <div className="text-white text-sm font-medium">{activity.description}</div>
                    <div className="text-white/60 text-xs">{activity.user}</div>
                  </div>
                  <div className="text-white/60 text-xs">
                    {formatTimeAgo(activity.timestamp)}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
