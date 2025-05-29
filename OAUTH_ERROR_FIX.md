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
