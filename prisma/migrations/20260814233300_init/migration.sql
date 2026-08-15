-- CreateEnum
CREATE TYPE "FloatingElementType" AS ENUM ('TEXT', 'IMAGE');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('EXAM', 'ASSIGNMENT', 'CLASS', 'REMINDER', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "carrera" TEXT NOT NULL,
    "semestre" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "courseName" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotePage" (
    "id" TEXT NOT NULL,
    "pageIndex" INTEGER NOT NULL,
    "textContent" TEXT,
    "noteId" TEXT NOT NULL,

    CONSTRAINT "NotePage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FloatingElement" (
    "id" TEXT NOT NULL,
    "type" "FloatingElementType" NOT NULL,
    "positionX" DOUBLE PRECISION NOT NULL,
    "positionY" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "text" TEXT,
    "imageUrl" TEXT,
    "pageId" TEXT NOT NULL,

    CONSTRAINT "FloatingElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "EventType" NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Note_userId_idx" ON "Note"("userId");

-- CreateIndex
CREATE INDEX "Note_userId_courseName_idx" ON "Note"("userId", "courseName");

-- CreateIndex
CREATE INDEX "NotePage_noteId_idx" ON "NotePage"("noteId");

-- CreateIndex
CREATE INDEX "FloatingElement_pageId_idx" ON "FloatingElement"("pageId");

-- CreateIndex
CREATE INDEX "Event_userId_idx" ON "Event"("userId");

-- CreateIndex
CREATE INDEX "Event_userId_date_idx" ON "Event"("userId", "date");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotePage" ADD CONSTRAINT "NotePage_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FloatingElement" ADD CONSTRAINT "FloatingElement_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "NotePage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
