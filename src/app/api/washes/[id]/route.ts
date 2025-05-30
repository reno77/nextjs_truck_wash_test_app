import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma, WashType, ImageType } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteImage } from '@/lib/s3';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'washer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const washId = parseInt(id);
    if (isNaN(washId)) {
      return NextResponse.json({ error: 'Invalid wash ID' }, { status: 400 });
    }

    const { licensePlate, washType, price, notes, driverId, beforeImage, afterImage } = await req.json();

    // Validate required fields
    if (!licensePlate || !washType || !price || !driverId || !beforeImage || !afterImage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if wash record exists and belongs to the current washer
    const existingWash = await prisma.washRecord.findFirst({
      where: {
        id: washId,
        washerId: (session.user as any).id,
      },
      include: {
        images: true,
        truck: true,
      },
    });

    if (!existingWash) {
      return NextResponse.json({ error: 'Wash record not found' }, { status: 404 });
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

    // Find or create truck if license plate changed
    let truck = existingWash.truck;
    if (truck.licensePlate !== licensePlate) {
      // Check if truck with new license plate exists
      const existingTruck = await prisma.truck.findUnique({
        where: { licensePlate },
      });

      if (existingTruck) {
        truck = existingTruck;
      } else {
        // Create new truck
        truck = await prisma.truck.create({
          data: {
            licensePlate,
            driverId: driver.id,
          },
        });
      }
    } else if (truck.driverId !== driver.id) {
      // Update truck driver if changed
      truck = await prisma.truck.update({
        where: { id: truck.id },
        data: { driverId: driver.id },
      });
    }

    // Prepare image updates
    const currentBeforeImage = existingWash.images.find(img => img.imageType === ImageType.before);
    const currentAfterImage = existingWash.images.find(img => img.imageType === ImageType.after);
    
    const imagesToDelete: string[] = [];
    const imagesToCreate: { imageType: ImageType; imageKey: string }[] = [];

    // Handle before image
    if (currentBeforeImage && currentBeforeImage.imageKey !== beforeImage) {
      imagesToDelete.push(currentBeforeImage.imageKey);
      imagesToCreate.push({ imageType: ImageType.before, imageKey: beforeImage });
    } else if (!currentBeforeImage) {
      imagesToCreate.push({ imageType: ImageType.before, imageKey: beforeImage });
    }

    // Handle after image
    if (currentAfterImage && currentAfterImage.imageKey !== afterImage) {
      imagesToDelete.push(currentAfterImage.imageKey);
      imagesToCreate.push({ imageType: ImageType.after, imageKey: afterImage });
    } else if (!currentAfterImage) {
      imagesToCreate.push({ imageType: ImageType.after, imageKey: afterImage });
    }

    // Update wash record in a transaction
    const updatedWashRecord = await prisma.$transaction(async (prisma) => {
      // Delete old images from database
      if (imagesToDelete.length > 0) {
        await prisma.washImage.deleteMany({
          where: {
            washRecordId: washId,
            imageKey: { in: imagesToDelete },
          },
        });
      }

      // Update the wash record
      const updatedWash = await prisma.washRecord.update({
        where: { id: washId },
        data: {
          truckId: truck.id,
          washType: washType as WashType,
          price: new Prisma.Decimal(price),
          notes,
          images: imagesToCreate.length > 0 ? {
            create: imagesToCreate,
          } : undefined,
        },
        include: {
          truck: {
            include: {
              driver: true,
            },
          },
          washer: true,
          images: true,
        },
      });

      return updatedWash;
    });

    // Delete old images from S3 (do this after successful database update)
    for (const imageKey of imagesToDelete) {
      try {
        await deleteImage(imageKey);
      } catch (error) {
        console.error(`Failed to delete image ${imageKey} from S3:`, error);
        // Don't fail the request if S3 deletion fails
      }
    }

    return NextResponse.json({ washRecord: updatedWashRecord });
  } catch (error) {
    console.error('Error updating wash record:', error);
    return NextResponse.json(
      { error: 'Failed to update wash record' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'washer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const washId = parseInt(id);
    if (isNaN(washId)) {
      return NextResponse.json({ error: 'Invalid wash ID' }, { status: 400 });
    }

    // Check if wash record exists and belongs to the current washer
    const existingWash = await prisma.washRecord.findFirst({
      where: {
        id: washId,
        washerId: (session.user as any).id,
      },
      include: {
        images: true,
      },
    });

    if (!existingWash) {
      return NextResponse.json({ error: 'Wash record not found' }, { status: 404 });
    }

    // Delete wash record (this will cascade delete images due to foreign key)
    await prisma.washRecord.delete({
      where: { id: washId },
    });

    // Delete images from S3
    for (const image of existingWash.images) {
      try {
        await deleteImage(image.imageKey);
      } catch (error) {
        console.error(`Failed to delete image ${image.imageKey} from S3:`, error);
        // Don't fail the request if S3 deletion fails
      }
    }

    return NextResponse.json({ message: 'Wash record deleted successfully' });
  } catch (error) {
    console.error('Error deleting wash record:', error);
    return NextResponse.json(
      { error: 'Failed to delete wash record' },
      { status: 500 }
    );
  }
}
