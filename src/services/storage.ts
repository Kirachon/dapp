import { Client as MinioClient } from 'minio';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000');
const MINIO_ACCESS_KEY = process.env.MINIO_ROOT_USER || 'minio';
const MINIO_SECRET_KEY = process.env.MINIO_ROOT_PASSWORD || 'minio123';
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';

const BUCKET_NAME = 'dating-app';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export class StorageService {
  private minioClient: MinioClient;

  constructor() {
    this.minioClient = new MinioClient({
      endPoint: MINIO_ENDPOINT,
      port: MINIO_PORT,
      useSSL: MINIO_USE_SSL,
      accessKey: MINIO_ACCESS_KEY,
      secretKey: MINIO_SECRET_KEY,
    });
    
    this.initializeBucket();
  }

  private async initializeBucket() {
    try {
      const bucketExists = await this.minioClient.bucketExists(BUCKET_NAME);
      if (!bucketExists) {
        await this.minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
        console.log(`✅ Created MinIO bucket: ${BUCKET_NAME}`);
        
        // Set bucket policy to allow public read access for images
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${BUCKET_NAME}/photos/*`],
            },
          ],
        };
        
        await this.minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
        console.log(`✅ Set public read policy for ${BUCKET_NAME}/photos/*`);
      }
    } catch (error) {
      console.error('❌ Failed to initialize MinIO bucket:', error);
    }
  }

  async uploadPhoto(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    userId: string
  ): Promise<{ url: string; thumbnailUrl: string; filename: string }> {
    // Validate file
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${buffer.length} bytes (max: ${MAX_FILE_SIZE})`);
    }

    const fileId = uuidv4();
    const extension = this.getExtensionFromMimeType(mimeType);
    const filename = `${fileId}.${extension}`;
    const thumbnailFilename = `${fileId}_thumb.${extension}`;

    try {
      // Process main image (resize and optimize)
      const processedImage = await sharp(buffer)
        .resize(1080, 1080, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();

      // Create thumbnail
      const thumbnail = await sharp(buffer)
        .resize(300, 300, { 
          fit: 'cover' 
        })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();

      // Upload main image
      const mainImagePath = `photos/${userId}/${filename}`;
      await this.minioClient.putObject(
        BUCKET_NAME,
        mainImagePath,
        processedImage,
        processedImage.length,
        {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000', // 1 year
          'x-amz-meta-original-name': originalName,
          'x-amz-meta-user-id': userId,
          'x-amz-meta-uploaded-at': new Date().toISOString(),
        }
      );

      // Upload thumbnail
      const thumbnailPath = `photos/${userId}/thumbnails/${thumbnailFilename}`;
      await this.minioClient.putObject(
        BUCKET_NAME,
        thumbnailPath,
        thumbnail,
        thumbnail.length,
        {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000',
          'x-amz-meta-user-id': userId,
        }
      );

      // Generate public URLs
      const baseUrl = `http://${MINIO_ENDPOINT}:${MINIO_PORT}/${BUCKET_NAME}`;
      const url = `${baseUrl}/${mainImagePath}`;
      const thumbnailUrl = `${baseUrl}/${thumbnailPath}`;

      console.log(`✅ Uploaded photo for user ${userId}: ${filename}`);

      return {
        url,
        thumbnailUrl,
        filename,
      };
    } catch (error) {
      console.error('❌ Failed to upload photo:', error);
      throw new Error('Failed to upload photo');
    }
  }

  async deletePhoto(userId: string, filename: string): Promise<void> {
    try {
      const mainImagePath = `photos/${userId}/${filename}`;
      const thumbnailPath = `photos/${userId}/thumbnails/${filename.replace('.', '_thumb.')}`;

      // Delete main image
      await this.minioClient.removeObject(BUCKET_NAME, mainImagePath);
      
      // Delete thumbnail (ignore errors if it doesn't exist)
      try {
        await this.minioClient.removeObject(BUCKET_NAME, thumbnailPath);
      } catch (error) {
        console.warn(`⚠️ Thumbnail not found for deletion: ${thumbnailPath}`);
      }

      console.log(`✅ Deleted photo for user ${userId}: ${filename}`);
    } catch (error) {
      console.error('❌ Failed to delete photo:', error);
      throw new Error('Failed to delete photo');
    }
  }

  async generatePresignedUploadUrl(
    userId: string,
    filename: string,
    mimeType: string
  ): Promise<{ uploadUrl: string; url: string; thumbnailUrl: string; filename: string }> {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    const fileId = uuidv4();
    const extension = this.getExtensionFromMimeType(mimeType);
    const objectName = `photos/${userId}/uploads/${fileId}.${extension}`;
    const thumbnailObjectName = `photos/${userId}/thumbnails/${fileId}.jpg`;

    try {
      const uploadUrl = await this.minioClient.presignedPutObject(
        BUCKET_NAME,
        objectName,
        24 * 60 * 60 // 24 hours
      );

      // Generate the final URLs that will be accessible after upload
      const baseUrl = `http://${MINIO_ENDPOINT}:${MINIO_PORT}/${BUCKET_NAME}`;
      const url = `${baseUrl}/${objectName}`;
      const thumbnailUrl = `${baseUrl}/${thumbnailObjectName}`;

      return {
        uploadUrl,
        url,
        thumbnailUrl,
        filename: `${fileId}.${extension}`,
      };
    } catch (error) {
      console.error('❌ Failed to generate presigned URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  private getExtensionFromMimeType(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      default:
        return 'jpg';
    }
  }

  async listUserPhotos(userId: string): Promise<string[]> {
    try {
      const prefix = `photos/${userId}/`;
      const objectsStream = this.minioClient.listObjects(BUCKET_NAME, prefix, false);
      
      const photos: string[] = [];
      for await (const obj of objectsStream) {
        if (obj.name && !obj.name.includes('/thumbnails/') && !obj.name.includes('/uploads/')) {
          const baseUrl = `http://${MINIO_ENDPOINT}:${MINIO_PORT}/${BUCKET_NAME}`;
          photos.push(`${baseUrl}/${obj.name}`);
        }
      }
      
      return photos;
    } catch (error) {
      console.error('❌ Failed to list user photos:', error);
      return [];
    }
  }
}

export const storageService = new StorageService();
