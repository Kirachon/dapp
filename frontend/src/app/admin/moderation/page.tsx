'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '@/contexts/AuthContext';
import { ADMIN_MODERATION, ADMIN_MODERATION_ACTION } from '@/lib/admin-queries';

interface ModerationItem {
  id: string;
  type: 'photo' | 'profile' | 'message';
  user: {
    id: string;
    name: string;
    email: string;
  };
  content: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  submittedAt: Date;
  reportedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function AdminModerationPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [priorityFilter, setPriorityFilter] = useState<
    'all' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  >('all');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  // GraphQL queries and mutations
  const {
    data: moderationData,
    loading: moderationLoading,
    error: moderationError,
    refetch,
  } = useQuery(ADMIN_MODERATION, {
    variables: {
      limit: pageSize,
      offset: currentPage * pageSize,
      status: activeTab,
      priority: priorityFilter === 'all' ? null : priorityFilter,
    },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const [moderationAction] = useMutation(ADMIN_MODERATION_ACTION, {
    onCompleted: () => refetch(),
    onError: (error) => console.error('Moderation action error:', error),
  });

  const moderationItems = moderationData?.adminModeration?.items || [];
  const totalCount = moderationData?.adminModeration?.totalCount || 0;
  const hasMore = moderationData?.adminModeration?.hasMore || false;

  // Auto-refresh when filters change
  useEffect(() => {
    setCurrentPage(0); // Reset to first page when filters change
    refetch();
  }, [activeTab, priorityFilter, refetch]);
  const handleModerationAction = async (itemId: string, action: 'approve' | 'reject') => {
    try {
      await moderationAction({
        variables: {
          itemId,
          action,
          reason: `Admin ${action} action`,
        },
      });
    } catch (error) {
      console.error(`Failed to ${action} item:`, error);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-blue-500/20 border-blue-400/30 text-blue-200',
      medium: 'bg-yellow-500/20 border-yellow-400/30 text-yellow-200',
      high: 'bg-orange-500/20 border-orange-400/30 text-orange-200',
      urgent: 'bg-red-500/20 border-red-400/30 text-red-200',
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      photo: '📸',
      profile: '👤',
      message: '💬',
    };
    return icons[type as keyof typeof icons] || '📄';
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Check admin access
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin?redirect=/admin/moderation');
      return;
    }

    // Check if user has admin role
    if (!user?.isAdmin && !user?.roles?.includes('admin')) {
      router.push('/');
      return;
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || (!user?.isAdmin && !user?.roles?.includes('admin'))) {
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
        <div className="absolute top-10 left-10 text-6xl animate-pulse">🛡️</div>
        <div className="absolute top-32 right-16 text-4xl animate-bounce">⚠️</div>
        <div className="absolute bottom-20 left-20 text-5xl animate-pulse">🔍</div>
        <div className="absolute bottom-40 right-10 text-3xl animate-bounce">✅</div>
      </div>

      {/* Enhanced Header */}
      <div className="flex items-center justify-between p-4 relative z-10">
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => router.push('/admin')}
            className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </motion.button>
          <div>
            <h1 className="font-bold text-xl text-white">Content Moderation</h1>
            <p className="text-white/70 text-sm">{moderationItems.length} items to review</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            className="p-3 rounded-xl glass-card text-white/80 hover:text-white hover:bg-white/15 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="px-4 relative z-10 mb-6">
        <div className="max-w-6xl mx-auto">
          <div className="glass-card-light p-4 rounded-2xl backdrop-blur-lg border border-white/30">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Status Tabs */}
              <div className="flex gap-1 bg-white/10 rounded-xl p-1">
                {[
                  {
                    key: 'pending',
                    label: 'Pending',
                    count: moderationItems.filter((i: ModerationItem) => i.status === 'pending')
                      .length,
                  },
                  {
                    key: 'approved',
                    label: 'Approved',
                    count: moderationItems.filter((i: ModerationItem) => i.status === 'approved')
                      .length,
                  },
                  {
                    key: 'rejected',
                    label: 'Rejected',
                    count: moderationItems.filter((i: ModerationItem) => i.status === 'rejected')
                      .length,
                  },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.key
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Priority Filter */}
              <div className="flex gap-2">
                {[
                  { key: 'all', label: 'All Priority' },
                  { key: 'urgent', label: 'Urgent' },
                  { key: 'high', label: 'High' },
                  { key: 'medium', label: 'Medium' },
                  { key: 'low', label: 'Low' },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setPriorityFilter(filter.key as any)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      priorityFilter === filter.key
                        ? 'bg-white/20 text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Moderation Queue */}
      <div className="flex-1 px-4 pb-8 relative z-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {moderationItems.length === 0 ? (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-white mb-2">No items to review</h3>
              <p className="text-white/80">All {activeTab} items have been processed.</p>
            </motion.div>
          ) : (
            <div className="space-y-4" data-testid="moderation-list">
              {moderationItems.map((item: ModerationItem, index: number) => (
                <motion.div
                  key={item.id}
                  className="glass-card-light p-6 rounded-2xl backdrop-blur-lg border border-white/30"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  data-testid="moderation-item"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{getTypeIcon(item.type)}</div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-semibold">{item.user.name}</h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(item.priority)}`}
                          >
                            {item.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-white/60 text-sm">{item.user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white/60 text-sm">{formatTimeAgo(item.submittedAt)}</div>
                      {item.reportedBy && (
                        <div className="text-white/40 text-xs">Reported by: {item.reportedBy}</div>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-white/80 text-sm mb-2">
                      <strong>Content:</strong> {item.content}
                    </div>
                    <div className="text-white/80 text-sm">
                      <strong>Reason:</strong> {item.reason}
                    </div>
                  </div>

                  {item.status === 'pending' && (
                    <div className="flex gap-3">
                      <motion.button
                        onClick={() => handleModerationAction(item.id, 'approve')}
                        className="flex-1 bg-green-500/20 border border-green-400/30 text-green-200 py-2 px-4 rounded-xl font-medium hover:bg-green-500/30 transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        data-testid="approve-button"
                      >
                        ✅ Approve
                      </motion.button>
                      <motion.button
                        onClick={() => handleModerationAction(item.id, 'reject')}
                        className="flex-1 bg-red-500/20 border border-red-400/30 text-red-200 py-2 px-4 rounded-xl font-medium hover:bg-red-500/30 transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        data-testid="reject-button"
                      >
                        ❌ Reject
                      </motion.button>
                      <motion.button
                        className="px-4 py-2 bg-white/10 text-white/70 rounded-xl hover:bg-white/20 transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        👁️ View Details
                      </motion.button>
                    </div>
                  )}

                  {item.status !== 'pending' && (
                    <div
                      className={`text-center py-2 rounded-xl ${
                        item.status === 'approved'
                          ? 'bg-green-500/20 text-green-200'
                          : 'bg-red-500/20 text-red-200'
                      }`}
                    >
                      {item.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
