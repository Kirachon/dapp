'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  university: string;
  status: 'active' | 'banned' | 'pending';
  joinedAt: Date;
  lastActive: Date;
  reportCount: number;
  verified: boolean;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned' | 'pending'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Mock user data
  const [users] = useState<User[]>([
    {
      id: '1',
      name: 'Emma Wilson',
      email: 'emma.wilson@berkeley.edu',
      age: 24,
      university: 'UC Berkeley',
      status: 'active',
      joinedAt: new Date('2024-01-15'),
      lastActive: new Date('2024-08-17'),
      reportCount: 0,
      verified: true
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.j@stanford.edu',
      age: 26,
      university: 'Stanford University',
      status: 'active',
      joinedAt: new Date('2024-02-20'),
      lastActive: new Date('2024-08-16'),
      reportCount: 1,
      verified: true
    },
    {
      id: '3',
      name: 'Mike Davis',
      email: 'mike.davis@ucla.edu',
      age: 23,
      university: 'UCLA',
      status: 'pending',
      joinedAt: new Date('2024-08-15'),
      lastActive: new Date('2024-08-15'),
      reportCount: 0,
      verified: false
    },
    {
      id: '4',
      name: 'Jessica Chen',
      email: 'j.chen@berkeley.edu',
      age: 25,
      university: 'UC Berkeley',
      status: 'banned',
      joinedAt: new Date('2024-03-10'),
      lastActive: new Date('2024-08-10'),
      reportCount: 5,
      verified: true
    }
  ]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUserAction = (userId: string, action: 'ban' | 'unban' | 'verify' | 'delete') => {
    console.log(`Action ${action} for user ${userId}`);
    // In a real app, this would make an API call
  };

  const handleBulkAction = (action: 'ban' | 'unban' | 'delete') => {
    console.log(`Bulk action ${action} for users:`, selectedUsers);
    setSelectedUsers([]);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-500/20 border-green-400/30 text-green-200',
      banned: 'bg-red-500/20 border-red-400/30 text-red-200',
      pending: 'bg-yellow-500/20 border-yellow-400/30 text-yellow-200'
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  // Check admin access
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin?redirect=/admin/users');
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
        <div className="absolute top-10 left-10 text-6xl animate-pulse">👥</div>
        <div className="absolute top-32 right-16 text-4xl animate-bounce">📊</div>
        <div className="absolute bottom-20 left-20 text-5xl animate-pulse">⚙️</div>
        <div className="absolute bottom-40 right-10 text-3xl animate-bounce">🔧</div>
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
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </motion.button>
          <div>
            <h1 className="font-bold text-xl text-white">User Management</h1>
            <p className="text-white/70 text-sm">{filteredUsers.length} users found</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button 
            className="p-3 rounded-xl glass-card text-white/80 hover:text-white hover:bg-white/15 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="px-4 relative z-10 mb-6">
        <div className="max-w-6xl mx-auto">
          <div className="glass-card-light p-4 rounded-2xl backdrop-blur-lg border border-white/30">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                  <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users by name or email..."
                    className="flex-1 bg-transparent text-white placeholder-white/60 focus:outline-none"
                  />
                </div>
              </div>
              
              {/* Status Filter */}
              <div className="flex gap-2">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'active', label: 'Active' },
                  { key: 'pending', label: 'Pending' },
                  { key: 'banned', label: 'Banned' }
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setStatusFilter(filter.key as any)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      statusFilter === filter.key
                        ? 'bg-white/20 text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
              <motion.div 
                className="mt-4 pt-4 border-t border-white/20"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white/80 text-sm">
                    {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBulkAction('ban')}
                      className="px-3 py-1.5 bg-red-500/20 border border-red-400/30 rounded-lg text-red-200 text-sm hover:bg-red-500/30 transition-all"
                    >
                      Ban Selected
                    </button>
                    <button
                      onClick={() => handleBulkAction('unban')}
                      className="px-3 py-1.5 bg-green-500/20 border border-green-400/30 rounded-lg text-green-200 text-sm hover:bg-green-500/30 transition-all"
                    >
                      Unban Selected
                    </button>
                    <button
                      onClick={() => setSelectedUsers([])}
                      className="px-3 py-1.5 bg-white/10 rounded-lg text-white/70 text-sm hover:bg-white/20 transition-all"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="flex-1 px-4 pb-8 relative z-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <div className="glass-card-light rounded-2xl backdrop-blur-lg border border-white/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/10">
                  <tr>
                    <th className="p-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(filteredUsers.map(u => u.id));
                          } else {
                            setSelectedUsers([]);
                          }
                        }}
                        className="rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500"
                      />
                    </th>
                    <th className="p-4 text-left text-white/80 font-medium">User</th>
                    <th className="p-4 text-left text-white/80 font-medium">University</th>
                    <th className="p-4 text-left text-white/80 font-medium">Status</th>
                    <th className="p-4 text-left text-white/80 font-medium">Joined</th>
                    <th className="p-4 text-left text-white/80 font-medium">Reports</th>
                    <th className="p-4 text-left text-white/80 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      className="border-t border-white/10 hover:bg-white/5 transition-colors"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {user.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="text-white font-medium">{user.name}</div>
                            <div className="text-white/60 text-sm">{user.email}</div>
                            <div className="text-white/60 text-xs">Age: {user.age}</div>
                          </div>
                          {user.verified && (
                            <div className="text-blue-400">✓</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-white/80">{user.university}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(user.status)}`}>
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </span>
                      </td>
                      <td className="p-4 text-white/80 text-sm">{formatDate(user.joinedAt)}</td>
                      <td className="p-4">
                        <span className={`text-sm ${user.reportCount > 0 ? 'text-red-400' : 'text-white/60'}`}>
                          {user.reportCount}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleUserAction(user.id, user.status === 'banned' ? 'unban' : 'ban')}
                            className={`p-2 rounded-lg text-xs transition-all ${
                              user.status === 'banned'
                                ? 'bg-green-500/20 text-green-200 hover:bg-green-500/30'
                                : 'bg-red-500/20 text-red-200 hover:bg-red-500/30'
                            }`}
                          >
                            {user.status === 'banned' ? '✓' : '🚫'}
                          </button>
                          <button
                            onClick={() => handleUserAction(user.id, 'verify')}
                            className="p-2 bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 rounded-lg text-xs transition-all"
                          >
                            👤
                          </button>
                          <button
                            onClick={() => handleUserAction(user.id, 'delete')}
                            className="p-2 bg-red-500/20 text-red-200 hover:bg-red-500/30 rounded-lg text-xs transition-all"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
