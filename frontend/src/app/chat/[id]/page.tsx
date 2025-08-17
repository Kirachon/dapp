'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'emoji';
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock data for demonstration
  useEffect(() => {
    setChatUser({
      id: params.id as string,
      name: 'Sarah Johnson',
      avatar: '/placeholder-avatar.png',
      isOnline: true,
      lastSeen: new Date()
    });

    setMessages([
      {
        id: '1',
        senderId: params.id as string,
        content: 'Hey! How are you doing? 😊',
        type: 'text',
        timestamp: new Date(Date.now() - 3600000),
        status: 'read'
      },
      {
        id: '2',
        senderId: user?.id || 'me',
        content: 'Hi Sarah! I\'m doing great, thanks for asking! How about you?',
        type: 'text',
        timestamp: new Date(Date.now() - 3500000),
        status: 'read'
      },
      {
        id: '3',
        senderId: params.id as string,
        content: 'I\'m wonderful! Just got back from a hiking trip. The views were amazing! 🏔️',
        type: 'text',
        timestamp: new Date(Date.now() - 3400000),
        status: 'read'
      }
    ]);
  }, [params.id, user?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: user?.id || 'me',
      content: newMessage,
      type: 'text',
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate message delivery
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === message.id 
            ? { ...msg, status: 'delivered' }
            : msg
        )
      );
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const emojis = ['😊', '😂', '❤️', '👍', '🔥', '💯', '🎉', '😍', '🤔', '👋', '💕', '✨'];

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
                  {chatUser.isOnline ? 'Active now' : `Last seen ${formatTime(chatUser.lastSeen!)}`}
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
                      <span>{formatTime(message.timestamp)}</span>
                      {isMe && (
                        <span className="ml-1">
                          {message.status === 'sending' && '⏳'}
                          {message.status === 'sent' && '✓'}
                          {message.status === 'delivered' && '✓✓'}
                          {message.status === 'read' && '✓✓'}
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
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="w-full bg-transparent text-white placeholder-white/60 focus:outline-none text-sm"
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
