import { NextRequest, NextResponse } from 'next/server';
import { getImageUrl } from '@/lib/s3';

export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json();

    if (!key || typeof key !== 'string') {
      return NextResponse.json(
        { error: 'Image key is required' },
        { status: 400 }
      );
    }

    // Generate presigned URL for viewing the image
    const viewUrl = await getImageUrl(key);

    return NextResponse.json({ viewUrl });
  } catch (error) {
    console.error('Error generating view URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate view URL' },
      { status: 500 }
    );
  }
}
