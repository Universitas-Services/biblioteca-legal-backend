/*
  Warnings:

  - You are about to drop the `ComentarioInterno` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ComentarioInterno" DROP CONSTRAINT "ComentarioInterno_autorId_fkey";

-- DropForeignKey
ALTER TABLE "ComentarioInterno" DROP CONSTRAINT "ComentarioInterno_documentoId_fkey";

-- DropTable
DROP TABLE "ComentarioInterno";

-- CreateTable
CREATE TABLE "NotaInterna" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotaInterna_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NotaInterna" ADD CONSTRAINT "NotaInterna_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaInterna" ADD CONSTRAINT "NotaInterna_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
