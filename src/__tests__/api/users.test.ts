import { createMockContext, mockContext, mockManagerSession } from '../helpers/testUtils';
import { createJsonRequest } from '../helpers/next-test-utils';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';

// Import route handlers
const routeModule = jest.requireActual('@/app/api/users/route');
const { GET, POST, PUT, DELETE } = routeModule as any;

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
          id: 1,
          email: 'user1@example.com',
          passwordHash: 'hashedpassword1',
          fullName: 'User 1',
          role: UserRole.washer,
          createdAt: new Date('2025-05-29T01:59:54.529Z'),
          updatedAt: new Date('2025-05-29T01:59:54.529Z'),
        },
        {
          id: 2,
          email: 'user2@example.com',
          passwordHash: 'hashedpassword2',
          fullName: 'User 2',
          role: UserRole.driver,
          createdAt: new Date('2025-05-29T01:59:54.529Z'),
          updatedAt: new Date('2025-05-29T01:59:54.529Z'),
        },
      ];

      mockContext.prisma.user.findMany.mockResolvedValue(mockUsers);

      const response = await GET(new NextRequest(new URL('http://localhost:3000/api/users')));
      const data = await response.json();

      expect(response.status).toBe(200);
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

  describe('POST /api/users', () => {
    it('should create a new user when authenticated as manager', async () => {
      mockGetServerSession.mockResolvedValue(mockManagerSession);
      
      const newUser = {
        email: 'newuser@example.com',
        fullName: 'New User',
        role: 'washer',
        password: 'password123'
      };

      mockContext.prisma.user.create.mockResolvedValue({
        id: 3,
        email: newUser.email,
        passwordHash: 'hashedpassword123',
        fullName: newUser.fullName,
        role: UserRole.washer,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await POST(
        new NextRequest(new URL('http://localhost:3000/api/users'), {
          method: 'POST',
          body: JSON.stringify(newUser),
        })
      );

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        user: {
          id: 3,
          email: newUser.email,
          fullName: newUser.fullName,
          role: UserRole.washer,
        }
      });
    });

    it('should return 400 for invalid user data', async () => {
      mockGetServerSession.mockResolvedValue(mockManagerSession);
      
      const invalidUser = {
        fullName: 'Invalid User',
        // missing email, role, and password
      };

      const response = await POST(
        new NextRequest(new URL('http://localhost:3000/api/users'), {
          method: 'POST',
          body: JSON.stringify(invalidUser),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/users', () => {
    it('should update an existing user when authenticated as manager', async () => {
      mockGetServerSession.mockResolvedValue(mockManagerSession);
      
      const updatedUser = {
        id: 1,
        email: 'updated@example.com',
        passwordHash: 'somehash',
        fullName: 'Updated User',
        role: UserRole.washer,
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
    it('should delete a user when authenticated as manager', async () => {
      mockGetServerSession.mockResolvedValue(mockManagerSession);
      
      const userId = '1';
      mockContext.prisma.user.delete.mockResolvedValue({
        id: Number(userId),
        email: 'deleted@example.com',
        passwordHash: '',
        fullName: 'Deleted User',
        role: UserRole.washer,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await DELETE(
        new NextRequest(new URL(`http://localhost:3000/api/users?id=${userId}`))
      );

      expect(response.status).toBe(200);
    });

    it('should return 404 when user not found', async () => {
      mockGetServerSession.mockResolvedValue(mockManagerSession);
      
      const userId = 'nonexistent';
      // Mock Prisma's P2025 error for record not found
      const prismaError = new Error('User not found');
      (prismaError as any).code = 'P2025';
      mockContext.prisma.user.delete.mockRejectedValue(prismaError);

      const response = await DELETE(
        new NextRequest(new URL(`http://localhost:3000/api/users?id=${userId}`))
      );

      expect(response.status).toBe(404);
    });
  });
});
