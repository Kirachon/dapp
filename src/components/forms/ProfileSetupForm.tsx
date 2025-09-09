'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from '@/components/ui/toast';

const profileSetupSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
});

type ProfileSetupFormData = z.infer<typeof profileSetupSchema>;

const ME_QUERY = gql`
  query Me { me { id email } }
`;

const UPSERT_PROFILE = gql`
  mutation UpsertMyProfile($input: ProfileInput!) {
    upsertMyProfile(input: $input) {
      userId
      firstName
      lastName
      bio
      photos
    }
  }
`;


interface ProfileSetupFormProps {
  onSuccess?: (profile: any) => void;
  initialData?: Partial<ProfileSetupFormData>;
}

export function ProfileSetupForm({ onSuccess, initialData }: ProfileSetupFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const { user, isAuthenticated } = useAuth();
  const { data: meData } = useQuery(ME_QUERY, { skip: !isAuthenticated });
  const [doUpsert] = useMutation(UPSERT_PROFILE);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    setValue,
    reset,
  } = useForm<ProfileSetupFormData>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: initialData,
  });

  const bioValue = watch('bio');

  useEffect(() => {
    setCharCount(bioValue?.length || 0);
  }, [bioValue]);

  // Load existing profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!isAuthenticated) return;

      try {
        // Prefer GraphQL myProfile if available; otherwise rely on initialData
        // We avoid adding a new query here to keep network churn low; form could be prefilled via props.
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };

    loadProfile();
  }, [session, reset]);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (isDirty) {
      const formData = watch();
      localStorage.setItem('profileDraft', JSON.stringify(formData));
    }
  }, [watch, isDirty]);

  // Load draft from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem('profileDraft');
    if (draft && !initialData) {
      try {
        const draftData = JSON.parse(draft);
        reset(draftData);
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, [reset, initialData]);

  const onSubmit = async (data: ProfileSetupFormData) => {
    setIsLoading(true);

    try {
      const res = await doUpsert({ variables: { input: data } });
      const profile = res.data?.upsertMyProfile;

      if (profile) {
        toast.success('Profile updated successfully!');
        localStorage.removeItem('profileDraft');
        onSuccess?.(profile);
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = () => {
    const formData = watch();
    localStorage.setItem('profileDraft', JSON.stringify(formData));
    toast.info('Draft saved locally');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
            First Name *
          </label>
          <Input
            {...register('firstName')}
            id="firstName"
            placeholder="Enter your first name"
            error={errors.firstName?.message}
            aria-describedby={errors.firstName ? 'firstName-error' : undefined}
            autoComplete="given-name"
          />
          {errors.firstName && (
            <p id="firstName-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.firstName.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
            Last Name *
          </label>
          <Input
            {...register('lastName')}
            id="lastName"
            placeholder="Enter your last name"
            error={errors.lastName?.message}
            aria-describedby={errors.lastName ? 'lastName-error' : undefined}
            autoComplete="family-name"
          />
          {errors.lastName && (
            <p id="lastName-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
          Bio
        </label>
        <Textarea
          {...register('bio')}
          id="bio"
          placeholder="Tell us a bit about yourself..."
          rows={4}
          error={errors.bio?.message}
          aria-describedby={errors.bio ? 'bio-error' : 'bio-help'}
          maxLength={500}
        />
        <div className="mt-1 flex justify-between items-center">
          <div>
            {errors.bio && (
              <p id="bio-error" className="text-sm text-red-600" role="alert">
                {errors.bio.message}
              </p>
            )}
            {!errors.bio && (
              <p id="bio-help" className="text-sm text-gray-500">
                Optional. Share something interesting about yourself.
              </p>
            )}
          </div>
          <span className={`text-sm ${charCount > 450 ? 'text-red-600' : 'text-gray-500'}`}>
            {charCount}/500
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1"
          aria-describedby={isLoading ? 'loading-text' : undefined}
        >
          {isLoading ? (
            <>
              <span className="sr-only" id="loading-text">Saving profile...</span>
              Saving...
            </>
          ) : (
            'Save Profile'
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={!isDirty}
          className="sm:w-auto"
        >
          Save Draft
        </Button>
      </div>

      {isDirty && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            You have unsaved changes. They will be automatically saved as a draft.
          </p>
        </div>
      )}
    </form>
  );
}
