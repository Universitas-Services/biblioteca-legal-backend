/*
  Warnings:

  - You are about to drop the column `categorias` on the `Documento` table. All the data in the column will be lost.
  - You are about to drop the column `matrizAElementos` on the `Documento` table. All the data in the column will be lost.
  - You are about to drop the column `matrizBElementos` on the `Documento` table. All the data in the column will be lost.
  - The `estado` column on the `Documento` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `tituloIntegro` to the `Documento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EstadoDocumento" AS ENUM ('PENDIENTE_REVISION', 'VIGENTE', 'REFORMADA', 'DEROGADA');

-- CreateEnum
CREATE TYPE "EstadoCategoria" AS ENUM ('SUGERIDA', 'APROBADA');

-- CreateEnum
CREATE TYPE "Profesion" AS ENUM ('ABOGADO', 'NOTARIO', 'JUEZ', 'FISCAL', 'DEFENSOR', 'ESTUDIANTE_DERECHO', 'ACADEMICO', 'CONSULTOR_LEGAL', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('REFORMADA', 'DEROGADA');

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "detalle" TEXT;

-- AlterTable Documento (seguro con filas existentes)
ALTER TABLE "Documento" DROP COLUMN IF EXISTS "categorias",
DROP COLUMN IF EXISTS "matrizAElementos",
DROP COLUMN IF EXISTS "matrizBElementos",
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "curadorId" TEXT,
ADD COLUMN IF NOT EXISTS "matrizAId" TEXT,
ADD COLUMN IF NOT EXISTS "revisorAsignadoId" TEXT,
ADD COLUMN IF NOT EXISTS "tituloIntegro" TEXT;

UPDATE "Documento"
SET "tituloIntegro" = COALESCE("tituloIntegro", "titulo")
WHERE "tituloIntegro" IS NULL;

ALTER TABLE "Documento" ALTER COLUMN "tituloIntegro" SET NOT NULL;

ALTER TABLE "Documento" ADD COLUMN IF NOT EXISTS "estado_new" "EstadoDocumento";

UPDATE "Documento"
SET "estado_new" = CASE
  WHEN "estado"::text ILIKE '%pendiente%' THEN 'PENDIENTE_REVISION'::"EstadoDocumento"
  WHEN "estado"::text ILIKE '%vigente%' THEN 'VIGENTE'::"EstadoDocumento"
  WHEN "estado"::text ILIKE '%reformad%' THEN 'REFORMADA'::"EstadoDocumento"
  WHEN "estado"::text ILIKE '%derogad%' THEN 'DEROGADA'::"EstadoDocumento"
  ELSE 'PENDIENTE_REVISION'::"EstadoDocumento"
END
WHERE "estado_new" IS NULL;

ALTER TABLE "Documento" DROP COLUMN "estado";
ALTER TABLE "Documento" RENAME COLUMN "estado_new" TO "estado";
ALTER TABLE "Documento" ALTER COLUMN "estado" SET NOT NULL;
ALTER TABLE "Documento" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE_REVISION';

-- AlterTable User (seguro con filas existentes)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "apellido" TEXT,
ADD COLUMN IF NOT EXISTS "consultasRealizadas" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "especialidades" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "nivelMuro" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "nombre" TEXT,
ADD COLUMN IF NOT EXISTS "pais" TEXT,
ADD COLUMN IF NOT EXISTS "profesion" "Profesion",
ADD COLUMN IF NOT EXISTS "telefono" TEXT,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" "EstadoCategoria" NOT NULL DEFAULT 'SUGERIDA',
    "sugeridoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatrizA" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "palabrasClave" TEXT[],
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatrizA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatrizB" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "palabrasClave" TEXT[],
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "esAgora" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatrizB_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialConsulta" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialConsulta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorito" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComentarioInterno" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComentarioInterno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DocumentoMatrizB" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_CategoriaToDocumento" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");

-- CreateIndex
CREATE INDEX "HistorialConsulta_userId_idx" ON "HistorialConsulta"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorito_userId_documentoId_key" ON "Favorito"("userId", "documentoId");

-- CreateIndex
CREATE UNIQUE INDEX "_DocumentoMatrizB_AB_unique" ON "_DocumentoMatrizB"("A", "B");

-- CreateIndex
CREATE INDEX "_DocumentoMatrizB_B_index" ON "_DocumentoMatrizB"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CategoriaToDocumento_AB_unique" ON "_CategoriaToDocumento"("A", "B");

-- CreateIndex
CREATE INDEX "_CategoriaToDocumento_B_index" ON "_CategoriaToDocumento"("B");

-- CreateIndex
CREATE INDEX "Documento_tituloIntegro_enteEmisor_fechaPublicacion_idx" ON "Documento"("tituloIntegro", "enteEmisor", "fechaPublicacion");

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_curadorId_fkey" FOREIGN KEY ("curadorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_revisorAsignadoId_fkey" FOREIGN KEY ("revisorAsignadoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_matrizAId_fkey" FOREIGN KEY ("matrizAId") REFERENCES "MatrizA"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_sugeridoPorId_fkey" FOREIGN KEY ("sugeridoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialConsulta" ADD CONSTRAINT "HistorialConsulta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialConsulta" ADD CONSTRAINT "HistorialConsulta_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorito" ADD CONSTRAINT "Favorito_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorito" ADD CONSTRAINT "Favorito_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComentarioInterno" ADD CONSTRAINT "ComentarioInterno_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComentarioInterno" ADD CONSTRAINT "ComentarioInterno_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentoMatrizB" ADD CONSTRAINT "_DocumentoMatrizB_A_fkey" FOREIGN KEY ("A") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentoMatrizB" ADD CONSTRAINT "_DocumentoMatrizB_B_fkey" FOREIGN KEY ("B") REFERENCES "MatrizB"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoriaToDocumento" ADD CONSTRAINT "_CategoriaToDocumento_A_fkey" FOREIGN KEY ("A") REFERENCES "Categoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoriaToDocumento" ADD CONSTRAINT "_CategoriaToDocumento_B_fkey" FOREIGN KEY ("B") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
