'use client';

import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SuperTokens, EmailPassword, Session } from '@/lib/supertokens';
import { useQuery, gql } from '@apollo/client';

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

// GraphQL query to get user profile and roles
const GET_USER_PROFILE = gql`
  query GetUserProfile {
    me {
      id
      email
      profile {
        id
        name
        isAdmin
      }
    }
  }
`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // GraphQL query to get user data
  const { data: userData, loading: userLoading, refetch: refetchUser } = useQuery(GET_USER_PROFILE, {
    skip: !Session.doesSessionExist(),
    errorPolicy: 'ignore',
    fetchPolicy: 'cache-and-network'
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const sessionExists = await Session.doesSessionExist();

        if (sessionExists) {
          // Session exists, user data will be fetched by GraphQL query
          setLoading(false);
        } else {
          // No session
          setUser(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setUser(null);
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for session changes
    const handleSessionChange = () => {
      checkAuth();
    };

    // SuperTokens session change listener
    Session.addEventListener('SESSION_CREATED', handleSessionChange);
    Session.addEventListener('UNAUTHORISED', handleSessionChange);

    return () => {
      Session.removeEventListener('SESSION_CREATED', handleSessionChange);
      Session.removeEventListener('UNAUTHORISED', handleSessionChange);
    };
  }, []);

  // Update user state when GraphQL data changes
  useEffect(() => {
    if (userData?.me) {
      const profile = userData.me.profile;
      setUser({
        id: userData.me.id,
        email: userData.me.email,
        roles: profile?.isAdmin ? ['admin', 'user'] : ['user'],
        isAdmin: profile?.isAdmin || false
      });
    } else if (!userLoading && Session.doesSessionExist()) {
      // Session exists but no user data - might be a new user without profile
      setUser({
        id: 'unknown',
        email: 'unknown',
        roles: ['user'],
        isAdmin: false
      });
    }
  }, [userData, userLoading]);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);

    try {
      const response = await EmailPassword.signIn({
        formFields: [
          { id: 'email', value: email },
          { id: 'password', value: password }
        ]
      });

      if (response.status === 'OK') {
        // Session created successfully, user data will be fetched by GraphQL
        await refetchUser();
        setLoading(false);
        return true;
      } else if (response.status === 'WRONG_CREDENTIALS_ERROR') {
        setLoading(false);
        return false;
      } else {
        console.error('Sign in error:', response);
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setLoading(false);
      return false;
    }
  };

  const signUp = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);

    try {
      const response = await EmailPassword.signUp({
        formFields: [
          { id: 'email', value: email },
          { id: 'password', value: password }
        ]
      });

      if (response.status === 'OK') {
        // Account created successfully, session created
        await refetchUser();
        setLoading(false);
        return true;
      } else if (response.status === 'EMAIL_ALREADY_EXISTS_ERROR') {
        setLoading(false);
        return false;
      } else {
        console.error('Sign up error:', response);
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Sign up error:', error);
      setLoading(false);
      return false;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await Session.signOut();
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const refetch = async (): Promise<void> => {
    try {
      await refetchUser();
    } catch (error) {
      console.error('Refetch error:', error);
    }
  };

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user && Session.doesSessionExist(),
    hasProfile: !!user && user.id !== 'unknown', // Has profile if user data is complete
    loading: loading || userLoading,
    signIn,
    signUp,
    signOut,
    refetch,
  }), [user, loading, userLoading]);

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
