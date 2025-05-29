import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cleanupOldImages } from '@/lib/cleanupS3';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'manager') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { daysOld } = await req.json();
    
    if (!daysOld || daysOld < 1) {
      return NextResponse.json(
        { error: 'Invalid daysOld parameter' },
        { status: 400 }
      );
    }

    await cleanupOldImages({ daysOld });

    return NextResponse.json({ 
      message: `Successfully initiated cleanup of images older than ${daysOld} days` 
    });
  } catch (error) {
    console.error('Error in cleanup endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup old images' },
      { status: 500 }
    );
  }
}
