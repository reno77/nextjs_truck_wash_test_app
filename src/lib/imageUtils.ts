import imageCompression from 'browser-image-compression';

export const IMAGE_CONFIG = {
  maxSizeMB: 1, // Maximum image size in MB
  maxWidthOrHeight: 1920, // Maximum dimension
  allowedTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ],
  compressionOptions: {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    preserveExif: true
  }
};

export const S3_CONFIG = {
  bucketStructure: {
    washes: {
      prefix: 'washes',
      beforePrefix: 'before',
      afterPrefix: 'after',
    }
  },
  expiryTime: {
    upload: 3600,     // 1 hour for upload URLs
    view: 24 * 3600,  // 24 hours for view URLs
    delete: 300       // 5 minutes for delete URLs
  }
};

export async function validateAndCompressImage(
  file: File
): Promise<{ isValid: boolean; error?: string; compressedFile?: File }> {
  try {
    // Check file type
    if (!IMAGE_CONFIG.allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `Invalid file type. Allowed types: ${IMAGE_CONFIG.allowedTypes.join(', ')}`
      };
    }

    // Check initial file size
    if (file.size > IMAGE_CONFIG.maxSizeMB * 1024 * 1024) {
      const compressed = await imageCompression(file, IMAGE_CONFIG.compressionOptions);
      
      // Check if compression helped
      if (compressed.size > IMAGE_CONFIG.maxSizeMB * 1024 * 1024) {
        return {
          isValid: false,
          error: `File too large. Maximum size: ${IMAGE_CONFIG.maxSizeMB}MB`
        };
      }

      return {
        isValid: true,
        compressedFile: compressed
      };
    }

    return {
      isValid: true,
      compressedFile: file
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Error processing image'
    };
  }
}

export function generateS3Key(userId: string, imageType: 'before' | 'after', fileName: string): string {
  const { washes } = S3_CONFIG.bucketStructure;
  const timestamp = new Date().toISOString().split('T')[0];
  return `${washes.prefix}/${userId}/${timestamp}/${washes[`${imageType}Prefix`]}/${fileName}`;
}
