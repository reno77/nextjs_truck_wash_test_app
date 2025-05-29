import { createMockContext, mockContext } from '../helpers/testUtils';
import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';
import { UserRole } from '@prisma/client';

const mockGoogleProvider = {
  id: 'google',
  name: 'Google',
  type: 'oauth',
  clientId: 'mock-google-client-id',
  clientSecret: 'mock-google-client-secret'
};

const mockCallbacks = {
  signIn: jest.fn(async ({ user, account }) => {
    if (account?.provider === 'google') {
      try {
        // Check if user already exists
        const existingUser = await mockContext.prisma.user.findUnique({
          where: { email: user.email! }
        });

        if (!existingUser) {
          // Check if there are any users in the database
          const userCount = await mockContext.prisma.user.count();
          
          // First user gets 'manager' role, subsequent users get 'driver' role
          const role = userCount === 0 ? 'manager' : 'driver';
          
          await mockContext.prisma.user.create({
            data: {
              email: user.email!,
              fullName: user.name || '',
              role: role,
              passwordHash: '', // No password for OAuth users
            }
          });
        }
        return true;
      } catch (error) {
        console.error('Error creating user:', error);
        return false;
      }
    }
    return false;
  }),
  jwt: jest.fn(async ({ token, user, trigger }) => {
    if (user) {
      token.role = user.role;
    } else if (trigger === 'update') {
      // Refresh user role from database
      const dbUser = await mockContext.prisma.user.findUnique({
        where: { id: token.sub! }
      });
      if (dbUser) {
        token.role = dbUser.role;
      }
    }
    return token;
  }),
  session: jest.fn(async ({ session, token }: { session: Session; token: JWT & { role?: UserRole } }) => {
    if (session.user) {
      session.user.id = token.sub!;
      session.user.role = token.role ?? 'driver';
    }
    return session;
  })
};

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {
    providers: [mockGoogleProvider],
    callbacks: mockCallbacks,
    adapter: {} // Mock adapter
  }
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockContext.prisma,
}));

describe('NextAuth Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Google Provider', () => {
    it('should allow Google sign in', async () => {
      const mockAccount = {
        provider: 'google',
        type: 'oauth',
        providerAccountId: '12345'
      };

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      };

      // Mock existing user
      mockContext.prisma.user.findUnique.mockResolvedValue({
        id: "1",
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'driver',
        passwordHash: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await mockCallbacks.signIn({
        user: mockUser,
        account: mockAccount,
        profile: {}
      });

      expect(result).toBe(true);
    });

    it('should create first user with manager role', async () => {
      const mockAccount = {
        provider: 'google',
        type: 'oauth',
        providerAccountId: '12345'
      };

      const mockUser = {
        id: '1',
        email: 'first@example.com',
        name: 'First User'
      };

      // Mock no existing user
      mockContext.prisma.user.findUnique.mockResolvedValue(null);
      // Mock no users in database (first user)
      mockContext.prisma.user.count.mockResolvedValue(0);
      mockContext.prisma.user.create.mockResolvedValue({
        id: "1",
        email: 'first@example.com',
        fullName: 'First User',
        role: 'manager',
        passwordHash: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await mockCallbacks.signIn({
        user: mockUser,
        account: mockAccount,
        profile: {}
      });

      expect(result).toBe(true);
      expect(mockContext.prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'first@example.com',
          fullName: 'First User',
          role: 'manager',
          passwordHash: '',
        }
      });
    });

    it('should create subsequent users with driver role', async () => {
      const mockAccount = {
        provider: 'google',
        type: 'oauth',
        providerAccountId: '67890'
      };

      const mockUser = {
        id: '2',
        email: 'second@example.com',
        name: 'Second User'
      };

      // Mock no existing user
      mockContext.prisma.user.findUnique.mockResolvedValue(null);
      // Mock existing users in database (not first user)
      mockContext.prisma.user.count.mockResolvedValue(1);
      mockContext.prisma.user.create.mockResolvedValue({
        id: "2",
        email: 'second@example.com',
        fullName: 'Second User',
        role: 'driver',
        passwordHash: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await mockCallbacks.signIn({
        user: mockUser,
        account: mockAccount,
        profile: {}
      });

      expect(result).toBe(true);
      expect(mockContext.prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'second@example.com',
          fullName: 'Second User',
          role: 'driver',
          passwordHash: '',
        }
      });
    });

    it('should reject non-Google providers', async () => {
      const mockAccount = {
        provider: 'github',
        type: 'oauth',
        providerAccountId: '12345'
      };

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      };

      const result = await mockCallbacks.signIn({
        user: mockUser,
        account: mockAccount,
        profile: {}
      });

      expect(result).toBe(false);
    });
  });

  describe('Callbacks', () => {
    it('should include role in JWT token from user', async () => {
      const mockToken: JWT = {
        sub: '1',
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        fullName: 'Test User',
        role: UserRole.washer,
      };

      const result = await mockCallbacks.jwt({ 
        token: mockToken, 
        user: mockUser,
        trigger: 'signIn',
      } as any);

      expect(result).toEqual(expect.objectContaining({
        role: UserRole.washer,
      }));
    });

    it('should refresh role from database on update', async () => {
      const mockToken: JWT = {
        sub: '1',
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockDbUser = {
        id: "1",
        email: 'test@example.com',
        fullName: 'Test User',
        role: UserRole.manager,
        passwordHash: 'hashedpassword123', // Required field
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockContext.prisma.user.findUnique.mockResolvedValue(mockDbUser);

      const result = await mockCallbacks.jwt({ 
        token: mockToken, 
        user: undefined,
        trigger: 'update',
      } as any);

      expect(result).toEqual(expect.objectContaining({
        role: UserRole.manager,
      }));
    });

    it('should include role in session with default driver role', async () => {
      const mockToken: JWT & { role?: UserRole } = {
        sub: '1',
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockSession: Session = {
        user: {
          id: mockToken.sub!,
          email: mockToken.email!,
          name: mockToken.name!,
          role: 'driver', // Add default role
        },
        expires: new Date().toISOString(),
      };

      const result = await mockCallbacks.session({
        session: mockSession,
        token: mockToken,
      });

      expect(result.user).toEqual(expect.objectContaining({
        id: mockToken.sub,
        email: mockToken.email,
        role: 'driver', // Default role when none specified
      }));
    });

    it('should include specified role in session', async () => {
      const mockToken: JWT & { role?: UserRole } = {
        sub: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.washer,
      };

      const mockSession: Session = {
        user: {
          id: mockToken.sub!,
          email: mockToken.email!,
          name: mockToken.name!,
          role: 'driver', // This will be overridden by the callback
        },
        expires: new Date().toISOString(),
      };

      const result = await mockCallbacks.session({
        session: mockSession,
        token: mockToken,
      });

      expect(result.user).toEqual(expect.objectContaining({
        id: mockToken.sub,
        email: mockToken.email,
        role: UserRole.washer,
      }));
    });
  });
});
