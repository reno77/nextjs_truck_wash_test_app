import { createMockContext, mockContext, mockWasherSession, mockDriverSession } from '../helpers/testUtils';
import { NextRequest } from 'next/server';
import { PUT, DELETE } from '@/app/api/washes/[id]/route';
import { getServerSession } from 'next-auth';
import { WashType, ImageType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock next-auth at the module level
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => jest.fn()),
  getServerSession: jest.fn(),
}));

// Mock the auth options
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {}
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockContext.prisma,
}));

// Mock S3 deleteImage function
jest.mock('@/lib/s3', () => ({
  deleteImage: jest.fn(),
}));

describe('Washes API - Individual Wash Operations', () => {
  const mockGetServerSession = getServerSession as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default unauthorized state
    mockGetServerSession.mockResolvedValue(null);
  });

  describe('PUT /api/washes/[id]', () => {
    it('should update a wash record when authenticated as washer', async () => {
      mockGetServerSession.mockResolvedValue(mockWasherSession);

      const updateData = {
        licensePlate: 'TRUCK002',
        driverId: '2',
        washType: 'premium',
        price: 150.00,
        notes: 'Updated wash notes',
        beforeImage: 'new-before-image-key',
        afterImage: 'new-after-image-key'
      };

      // Mock the existing wash record
      const mockExistingWashRecord = {
        id: 1,
        truckId: 1,
        washerId: mockWasherSession.user.id,
        washType: WashType.basic,
        price: new Decimal(100.00),
        notes: 'Original notes',
        washDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        truck: {
          id: 1,
          licensePlate: 'TRUCK001',
          driverId: '1',
          driver: {
            id: '1',
            email: 'driver1@example.com',
            fullName: 'Driver One',
            role: 'driver'
          }
        },
        images: [
          { id: 1, imageType: ImageType.before, imageKey: 'old-before-image-key' },
          { id: 2, imageType: ImageType.after, imageKey: 'old-after-image-key' }
        ]
      };

      // Mock the updated wash record
      const mockUpdatedWashRecord = {
        id: 1,
        truckId: 2,
        washerId: mockWasherSession.user.id,
        washType: WashType.premium,
        price: new Decimal(150.00),
        notes: 'Updated wash notes',
        washDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        truck: {
          id: 2,
          licensePlate: 'TRUCK002',
          driverId: '2',
          driver: {
            id: '2',
            email: 'driver2@example.com',
            fullName: 'Driver Two',
            role: 'driver'
          }
        },
        washer: {
          id: mockWasherSession.user.id,
          email: 'washer@example.com',
          fullName: 'Test Washer',
          role: 'washer'
        },
        images: [
          { id: 3, imageType: ImageType.before, imageKey: 'new-before-image-key' },
          { id: 4, imageType: ImageType.after, imageKey: 'new-after-image-key' }
        ]
      };

      // Mock the driver lookup
      const mockDriver = {
        id: '2',
        email: 'driver2@example.com',
        fullName: 'Driver Two',
        role: 'driver' as const,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordHash: null
      };

      // Mock the truck lookup/creation
      const mockTruck = {
        id: 2,
        licensePlate: 'TRUCK002',
        driverId: '2',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockContext.prisma.washRecord.findFirst.mockResolvedValue(mockExistingWashRecord);
      mockContext.prisma.user.findUnique.mockResolvedValue(mockDriver);
      mockContext.prisma.truck.findUnique.mockResolvedValue(mockTruck);
      mockContext.prisma.$transaction.mockResolvedValue(mockUpdatedWashRecord);

      const response = await PUT(
        new NextRequest(new URL('http://localhost:3000/api/washes/1'), {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }),
        { params: Promise.resolve({ id: '1' }) }
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('washRecord');
      expect(data.washRecord).toMatchObject({
        id: 1,
        truckId: 2,
        washerId: mockWasherSession.user.id,
        washType: 'premium',
        notes: 'Updated wash notes'
      });
    });

    it('should return 404 when wash record not found or not owned by washer', async () => {
      mockGetServerSession.mockResolvedValue(mockWasherSession);

      mockContext.prisma.washRecord.findFirst.mockResolvedValue(null);

      const updateData = {
        licensePlate: 'TRUCK002',
        driverId: '2',
        washType: 'premium',
        price: 150.00,
        notes: 'Updated wash notes',
        beforeImage: 'new-before-image-key',
        afterImage: 'new-after-image-key'
      };

      const response = await PUT(
        new NextRequest(new URL('http://localhost:3000/api/washes/999'), {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }),
        { params: Promise.resolve({ id: '999' }) }
      );

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated as washer', async () => {
      mockGetServerSession.mockResolvedValue(mockDriverSession);

      const updateData = {
        licensePlate: 'TRUCK002',
        driverId: '2',
        washType: 'premium',
        price: 150.00,
        notes: 'Updated wash notes',
        beforeImage: 'new-before-image-key',
        afterImage: 'new-after-image-key'
      };

      const response = await PUT(
        new NextRequest(new URL('http://localhost:3000/api/washes/1'), {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }),
        { params: Promise.resolve({ id: '1' }) }
      );

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/washes/[id]', () => {
    it('should delete a wash record when authenticated as washer', async () => {
      mockGetServerSession.mockResolvedValue(mockWasherSession);

      const mockExistingWashRecord = {
        id: 1,
        truckId: 1,
        washerId: mockWasherSession.user.id,
        washType: WashType.basic,
        price: new Decimal(100.00),
        washDate: new Date(),
        notes: 'Test notes',
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [
          { id: 1, imageKey: 'image-key-1' },
          { id: 2, imageKey: 'image-key-2' }
        ]
      };

      mockContext.prisma.washRecord.findFirst.mockResolvedValue(mockExistingWashRecord);
      mockContext.prisma.washRecord.delete.mockResolvedValue(mockExistingWashRecord);

      const response = await DELETE(
        new NextRequest(new URL('http://localhost:3000/api/washes/1'), {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: '1' }) }
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('message', 'Wash record deleted successfully');
      expect(mockContext.prisma.washRecord.delete).toHaveBeenCalledWith({
        where: { id: 1 }
      });
    });

    it('should return 404 when wash record not found or not owned by washer', async () => {
      mockGetServerSession.mockResolvedValue(mockWasherSession);

      mockContext.prisma.washRecord.findFirst.mockResolvedValue(null);

      const response = await DELETE(
        new NextRequest(new URL('http://localhost:3000/api/washes/999'), {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: '999' }) }
      );

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated as washer', async () => {
      mockGetServerSession.mockResolvedValue(mockDriverSession);

      const response = await DELETE(
        new NextRequest(new URL('http://localhost:3000/api/washes/1'), {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: '1' }) }
      );

      expect(response.status).toBe(401);
    });
  });
});
