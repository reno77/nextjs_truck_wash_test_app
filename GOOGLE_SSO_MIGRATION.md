# Google SSO Migration Guide

## Overview
The truck wash application has been successfully updated to use Google SSO instead of manual user creation. The first user to sign in will automatically be assigned the "manager" role, and all subsequent users will be assigned the "driver" role. Managers can change user roles as needed.

## Changes Made

### 1. NextAuth Configuration (`/src/lib/auth.ts`)
- **Replaced** CredentialsProvider with GoogleProvider
- **Added** PrismaAdapter for database integration
- **Updated** signIn callback to auto-create users with role assignment:
  - **First user** gets "manager" role (when user count = 0)
  - **Subsequent users** get "driver" role (when user count > 0)
- **Enhanced** JWT and session callbacks to manage user roles

### 2. Database Schema (`/prisma/schema.prisma`)
- **Added** NextAuth required models: Account, Session, VerificationToken
- **Made** passwordHash optional for OAuth users
- **Set** intelligent role assignment for new users based on existing user count
- **Added** relationships for NextAuth adapter

### 3. Login Page (`/src/app/login/page.tsx`)
- **Completely rewritten** to use Google Sign In button
- **Removed** email/password form
- **Added** Google branding and styling
- **Included** user messaging about auto-registration

### 4. User Management (`/src/app/manager/users/page.tsx`)
- **Removed** "Create User" button and functionality
- **Added** informational message about auto-registration
- **Enhanced** role display with color-coded badges

### 5. API Changes
- **Removed** POST endpoint from `/src/app/api/users/route.ts`
- **Deleted** user creation components (`/src/app/manager/users/create/`)
- **Updated** tests to work with Google SSO and first user manager logic

## User Role Assignment Logic

### First User (Manager)
- When the database has **zero users**, the first person to sign in with Google will be assigned the **"manager"** role
- This ensures there's always at least one manager to manage the system

### Subsequent Users (Drivers)
- When the database has **one or more users**, new users signing in with Google will be assigned the **"driver"** role
- Managers can later change user roles through the user management interface

## Required Setup

### 1. Google OAuth Configuration
You need to set up Google OAuth credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure the consent screen
6. Add authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
7. Copy the Client ID and Client Secret

### 2. Environment Variables (`.env`)
Update your `.env` file with:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Database
DATABASE_URL="file:./dev.db"
```

### 3. Database Migration
The Prisma schema has been updated. Run:

```bash
npm install
npx prisma generate
npx prisma migrate dev --name add-nextauth-tables
```

## User Flow

### New User Registration
1. User clicks "Sign in with Google" on login page
2. Google OAuth flow authenticates the user
3. NextAuth signIn callback checks if user exists in database
4. If new user, automatically creates account with:
   - Email from Google profile
   - Full name from Google profile
   - **Smart role assignment**:
     - First user (when database is empty): **"manager"** role
     - Subsequent users: **"driver"** role
5. User is redirected to their role-specific dashboard

### Role Management
1. The first user automatically becomes a manager
2. Managers can view all users in the user management page
3. Managers can change user roles using the existing edit functionality
4. Role changes take effect on the user's next login session refresh

## Security Features
- **OAuth Security**: No password storage, leverages Google's security
- **Role-based Access**: Maintains existing role-based authorization
- **Auto-cleanup**: Only Google provider is allowed
- **Database Integration**: Full integration with existing user system
- **Bootstrap Manager**: First user automatically gets manager privileges

## Testing
All tests have been updated:
- ✅ Auth tests now use Google SSO mocks with first user manager logic
- ✅ Users API tests work without POST endpoint
- ✅ Existing functionality preserved
- ✅ Smart role assignment tested for first and subsequent users

## Deployment Notes
- Ensure Google OAuth redirect URIs include your production domain
- Update NEXTAUTH_URL for production environment
- Generate a secure NEXTAUTH_SECRET for production
- Database migrations will run automatically on deployment

## Backwards Compatibility
- Existing users with passwords can still be managed (role changes, etc.)
- No data loss occurs during migration
- All existing wash records and relationships are preserved
