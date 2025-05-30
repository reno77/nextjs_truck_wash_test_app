import { createMockContext, mockContext, mockManagerSession } from '../helpers/testUtils';
import { createJsonRequest } from '../helpers/next-test-utils';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';

// Import route handlers
const routeModule = jest.requireActual('@/app/api/users/route');
const { GET, PUT, DELETE } = routeModule as any;

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

describe('Users API', () => {
  const mockGetServerSession = getServerSession as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(null);
  });

  describe('GET /api/users', () => {
    it('should return all users when authenticated as manager', async () => {
      mockGetServerSession.mockResolvedValue(mockManagerSession);
      
      const mockUsers = [
        {
          id: '1',
          email: 'user1@example.com',
          passwordHash: 'hashedpassword1',
          fullName: 'User 1',
          role: UserRole.washer,
          deletedAt: null,
          createdAt: new Date('2025-05-29T01:59:54.529Z'),
          updatedAt: new Date('2025-05-29T01:59:54.529Z'),
        },
        {
          id: '2',
          email: 'user2@example.com',
          passwordHash: 'hashedpassword2',
          fullName: 'User 2',
          role: UserRole.driver,
          deletedAt: null,
          createdAt: new Date('2025-05-29T01:59:54.529Z'),
          updatedAt: new Date('2025-05-29T01:59:54.529Z'),
        },
      ];

      mockContext.prisma.user.findMany.mockResolvedValue(mockUsers);

      const response = await GET(new NextRequest(new URL('http://localhost:3000/api/users')));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockContext.prisma.user.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null }
      });
      expect(data).toMatchObject(mockUsers.map(user => ({
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        fullName: user.fullName,
        role: user.role,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })));
    });

    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const response = await GET(new NextRequest(new URL('http://localhost:3000/api/users')));
      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/users', () => {
    it('should update an existing user when authenticated as manager', async () => {
      mockGetServerSession.mockResolvedValue(mockManagerSession);
      
      const updatedUser = {
        id: '1',
        email: 'updated@example.com',
        passwordHash: 'somehash',
        fullName: 'Updated User',
        role: UserRole.washer,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockContext.prisma.user.update.mockResolvedValue(updatedUser);

      const response = await PUT(
        new NextRequest(new URL('http://localhost:3000/api/users?id=1'), {
          method: 'PUT',
          body: JSON.stringify({
            fullName: 'Updated User',
            email: 'updated@example.com',
            role: 'washer',
          }),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
      });
    });
  });

  describe('DELETE /api/users', () => {
    it('should soft delete a user when authenticated as manager', async () => {
      mockGetServerSession.mockResolvedValue(mockManagerSession);
      
      const userId = '1';
      const existingUser = {
        id: userId,
        email: 'user@example.com',
        passwordHash: 'hashedpassword',
        fullName: 'Test User',
        role: UserRole.washer,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const softDeletedUser = {
        ...existingUser,
        deletedAt: new Date(),
      };

      mockContext.prisma.user.findUnique.mockResolvedValue(existingUser);
      mockContext.prisma.user.update.mockResolvedValue(softDeletedUser);

      const response = await DELETE(
        new NextRequest(new URL(`http://localhost:3000/api/users?id=${userId}`))
      );

      expect(response.status).toBe(200);
      expect(mockContext.prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId }
      });
      expect(mockContext.prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { deletedAt: expect.any(Date) }
      });
    });

    it('should return 404 when user not found or already soft deleted', async () => {
      mockGetServerSession.mockResolvedValue(mockManagerSession);
      
      const userId = 'nonexistent';
      mockContext.prisma.user.findUnique.mockResolvedValue(null);

      const response = await DELETE(
        new NextRequest(new URL(`http://localhost:3000/api/users?id=${userId}`))
      );

      expect(response.status).toBe(404);
      expect(mockContext.prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId }
      });
    });
  });
});
