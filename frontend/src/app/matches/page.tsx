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
  query GetMyConversations($page: Int, $pageSize: Int) {
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

  const { data: matchesData, loading: matchesLoading } = useQuery(GET_MATCHES_QUERY, {
    skip: !isAuthenticated || !hasProfile,
    fetchPolicy: 'cache-and-network',
  });

  const { data: conversationsData, loading: conversationsLoading } = useQuery(GET_CONVERSATIONS_QUERY, {
    skip: !isAuthenticated || !hasProfile,
    fetchPolicy: 'cache-and-network',
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

  // Mock data for demonstration
  const mockMatches = [
    {
      id: '1',
      user: { userId: '1', name: 'Emma Wilson', photos: ['/placeholder-avatar.png'], age: 24 },
      status: 'new',
      lastActive: '2 hours ago',
      isOnline: true,
      mutualFriends: 3
    },
    {
      id: '2',
      user: { userId: '2', name: 'Sarah Johnson', photos: ['/placeholder-avatar.png'], age: 26 },
      status: 'recent',
      lastActive: '1 day ago',
      isOnline: false,
      mutualFriends: 1
    },
    {
      id: '3',
      user: { userId: '3', name: 'Jessica Chen', photos: ['/placeholder-avatar.png'], age: 23 },
      status: 'new',
      lastActive: '30 minutes ago',
      isOnline: true,
      mutualFriends: 5
    },
    {
      id: '4',
      user: { userId: '4', name: 'Amanda Davis', photos: ['/placeholder-avatar.png'], age: 25 },
      status: 'recent',
      lastActive: '3 days ago',
      isOnline: false,
      mutualFriends: 2
    }
  ];

  const matches = mockMatches;
  const conversations: Conversation[] = conversationsData?.conversations || [];

  const filteredMatches = matches.filter(match => {
    const matchesSearch = match.user.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || match.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleMatchClick = (match: any) => {
    router.push(`/chat/${match.user.userId}`);
  };

  const handleConversationClick = (conversation: Conversation) => {
    router.push(`/chat/${conversation.conversationId}`);
  };

  if (matchesLoading || conversationsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white/80">Loading matches...</p>
        </div>
      </div>
    );
  }

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
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
              <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                { key: 'new', label: 'New', count: matches.filter(m => m.status === 'new').length },
                { key: 'recent', label: 'Recent', count: matches.filter(m => m.status === 'recent').length }
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
      <div className="flex-1 overflow-y-auto p-4 relative z-10">
        <div className="max-w-sm mx-auto">
          {filteredMatches.length === 0 ? (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-6xl mb-4">💔</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {searchQuery ? 'No matches found' : 'No matches yet'}
              </h3>
              <p className="text-white/80 mb-6">
                {searchQuery ? 'Try adjusting your search' : 'Keep swiping to find your perfect match!'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => router.push('/discover')}
                  className="bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7043] text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Start Discovering
                </button>
              )}
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              {viewMode === 'grid' ? (
                <motion.div
                  key="grid"
                  className="grid grid-cols-2 gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {filteredMatches.map((match, index) => (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleMatchClick(match)}
                      className="glass-card rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition-all duration-300 backdrop-blur-lg border border-white/30"
                    >
                      <div className="aspect-[3/4] relative">
                        <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                          <span className="text-white text-2xl font-bold">
                            {match.user.name.charAt(0)}
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
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                          <h3 className="text-white font-semibold text-sm mb-1">
                            {match.user.name}, {match.user.age}
                          </h3>
                          <div className="flex items-center gap-2 text-white/80 text-xs">
                            <span>{match.lastActive}</span>
                            {match.mutualFriends > 0 && (
                              <>
                                <span>•</span>
                                <span>{match.mutualFriends} mutual</span>
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
                  {filteredMatches.map((match, index) => (
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
                              {match.user.name.charAt(0)}
                            </span>
                          </div>
                          {match.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-white">
                              {match.user.name}, {match.user.age}
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
