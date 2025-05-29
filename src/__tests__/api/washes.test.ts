import { createMockContext, mockContext, mockWasherSession, mockDriverSession } from '../helpers/testUtils';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/washes/route';
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

describe('Washes API', () => {
  const mockGetServerSession = getServerSession as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default unauthorized state
    mockGetServerSession.mockResolvedValue(null);
  });

  describe('GET /api/washes', () => {
    it('should return all wash records for a washer', async () => {
      mockGetServerSession.mockResolvedValue(mockWasherSession);

      const mockWashRecords = [
        { 
          id: 1,
          truckId: 1,
          washerId: parseInt(mockWasherSession.user.id),
          washType: WashType.basic,
          price: new Decimal(100.00),
          washDate: new Date(),
          notes: 'Test wash',
          createdAt: new Date(),
          updatedAt: new Date(),
          truck: {
            id: 1,
            licensePlate: 'TRUCK001',
            driverId: 1,
            driver: {
              id: 1,
              email: 'driver@example.com',
              fullName: 'Test Driver',
              role: 'driver'
            }
          },
          images: []
        },
      ];

      mockContext.prisma.washRecord.findMany.mockResolvedValue(mockWashRecords);

      const response = await GET(new NextRequest(new URL('http://localhost:3000/api/washes')));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('washRecords');
      expect(data.washRecords).toHaveLength(1);
      expect(data.washRecords[0]).toMatchObject({
        id: 1,
        truckId: 1,
        washerId: 1,
        washType: 'basic',
        notes: 'Test wash',
        truck: {
          id: 1,
          licensePlate: 'TRUCK001',
          driverId: 1,
          driver: {
            id: 1,
            email: 'driver@example.com',
            fullName: 'Test Driver',
            role: 'driver'
          }
        },
        images: []
      });
    });

    it('should return 401 when not authenticated as washer', async () => {
      mockGetServerSession.mockResolvedValue(mockDriverSession);

      const response = await GET(new NextRequest(new URL('http://localhost:3000/api/washes')));
      expect(response.status).toBe(401);
    });

    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const response = await GET(new NextRequest(new URL('http://localhost:3000/api/washes')));
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/washes', () => {
    it('should create a new wash record when authenticated as washer', async () => {
      mockGetServerSession.mockResolvedValue(mockWasherSession);

      const newWashData = {
        licensePlate: 'TRUCK001',
        driverId: '1',
        washType: 'basic',
        price: 100.00,
        notes: 'Test wash',
        beforeImage: 'before-image-key',
        afterImage: 'after-image-key'
      };

      // Mock driver lookup
      mockContext.prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'driver@example.com',
        fullName: 'Test Driver',
        role: 'driver',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Mock truck lookup (not found, so create new)
      mockContext.prisma.truck.findUnique.mockResolvedValue(null);
      mockContext.prisma.truck.create.mockResolvedValue({
        id: 1,
        licensePlate: 'TRUCK001',
        driverId: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const createdWashRecord = {
        id: 1,
        truckId: 1,
        washerId: parseInt(mockWasherSession.user.id),
        washType: WashType.basic,
        price: new Decimal(100.00),
        washDate: new Date(),
        notes: 'Test wash',
        createdAt: new Date(),
        updatedAt: new Date(),
        truck: {
          id: 1,
          licensePlate: 'TRUCK001',
          driverId: 1
        },
        washer: {
          id: parseInt(mockWasherSession.user.id),
          email: 'washer@example.com',
          fullName: 'Test Washer',
          role: 'washer'
        },
        images: [
          { id: 1, imageType: ImageType.before, imageKey: 'before-image-key' },
          { id: 2, imageType: ImageType.after, imageKey: 'after-image-key' }
        ]
      };

      mockContext.prisma.washRecord.create.mockResolvedValue(createdWashRecord);

      const response = await POST(
        new NextRequest(new URL('http://localhost:3000/api/washes'), {
          method: 'POST',
          body: JSON.stringify(newWashData),
        })
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('washRecord');
      expect(data.washRecord).toMatchObject({
        id: 1,
        truckId: 1,
        washerId: 1,
        washType: 'basic',
        notes: 'Test wash',
        truck: {
          id: 1,
          licensePlate: 'TRUCK001',
          driverId: 1
        },
        washer: {
          id: 1,
          email: 'washer@example.com',
          fullName: 'Test Washer',
          role: 'washer'
        },
        images: [
          { id: 1, imageType: 'before', imageKey: 'before-image-key' },
          { id: 2, imageType: 'after', imageKey: 'after-image-key' }
        ]
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockGetServerSession.mockResolvedValue(mockWasherSession);

      const invalidWashData = {
        licensePlate: 'TRUCK001'
        // missing required fields
      };

      const response = await POST(
        new NextRequest(new URL('http://localhost:3000/api/washes'), {
          method: 'POST',
          body: JSON.stringify(invalidWashData),
        })
      );

      expect(response.status).toBe(400);
    });

    it('should return 401 when not authenticated as washer', async () => {
      mockGetServerSession.mockResolvedValue(mockDriverSession);

      const newWashData = {
        licensePlate: 'TRUCK001',
        driverId: '1',
        washType: 'basic',
        price: 100.00,
        notes: 'Test wash',
        beforeImage: 'before-image-key',
        afterImage: 'after-image-key'
      };

      const response = await POST(
        new NextRequest(new URL('http://localhost:3000/api/washes'), {
          method: 'POST',
          body: JSON.stringify(newWashData),
        })
      );

      expect(response.status).toBe(401);
    });
  });
});
