import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function generatePresignedUrl(
  key: string,
  operation: 'get' | 'put',
  expiresIn: number = 3600
): Promise<string> {
  const command = operation === 'get'
    ? new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
      })
    : new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        ContentType: 'image/jpeg', // Adjust based on your needs
      });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

export async function getImageUrl(key: string): Promise<string> {
  return generatePresignedUrl(key, 'get', 24 * 3600); // 24 hours expiry for viewing
}

export async function getUploadUrl(key: string): Promise<string> {
  return generatePresignedUrl(key, 'put', 3600); // 1 hour expiry for uploads
}

export async function deleteImage(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
  });
  
  await s3Client.send(command);
}
