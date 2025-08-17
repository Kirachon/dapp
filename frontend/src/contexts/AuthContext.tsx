'use client';

import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  roles: string[];
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  hasProfile: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for development
const MOCK_USERS = {
  'admin@loveconnect.com': {
    id: 'admin-1',
    email: 'admin@loveconnect.com',
    password: 'admin123',
    roles: ['admin', 'user'],
    isAdmin: true,
    hasProfile: true
  },
  'user@example.com': {
    id: 'user-1',
    email: 'user@example.com',
    password: 'user123',
    roles: ['user'],
    isAdmin: false,
    hasProfile: true
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedUser = localStorage.getItem('auth_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        localStorage.removeItem('auth_user');
      } finally {
        setLoading(false);
      }
    };

    // Add a small delay to ensure localStorage is available
    const timer = setTimeout(checkAuth, 100);

    // Listen for storage changes to sync auth state across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_user') {
        if (e.newValue) {
          setUser(JSON.parse(e.newValue));
        } else {
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockUser = MOCK_USERS[email as keyof typeof MOCK_USERS];

    if (mockUser && mockUser.password === password) {
      const userData: User = {
        id: mockUser.id,
        email: mockUser.email,
        roles: mockUser.roles,
        isAdmin: mockUser.isAdmin
      };

      setUser(userData);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      setLoading(false);
      return true;
    }

    setLoading(false);
    return false;
  };

  const signUp = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // For demo, create a new user
    const userData: User = {
      id: `user-${Date.now()}`,
      email,
      roles: ['user'],
      isAdmin: false
    };

    setUser(userData);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    setLoading(false);
    return true;
  };

  const signOut = async (): Promise<void> => {
    setUser(null);
    localStorage.removeItem('auth_user');
    router.push('/');
  };

  const refetch = async (): Promise<void> => {
    // In a real app, this would refetch user data from the server
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  };

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    hasProfile: !!user, // For demo, assume all users have profiles
    loading,
    signIn,
    signUp,
    signOut,
    refetch,
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
