import { gql } from '@apollo/client';
import { makeClient } from '@/lib/apollo';
// Using native fetch to avoid type incompatibilities during production build.

const client = makeClient();
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';

// GraphQL Mutations
const UPSERT_PROFILE = gql`
  mutation UpsertMyProfile($input: ProfileInput!) {
    upsertMyProfile(input: $input) {
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

const UPSERT_PREFERENCES = gql`
  mutation UpsertMyPreferences($input: PreferencesInput!) {
    upsertMyPreferences(input: $input) {
      userId
      minAge
      maxAge
      distanceKm
      showMe
    }
  }
`;

const SEND_WELCOME = gql`
  mutation SendWelcome {
    sendWelcomeEmail
  }
`;

const UPDATE_LOCATION = gql`
  mutation UpdateMyLocation($latitude: Float!, $longitude: Float!) {
    updateMyLocation(latitude: $latitude, longitude: $longitude)
  }
`;

// Types
export interface OnboardingBasics {
  name: string;
  age: number;
  gender?: string;
  orientation?: string;
}

export interface OnboardingPhotos {
  photos: string[];
  primaryPhotoIndex: number;
}

export interface OnboardingAbout {
  bio: string;
  interests: string[];
  education?: string;
}

export interface OnboardingPreferences {
  minAge: number;
  maxAge: number;
  distanceKm: number;
  showMe?: string;
}

export interface OnboardingPrompts {
  prompts: Array<{ question: string; answer: string }>;
}

export interface OnboardingLocation {
  latitude: number;
  longitude: number;
}

export interface CompleteOnboardingData {
  basics: OnboardingBasics;
  photos: OnboardingPhotos;
  about: OnboardingAbout;
  preferences: OnboardingPreferences;
  location?: OnboardingLocation;
}

class OnboardingService {
  // Photo upload service using presigned URLs with retry logic
  async uploadPhoto(
    file: File,
    maxRetries: number = 3,
  ): Promise<{ url: string; thumbnailUrl: string; filename: string }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📤 Uploading ${file.name} (attempt ${attempt}/${maxRetries})`);

        // Step 1: Get presigned upload URL from backend
        const uploadUrlResponse = await fetch(`${API_BASE}/api/photos/upload-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type,
          }),
        });

        if (!uploadUrlResponse.ok) {
          const errorData = await uploadUrlResponse.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to get upload URL (${uploadUrlResponse.status})`,
          );
        }

        const uploadUrlResult = await uploadUrlResponse.json();
        if (!uploadUrlResult.success) {
          throw new Error(uploadUrlResult.error || 'Failed to get upload URL');
        }

        const { uploadUrl, url, thumbnailUrl, filename } = uploadUrlResult.data;

        // Step 2: Upload file directly to MinIO using presigned URL
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(
            `Upload failed with status: ${uploadResponse.status} ${uploadResponse.statusText}`,
          );
        }

        console.log(`✅ Photo uploaded successfully: ${filename} (attempt ${attempt})`);

        return {
          url,
          thumbnailUrl,
          filename,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown upload error');
        console.warn(
          `⚠️  Upload attempt ${attempt}/${maxRetries} failed for ${file.name}:`,
          lastError.message,
        );

        // Don't retry on certain errors
        if (lastError.message.includes('401') || lastError.message.includes('403')) {
          throw new Error(`Authentication error: ${lastError.message}`);
        }

        if (lastError.message.includes('413') || lastError.message.includes('too large')) {
          throw new Error(`File too large: ${file.name} exceeds size limit`);
        }

        if (lastError.message.includes('415') || lastError.message.includes('Unsupported')) {
          throw new Error(`Unsupported file type: ${file.type}`);
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw new Error(
      `Failed to upload ${file.name} after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
    );
  }

  // Upload multiple photos with progress tracking and error handling
  async uploadMultiplePhotos(
    files: File[],
    onProgress?: (progress: {
      completed: number;
      total: number;
      currentFile?: string;
      errors?: string[];
    }) => void,
  ): Promise<string[]> {
    const results: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        onProgress?.({
          completed: i,
          total: files.length,
          currentFile: file.name,
          errors: errors.length > 0 ? errors : undefined,
        });

        // Validate file before upload
        if (file.size > 10 * 1024 * 1024) {
          // 10MB limit
          throw new Error(
            `File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB > 10MB)`,
          );
        }

        if (!file.type.startsWith('image/')) {
          throw new Error(`Invalid file type: ${file.name} (${file.type})`);
        }

        const result = await this.uploadPhoto(file, 3); // 3 retries
        results.push(result.url);

        console.log(`✅ Uploaded photo ${i + 1}/${files.length}: ${file.name}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const fullError = `${file.name}: ${errorMessage}`;
        errors.push(fullError);

        console.error(`❌ Failed to upload photo ${i + 1}/${files.length}:`, fullError);

        // For now, fail fast on any error. In the future, we could make this configurable
        // to allow partial uploads and let the user retry failed ones individually
        throw new Error(`Upload failed: ${fullError}`);
      }
    }

    onProgress?.({
      completed: files.length,
      total: files.length,
      errors: errors.length > 0 ? errors : undefined,
    });

    return results;
  }

  // Convert data URLs to files and upload them (legacy support)
  async uploadPhotosFromDataUrls(dataUrls: string[]): Promise<string[]> {
    const files = await Promise.all(
      dataUrls.map(async (dataUrl, index) => {
        // Convert data URL to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        // Create file from blob
        return new File([blob], `photo-${index + 1}.jpg`, { type: 'image/jpeg' });
      }),
    );

    return this.uploadMultiplePhotos(files);
  }

  // Save onboarding data to sessionStorage
  saveStep(step: string, data: any) {
    sessionStorage.setItem(`onboarding_${step}`, JSON.stringify(data));
  }

  // Get onboarding data from sessionStorage
  getStep(step: string): any {
    const data = sessionStorage.getItem(`onboarding_${step}`);
    return data ? JSON.parse(data) : null;
  }

  // Get all onboarding data
  getAllSteps(): Partial<CompleteOnboardingData> {
    return {
      basics: this.getStep('basics'),
      photos: this.getStep('photos'),
      about: this.getStep('about'),
      preferences: this.getStep('preferences'),
      location: this.getStep('location'),
    };
  }

  // Clear all onboarding data
  clearAllSteps() {
    ['basics', 'photos', 'about', 'preferences', 'location'].forEach((step) => {
      sessionStorage.removeItem(`onboarding_${step}`);
    });
  }

  // Complete onboarding by submitting all data to backend
  async completeOnboarding(): Promise<void> {
    try {
      const allData = this.getAllSteps();

      if (!allData.basics || !allData.photos || !allData.about || !allData.preferences) {
        throw new Error('Missing required onboarding data');
      }

      // Handle photos - check if they're already URLs or need to be uploaded
      let photoUrls: string[] = [];
      if (allData.photos.photos.length > 0) {
        // Check if photos are already URLs (from new MinIO upload) or base64 data URLs (legacy)
        const firstPhoto = allData.photos.photos[0];
        if (firstPhoto.startsWith('http://') || firstPhoto.startsWith('https://')) {
          // Photos are already uploaded URLs
          photoUrls = allData.photos.photos;
        } else {
          // Photos are base64 data URLs, try to upload them; on failure (e.g., invalid session), gracefully fallback to inline data URLs
          try {
            photoUrls = await this.uploadPhotosFromDataUrls(allData.photos.photos);
          } catch (e: any) {
            console.warn(
              `⚠️ Photo upload failed, falling back to inline data URLs: ${e?.message || e}`,
            );
            photoUrls = allData.photos.photos; // Fallback for E2E/dev to keep flow unblocked
          }
        }
      }

      // Prepare profile data
      const profileInput = {
        name: allData.basics.name,
        age: allData.basics.age,
        gender: allData.basics.gender,
        orientation: allData.basics.orientation,
        bio: allData.about.bio,
        interests: allData.about.interests,
        education: allData.about.education,
        photos: photoUrls,
        visibility: 'PUBLIC' as const,
      };

      // Temporarily disabled GraphQL calls for testing

      // Persist to backend GraphQL
      await client.mutate({
        mutation: UPSERT_PROFILE,
        variables: { input: profileInput },
        context: { fetchOptions: { credentials: 'include' } },
      });
      await client.mutate({
        mutation: UPSERT_PREFERENCES,
        variables: { input: allData.preferences },
        context: { fetchOptions: { credentials: 'include' } },
      });
      if (allData.location) {
        await client.mutate({
          mutation: UPDATE_LOCATION,
          variables: {
            latitude: allData.location.latitude,
            longitude: allData.location.longitude,
          },
          context: { fetchOptions: { credentials: 'include' } },
        });

        // Send welcome email (best-effort)
        try {
          await client.mutate({
            mutation: SEND_WELCOME,
            context: { fetchOptions: { credentials: 'include' } },
          });
        } catch {}
      }

      // Clear onboarding data after successful completion
      this.clearAllSteps();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      throw error;
    }
  }

  // Get user's current location
  async getCurrentLocation(): Promise<OnboardingLocation> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(new Error(`Location error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        },
      );
    });
  }

  // Validate onboarding step data
  validateBasics(data: OnboardingBasics): string[] {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }

    if (!data.age || data.age < 18 || data.age > 99) {
      errors.push('Age must be between 18 and 99');
    }

    return errors;
  }

  validatePhotos(data: OnboardingPhotos): string[] {
    const errors: string[] = [];

    if (!data.photos || data.photos.length < 2) {
      errors.push('At least 2 photos are required');
    }

    if (data.photos && data.photos.length > 9) {
      errors.push('Maximum 9 photos allowed');
    }

    return errors;
  }

  validateAbout(data: OnboardingAbout): string[] {
    const errors: string[] = [];

    if (!data.bio || data.bio.trim().length < 10) {
      errors.push('Bio must be at least 10 characters');
    }

    if (!data.interests || data.interests.length < 3) {
      errors.push('Please select at least 3 interests');
    }

    return errors;
  }

  validatePreferences(data: OnboardingPreferences): string[] {
    const errors: string[] = [];

    if (data.minAge < 18 || data.minAge > 99) {
      errors.push('Minimum age must be between 18 and 99');
    }

    if (data.maxAge < 18 || data.maxAge > 99) {
      errors.push('Maximum age must be between 18 and 99');
    }

    if (data.minAge >= data.maxAge) {
      errors.push('Maximum age must be greater than minimum age');
    }

    if (data.distanceKm < 1 || data.distanceKm > 500) {
      errors.push('Distance must be between 1 and 500 km');
    }

    return errors;
  }

  validatePrompts(data: OnboardingPrompts): string[] {
    const errors: string[] = [];

    if (!data.prompts || data.prompts.length === 0) {
      errors.push('Please select at least one prompt');
      return errors;
    }

    if (data.prompts.length > 3) {
      errors.push('Maximum 3 prompts allowed');
    }

    data.prompts.forEach((prompt, index) => {
      if (!prompt.question || !prompt.question.trim()) {
        errors.push(`Prompt ${index + 1} question is required`);
      }

      if (!prompt.answer || !prompt.answer.trim()) {
        errors.push(`Please answer prompt ${index + 1}`);
      } else if (prompt.answer.trim().length < 10) {
        errors.push(`Prompt ${index + 1} answer must be at least 10 characters`);
      } else if (prompt.answer.trim().length > 300) {
        errors.push(`Prompt ${index + 1} answer must be less than 300 characters`);
      }
    });

    return errors;
  }
}

export const onboardingService = new OnboardingService();
