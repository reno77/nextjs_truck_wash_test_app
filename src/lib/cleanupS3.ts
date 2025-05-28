import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { S3_CONFIG } from './imageUtils';

interface CleanupOptions {
  daysOld?: number;
  prefix?: string;
}

export async function cleanupOldImages(options: CleanupOptions = {}) {
  const { daysOld = 30, prefix = S3_CONFIG.bucketStructure.washes.prefix } = options;
  const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // List all objects in the bucket with the given prefix
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Prefix: prefix,
    });

    const listedObjects = await s3Client.send(listCommand);
    
    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      console.log('No objects found to clean up');
      return;
    }

    // Filter objects older than cutoff date
    const objectsToDelete = listedObjects.Contents
      .filter(obj => obj.LastModified && obj.LastModified < cutoffDate)
      .map(obj => ({ Key: obj.Key! }));

    if (objectsToDelete.length === 0) {
      console.log('No old objects found to delete');
      return;
    }

    // Delete old objects
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Delete: { Objects: objectsToDelete },
    });

    await s3Client.send(deleteCommand);
    console.log(`Successfully deleted ${objectsToDelete.length} old images`);
  } catch (error) {
    console.error('Error cleaning up old images:', error);
    throw error;
  }
}
