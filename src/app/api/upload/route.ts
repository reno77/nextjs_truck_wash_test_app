import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { s3Client } from '@/lib/s3';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { IMAGE_CONFIG, S3_CONFIG, generateS3Key } from '@/lib/imageUtils';

export async function POST(req: NextRequest) {
  try {
    // Validate AWS environment variables first
    const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_S3_BUCKET_NAME'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Upload API - Missing AWS environment variables:', missingVars);
      return NextResponse.json(
        { error: `Missing AWS configuration: ${missingVars.join(', ')}` },
        { status: 500 }
      );
    }
    
    console.log('Upload API - AWS environment variables check passed');

    const session = await getServerSession(authOptions);
    
    // For debugging - temporarily allow requests without authentication
    const isDebugMode = process.env.NODE_ENV === 'development' && req.url?.includes('debug=true');
    
    if (!isDebugMode && (!session || !session.user || (session.user as any).role !== 'washer')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Upload API - Authentication check passed (debug mode:', isDebugMode, ')');

    // Parse JSON directly from request
    let parsedBody;
    try {
      parsedBody = await req.json();
      console.log('Upload API - Parsed body:', parsedBody);
    } catch (parseError) {
      console.error('Upload API - JSON parse error:', parseError);
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      console.error('Upload API - Parse error message:', errorMessage);
      
      // Try to get raw body for debugging
      try {
        const bodyText = await req.text();
        console.log('Upload API - Raw request body after error:', bodyText);
      } catch (textError) {
        console.log('Upload API - Could not read raw body:', textError);
      }
      
      return NextResponse.json({ error: 'Invalid JSON in request body: ' + errorMessage }, { status: 400 });
    }

    const { fileType, imageType, fileSize } = parsedBody;

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
    const userId = session?.user ? (session.user as any).id.toString() : 'debug-user';
    const key = generateS3Key(
      userId,
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
        'user-id': userId,
        'image-type': imageType,
      },
    });

    console.log('Upload API - Generating presigned URL for bucket:', process.env.AWS_S3_BUCKET_NAME);
    console.log('Upload API - S3 key:', key);
    console.log('Upload API - Request body received:', { fileType, imageType, fileSize });

    let presignedUrl;
    try {
      presignedUrl = await getSignedUrl(s3Client, putObjectCommand, {
        expiresIn: S3_CONFIG.expiryTime.upload,
      });
      console.log('Upload API - Presigned URL generated successfully');
    } catch (s3Error) {
      console.error('Upload API - S3 Error generating presigned URL:', s3Error);
      return NextResponse.json(
        { error: 'Failed to generate presigned URL - S3 error' },
        { status: 500 }
      );
    }

    // Generate a view URL that expires in 24 hours
    let viewUrl;
    try {
      const getObjectCommand = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
      });
      viewUrl = await getSignedUrl(s3Client, getObjectCommand, {
        expiresIn: S3_CONFIG.expiryTime.view,
      });
      console.log('Upload API - View URL generated successfully');
    } catch (s3Error) {
      console.error('Upload API - S3 Error generating view URL:', s3Error);
      return NextResponse.json(
        { error: 'Failed to generate view URL - S3 error' },
        { status: 500 }
      );
    }

    const responseData = {
      uploadUrl: presignedUrl, // URL for uploading the file
      key,                     // S3 key for database storage
      viewUrl,                 // Pre-signed URL for viewing the file
    };

    console.log('Upload API - Response data:', {
      uploadUrl: 'URL_HIDDEN',
      key,
      viewUrl: 'URL_HIDDEN'
    });

    return NextResponse.json(responseData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error type:', typeof error);
    console.error('Error stringified:', JSON.stringify(error, null, 2));
    
    // Ensure we always return a valid JSON response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        error: 'Failed to generate upload URL',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
