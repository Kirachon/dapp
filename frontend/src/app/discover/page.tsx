'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Button } from '@/components/ui/Button';
import { Modal, ModalContent } from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { calculateAge } from '@/lib/utils';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { io, Socket } from 'socket.io-client';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const GET_DISCOVERY_FEED_QUERY = gql`
  query GetDiscoveryFeed($page: Int, $pageSize: Int) {
    discoveryFeed(page: $page, pageSize: $pageSize) {
      userId
      name
      age
      photos
      bio
      interests
      gender
      orientation
    }
  }
`;

const SWIPE_MUTATION = gql`
  mutation Swipe($targetUserId: ID!, $direction: SwipeDirection!) {
    swipe(targetUserId: $targetUserId, direction: $direction) {
      ok
      matched
      matchId
    }
  }
`;

interface Profile {
  userId: string;
  name: string;
  age: number;
  photos: string[];
  bio?: string;
  interests: string[];
  gender?: string;
  orientation?: string;
}

export default function DiscoverPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchData, setMatchData] = useState<any>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Socket.IO test interface state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const [showTestInterface, setShowTestInterface] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const socketRef = useRef<Socket | null>(null);

  const router = useRouter();
  const { isAuthenticated, hasProfile } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_DISCOVERY_FEED_QUERY, {
    variables: { page: 1, pageSize: 20 },
    fetchPolicy: 'cache-and-network',
  });

  const [swipeMutation, { loading: swipeLoading }] = useMutation(SWIPE_MUTATION, {
    onCompleted: (data) => {
      if (data.swipe.matched) {
        setMatchData({ matchId: data.swipe.matchId, otherUserName: currentProfile?.name });
        setShowMatchModal(true);
      }
    },
    onError: (error) => {
      console.error('Swipe error:', error);
    },
  });

  // Redirect if not authenticated or no profile
  // Temporarily disabled for testing
  // useEffect(() => {
  //   if (!isAuthenticated) {
  //     router.push('/signin');
  //   } else if (!hasProfile) {
  //     router.push('/onboarding');
  //   }
  // }, [isAuthenticated, hasProfile, router]);

  // Temporarily disabled for testing
  // if (!isAuthenticated || !hasProfile) {
  //   return null;
  // }

  // Socket.IO initialization for testing
  useEffect(() => {
    console.log('🔌 Initializing Socket.IO client on discover page...');

    const newSocket = io('http://localhost:8080', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      query: {
        test: 'true',
      },
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket.IO connected on discover page');
      setIsConnected(true);
      setConnectionStatus('Connected');
      setSocket(newSocket);
      socketRef.current = newSocket;
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected on discover page');
      setIsConnected(false);
      setConnectionStatus('Disconnected');
    });

    newSocket.on('test-message', (data: { message: string; timestamp: string }) => {
      console.log('📨 Received test message:', data);
      setReceivedMessages((prev) => [...prev, `${data.timestamp}: ${data.message}`]);
    });

    newSocket.on('new_match', (data: { matchId: string; message: string; timestamp: Date }) => {
      console.log('💕 New match notification:', data);
      // Show match modal immediately
      setMatchData({ matchId: data.matchId });
      setShowMatchModal(true);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
      setConnectionStatus(`Error: ${error.message}`);
    });

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up Socket.IO connection...');
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const profiles: Profile[] = data?.discoveryFeed || [];
  const currentProfile = profiles[currentIndex];

  const handleSwipe = async (direction: 'LEFT' | 'RIGHT' | 'SUPER') => {
    if (!currentProfile || swipeLoading) return;

    setSwipeDirection(direction === 'LEFT' ? 'left' : 'right');

    try {
      await swipeMutation({
        variables: {
          targetUserId: currentProfile.userId,
          direction,
        },
      });

      // Move to next profile after animation
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setSwipeDirection(null);
      }, 300);
    } catch (error) {
      console.error('Swipe error:', error);
      setSwipeDirection(null);
    }
  };

  const handleMatchModalClose = () => {
    setShowMatchModal(false);
    setMatchData(null);
  };

  // Socket.IO test functions
  const sendTestMessage = () => {
    if (socket && isConnected && testMessage.trim()) {
      console.log('📤 Sending test message:', testMessage);
      socket.emit('test-message', {
        message: testMessage,
        timestamp: new Date().toISOString(),
        sender: 'discover-page-test',
      });
      setTestMessage('');
    }
  };

  const toggleTestInterface = () => {
    setShowTestInterface(!showTestInterface);
  };

  const clearMessages = () => {
    setReceivedMessages([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary-500)] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[var(--color-text-secondary)]">Finding your matches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">😔</div>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
            Something went wrong
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-4">
            We couldn't load your potential matches
          </p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (currentIndex >= profiles.length) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">💫</div>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
            You're all caught up!
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-4">
            No more profiles in your area. Check back later for new matches!
          </p>
          <Button onClick={() => refetch()} data-testid="refresh-button">
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex flex-col relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 text-6xl animate-pulse">💖</div>
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
            <span className="text-white font-bold text-xl">💖</span>
          </motion.div>
          <span className="font-bold text-xl text-white">Discover</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Socket.IO Test Button */}
          <motion.button
            onClick={toggleTestInterface}
            className={`p-3 rounded-xl glass-card transition-all ${
              isConnected
                ? 'text-green-300 hover:text-green-200 hover:bg-green-500/15'
                : 'text-red-300 hover:text-red-200 hover:bg-red-500/15'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={`Socket.IO: ${connectionStatus}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </motion.button>

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
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Enhanced Card Stack */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="relative w-full max-w-sm h-[600px]">
          <AnimatePresence mode="wait">
            {currentProfile && (
              <motion.div
                key={currentProfile.userId}
                className="absolute inset-0 w-full h-full"
                data-testid="profile-card"
                initial={{ scale: 0.9, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{
                  scale: 0.8,
                  opacity: 0,
                  x: swipeDirection === 'left' ? -400 : swipeDirection === 'right' ? 400 : 0,
                  rotate: swipeDirection === 'left' ? -30 : swipeDirection === 'right' ? 30 : 0,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(event, info: PanInfo) => {
                  const threshold = 100;
                  if (info.offset.x > threshold) {
                    handleSwipe('RIGHT');
                  } else if (info.offset.x < -threshold) {
                    handleSwipe('LEFT');
                  }
                }}
                whileDrag={{ scale: 1.05 }}
              >
                <div className="relative w-full h-full bg-white rounded-3xl shadow-2xl overflow-hidden card-shadow">
                  {/* Enhanced Photo Section */}
                  <div className="relative h-3/4">
                    {currentProfile.photos.length > 1 ? (
                      <Swiper
                        modules={[Navigation, Pagination]}
                        spaceBetween={0}
                        slidesPerView={1}
                        navigation
                        pagination={{ clickable: true }}
                        className="h-full"
                      >
                        {currentProfile.photos.map((photo, index) => (
                          <SwiperSlide key={index}>
                            <img
                              src={photo || '/placeholder-avatar.png'}
                              alt={`${currentProfile.name} photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </SwiperSlide>
                        ))}
                      </Swiper>
                    ) : (
                      <img
                        src={currentProfile.photos[0] || '/placeholder-avatar.png'}
                        alt={currentProfile.name}
                        className="w-full h-full object-cover"
                      />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {/* Enhanced Photo Indicators */}
                    <div className="absolute top-4 left-4 right-4 flex gap-1">
                      {currentProfile.photos.map((_, index) => (
                        <div
                          key={index}
                          data-testid="photo-indicator"
                          className={`flex-1 h-1.5 rounded-full transition-all ${
                            index === 0 ? 'bg-white shadow-lg' : 'bg-white/40'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Enhanced Info Overlay */}
                    <div className="absolute bottom-6 left-6 right-6 text-white">
                      <motion.h2
                        className="text-3xl font-bold mb-2 drop-shadow-lg"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        {currentProfile.name}, {currentProfile.age}
                      </motion.h2>
                      <motion.div
                        className="flex items-center gap-2 text-sm opacity-90"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <span>📍</span>
                        <span>2 miles away</span>
                        <span>•</span>
                        <span>🟢 Active now</span>
                      </motion.div>
                    </div>
                  </div>

                  {/* Enhanced Details Section */}
                  <div className="p-6 h-1/4 overflow-y-auto bg-gradient-to-b from-white to-gray-50">
                    {currentProfile.bio && (
                      <motion.p
                        className="text-sm text-gray-700 mb-4 leading-relaxed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        {currentProfile.bio}
                      </motion.p>
                    )}
                    {currentProfile.interests.length > 0 && (
                      <motion.div
                        className="flex flex-wrap gap-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        {currentProfile.interests.slice(0, 4).map((interest, index) => (
                          <motion.span
                            key={interest}
                            className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-blue-100 text-xs rounded-full text-purple-700 font-medium"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 + index * 0.1 }}
                          >
                            {interest}
                          </motion.span>
                        ))}
                        {currentProfile.interests.length > 4 && (
                          <span className="px-3 py-1.5 bg-gray-100 text-xs rounded-full text-gray-600 font-medium">
                            +{currentProfile.interests.length - 4} more
                          </span>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Enhanced Action Buttons */}
      <div className="p-6 relative z-10">
        <motion.div
          className="flex items-center justify-center gap-8"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          {/* Pass Button */}
          <motion.button
            onClick={() => handleSwipe('LEFT')}
            disabled={swipeLoading}
            className="action-btn pass w-16 h-16 bg-white/90 backdrop-blur-md shadow-xl border-2 border-red-200 hover:border-red-300 disabled:opacity-50"
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.95 }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: 'spring', stiffness: 300 }}
          >
            <span className="text-2xl">❌</span>
          </motion.button>

          {/* Super Like Button */}
          <motion.button
            onClick={() => handleSwipe('SUPER')}
            disabled={swipeLoading}
            className="action-btn super w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-500 shadow-xl border-2 border-blue-300 hover:border-blue-400 disabled:opacity-50"
            whileHover={{ scale: 1.15, y: -3 }}
            whileTap={{ scale: 0.95 }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.9, type: 'spring', stiffness: 300 }}
          >
            <span className="text-xl">⭐</span>
          </motion.button>

          {/* Like Button */}
          <motion.button
            onClick={() => handleSwipe('RIGHT')}
            disabled={swipeLoading}
            className="action-btn like w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 shadow-xl border-2 border-green-300 hover:border-green-400 disabled:opacity-50"
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.95 }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.0, type: 'spring', stiffness: 300 }}
          >
            <span className="text-2xl">💚</span>
          </motion.button>
        </motion.div>

        {/* Action Labels */}
        <motion.div
          className="flex items-center justify-center gap-8 mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          <span className="text-white/60 text-xs font-medium w-16 text-center">Pass</span>
          <span className="text-white/60 text-xs font-medium w-14 text-center">Super</span>
          <span className="text-white/60 text-xs font-medium w-16 text-center">Like</span>
        </motion.div>
      </div>

      {/* Match Modal */}
      <Modal isOpen={showMatchModal} onClose={handleMatchModalClose} showCloseButton={false}>
        <ModalContent className="text-center py-8" data-testid="match-modal">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            It's a Match!
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-6">
            You and {matchData?.otherUserName || 'your match'} liked each other
          </p>
          <div className="flex gap-4">
            <Button variant="secondary" onClick={handleMatchModalClose} className="flex-1">
              Keep Swiping
            </Button>
            <Button
              onClick={() => {
                handleMatchModalClose();
                router.push('/matches');
              }}
              className="flex-1"
            >
              Send Message
            </Button>
          </div>
        </ModalContent>
      </Modal>

      {/* Socket.IO Test Interface */}
      {showTestInterface && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 right-4 w-80 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 p-4 z-50"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Socket.IO Test</h3>
            <button
              onClick={toggleTestInterface}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
              ></div>
              <span className="text-sm text-gray-600">{connectionStatus}</span>
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendTestMessage()}
                placeholder="Type a test message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isConnected}
              />
              <button
                onClick={sendTestMessage}
                disabled={!isConnected || !testMessage.trim()}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>

            {/* Received Messages */}
            <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Received Messages:</span>
                {receivedMessages.length > 0 && (
                  <button
                    onClick={clearMessages}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Clear
                  </button>
                )}
              </div>
              {receivedMessages.length === 0 ? (
                <p className="text-xs text-gray-400">No messages received yet</p>
              ) : (
                <div className="space-y-1">
                  {receivedMessages.map((msg, index) => (
                    <div key={index} className="text-xs text-gray-700 bg-white rounded p-1">
                      {msg}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
