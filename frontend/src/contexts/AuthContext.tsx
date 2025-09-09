'use client';

import React, { createContext, useContext, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SuperTokens, EmailPassword, Session } from '@/lib/supertokens';
import { useQuery, gql } from '@apollo/client';
import { makeClient } from '@/lib/apollo';


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
  signUp: (email: string, password: string, acceptTerms?: boolean) => Promise<boolean>;
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
  const client = makeClient();

  const [loading, setLoading] = useState(true);
  const [sessionExists, setSessionExists] = useState(false);
  const [isSessionChecked, setIsSessionChecked] = useState(false);
  const router = useRouter();
  const sessionCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // GraphQL query to get user data - heavily optimized
  const { data: userData, loading: userLoading, refetch: refetchUser } = useQuery(GET_USER_PROFILE, {
    skip: !sessionExists || !isSessionChecked, // Don't run until session is confirmed
    errorPolicy: 'ignore',
    fetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: false,
    pollInterval: 0, // Disable polling
    returnPartialData: true, // Return partial data immediately
    context: {
      timeout: 5000 // 5 second timeout
    }
  });

  // Optimized session check with immediate response for better UX
  const checkAuth = useCallback(async () => {
    if (sessionCheckTimeoutRef.current) {
      clearTimeout(sessionCheckTimeoutRef.current);
    }

    try {
      // Use a faster, non-blocking session check
      const exists = await Session.doesSessionExist();

      // Batch state updates to prevent multiple re-renders
      if (exists) {
        setSessionExists(true);
        setIsSessionChecked(true);
        // Don't set loading to false yet - wait for user data
      } else {
        // No session - immediately set final state
        setUser(null);
        setSessionExists(false);
        setIsSessionChecked(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      // Fail fast - don't block the UI
      setUser(null);
      setSessionExists(false);
      setIsSessionChecked(true);
      setLoading(false);
    }
  }, []);

  // Check for existing session on mount - optimized for speed
  useEffect(() => {
    checkAuth();

    // Interceptors are attached in Apollo via supertokens-web-js fetch wrapper.
    return () => {
      if (sessionCheckTimeoutRef.current) {
        clearTimeout(sessionCheckTimeoutRef.current);
      }
    };
  }, [checkAuth]);

  // Update user state when GraphQL data changes - heavily optimized
  useEffect(() => {
    if (userData?.me) {
      const profile = userData.me.profile;
      const newUser = {
        id: userData.me.id,
        email: userData.me.email,
        roles: profile?.isAdmin ? ['admin', 'user'] : ['user'],
        isAdmin: profile?.isAdmin || false
      };

      // Only update if user data actually changed to prevent unnecessary re-renders
      setUser(prevUser => {
        if (!prevUser ||
            prevUser.id !== newUser.id ||
            prevUser.email !== newUser.email ||
            prevUser.isAdmin !== newUser.isAdmin) {
          return newUser;
        }
        return prevUser;
      });

      // Set loading to false once we have user data
      setLoading(false);
    } else if (!userLoading && sessionExists && isSessionChecked) {
      // Session exists but no user data - might be a new user without profile
      setUser(prevUser => {
        if (!prevUser || prevUser.id !== 'unknown') {
          return {
            id: 'unknown',
            email: 'unknown',
            roles: ['user'],
            isAdmin: false
          };
        }
        return prevUser;
      });

      // Set loading to false for unknown users too
      setLoading(false);
    }
  }, [userData, userLoading, sessionExists, isSessionChecked]);

  // Optimized signIn function with faster response
  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);

    try {
      const response = await EmailPassword.signIn({
        formFields: [
          { id: 'email', value: email },
          { id: 'password', value: password }
        ]
      });

      if (response.status === 'OK') {
        // Session created successfully
        setSessionExists(true);
        setIsSessionChecked(true);

        // Don't wait for user data fetch - let it happen in background
        refetchUser().catch(console.error);

        // Set loading to false immediately for better UX
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
  }, [refetchUser]);

  // Optimized signUp function with faster response
  const signUp = useCallback(async (email: string, password: string, acceptTerms: boolean = true): Promise<boolean> => {
    setLoading(true);

    try {
      // Use GraphQL mutation to align with backend resolver and capture rate limit + terms errors
      const SIGN_UP = gql`
        mutation SignUp($email: String!, $password: String!, $acceptTerms: Boolean!) {
          signUp(email: $email, password: $password, acceptTerms: $acceptTerms) {
            ok
            error
            user { id email }
          }
        }
      `;

      const result = await client.mutate({
        mutation: SIGN_UP,
        variables: { email, password, acceptTerms },
      });

      const resp = result.data?.signUp;
      if (resp?.ok) {
        setSessionExists(true);
        setIsSessionChecked(true);
        refetchUser().catch(console.error);
        setLoading(false);
        return true;
      }

      // Map error codes to user-friendly states
      const err = resp?.error as string | undefined;
      if (err?.startsWith('RATE_LIMIT')) {
        const retry = Number(err.split(':')[1] || '10');
        console.warn(`Rate limited. Retry after ${retry}s`);
      }
      if (err === 'TERMS_REQUIRED') {
        console.warn('Terms acceptance required');
      }

      setLoading(false);
      return false;
    } catch (error) {
      console.error('Sign up error:', error);
      setLoading(false);
      return false;
    }
  }, [refetchUser]);

  // Memoized signOut function to prevent unnecessary re-renders
  const signOut = useCallback(async (): Promise<void> => {
    try {
      await Session.signOut();
      setUser(null);
      setSessionExists(false);
      setIsSessionChecked(true);
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [router]);

  // Memoized refetch function to prevent unnecessary re-renders
  const refetch = useCallback(async (): Promise<void> => {
    try {
      await refetchUser();
    } catch (error) {
      console.error('Refetch error:', error);
    }
  }, [refetchUser]);

  // Memoized isAuthenticated check to avoid synchronous Session.doesSessionExist() calls
  const isAuthenticated = useMemo(() => {
    return !!user && sessionExists;
  }, [user, sessionExists]);

  // Memoized context value to prevent unnecessary re-renders
  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated,
    hasProfile: !!user && user.id !== 'unknown', // Has profile if user data is complete
    loading: loading || userLoading,
    signIn,
    signUp,
    signOut,
    refetch,
  }), [user, isAuthenticated, loading, userLoading, signIn, signUp, signOut, refetch]);

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
