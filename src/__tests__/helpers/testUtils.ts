import { PrismaClient, Prisma, WashRecord } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { DefaultArgs } from '@prisma/client/runtime/library';

export type Context = {
  prisma: PrismaClient;
};

export type MockContext = {
  prisma: DeepMockProxy<PrismaClient>;
};

export const createMockContext = (): MockContext => {
  return {
    prisma: mockDeep<PrismaClient>(),
  };
};

export const mockContext = createMockContext();

// Mock session data for different roles
export const mockAuthSession = (role: string) => ({
  expires: new Date(Date.now() + 2 * 86400).toISOString(),
  user: { 
    id: "1", 
    name: "Test User", 
    email: "test@example.com", 
    role: role
  }
});

export const mockManagerSession = mockAuthSession('manager');
export const mockWasherSession = mockAuthSession('washer');
export const mockDriverSession = mockAuthSession('driver');

// Helper functions for test request creation
export const createMockRequest = (data: any) => ({
  json: () => Promise.resolve(data),
  formData: () => Promise.resolve(new FormData()),
  headers: new Headers(),
  method: 'POST'
});

export const mockSuccessResponse = {
  status: 200,
  json: () => Promise.resolve({ success: true })
};

export const mockUnauthorizedResponse = {
  status: 401,
  json: () => Promise.resolve({ error: 'Unauthorized' })
};

export const mockBadRequestResponse = {
  status: 400,
  json: () => Promise.resolve({ error: 'Bad Request' })
};

export const mockNotFoundResponse = {
  status: 404,
  json: () => Promise.resolve({ error: 'Not Found' })
};

// S3 Mock Helpers
export const mockS3Success = {
  $metadata: { httpStatusCode: 200 },
  ETag: 'mock-etag'
};

export const mockS3Error = new Error('S3 Error');

// Mock user data
export const mockUserData = {
  manager: {
    id: '1',
    email: 'manager@example.com',
    name: 'Test Manager',
    role: 'MANAGER',
  },
  washer: {
    id: '2',
    email: 'washer@example.com',
    name: 'Test Washer',
    role: 'WASHER',
  },
  driver: {
    id: '3',
    email: 'driver@example.com',
    name: 'Test Driver',
    role: 'DRIVER',
  }
};
