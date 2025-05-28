-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('manager', 'driver', 'washer');

-- CreateEnum
CREATE TYPE "WashType" AS ENUM ('basic', 'premium', 'deluxe');

-- CreateEnum
CREATE TYPE "ImageType" AS ENUM ('before', 'after');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Truck" (
    "id" SERIAL NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "driverId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Truck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WashRecord" (
    "id" SERIAL NOT NULL,
    "truckId" INTEGER NOT NULL,
    "washerId" INTEGER NOT NULL,
    "washType" "WashType" NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "washDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WashRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WashImage" (
    "id" SERIAL NOT NULL,
    "washRecordId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageType" "ImageType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WashImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_licensePlate_key" ON "Truck"("licensePlate");

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WashRecord" ADD CONSTRAINT "WashRecord_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WashRecord" ADD CONSTRAINT "WashRecord_washerId_fkey" FOREIGN KEY ("washerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WashImage" ADD CONSTRAINT "WashImage_washRecordId_fkey" FOREIGN KEY ("washRecordId") REFERENCES "WashRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
