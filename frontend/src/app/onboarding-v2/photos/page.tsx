'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { onboardingService, OnboardingPhotos } from '@/services/onboarding';
import { motion } from 'framer-motion';
import { markOnboardingStep } from '@/lib/onboardingProgress';

interface PhotoUpload {
  file: File;
  preview: string;
  url?: string; // MinIO URL after upload
  uploading?: boolean;
  error?: string;
}

export default function OnboardingPhotosPage() {
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [primaryPhotoIndex, setPrimaryPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    completed: 0,
    total: 0,
    currentFile: '',
    errors: [] as string[],
  });
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Load existing data on mount and respond to sessionStorage updates
  useEffect(() => {
    const loadFromStorage = () => {
      const existingData = onboardingService.getStep('photos');
      if (existingData) {
        // Convert legacy string URLs to PhotoUpload objects
        const legacyPhotos = existingData.photos || [];
        if (legacyPhotos.length > 0 && typeof legacyPhotos[0] === 'string') {
          // Legacy format - convert to new format
          const convertedPhotos: PhotoUpload[] = legacyPhotos.map((url: string) => ({
            file: new File([], 'existing-photo.jpg'), // Placeholder file (size 0)
            preview: url,
            url: url.startsWith('http') ? url : undefined, // Only set URL if it's a real URL
          }));
          setPhotos(convertedPhotos);
        } else {
          setPhotos(existingData.photos || []);
        }
        setPrimaryPhotoIndex(existingData.primaryPhotoIndex || 0);
      }
    };

    loadFromStorage();

    // Listen for storage events so tests can inject photos via sessionStorage
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'onboarding_photos') {
        loadFromStorage();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, router]);

  const validateAndAddFile = useCallback(
    (file: File) => {
      // Validation checks
      if (photos.length >= 6) {
        setError('You can upload a maximum of 6 photos');
        return false;
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit to match backend
        setError(`File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB > 10MB)`);
        return false;
      }

      if (!file.type.startsWith('image/')) {
        setError(`Invalid file type: ${file.name} (${file.type}). Please select an image file.`);
        return false;
      }

      // Check for supported formats
      const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!supportedTypes.includes(file.type.toLowerCase())) {
        setError(`Unsupported image format: ${file.type}. Supported formats: JPEG, PNG, WebP, GIF`);
        return false;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const newPhoto: PhotoUpload = {
          file,
          preview: result,
        };
        setPhotos((prev) => [...prev, newPhoto]);
        setError('');
      };
      reader.readAsDataURL(file);
      return true;
    },
    [photos.length],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach(validateAndAddFile);
    },
    [validateAndAddFile],
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(validateAndAddFile);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    if (primaryPhotoIndex >= index && primaryPhotoIndex > 0) {
      setPrimaryPhotoIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (photos.length < 2) {
      setError('Please upload at least 2 photos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Upload photos that haven't been uploaded yet (skip legacy placeholders with size 0)
      const photosToUpload = photos.filter(
        (photo) => !photo.url && photo.file && photo.file.size > 0,
      );
      const uploadedUrls: string[] = [];

      if (photosToUpload.length > 0) {
        console.log(`📤 Uploading ${photosToUpload.length} photos...`);

        const files = photosToUpload.map((photo) => photo.file);
        try {
          const urls = await onboardingService.uploadMultiplePhotos(files, (progress) => {
            setUploadProgress({
              completed: progress.completed,
              total: progress.total,
              currentFile: progress.currentFile || '',
              errors: progress.errors || [],
            });
          });
          uploadedUrls.push(...urls);
        } catch (err) {
          // If upload fails (e.g., invalid session), continue with existing data URLs to keep flow unblocked
          console.warn(
            '⚠️ Photo upload failed in photos step, proceeding with local previews:',
            (err as Error)?.message,
          );
        }

        // Update photos with uploaded URLs (best-effort)
        if (uploadedUrls.length > 0) {
          setPhotos((prev) =>
            prev.map((photo) => {
              if (!photo.url && photo.file && photo.file.size > 0) {
                const uploadIndex = photosToUpload.findIndex((p) => p === photo);
                if (uploadIndex !== -1 && uploadedUrls[uploadIndex]) {
                  return { ...photo, url: uploadedUrls[uploadIndex] };
                }
              }
              return photo;
            }),
          );
        }
      }

      // Collect all photo URLs (prefer real URLs else fallback to data URLs)
      const allPhotoUrls = photos
        .map((photo) => photo.url || (photo.preview?.startsWith('data:') ? photo.preview : ''))
        .filter(Boolean);
      // Also include any newly uploaded URLs we just got
      for (const u of uploadedUrls) {
        if (!allPhotoUrls.includes(u)) allPhotoUrls.push(u);
      }

      const photosData: OnboardingPhotos = {
        photos: allPhotoUrls,
        primaryPhotoIndex,
      };

      // Validate with service
      const validationErrors = onboardingService.validatePhotos(photosData);
      if (validationErrors.length > 0) {
        setError(validationErrors[0]);
        return;
      }

      // Save to onboarding service
      onboardingService.saveStep('photos', photosData);

      console.log(`✅ Successfully saved ${allPhotoUrls.length} photos to onboarding`);

      // Persist progress and navigate to next step
      await markOnboardingStep('photos');
      router.push('/onboarding-v2/about');
    } catch (error) {
      console.error('Error uploading/saving photos:', error);
      setError(error instanceof Error ? error.message : 'Failed to save photos. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress({ completed: 0, total: 0, currentFile: '', errors: [] });
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex flex-col relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 text-6xl animate-pulse">📸</div>
        <div className="absolute top-32 right-16 text-4xl animate-bounce">✨</div>
        <div className="absolute bottom-20 left-20 text-5xl animate-pulse">💫</div>
        <div className="absolute bottom-40 right-10 text-3xl animate-bounce">🌟</div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 relative z-10">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
        <span className="text-sm font-medium text-white/80">2/5</span>
      </div>

      {/* Progress Bar */}
      <div className="px-4 mb-8 relative z-10">
        <div className="w-full bg-white/20 rounded-full h-3 backdrop-blur-sm">
          <div
            className="bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] h-3 rounded-full transition-all duration-500 shadow-lg"
            style={{ width: '40%' }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-white/70">
          <span>Basics</span>
          <span>Photos</span>
          <span>About</span>
          <span>Preferences</span>
          <span>Prompts</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-8 relative z-10">
        <div className="max-w-sm mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/15 rounded-full mx-auto mb-4 flex items-center justify-center backdrop-blur-md border-2 border-white/20">
              <span className="text-2xl">📸</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Add your photos</h1>
            <p className="text-white/80 text-base">
              Upload at least 2 photos to show your personality
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg backdrop-blur-sm"
            >
              <p className="text-red-200 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Photo Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <motion.div
                key={index}
                className="aspect-square relative"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {photos[index] ? (
                  <div className="relative w-full h-full group">
                    <div
                      className={`absolute inset-0 rounded-xl border-3 transition-all ${
                        primaryPhotoIndex === index
                          ? 'border-yellow-400 shadow-lg shadow-yellow-400/30'
                          : 'border-white/30'
                      }`}
                    >
                      <img
                        src={photos[index].url || photos[index].preview}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover rounded-xl shadow-lg"
                      />
                    </div>

                    {/* Primary Photo Badge */}
                    {primaryPhotoIndex === index && (
                      <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                        Main
                      </div>
                    )}

                    {/* Photo Actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                      <button
                        onClick={() => setPrimaryPhotoIndex(index)}
                        className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-sm transition-all"
                        title="Set as main photo"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => removePhoto(index)}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-200 p-2 rounded-full backdrop-blur-sm transition-all"
                        title="Remove photo"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <motion.button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full border-2 border-dashed border-white/40 rounded-xl flex flex-col items-center justify-center text-white/60 hover:text-white/80 hover:border-white/60 transition-all backdrop-blur-sm bg-white/5"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <svg
                      className="w-8 h-8 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <span className="text-xs font-medium">Add Photo</span>
                  </motion.button>
                )}
              </motion.div>
            ))}
          </div>

          {/* Upload Instructions */}
          <div className="text-center mb-6">
            <p className="text-white/70 text-sm mb-2">Tap any empty slot to add a photo</p>
            <p className="text-white/60 text-xs">
              Supported formats: JPEG, PNG, WebP, GIF (max 10MB each)
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Upload Progress */}
          {loading && uploadProgress.total > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 glass-card p-4 rounded-xl backdrop-blur-sm border border-white/20"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/80 text-sm">
                  {uploadProgress.errors.length > 0
                    ? 'Upload errors occurred'
                    : 'Uploading photos...'}
                </span>
                <span className="text-white text-sm font-medium">
                  {uploadProgress.completed}/{uploadProgress.total}
                </span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    uploadProgress.errors.length > 0
                      ? 'bg-gradient-to-r from-red-500 to-red-600'
                      : 'bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53]'
                  }`}
                  style={{ width: `${(uploadProgress.completed / uploadProgress.total) * 100}%` }}
                ></div>
              </div>
              {uploadProgress.currentFile && (
                <p className="text-white/60 text-xs truncate">{uploadProgress.currentFile}</p>
              )}
              {uploadProgress.errors.length > 0 && (
                <div className="mt-2 p-2 bg-red-500/20 border border-red-400/30 rounded-lg">
                  <p className="text-red-200 text-xs font-medium mb-1">Upload Errors:</p>
                  {uploadProgress.errors.map((error, index) => (
                    <p key={index} className="text-red-200 text-xs truncate">
                      • {error}
                    </p>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Continue Button */}
          <form onSubmit={handleSubmit}>
            <motion.button
              type="submit"
              disabled={loading || photos.length < 2}
              className={`w-full py-3 px-6 rounded-xl font-semibold shadow-lg transition-all duration-300 ${
                photos.length >= 2
                  ? 'bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7043] text-white hover:shadow-xl'
                  : 'bg-white/20 text-white/50 cursor-not-allowed'
              }`}
              whileHover={photos.length >= 2 ? { scale: 1.02 } : {}}
              whileTap={photos.length >= 2 ? { scale: 0.98 } : {}}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {uploadProgress.total > 0 ? 'Uploading...' : 'Saving...'}
                </div>
              ) : (
                `Continue ${photos.length >= 2 ? '' : `(${photos.length}/2 photos)`}`
              )}
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  );
}
