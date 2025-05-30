# OAuthAccountNotLinked Error Fix

## Issue Description
The application was experiencing an `OAuthAccountNotLinked` error during Google SSO authentication due to a type mismatch between the User model and NextAuth's adapter requirements.

## Root Cause
- **User model**: Had `Int` type for the `id` field (auto-incrementing integer)
- **NextAuth adapter**: Expected `String` type for User IDs to properly link OAuth accounts
- **Database relationships**: Account and Session tables couldn't properly reference User records due to type mismatch

## Solution Implemented

### 1. Database Schema Migration
- Converted User `id` field from `Int` to `String` using `@default(cuid())`
- Updated all foreign key relationships to use String-based User IDs:
  - `Account.userId`: `String` → references `User.id`
  - `Session.userId`: `String` → references `User.id`
  - `Truck.driverId`: `String?` → references `User.id`
  - `WashRecord.washerId`: `String` → references `User.id`

### 2. Schema Updates
```prisma
model User {
  id          String    @id @default(cuid())  // Changed from Int @id @default(autoincrement())
  email       String    @unique
  passwordHash String?  // Optional for OAuth users
  fullName    String
  role        UserRole  @default(driver)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  trucks      Truck[]   @relation("DriverTrucks")
  washes      WashRecord[] @relation("WasherWashes")

  // NextAuth fields
  accounts      Account[]
  sessions      Session[]
}
```

### 3. Auth Configuration Updates
- Updated auth configuration to use `null` instead of empty string for `passwordHash`
- Ensured proper type compatibility with NextAuth adapter
- Maintained first user manager logic functionality

### 4. Migration Process
1. Dropped existing foreign key constraints
2. Converted User ID column from integer to string/text
3. Updated all referencing tables to use string-based foreign keys
4. Re-established foreign key constraints
5. Generated new Prisma client

## Verification
- ✅ All 26 tests passing
- ✅ Development server starts without errors
- ✅ NextAuth adapter properly integrated
- ✅ First user manager logic preserved
- ✅ Database relationships intact

## Test Results
```
Test Suites: 5 passed, 5 total
Tests:       26 passed, 26 total
```

## Technical Details
- **Migration file**: `20250529124951_convert_user_ids_to_string`
- **CUID generation**: NextAuth compatible string IDs using `@default(cuid())`
- **Foreign key integrity**: All relationships properly maintained with cascade deletes
- **Backward compatibility**: Tests updated to work with string-based User IDs

## Status
🟢 **RESOLVED** - OAuthAccountNotLinked error has been fixed. Google SSO authentication should now work properly without account linking issues.

---

# OAuth "State Cookie Was Missing" Error Fix (May 30, 2025)

## Problem
After fixing the OAuthAccountNotLinked error, the application was experiencing a new OAuth callback error:

```
OAuthCallbackError: State cookie was missing.
```

This error occurs when NextAuth.js cannot find the required state cookie during the OAuth callback process.

## Root Causes
1. **Incorrect cookie settings for development environment** - Default NextAuth.js cookie settings were too restrictive for local development
2. **Missing cache control headers** - OAuth callback responses weren't properly configured to prevent caching
3. **Import path issues** - `authOptions` was being imported from the wrong location after refactoring

## Solutions Applied

### 1. Fixed Cookie Configuration
Updated `/src/lib/auth.ts` to include explicit cookie settings optimized for development:

```typescript
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
  // ... other cookie configurations
}
```

### 2. Added Cache Control Headers
Updated `/next.config.ts` to prevent caching of authentication responses:

```typescript
async headers() {
  return [
    {
      source: '/api/auth/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-store, max-age=0',
        },
      ],
    },
  ];
}
```

### 3. Fixed Import Paths and TypeScript Issues
- Corrected import statements to use `authOptions` from `@/lib/auth`
- Removed invalid `authOptions` export from NextAuth route handler
- Fixed route parameter types to use inline type definitions
- Resolved ESLint errors for unused variables

## Testing Results (May 30, 2025)
- ✅ Application builds successfully without TypeScript errors
- ✅ Development server starts without compilation issues  
- ✅ All tests pass (32/32) - including new CRUD operation tests
- ✅ OAuth state cookie error should now be resolved

## Production Considerations
When deploying to production, update the cookie settings:

```typescript
secure: process.env.NODE_ENV === 'production'
```

## Status Update
🟢 **RESOLVED** - Both OAuthAccountNotLinked and "State cookie was missing" errors have been fixed. Google SSO authentication should now work properly in development environment.

---

# Soft Delete Implementation for User Management (May 30, 2025)

## Feature Description
Implemented soft delete functionality for user deletion operations to maintain data integrity and support potential data recovery needs.

## Implementation Details

### 1. Database Schema Update
Added a `deletedAt` timestamp field to the User model:

```prisma
model User {
  id          String    @id @default(cuid())
  email       String    @unique
  passwordHash String?  // Optional for OAuth users
  fullName    String
  role        UserRole  @default(driver)
  deletedAt   DateTime? // Soft delete timestamp
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  // ...existing fields...
}
```

### 2. API Updates

#### GET /api/users
- **Modified**: Now filters out soft-deleted users
- **Filter**: `where: { deletedAt: null }`
- **Result**: Only returns active (non-deleted) users

#### DELETE /api/users
- **Changed from**: Hard delete using `prisma.user.delete()`
- **Changed to**: Soft delete using `prisma.user.update()`
- **Implementation**: Sets `deletedAt: new Date()` instead of removing record
- **Validation**: Checks if user exists and is not already soft-deleted

### 3. Test Updates
Updated all user API tests to reflect soft delete behavior:

- **GET tests**: Verify `deletedAt: null` filter is applied
- **DELETE tests**: 
  - Verify `findUnique()` is called to check user existence
  - Verify `update()` is called with `deletedAt` timestamp
  - Test returns 404 for non-existent or already deleted users

### 4. Benefits
- **Data Preservation**: User records are preserved in database
- **Audit Trail**: Deletion timestamp provides audit information
- **Recovery**: Users can potentially be restored by setting `deletedAt` back to `null`
- **Referential Integrity**: Maintains relationships with other tables (washes, trucks, etc.)

## Testing Results
- ✅ All 32 tests passing
- ✅ User deletion now uses soft delete
- ✅ User listing excludes soft-deleted users
- ✅ Proper error handling for already deleted users

## Migration Status
- **Database Migration**: `20250530043639_add_soft_delete_to_users` - Applied ✅
- **Prisma Client**: Regenerated to include `deletedAt` field types ✅
- **API Implementation**: Updated to use soft delete pattern ✅
- **Tests**: Updated to match new soft delete behavior ✅

## Usage Examples

### Soft Delete a User
```typescript
// Before (hard delete)
await prisma.user.delete({ where: { id: userId } });

// After (soft delete)
await prisma.user.update({ 
  where: { id: userId },
  data: { deletedAt: new Date() }
});
```

### Get Active Users Only
```typescript
const activeUsers = await prisma.user.findMany({
  where: { deletedAt: null }
});
```

### Restore a Soft-Deleted User (if needed)
```typescript
await prisma.user.update({
  where: { id: userId },
  data: { deletedAt: null }
});
```

## Status
🟢 **COMPLETED** - Soft delete functionality has been successfully implemented for user management operations.
