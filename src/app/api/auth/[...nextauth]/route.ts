import NextAuth, { NextAuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { compare } from 'bcryptjs';
import prisma from '@/lib/prisma';

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    }
  }
  
  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
  }
}

export const authOptions: NextAuthOptions = {
  debug: true, // Enable debug messages
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Missing credentials');
          }
          
          const user = await prisma.user.findUnique({ where: { email: credentials.email } });
          if (!user) {
            throw new Error('User not found');
          }
          
          const isValid = await compare(credentials.password, user.passwordHash);
          if (!isValid) {
            throw new Error('Invalid password');
          }
          
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.fullName,
            role: user.role,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          token.role = user.role;
        }
        return token;
      },
      async session({ session, token }) {
        if (token) {
          (session.user as any).id = token.id;
          (session.user as any).role = token.role;
        }
        return session;
      },
      async redirect({ url, baseUrl }) {
        // Redirect to home page after login, middleware will handle the rest
        if (url.includes('/login')) {
          return baseUrl;
        }
        return url;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
