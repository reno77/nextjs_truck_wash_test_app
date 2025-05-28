import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { s3Client } from '@/lib/s3';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { IMAGE_CONFIG, S3_CONFIG, generateS3Key } from '@/lib/imageUtils';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'washer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileType, imageType, fileSize } = await req.json();

    // Validate file type
    if (!IMAGE_CONFIG.allowedTypes.includes(fileType)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed types: ${IMAGE_CONFIG.allowedTypes.join(
            ', '
          )}`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (fileSize > IMAGE_CONFIG.maxSizeMB * 1024 * 1024) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size: ${IMAGE_CONFIG.maxSizeMB}MB`,
        },
        { status: 400 }
      );
    }

    // Generate a unique filename
    const fileExtension = fileType.split('/')[1];
    const fileName = `${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;

    // Generate S3 key using the configured structure
    const key = generateS3Key(
      (session.user as any).id.toString(),
      imageType,
      fileName
    );

    // Generate presigned URL
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
      Metadata: {
        'original-filename': fileName,
        'upload-date': new Date().toISOString(),
        'user-id': (session.user as any).id.toString(),
        'image-type': imageType,
      },
    });

    const presignedUrl = await getSignedUrl(s3Client, putObjectCommand, {
      expiresIn: S3_CONFIG.expiryTime.upload,
    });

    // Generate a view URL that expires in 24 hours
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    });
    const viewUrl = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: S3_CONFIG.expiryTime.view,
    });

    return NextResponse.json({
      uploadUrl: presignedUrl, // URL for uploading the file
      key,                     // S3 key for database storage
      viewUrl,                 // Pre-signed URL for viewing the file
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
