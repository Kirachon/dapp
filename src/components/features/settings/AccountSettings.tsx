'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/toast';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
});

const changeEmailSchema = z.object({
  newEmail: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
type ChangeEmailFormData = z.infer<typeof changeEmailSchema>;

export function AccountSettings() {
  const { user } = useAuth();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const emailForm = useForm<ChangeEmailFormData>({
    resolver: zodResolver(changeEmailSchema),
  });

  const handlePasswordChange = async (data: ChangePasswordFormData) => {
    setIsChangingPassword(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Password updated successfully');
        passwordForm.reset();
      } else {
        if (result.error.code === 'INVALID_PASSWORD') {
          passwordForm.setError('currentPassword', { message: result.error.message });
        } else {
          toast.error(result.error.message);
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleEmailChange = async (data: ChangeEmailFormData) => {
    setIsChangingEmail(true);

    try {
      const response = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Verification email sent to your new address');
        emailForm.reset();
      } else {
        if (result.error.code === 'INVALID_PASSWORD') {
          emailForm.setError('password', { message: result.error.message });
        } else if (result.error.code === 'EMAIL_EXISTS') {
          emailForm.setError('newEmail', { message: result.error.message });
        } else {
          toast.error(result.error.message);
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsChangingEmail(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Account Settings</h2>
      </div>

      {/* Current Account Info */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Current Account</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Created</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">
              {session?.user?.profile ? 'Profile completed' : 'Profile pending'}
            </p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Change Password</h3>
        <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4 max-w-md">
          <div>
            <Input
              {...passwordForm.register('currentPassword')}
              type="password"
              placeholder="Current password"
              error={passwordForm.formState.errors.currentPassword?.message}
              autoComplete="current-password"
            />
          </div>
          <div>
            <Input
              {...passwordForm.register('newPassword')}
              type="password"
              placeholder="New password"
              error={passwordForm.formState.errors.newPassword?.message}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Input
              {...passwordForm.register('confirmPassword')}
              type="password"
              placeholder="Confirm new password"
              error={passwordForm.formState.errors.confirmPassword?.message}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={isChangingPassword}>
            {isChangingPassword ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>

      {/* Change Email */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Change Email Address</h3>
        <form onSubmit={emailForm.handleSubmit(handleEmailChange)} className="space-y-4 max-w-md">
          <div>
            <Input
              {...emailForm.register('newEmail')}
              type="email"
              placeholder="New email address"
              error={emailForm.formState.errors.newEmail?.message}
              autoComplete="email"
            />
          </div>
          <div>
            <Input
              {...emailForm.register('password')}
              type="password"
              placeholder="Current password"
              error={emailForm.formState.errors.password?.message}
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" disabled={isChangingEmail}>
            {isChangingEmail ? 'Sending...' : 'Send Verification Email'}
          </Button>
        </form>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          A verification email will be sent to your new address.
        </p>
      </div>

      {/* Delete Account */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">Delete Account</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                Once you delete your account, there is no going back. This action cannot be undone.
                All your data, including profile information, settings, and activity history will be permanently deleted.
              </p>
              {!showDeleteConfirm ? (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Account
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Are you absolutely sure? This action cannot be undone.
                  </p>
                  <div className="flex space-x-3">
                    <Button
                      variant="destructive"
                      onClick={() => {
                        // TODO: Implement account deletion
                        toast.error('Account deletion not yet implemented');
                      }}
                    >
                      Yes, Delete My Account
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
