import { createMockContext, mockContext, mockManagerSession } from '../helpers/testUtils';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/cleanup/route';
import { getServerSession } from 'next-auth';
import { S3Client, DeleteObjectsCommand, ListObjectsV2Command, ListObjectsV2Output } from '@aws-sdk/client-s3';

jest.mock('next-auth');
jest.mock('@aws-sdk/client-s3');
jest.mock('@/lib/prisma', () => ({
  prisma: mockContext.prisma,
}));

describe('Cleanup API', () => {
  const mockGetServerSession = getServerSession as jest.Mock;
  const mockS3Client = S3Client as jest.MockedClass<typeof S3Client>;
  let mockS3Send: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockManagerSession);
    
    // Reset the mock S3 send method
    mockS3Send = jest.fn();
    mockS3Client.prototype.send = mockS3Send;
    
    // Ensure the S3Client mock returns our mockS3Send function
    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockS3Send
    }));
  });

  describe('POST /api/cleanup', () => {
    it('should clean up unused S3 images when authenticated as manager', async () => {
      // Mock database washes with image keys
      const usedImageKeys = ['used-image-1.jpg', 'used-image-2.jpg'];
      mockContext.prisma.washImage.findMany.mockResolvedValue([
        { id: 1, washRecordId: 1, imageKey: usedImageKeys[0], imageType: 'before', createdAt: new Date() },
        { id: 2, washRecordId: 1, imageKey: usedImageKeys[1], imageType: 'after', createdAt: new Date() },
      ]);

      // Mock S3 objects with LastModified dates
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // Older than 30 days
      
      const allS3Objects = [
        { Key: 'used-image-1.jpg', LastModified: oldDate },
        { Key: 'used-image-2.jpg', LastModified: oldDate },
        { Key: 'unused-image-1.jpg', LastModified: oldDate },
        { Key: 'unused-image-2.jpg', LastModified: oldDate },
      ];

      mockS3Send.mockImplementation((command) => {
        if (command instanceof ListObjectsV2Command) {
          return Promise.resolve({ Contents: allS3Objects } as ListObjectsV2Output);
        }
        if (command instanceof DeleteObjectsCommand) {
          return Promise.resolve({ Deleted: allS3Objects.map(obj => ({ Key: obj.Key })) });
        }
        return Promise.reject(new Error('Unknown command'));
      });

      const response = await POST(
        new NextRequest(new URL('http://localhost:3000/api/cleanup'), {
          method: 'POST',
          body: JSON.stringify({ daysOld: 30 }),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Successfully initiated cleanup of images older than 30 days');
      expect(mockS3Send).toHaveBeenCalledWith(
        expect.any(DeleteObjectsCommand)
      );
    });

    it('should return 401 when not authenticated as manager', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const response = await POST(
        new NextRequest(new URL('http://localhost:3000/api/cleanup'), {
          method: 'POST',
          body: JSON.stringify({ daysOld: 30 }),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(401);
    });

    it('should handle S3 errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockManagerSession);
      mockContext.prisma.washImage.findMany.mockResolvedValue([]);
      mockS3Send.mockImplementation((command) => {
        if (command instanceof ListObjectsV2Command) {
          return Promise.reject(new Error('S3 Error'));
        }
        return Promise.reject(new Error('Unknown command'));
      });

      const response = await POST(
        new NextRequest(new URL('http://localhost:3000/api/cleanup'), {
          method: 'POST',
          body: JSON.stringify({ daysOld: 30 }),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(500);
    });
  });
});
