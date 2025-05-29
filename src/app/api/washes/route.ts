import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma, WashType, ImageType } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'washer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { licensePlate, washType, price, notes, driverId, beforeImage, afterImage } = await req.json();

    // Validate required fields
    if (!licensePlate || !washType || !price || !driverId || !beforeImage || !afterImage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate driver exists
    const driver = await prisma.user.findUnique({
      where: { id: driverId, role: 'driver' },
    });

    if (!driver) {
      return NextResponse.json(
        { error: 'Invalid driver selected' },
        { status: 400 }
      );
    }

    // Validate wash type
    const validWashTypes = ['basic', 'premium', 'deluxe'] as const;
    if (!validWashTypes.includes(washType as typeof validWashTypes[number])) {
      return NextResponse.json(
        { error: 'Invalid wash type' },
        { status: 400 }
      );
    }

    // Find or create truck
    let truck = await prisma.truck.findUnique({
      where: { licensePlate },
    });

    if (!truck) {
      truck = await prisma.truck.create({
        data: {
          licensePlate,
          driverId: driver.id,
        },
      });
    }

    const washRecordData: Prisma.WashRecordCreateInput = {
      truck: {
        connect: {
          id: truck.id,
        },
      },
      washer: {
        connect: {
          id: (session.user as any).id,
        },
      },
      washType: washType as WashType,
      price: new Prisma.Decimal(price),
      notes,
      images: {
        create: [
          {
            imageType: ImageType.before,
            imageKey: beforeImage,
          },
          {
            imageType: ImageType.after,
            imageKey: afterImage,
          },
        ],
      },
    };

    // Create wash record with properly typed data
    const washRecord = await prisma.washRecord.create({
      data: washRecordData,
      include: {
        truck: true,
        washer: true,
        images: true,
      },
    });

    return NextResponse.json({ washRecord });
  } catch (error) {
    console.error('Error creating wash record:', error);
    return NextResponse.json(
      { error: 'Failed to create wash record' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'washer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const washRecords = await prisma.washRecord.findMany({
      where: {
        washerId: (session.user as any).id,
      },
      include: {
        truck: {
          include: {
            driver: true,
          },
        },
        images: true,
      },
      orderBy: {
        washDate: 'desc',
      },
    });

    return NextResponse.json({ washRecords });
  } catch (error) {
    console.error('Error fetching wash records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wash records' },
      { status: 500 }
    );
  }
}
