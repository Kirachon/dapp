'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, gql } from '@apollo/client';

// GraphQL Query for conversations
const GET_CONVERSATIONS_QUERY = gql`
  query GetMyConversations($page: Int, $pageSize: Int) {
    myConversations(page: $page, pageSize: $pageSize) {
      id
      matchId
      lastMessageAt
      unreadCount
      lastMessage {
        id
        content
        senderId
        createdAt
        type
      }
      otherUser {
        userId
        name
        photos
        age
        bio
      }
    }
  }
`;

interface Conversation {
  id: string;
  matchId: string;
  lastMessageAt: string;
  unreadCount: number;
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    type: string;
  };
  otherUser: {
    userId: string;
    name: string;
    photos: string[];
    age: number;
    bio?: string;
  };
}

export default function ConversationsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  // GraphQL Query
  const { data, loading, error, refetch } = useQuery(GET_CONVERSATIONS_QUERY, {
    variables: {
      page: 1,
      pageSize: 50
    },
    skip: !isAuthenticated,
    notifyOnNetworkStatusChange: true,
    pollInterval: 30000, // Poll every 30 seconds for new messages
  });

  const conversations: Conversation[] = data?.myConversations || [];

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, router]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleConversationClick = (conversationId: string) => {
    setSelectedConversation(conversationId);
    router.push(`/chat/${conversationId}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center">
        <div className="glass-card p-8 rounded-3xl backdrop-blur-lg border border-white/30">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span className="text-white">Loading conversations...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center">
        <div className="glass-card p-8 rounded-3xl backdrop-blur-lg border border-white/30 text-center">
          <div className="text-6xl mb-4">😞</div>
          <h3 className="text-xl font-semibold text-white mb-3">Oops! Something went wrong</h3>
          <p className="text-white/80 mb-6">Unable to load your conversations. Please try again.</p>
          <button
            onClick={() => refetch()}
            className="px-6 py-3 bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] text-white rounded-xl hover:from-[#ff5252] hover:to-[#ff7043] transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 text-6xl animate-pulse">💬</div>
        <div className="absolute top-32 right-16 text-4xl animate-bounce">💕</div>
        <div className="absolute bottom-20 left-20 text-5xl animate-pulse">✨</div>
        <div className="absolute bottom-40 right-10 text-3xl animate-bounce">🔥</div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 relative z-10 glass-card-light border-b border-white/20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl glass-card text-white/80 hover:text-white hover:bg-white/15 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-white">Messages</h1>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl glass-card text-white/80 hover:text-white hover:bg-white/15 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
        {conversations.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="text-8xl mb-6 opacity-50">💬</div>
            <h2 className="text-2xl font-semibold text-white mb-3">No conversations yet</h2>
            <p className="text-white/70 mb-8 max-w-sm">
              Start matching with people to begin conversations! 
              Your matches will appear here.
            </p>
            <button
              onClick={() => router.push('/discover')}
              className="px-8 py-3 bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] text-white rounded-xl hover:from-[#ff5252] hover:to-[#ff7043] transition-all font-medium"
            >
              Start Matching
            </button>
          </div>
        ) : (
          // Conversations List
          <div className="p-4 space-y-3" data-testid="conversation-list">
            <AnimatePresence>
              {conversations.map((conversation, index) => (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card p-4 rounded-2xl backdrop-blur-lg border border-white/30 hover:bg-white/10 transition-all cursor-pointer"
                  onClick={() => handleConversationClick(conversation.id)}
                  data-testid="conversation-item"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30 overflow-hidden">
                        {conversation.otherUser.photos?.[0] ? (
                          <img 
                            src={conversation.otherUser.photos[0]} 
                            alt={conversation.otherUser.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-semibold text-lg">
                            {conversation.otherUser.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      {conversation.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-white font-semibold truncate">
                          {conversation.otherUser.name}
                        </h3>
                        <span className="text-white/60 text-xs flex-shrink-0">
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      
                      {conversation.lastMessage ? (
                        <p className="text-white/70 text-sm truncate">
                          {conversation.lastMessage.senderId === user?.id ? 'You: ' : ''}
                          {conversation.lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-white/50 text-sm italic">
                          Say hello! 👋
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="flex-shrink-0 text-white/40">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Bottom Navigation Spacer */}
      <div className="h-20"></div>
    </div>
  );
}
