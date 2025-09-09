'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toast';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

type VerificationStatus = 'pending' | 'success' | 'error' | 'expired';

interface VerificationState {
  status: VerificationStatus;
  message: string;
  email?: string;
}

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verificationState, setVerificationState] = useState<VerificationState>({
    status: 'pending',
    message: 'Verifying your email address...'
  });
  const [isResending, setIsResending] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setVerificationState({
        status: 'error',
        message: 'Invalid verification link. Please check your email for the correct link.'
      });
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      // Call GraphQL mutation verifyEmail(token)
      const resp = await fetch((process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/graphql'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation Verify($token: String!) { verifyEmail(token: $token) }`,
          variables: { token: verificationToken },
        }),
      });
      const result = await resp.json();
      const ok = !!result?.data?.verifyEmail;

      if (ok) {
        setVerificationState({
          status: 'success',
          message: 'Your email has been verified successfully!'
        });
        setTimeout(() => { router.push('/auth/login?verified=true'); }, 3000);
      } else {
        setVerificationState({ status: 'error', message: 'Verification failed or token expired.' });
      }
    } catch (error) {
      setVerificationState({ status: 'error', message: 'An unexpected error occurred. Please try again.' });
    }
  };

  const handleResendVerification = async () => {
    // We no longer require the email value; backend uses session to send to current user
    setIsResending(true);
    try {
      const resp = await fetch((process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/graphql'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `mutation { resendVerificationEmail }` }),
      });
      const result = await resp.json();
      if (result?.data?.resendVerificationEmail) {
        toast.success('Verification email sent successfully!');
        setVerificationState({ status: 'pending', message: 'A new verification email has been sent. Please check your inbox.' });
      } else {
        toast.error('Failed to resend verification email');
      }
    } catch (error) {
      toast.error('Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  const getStatusIcon = () => {
    switch (verificationState.status) {
      case 'success':
        return <CheckCircleIcon className="h-16 w-16 text-green-500" aria-hidden="true" />;
      case 'error':
      case 'expired':
        return <XCircleIcon className="h-16 w-16 text-red-500" aria-hidden="true" />;
      case 'pending':
      default:
        return <ClockIcon className="h-16 w-16 text-blue-500 animate-pulse" aria-hidden="true" />;
    }
  };

  const getStatusColor = () => {
    switch (verificationState.status) {
      case 'success':
        return 'text-green-700';
      case 'error':
      case 'expired':
        return 'text-red-700';
      case 'pending':
      default:
        return 'text-blue-700';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            {getStatusIcon()}
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Email Verification
          </h1>
          
          <p className={`text-lg ${getStatusColor()} mb-8`}>
            {verificationState.message}
          </p>

          {verificationState.status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800">
                You will be redirected to the login page in a few seconds...
              </p>
            </div>
          )}

          {verificationState.status === 'expired' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 mb-4">
                Your verification link has expired. Click the button below to receive a new one.
              </p>
              <Button
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full"
              >
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
            </div>
          )}

          {verificationState.status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 mb-4">
                There was a problem verifying your email address.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => router.push('/auth/register')}
                  variant="outline"
                  className="w-full"
                >
                  Back to Registration
                </Button>
                <Button
                  onClick={() => router.push('/auth/login')}
                  className="w-full"
                >
                  Go to Login
                </Button>
              </div>
            </div>
          )}

          {verificationState.status === 'pending' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">
                Please wait while we verify your email address...
              </p>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <a href="/support" className="text-blue-600 hover:text-blue-500">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
