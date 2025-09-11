'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, gql } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { formatTimeAgo } from '@/lib/utils';

const GET_MATCHES_QUERY = gql`
  query GetMyMatches($status: MatchStatus, $page: Int, $pageSize: Int) {
    myMatches(status: $status, page: $page, pageSize: $pageSize) {
      id
      status
      createdAt
      otherUser {
        userId
        name
        photos
        age
      }
    }
  }
`;

const GET_CONVERSATIONS_QUERY = gql`
  query GetConversationsList($page: Int, $pageSize: Int) {
    myConversations(page: $page, pageSize: $pageSize) {
      id
      matchId
      lastMessageAt
      unreadCount
      otherUser {
        userId
        name
        photos
        age
      }
    }
  }
`;

interface Match {
  matchId: string;
  user: {
    userId: string;
    name: string;
    photos: string[];
  };
  lastMessage?: {
    messageId: string;
    content: string;
    timestamp: string;
    senderId: string;
  };
  createdAt: string;
}

interface Conversation {
  conversationId: string;
  participants: Array<{
    userId: string;
    name: string;
    photos: string[];
  }>;
  lastMessage?: {
    messageId: string;
    content: string;
    timestamp: string;
    senderId: string;
  };
  unreadCount: number;
}

export default function MatchesPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'recent'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const router = useRouter();
  const { isAuthenticated, hasProfile, user } = useAuth();

  const {
    data: matchesData,
    loading: matchesLoading,
    error: matchesError,
    refetch: refetchMatches,
  } = useQuery(GET_MATCHES_QUERY, {
    skip: !isAuthenticated || !hasProfile,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
    pollInterval: 30000, // Refresh every 30 seconds
    variables: {
      status: activeTab === 'all' ? undefined : activeTab.toUpperCase(),
      page: 1,
      pageSize: 50,
    },
  });

  const {
    data: conversationsData,
    loading: conversationsLoading,
    error: conversationsError,
    refetch: refetchConversations,
  } = useQuery(GET_CONVERSATIONS_QUERY, {
    skip: !isAuthenticated || !hasProfile,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
    variables: {
      page: 1,
      pageSize: 50,
    },
  });

  // Redirect if not authenticated or no profile
  if (!isAuthenticated) {
    router.push('/signin');
    return null;
  }

  if (!hasProfile) {
    router.push('/onboarding');
    return null;
  }

  // Get real matches data from GraphQL
  const matches = matchesData?.myMatches || [];
  const conversations: Conversation[] = conversationsData?.myConversations || [];

  const filteredMatches = matches.filter((match: any) => {
    const matchesSearch =
      match.otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const matchesTab = activeTab === 'all' || match.status?.toLowerCase() === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleMatchClick = (match: any) => {
    router.push(`/chat/${match.otherUser?.userId || match.id}`);
  };

  const handleConversationClick = (conversation: Conversation) => {
    router.push(`/chat/${conversation.conversationId}`);
  };

  // Professional loading skeleton component
  const MatchesLoadingSkeleton = () => (
    <div
      className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] relative overflow-hidden"
      data-testid="matches-loading-skeleton"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 text-6xl animate-pulse">💕</div>
        <div className="absolute top-32 right-16 text-4xl animate-bounce">✨</div>
        <div className="absolute bottom-20 left-20 text-5xl animate-pulse">💫</div>
        <div className="absolute bottom-40 right-10 text-3xl animate-bounce">🔥</div>
      </div>

      {/* Header Skeleton */}
      <div className="flex items-center justify-between p-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 rounded-xl animate-pulse"></div>
          <div className="h-6 w-20 bg-white/20 rounded animate-pulse"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/15 rounded-lg animate-pulse"></div>
          <div className="w-8 h-8 bg-white/15 rounded-lg animate-pulse"></div>
        </div>
      </div>

      {/* Tab Skeleton */}
      <div className="px-4 mb-4 relative z-10">
        <div className="flex bg-white/10 rounded-2xl p-1 backdrop-blur-md border border-white/20">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 h-10 bg-white/10 rounded-xl animate-pulse mx-1"></div>
          ))}
        </div>
      </div>

      {/* Search Bar Skeleton */}
      <div className="px-4 mb-6 relative z-10">
        <div className="h-12 bg-white/10 rounded-2xl animate-pulse backdrop-blur-md border border-white/20"></div>
      </div>

      {/* Content Skeleton */}
      <div className="flex-1 overflow-y-auto p-4 relative z-10">
        <div className="max-w-sm mx-auto">
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="glass-card rounded-2xl overflow-hidden backdrop-blur-lg border border-white/30"
                data-testid="skeleton-card"
              >
                <div className="aspect-[3/4] relative">
                  <div className="w-full h-full bg-white/10 animate-pulse"></div>

                  {/* Status indicator skeleton */}
                  <div className="absolute top-2 right-2">
                    <div className="w-3 h-3 bg-white/20 rounded-full animate-pulse"></div>
                  </div>

                  {/* Info overlay skeleton */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <div className="h-4 bg-white/20 rounded mb-2 animate-pulse"></div>
                    <div className="h-3 bg-white/15 rounded w-2/3 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (matchesLoading && !matchesData) {
    return <MatchesLoadingSkeleton />;
  }

  // Comprehensive error handling component
  const ErrorMessage = ({ error, onRetry }: { error: any; onRetry: () => void }) => {
    const getErrorMessage = (error: any) => {
      if (error?.networkError) {
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      }
      if (error?.graphQLErrors?.length > 0) {
        const graphQLError = error.graphQLErrors[0];
        if (graphQLError.extensions?.code === 'UNAUTHENTICATED') {
          return 'Your session has expired. Please sign in again.';
        }
        if (graphQLError.extensions?.code === 'FORBIDDEN') {
          return "You don't have permission to view matches. Please complete your profile.";
        }
        return graphQLError.message || 'Something went wrong with your request.';
      }
      return 'Something went wrong. Please try again.';
    };

    const getErrorIcon = (error: any) => {
      if (error?.networkError) return '📡';
      if (error?.graphQLErrors?.some((e: any) => e.extensions?.code === 'UNAUTHENTICATED'))
        return '🔐';
      if (error?.graphQLErrors?.some((e: any) => e.extensions?.code === 'FORBIDDEN')) return '⛔';
      return '⚠️';
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center p-4">
        <motion.div
          className="text-center max-w-md mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="glass-card p-8 rounded-3xl backdrop-blur-lg border border-white/30">
            <div className="text-6xl mb-4">{getErrorIcon(error)}</div>
            <h3 className="text-xl font-semibold text-white mb-3">Oops! Something went wrong</h3>
            <p className="text-white/80 mb-6 leading-relaxed">{getErrorMessage(error)}</p>
            <div className="flex flex-col gap-3">
              <motion.button
                onClick={onRetry}
                className="bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7043] text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Try Again
              </motion.button>
              {error?.graphQLErrors?.some((e: any) => e.extensions?.code === 'UNAUTHENTICATED') && (
                <motion.button
                  onClick={() => router.push('/signin')}
                  className="bg-white/20 hover:bg-white/30 text-white py-3 px-6 rounded-xl font-semibold backdrop-blur-md border border-white/30 transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Sign In
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  // Handle errors
  if (matchesError) {
    return <ErrorMessage error={matchesError} onRetry={() => refetchMatches()} />;
  }

  // Enhanced empty state component
  const EmptyMatchesState = ({ searchQuery }: { searchQuery: string }) => {
    const getEmptyStateContent = () => {
      if (searchQuery) {
        return {
          icon: '🔍',
          title: 'No matches found',
          message: 'Try adjusting your search terms or clear the search to see all matches.',
          action: {
            text: 'Clear Search',
            onClick: () => setSearchQuery(''),
          },
        };
      }

      // Check if user is new (no matches at all)
      const totalMatches = matches.length;
      if (totalMatches === 0) {
        return {
          icon: '💕',
          title: 'Ready to find love?',
          message:
            'Start discovering amazing people in your area! Swipe right on profiles you like to create matches.',
          action: {
            text: 'Start Discovering',
            onClick: () => router.push('/discover'),
          },
          secondaryAction: {
            text: 'Update Preferences',
            onClick: () => router.push('/filters'),
          },
        };
      }

      // User has matches but filtered results are empty
      return {
        icon: '🎯',
        title: 'No matches in this category',
        message: "Try switching to 'All' to see your complete match list, or discover new people.",
        action: {
          text: 'View All Matches',
          onClick: () => setActiveTab('all'),
        },
        secondaryAction: {
          text: 'Discover More',
          onClick: () => router.push('/discover'),
        },
      };
    };

    const content = getEmptyStateContent();

    return (
      <motion.div
        className="text-center py-12 px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="glass-card p-8 rounded-3xl backdrop-blur-lg border border-white/30 max-w-sm mx-auto"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <motion.div
            className="text-6xl mb-6"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          >
            {content.icon}
          </motion.div>

          <h3 className="text-xl font-semibold text-white mb-3">{content.title}</h3>

          <p className="text-white/80 mb-8 leading-relaxed">{content.message}</p>

          <div className="space-y-3">
            <motion.button
              onClick={content.action.onClick}
              className="w-full bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7043] text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {content.action.text}
            </motion.button>

            {content.secondaryAction && (
              <motion.button
                onClick={content.secondaryAction.onClick}
                className="w-full bg-white/20 hover:bg-white/30 text-white py-3 px-6 rounded-xl font-semibold backdrop-blur-md border border-white/30 transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {content.secondaryAction.text}
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 text-6xl animate-pulse">💕</div>
        <div className="absolute top-32 right-16 text-4xl animate-bounce">✨</div>
        <div className="absolute bottom-20 left-20 text-5xl animate-pulse">💫</div>
        <div className="absolute bottom-40 right-10 text-3xl animate-bounce">🔥</div>
      </div>

      {/* Enhanced Header */}
      <div className="flex items-center justify-between p-4 relative z-10">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20"
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-white font-bold text-xl">💕</span>
          </motion.div>
          <span className="font-bold text-xl text-white">Matches</span>
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </motion.button>
          <motion.button
            className="p-3 rounded-xl glass-card text-white/80 hover:text-white hover:bg-white/15 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            )}
          </motion.button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 relative z-10">
        <div className="max-w-sm mx-auto">
          <div className="glass-card-light p-3 rounded-2xl backdrop-blur-lg border border-white/30">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-white/70"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search matches..."
                className="flex-1 bg-transparent text-white placeholder-white/60 focus:outline-none text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="px-4 relative z-10">
        <div className="max-w-sm mx-auto">
          <div className="glass-card-light p-1 rounded-2xl backdrop-blur-lg border border-white/30">
            <div className="flex">
              {[
                { key: 'all', label: 'All', count: matches.length },
                {
                  key: 'new',
                  label: 'New',
                  count: matches.filter((m: any) => m.status === 'ACTIVE').length,
                },
                {
                  key: 'recent',
                  label: 'Recent',
                  count: matches.filter((m: any) => m.status === 'ACTIVE').length,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-xl transition-all ${
                    activeTab === tab.key
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 relative z-10">
        <div className="max-w-sm sm:max-w-md lg:max-w-4xl xl:max-w-6xl mx-auto">
          {filteredMatches.length === 0 ? (
            <EmptyMatchesState searchQuery={searchQuery} />
          ) : (
            <AnimatePresence mode="wait">
              {viewMode === 'grid' ? (
                <motion.div
                  key="grid"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"
                  data-testid="matches-grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {filteredMatches.map((match: any, index: number) => (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleMatchClick(match)}
                      className="glass-card rounded-2xl overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 backdrop-blur-lg border border-white/30 touch-manipulation"
                    >
                      <div className="aspect-[3/4] relative">
                        {match.otherUser?.photos && match.otherUser.photos.length > 0 ? (
                          <img
                            src={match.otherUser.photos[0]}
                            alt={`${match.otherUser.name}'s photo`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              // Fallback to gradient background with initial
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center"
                          style={{ display: match.otherUser?.photos?.length ? 'none' : 'flex' }}
                        >
                          <span className="text-white text-2xl sm:text-3xl lg:text-4xl font-bold">
                            {match.otherUser?.name?.charAt(0) || '?'}
                          </span>
                        </div>

                        {/* Status Indicator */}
                        <div className="absolute top-2 right-2">
                          {match.status === 'new' && (
                            <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                          )}
                          {match.isOnline && (
                            <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>

                        {/* Match Info Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 sm:p-3">
                          <h3 className="text-white font-semibold text-xs sm:text-sm lg:text-base mb-1 truncate">
                            {match.otherUser?.name || 'Unknown'}, {match.otherUser?.age || '?'}
                          </h3>
                          <div className="flex items-center gap-1 sm:gap-2 text-white/80 text-xs">
                            <span className="truncate">
                              {match.createdAt ? formatTimeAgo(match.createdAt) : 'Recently'}
                            </span>
                            {/* Add mutual friends if available in the data */}
                            {match.mutualFriends && match.mutualFriends > 0 && (
                              <>
                                <span>•</span>
                                <span className="truncate">{match.mutualFriends} mutual</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  className="space-y-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {filteredMatches.map((match: any, index: number) => (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleMatchClick(match)}
                      className="glass-card-light p-4 rounded-2xl backdrop-blur-lg border border-white/30 cursor-pointer hover:bg-white/20 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold">
                              {match.otherUser?.name?.charAt(0) || '?'}
                            </span>
                          </div>
                          {match.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-white">
                              {match.otherUser?.name}, {match.otherUser?.age}
                            </h4>
                            {match.status === 'new' && (
                              <span className="px-2 py-1 bg-red-500/20 border border-red-400/30 rounded-full text-red-200 text-xs font-medium">
                                New
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-white/70 text-sm">
                            <span>{match.lastActive}</span>
                            {match.mutualFriends > 0 && (
                              <>
                                <span>•</span>
                                <span>{match.mutualFriends} mutual friends</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <motion.button
                            className="p-2 bg-white/20 rounded-lg text-white/80 hover:text-white hover:bg-white/30 transition-all"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            💬
                          </motion.button>
                          <motion.button
                            className="p-2 bg-white/20 rounded-lg text-white/80 hover:text-white hover:bg-white/30 transition-all"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            👤
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
