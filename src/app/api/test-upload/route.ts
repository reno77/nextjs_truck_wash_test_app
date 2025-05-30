import { NextRequest, NextResponse } from 'next/server';
import { s3Client } from '@/lib/s3';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    console.log('Test Upload API - Starting...');
    
    // Debug: Log the raw request body
    const bodyText = await req.text();
    console.log('Test Upload API - Raw body:', bodyText);
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('Test Upload API - JSON parse error:', parseError);
      console.error('Test Upload API - Body that failed to parse:', bodyText);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { fileType, imageType, fileSize } = parsedBody;
    console.log('Test Upload API - Parsed body:', { fileType, imageType, fileSize });

    // Generate a unique filename
    const fileExtension = fileType.split('/')[1];
    const fileName = `test-${crypto.randomBytes(8).toString('hex')}.${fileExtension}`;
    const key = `test-uploads/${fileName}`;

    console.log('Test Upload API - Generated key:', key);

    // Generate presigned URL
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    console.log('Test Upload API - Creating presigned URL...');
    const presignedUrl = await getSignedUrl(s3Client, putObjectCommand, {
      expiresIn: 3600,
    });

    console.log('Test Upload API - Presigned URL created successfully');

    // Generate a view URL
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    });
    const viewUrl = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: 86400,
    });

    console.log('Test Upload API - View URL created successfully');

    const result = {
      uploadUrl: presignedUrl,
      key,
      viewUrl,
    };

    console.log('Test Upload API - Returning result:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Test Upload API - Error:', error);
    console.error('Test Upload API - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to generate upload URL', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
