import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from '@/lib/prisma';

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      idToken?: string; // Add id_token for federated logout
    }
  }
  
  interface User {
    idToken?: string; // Add id_token to User type
  }
}

// Create a custom adapter that properly handles the fullName field
function CustomPrismaAdapter(prisma: any) {
  const adapter = PrismaAdapter(prisma);
  
  return {
    ...adapter,
    createUser: async (data: any) => {
      // Get user count to determine role for first user
      const userCount = await prisma.user.count();
      const role = userCount === 0 ? 'manager' : 'driver';
      
      // Create user with proper field mapping
      return await prisma.user.create({
        data: {
          email: data.email,
          fullName: data.name || data.email.split('@')[0] || 'Unknown User',
          role: role,
          passwordHash: null, // No password for OAuth users
        }
      });
    }
  };
}

export const authOptions: NextAuthOptions = {
  adapter: CustomPrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile, tokens) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          idToken: tokens.id_token, // Store the id_token for federated logout
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      // Allow all Google sign-ins - let NextAuth handle user creation
      if (account?.provider === 'google') {
        return true;
      }
      return false;
    },
    async jwt({ token, user, account }) {
      if (account && user) {
        // Fetch the user from database to get the role
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! }
        });
        
        if (dbUser) {
          token.id = String(dbUser.id); // Ensure it's treated as string
          token.role = dbUser.role;
        }
        
        // Store the id_token from Google for federated logout
        if (user.idToken) {
          token.idToken = user.idToken;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        // Fetch fresh user data from database
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email }
        });
        
        if (dbUser) {
          session.user.id = String(dbUser.id); // Ensure it's treated as string
          session.user.role = dbUser.role;
        }
        
        // Include the id_token in the session for federated logout
        if (token.idToken) {
          session.user.idToken = token.idToken as string;
        }
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false, // Set to false for development
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: false, // Set to false for development
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false, // Set to false for development
      }
    },
    pkceCodeVerifier: {
      name: `next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false, // Set to false for development
        maxAge: 900, // 15 minutes
      }
    },
    state: {
      name: `next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false, // Set to false for development
        maxAge: 900, // 15 minutes
      }
    },
    nonce: {
      name: `next-auth.nonce`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false, // Set to false for development
      }
    }
  },
};
