import sharp from 'sharp';

export interface ImageProcessingOptions {
  width: number;
  height: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface ProcessedImage {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number;
}

export class ImageProcessor {
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_FORMATS = ['jpeg', 'jpg', 'png', 'webp'];
  private static readonly AVATAR_SIZES = {
    thumbnail: { width: 50, height: 50 },
    standard: { width: 200, height: 200 },
    large: { width: 400, height: 400 },
  };

  static validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return { valid: false, error: 'File size must be under 5MB' };
    }

    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !this.ALLOWED_FORMATS.includes(fileExtension)) {
      return { valid: false, error: 'File must be JPEG, PNG, or WebP format' };
    }

    // Check MIME type
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'File must be an image' };
    }

    return { valid: true };
  }

  static async processImage(
    buffer: Buffer,
    options: ImageProcessingOptions
  ): Promise<ProcessedImage> {
    try {
      const { width, height, quality = 85, format = 'webp' } = options;

      let sharpInstance = sharp(buffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'center',
        })
        .rotate(); // Auto-rotate based on EXIF data

      // Apply format-specific processing
      switch (format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ quality, progressive: true });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({ quality, progressive: true });
          break;
        case 'webp':
        default:
          sharpInstance = sharpInstance.webp({ quality });
          break;
      }

      const processedBuffer = await sharpInstance.toBuffer();
      const metadata = await sharp(processedBuffer).metadata();

      return {
        buffer: processedBuffer,
        format,
        width: metadata.width || width,
        height: metadata.height || height,
        size: processedBuffer.length,
      };
    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error('Failed to process image');
    }
  }

  static async processAvatarSizes(buffer: Buffer): Promise<{
    thumbnail: ProcessedImage;
    standard: ProcessedImage;
    large: ProcessedImage;
  }> {
    try {
      const [thumbnail, standard, large] = await Promise.all([
        this.processImage(buffer, {
          ...this.AVATAR_SIZES.thumbnail,
          format: 'webp',
          quality: 80,
        }),
        this.processImage(buffer, {
          ...this.AVATAR_SIZES.standard,
          format: 'webp',
          quality: 85,
        }),
        this.processImage(buffer, {
          ...this.AVATAR_SIZES.large,
          format: 'webp',
          quality: 90,
        }),
      ]);

      return { thumbnail, standard, large };
    } catch (error) {
      console.error('Avatar processing error:', error);
      throw new Error('Failed to process avatar images');
    }
  }

  static generateFileName(userId: string, size: string, format: string): string {
    const timestamp = Date.now();
    return `avatars/${userId}/${size}-${timestamp}.${format}`;
  }

  static async extractMetadata(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
    hasAlpha: boolean;
  }> {
    try {
      const metadata = await sharp(buffer).metadata();
      
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
        hasAlpha: metadata.hasAlpha || false,
      };
    } catch (error) {
      console.error('Metadata extraction error:', error);
      throw new Error('Failed to extract image metadata');
    }
  }

  static sanitizeImage(buffer: Buffer): Promise<Buffer> {
    // Remove EXIF data and other metadata for privacy
    return sharp(buffer)
      .rotate() // Apply rotation based on EXIF, then remove EXIF
      .toBuffer();
  }
}
