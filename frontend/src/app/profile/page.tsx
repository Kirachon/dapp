'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, gql } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

const GET_MY_PROFILE = gql`
  query GetMyProfile {
    myProfile {
      userId
      name
      age
      gender
      orientation
      bio
      interests
      education
      photos
      visibility
    }
  }
`;

const GET_MY_PREFERENCES = gql`
  query GetMyPreferences {
    myPreferences {
      userId
      minAge
      maxAge
      distanceKm
      showMe
    }
  }
`;

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut, isAuthenticated, hasProfile } = useAuth();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const { data: profileData, loading: profileLoading } = useQuery(GET_MY_PROFILE, {
    skip: !isAuthenticated || !hasProfile,
  });

  const { data: preferencesData, loading: preferencesLoading } = useQuery(GET_MY_PREFERENCES, {
    skip: !isAuthenticated || !hasProfile,
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

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const profile = profileData?.myProfile;
  const preferences = preferencesData?.myPreferences;

  if (profileLoading || preferencesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white/80">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Calculate profile completion percentage
  const calculateCompletion = () => {
    let completed = 0;
    const total = 6;

    if (profile?.name) completed++;
    if (profile?.photos?.length > 0) completed++;
    if (profile?.bio) completed++;
    if (profile?.interests?.length > 0) completed++;
    if (profile?.education) completed++;
    if (profile?.age) completed++;

    return Math.round((completed / total) * 100);
  };

  const completionPercentage = calculateCompletion();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 text-6xl animate-pulse">👤</div>
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
            <span className="text-white font-bold text-xl">👤</span>
          </motion.div>
          <span className="font-bold text-xl text-white">My Profile</span>
        </div>
        <motion.button
          className="p-3 rounded-xl glass-card text-white/80 hover:text-white hover:bg-white/15 transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/profile/settings')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </motion.button>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-8 relative z-10 overflow-y-auto">
        <div className="max-w-sm mx-auto">
          {/* Enhanced Profile Header */}
          <motion.div
            className="glass-card-light p-6 rounded-2xl backdrop-blur-lg border border-white/30 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Profile Photo and Basic Info */}
            <div className="text-center mb-6">
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 rounded-full border-4 border-white/50 bg-white/20 overflow-hidden backdrop-blur-sm">
                  {profile?.photos?.[0] ? (
                    <img
                      src={profile.photos[0]}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-white/80">
                      👤
                    </div>
                  )}
                </div>
                <motion.button
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] rounded-full flex items-center justify-center text-white shadow-lg"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setActiveSection('photos')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </motion.button>
              </div>

              <h2 className="text-2xl font-bold text-white mb-1">
                {profile?.name || 'Anonymous'}
              </h2>
              {profile?.age && (
                <p className="text-white/80 text-lg mb-2">
                  {profile.age} years old
                </p>
              )}

              {/* Verification Badges */}
              <div className="flex justify-center gap-2 mb-4">
                <div className="px-3 py-1 bg-green-500/20 border border-green-400/30 rounded-full text-green-200 text-xs font-medium">
                  📸 Photo Verified
                </div>
                <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-400/30 rounded-full text-yellow-200 text-xs font-medium">
                  🆔 ID Pending
                </div>
              </div>

              {/* Profile Completion */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/80 text-sm">Profile Completion</span>
                  <span className="text-white font-semibold text-sm">{completionPercentage}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercentage}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Profile Sections */}
          <div className="space-y-4">
            {/* Photos Section */}
            <motion.div
              className="glass-card-light p-5 rounded-2xl backdrop-blur-lg border border-white/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <span>📸</span> Photos
                </h3>
                <motion.button
                  className="text-white/70 hover:text-white text-sm underline"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setActiveSection('photos')}
                >
                  Edit
                </motion.button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {profile?.photos?.slice(0, 6).map((photo: string, index: number) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden bg-white/10">
                    <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 6 - (profile?.photos?.length || 0)) }).map((_, index) => (
                  <div key={`empty-${index}`} className="aspect-square rounded-lg bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center">
                    <span className="text-white/50 text-2xl">+</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* About Me Section */}
            <motion.div
              className="glass-card-light p-5 rounded-2xl backdrop-blur-lg border border-white/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <span>📝</span> About Me
                </h3>
                <motion.button
                  className="text-white/70 hover:text-white text-sm underline"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setActiveSection('bio')}
                >
                  Edit
                </motion.button>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">
                {profile?.bio || 'Tell people about yourself...'}
              </p>
            </motion.div>

            {/* Interests Section */}
            <motion.div
              className="glass-card-light p-5 rounded-2xl backdrop-blur-lg border border-white/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <span>🎯</span> Interests
                </h3>
                <motion.button
                  className="text-white/70 hover:text-white text-sm underline"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setActiveSection('interests')}
                >
                  Edit
                </motion.button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile?.interests?.slice(0, 8).map((interest: string, index: number) => (
                  <span key={index} className="px-3 py-1.5 bg-white/20 rounded-full text-white/90 text-xs font-medium">
                    {interest}
                  </span>
                ))}
                {!profile?.interests?.length && (
                  <span className="text-white/60 text-sm">Add your interests...</span>
                )}
              </div>
            </motion.div>

            {/* Education Section */}
            <motion.div
              className="glass-card-light p-5 rounded-2xl backdrop-blur-lg border border-white/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <span>🎓</span> Education
                </h3>
                <motion.button
                  className="text-white/70 hover:text-white text-sm underline"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setActiveSection('education')}
                >
                  Edit
                </motion.button>
              </div>
              <p className="text-white/80 text-sm">
                {profile?.education || 'Add your education...'}
              </p>
            </motion.div>

            {/* Preferences Section */}
            <motion.div
              className="glass-card-light p-5 rounded-2xl backdrop-blur-lg border border-white/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <span>⚙️</span> Preferences
                </h3>
                <motion.button
                  className="text-white/70 hover:text-white text-sm underline"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => router.push('/filters')}
                >
                  Edit
                </motion.button>
              </div>
              {preferences && (
                <div className="space-y-2 text-sm text-white/80">
                  <p>Age range: {preferences.minAge} - {preferences.maxAge}</p>
                  <p>Distance: {preferences.distanceKm} km</p>
                  <p>Show me: {preferences.showMe}</p>
                </div>
              )}
            </motion.div>

            {/* Profile Statistics */}
            <motion.div
              className="glass-card-light p-5 rounded-2xl backdrop-blur-lg border border-white/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
                <span>📊</span> Profile Stats
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">127</div>
                  <div className="text-white/70 text-xs">Profile Views</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">23</div>
                  <div className="text-white/70 text-xs">Likes Received</div>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              className="space-y-3 pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <button
                onClick={() => router.push('/onboarding')}
                className="w-full bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7043] text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Edit Profile
              </button>
              <button
                onClick={handleSignOut}
                className="w-full glass-card text-white/80 hover:text-white hover:bg-white/15 py-3 px-6 rounded-xl font-medium transition-all duration-200"
              >
                Sign Out
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
