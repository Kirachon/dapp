'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, gql } from '@apollo/client';
import { io, Socket } from 'socket.io-client';

// GraphQL Queries and Mutations
const GET_MESSAGES_QUERY = gql`
  query GetMessages($conversationId: ID!, $page: Int, $pageSize: Int) {
    messages(conversationId: $conversationId, page: $page, pageSize: $pageSize) {
      id
      content
      senderId
      createdAt
      readAt
      type
      mediaUrls
    }
  }
`;

const GET_CONVERSATION_QUERY = gql`
  query GetConversation($conversationId: ID!) {
    myConversations(page: 1, pageSize: 1) {
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

const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessage($conversationId: ID!, $content: String, $mediaUrls: [String!]) {
    sendMessage(conversationId: $conversationId, content: $content, mediaUrls: $mediaUrls) {
      id
      content
      senderId
      createdAt
      readAt
      type
      mediaUrls
    }
  }
`;

const MARK_CONVERSATION_READ_MUTATION = gql`
  mutation MarkConversationRead($conversationId: ID!) {
    markConversationRead(conversationId: $conversationId)
  }
`;

// Real-time functionality handled exclusively by Socket.IO

interface Message {
  id: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO';
  createdAt: string;
  readAt?: string;
  mediaUrls?: string[];
}

interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

interface SocketMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO';
  content: string;
  mediaUrls: string[];
  createdAt: string;
  readAt?: string;
}


function normalizeMessage(m: any): Message {
  return {
    id: String(m.id),
    senderId: String(m.senderId ?? ''),
    content: String(m.content ?? ''),
    type: (m.type as 'TEXT' | 'IMAGE' | 'VIDEO') ?? 'TEXT',
    createdAt: m.createdAt ?? new Date().toISOString(),
    readAt: m.readAt ?? undefined,
    mediaUrls: Array.isArray(m.mediaUrls) ? m.mediaUrls : [],
  };
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const conversationId = params.id as string;

  // GraphQL Queries
  const { data: messagesData, loading: messagesLoading, error: messagesError, refetch: refetchMessages } = useQuery(GET_MESSAGES_QUERY, {
    variables: {
      conversationId,
      page: 1,
      pageSize: 50
    },
    skip: !conversationId || !isAuthenticated,
    notifyOnNetworkStatusChange: true,
  });

  const { data: conversationData, loading: conversationLoading } = useQuery(GET_CONVERSATION_QUERY, {
    variables: { conversationId },
    skip: !conversationId || !isAuthenticated,
  });

  const [sendMessageMutation] = useMutation(SEND_MESSAGE_MUTATION);
  const [markConversationReadMutation] = useMutation(MARK_CONVERSATION_READ_MUTATION);

  // Real-time functionality handled exclusively by Socket.IO below

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!isAuthenticated || !conversationId) return;

    console.log('🔌 Initializing Socket.IO connection...');

    // Create Socket.IO connection
    const newSocket = io('http://localhost:8080', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket.IO connected');
      setIsConnected(true);

      // Join the conversation room
      newSocket.emit('join-conversation', { conversationId });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
      setIsConnected(false);
    });

    newSocket.on('new_message', (message: SocketMessage) => {
      console.log('📨 Received message via Socket.IO:', message);

      // Add message to local state if it's for this conversation
      if (message.conversationId === conversationId) {
        setMessages(prev => {
          const exists = prev.find(msg => msg.id === message.id);
          if (exists) return prev;

          const next = [...prev, normalizeMessage(message)];
          return next.sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      }
    });

    newSocket.on('user_typing', (data: { userId: string; isTyping: boolean }) => {
      console.log('⌨️ Typing event via Socket.IO:', data);
      if (data.userId !== user?.id) {
        setOtherUserTyping(data.isTyping);

        if (data.isTyping) {
          setTimeout(() => setOtherUserTyping(false), 3000);
        }
      }
    });

    newSocket.on('user_presence_changed', (data: { userId: string; isOnline: boolean; lastSeen: Date }) => {
      console.log('👤 Presence update via Socket.IO:', data);
      if (data.userId === chatUser?.id) {
        setChatUser(prev => prev ? {
          ...prev,
          isOnline: data.isOnline,
          lastSeen: new Date(data.lastSeen)
        } : null);
      }
    });

    // Handle Socket.IO errors
    newSocket.on('error', (error: { message: string }) => {
      console.error('❌ Socket.IO error:', error);
      // Could show a toast notification to the user
    });

    // Handle message send confirmation
    newSocket.on('message_sent', (data: { messageId: string; conversationId: string }) => {
      console.log('✅ Message send confirmed:', data);
    });

    // Handle message send errors
    newSocket.on('message_error', (error: { message: string; conversationId: string }) => {
      console.error('❌ Message send error:', error);
      // Could show error feedback to user
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up Socket.IO connection...');
      newSocket.disconnect();
    };
  }, [isAuthenticated, conversationId, user?.id]);

  // Set connection status based on Socket.IO connection
  useEffect(() => {
    setIsConnected(isAuthenticated && socket?.connected === true);
  }, [isAuthenticated, socket?.connected]);

  // Load messages from GraphQL
  useEffect(() => {
    if (messagesData?.messages) {
      setMessages((messagesData.messages as any[]).map(normalizeMessage));
    }
  }, [messagesData]);

  // Set chat user from conversation data
  useEffect(() => {
    if (conversationData?.myConversations?.[0]?.otherUser) {
      const otherUser = conversationData.myConversations[0].otherUser;
      setChatUser({
        id: otherUser.userId,
        name: otherUser.name,
        avatar: otherUser.photos?.[0] || '/placeholder-avatar.png',
        isOnline: false, // Will be updated by socket events
        lastSeen: new Date(),
      });
    }
  }, [conversationData]);

  // Real-time message handling is done exclusively via Socket.IO events below

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      // Primary method: Socket.IO for real-time delivery and persistence
      if (socket && socket.connected) {
        socket.emit('send_message', {
          conversationId,
          content: messageContent,
          type: 'TEXT'
        });
        console.log('✅ Message sent via Socket.IO');
      } else {
        // Fallback: GraphQL mutation when Socket.IO is not available
        console.log('⚠️ Socket.IO not connected, falling back to GraphQL');
        await sendMessageMutation({
          variables: {
            conversationId,
            content: messageContent,
            mediaUrls: [],
          },
        });
        console.log('✅ Message sent via GraphQL fallback');
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      // Re-add message to input on failure
      setNewMessage(messageContent);

      // If Socket.IO failed, try GraphQL as fallback
      if (socket && socket.connected) {
        try {
          console.log('🔄 Retrying with GraphQL fallback...');
          await sendMessageMutation({
            variables: {
              conversationId,
              content: messageContent,
              mediaUrls: [],
            },
          });
          console.log('✅ Message sent via GraphQL fallback');
          setNewMessage(''); // Clear input again on successful fallback
        } catch (fallbackError) {
          console.error('❌ GraphQL fallback also failed:', fallbackError);
        }
      }
    }
  }, [newMessage, conversationId, sendMessageMutation, socket]);

  // Handle typing indicators with Socket.IO
  const handleInputChange = useCallback((value: string) => {
    setNewMessage(value);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set local typing state
    const isTypingNow = value.length > 0;
    if (isTypingNow !== isTyping) {
      setIsTyping(isTypingNow);

      // Emit typing event via Socket.IO
      if (socket && socket.connected) {
        socket.emit('typing', {
          conversationId,
          isTyping: isTypingNow
        });
      }
    }

    // Set timeout to stop typing indicator
    if (isTypingNow) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);

        // Emit typing stop event via Socket.IO
        if (socket && socket.connected) {
          socket.emit('typing', {
            conversationId,
            isTyping: false
          });
        }
      }, 1000);
    }
  }, [isTyping, socket, conversationId]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Mark messages as read when component mounts or messages change
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    const unreadMessages = messages.filter(
      msg => msg.senderId !== user?.id && !msg.readAt
    );

    if (unreadMessages.length > 0) {
      // Mark as read via GraphQL mutation
      markConversationReadMutation({
        variables: { conversationId }
      }).catch(console.error);
    }
  }, [messages, conversationId, user?.id, markConversationReadMutation]);

  const emojis = ['😊', '😂', '❤️', '👍', '🔥', '💯', '🎉', '😍', '🤔', '👋', '💕', '✨'];

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, router]);

  // Loading state
  if (messagesLoading || conversationLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center">
        <div className="glass-card p-8 rounded-3xl backdrop-blur-lg border border-white/30">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span className="text-white">Loading conversation...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (messagesError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center">
        <div className="glass-card p-8 rounded-3xl backdrop-blur-lg border border-white/30 text-center">
          <div className="text-6xl mb-4">😞</div>
          <h3 className="text-xl font-semibold text-white mb-3">Oops! Something went wrong</h3>
          <p className="text-white/80 mb-6">Unable to load the conversation. Please try again.</p>
          <button
            onClick={() => refetchMessages()}
            className="px-6 py-3 bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] text-white rounded-xl hover:from-[#ff5252] hover:to-[#ff7043] transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex flex-col relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 text-6xl animate-pulse">💬</div>
        <div className="absolute top-32 right-16 text-4xl animate-bounce">💕</div>
        <div className="absolute bottom-20 left-20 text-5xl animate-pulse">✨</div>
        <div className="absolute bottom-40 right-10 text-3xl animate-bounce">🔥</div>
      </div>

      {/* Enhanced Header */}
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

          {chatUser && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30">
                  <span className="text-white font-semibold">
                    {chatUser.name.charAt(0)}
                  </span>
                </div>
                {chatUser.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div>
                <h2 className="text-white font-semibold">{chatUser.name}</h2>
                <p className="text-white/70 text-xs">
                  {!isConnected ? (
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      Connecting...
                    </span>
                  ) : otherUserTyping ? (
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      Typing...
                    </span>
                  ) : chatUser.isOnline ? 'Active now' : `Last seen ${formatTime(chatUser.lastSeen!)}`}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            className="p-3 rounded-xl glass-card text-white/80 hover:text-white hover:bg-white/15 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </motion.button>
          <motion.button
            className="p-3 rounded-xl glass-card text-white/80 hover:text-white hover:bg-white/15 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 relative z-10 custom-scrollbar">
        <div className="max-w-sm mx-auto space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => {
              const isMe = message.senderId === user?.id || message.senderId === 'me';
              const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.8 }}
                  className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMe && showAvatar && (
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30 flex-shrink-0">
                      <span className="text-white text-xs font-semibold">
                        {chatUser?.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  {!isMe && !showAvatar && <div className="w-8"></div>}

                  <div className={`max-w-[75%] ${isMe ? 'order-1' : ''}`}>
                    <div
                      className={`message-bubble px-4 py-3 rounded-2xl backdrop-blur-md border ${
                        isMe
                          ? 'bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] text-white border-white/20 rounded-br-md'
                          : 'bg-white/20 text-white border-white/30 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </div>
                    <div className={`flex items-center gap-1 mt-1 text-xs text-white/60 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span>{formatTime(message.createdAt)}</span>
                      {isMe && (
                        <span className="ml-1">
                          {!message.readAt && '✓'}
                          {message.readAt && '✓✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Typing Indicator */}
          {otherUserTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-2 justify-start"
            >
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30">
                <span className="text-white text-xs font-semibold">
                  {chatUser?.name.charAt(0)}
                </span>
              </div>
              <div className="bg-white/20 backdrop-blur-md border border-white/30 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="p-4 relative z-10"
          >
            <div className="max-w-sm mx-auto glass-card-light p-4 rounded-2xl backdrop-blur-lg border border-white/30">
              <div className="grid grid-cols-6 gap-3">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setNewMessage(prev => prev + emoji);
                      setShowEmojiPicker(false);
                      inputRef.current?.focus();
                    }}
                    className="text-2xl p-2 rounded-lg hover:bg-white/20 transition-all"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Input Area */}
      <div className="p-4 relative z-10">
        <div className="max-w-sm mx-auto">
          <div className="glass-card-light p-3 rounded-2xl backdrop-blur-lg border border-white/30">
            <div className="flex items-end gap-3">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/20 transition-all flex-shrink-0"
              >
                <span className="text-xl">😊</span>
              </button>

              <div className="flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="w-full bg-transparent text-white placeholder-white/60 focus:outline-none text-sm"
                  disabled={!isConnected}
                />
              </div>

              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="p-2 rounded-xl bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] text-white hover:from-[#ff5252] hover:to-[#ff7043] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
