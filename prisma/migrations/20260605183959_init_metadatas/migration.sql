-- CreateEnum
CREATE TYPE "AmbitoTerritorial" AS ENUM ('NACIONAL', 'ESTADAL');

-- AlterTable
ALTER TABLE "MatrizA" ADD COLUMN     "imagenBannerPublicId" TEXT,
ADD COLUMN     "imagenBannerUrl" TEXT,
ALTER COLUMN "categoriasKeywords" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MatrizB" ALTER COLUMN "categoriasKeywords" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Metadata" (
    "id" TEXT NOT NULL,
    "temaPrincipal" TEXT,
    "tipoDocumento" TEXT,
    "tipoNorma" TEXT,
    "enteEmisor" TEXT,
    "fechaPublicacion" TIMESTAMP(3),
    "numeroGaceta" TEXT,
    "ambitoTerritorial" "AmbitoTerritorial",
    "pais" TEXT,
    "documentoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Metadata_documentoId_key" ON "Metadata"("documentoId");

-- AddForeignKey
ALTER TABLE "Metadata" ADD CONSTRAINT "Metadata_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
