-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "category" TEXT,
ADD COLUMN     "color" INTEGER,
ADD COLUMN     "endTime" TEXT,
ALTER COLUMN "type" SET DEFAULT 'OTHER';
