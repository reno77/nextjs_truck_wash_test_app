import { createMockContext, mockContext, mockWasherSession } from '../helpers/testUtils';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/upload/route';
import { getServerSession } from 'next-auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

jest.mock('next-auth');
jest.mock('@aws-sdk/client-s3');
jest.mock('@/lib/s3');

describe('Upload API', () => {
  const mockGetServerSession = getServerSession as jest.Mock;
  const mockS3Client = S3Client as jest.MockedClass<typeof S3Client>;
  let mockS3Send: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockWasherSession);
    
    // Reset the mock S3 send method
    mockS3Send = jest.fn();
    mockS3Client.prototype.send = mockS3Send;
  });

  describe('POST /api/upload', () => {
    it('should generate presigned URLs successfully', async () => {
      const uploadData = {
        fileType: 'image/jpeg',
        imageType: 'before',
        fileSize: 1024 * 1024 // 1MB
      };

      mockS3Send.mockResolvedValue({ 
        uploadUrl: 'https://mock-presigned-url.com',
        key: 'mock-s3-key',
        viewUrl: 'https://mock-view-url.com'
      });

      const response = await POST(
        new NextRequest(new URL('http://localhost:3000/api/upload'), {
          method: 'POST',
          body: JSON.stringify(uploadData),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('uploadUrl');
      expect(data).toHaveProperty('key');
      expect(data).toHaveProperty('viewUrl');
    });

    it('should return 400 for invalid file type', async () => {
      const invalidData = {
        fileType: 'text/plain',
        imageType: 'before',
        fileSize: 1024
      };

      const response = await POST(
        new NextRequest(new URL('http://localhost:3000/api/upload'), {
          method: 'POST',
          body: JSON.stringify(invalidData),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(400);
    });

    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const uploadData = {
        fileType: 'image/jpeg',
        imageType: 'before',
        fileSize: 1024 * 1024
      };

      const response = await POST(
        new NextRequest(new URL('http://localhost:3000/api/upload'), {
          method: 'POST',
          body: JSON.stringify(uploadData),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(401);
    });

    it('should handle S3 errors gracefully', async () => {
      const uploadData = {
        fileType: 'image/jpeg',
        imageType: 'before',
        fileSize: 1024 * 1024
      };

      // Mock getSignedUrl to throw an error
      const mockGetSignedUrl = require('@aws-sdk/s3-request-presigner').getSignedUrl;
      mockGetSignedUrl.mockRejectedValue(new Error('S3 Error'));

      const response = await POST(
        new NextRequest(new URL('http://localhost:3000/api/upload'), {
          method: 'POST',
          body: JSON.stringify(uploadData),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(500);
      
      // Reset the mock
      mockGetSignedUrl.mockImplementation((client, command) => {
        const type = command?.constructor?.name || 'Command';
        const bucket = command?.input?.Bucket || command?.Bucket || 'test-bucket';
        const key = command?.input?.Key || command?.Key || 'test-key';
        return Promise.resolve(`https://mock-s3-url.com/${bucket}/${type}/${key}`);
      });
    });
  });
});
