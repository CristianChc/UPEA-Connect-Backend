-- CreateEnum
CREATE TYPE "CategoriaConocimiento" AS ENUM ('TRAMITES', 'REGLAMENTO', 'CALENDARIO', 'CONTACTOS', 'CAMPUS', 'OTRO');

-- CreateTable
CREATE TABLE "Conocimiento" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "categoria" "CategoriaConocimiento" NOT NULL,
    "contenido" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conocimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conocimiento_activo_categoria_idx" ON "Conocimiento"("activo", "categoria");
