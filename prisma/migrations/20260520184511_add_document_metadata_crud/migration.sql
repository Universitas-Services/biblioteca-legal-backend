-- AlterTable
ALTER TABLE "Documento" ADD COLUMN     "categorias" TEXT[],
ADD COLUMN     "eliminado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enteEmisor" TEXT,
ADD COLUMN     "esReforma" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "etiquetas" TEXT[],
ADD COLUMN     "fechaEliminacion" TIMESTAMP(3),
ADD COLUMN     "fechaPublicacion" TEXT,
ADD COLUMN     "matrizAElementos" TEXT[],
ADD COLUMN     "matrizBElementos" TEXT[],
ADD COLUMN     "nombreBreve" TEXT,
ADD COLUMN     "numeroGaceta" TEXT,
ADD COLUMN     "palabrasClave" TEXT[],
ADD COLUMN     "reformaAId" TEXT,
ADD COLUMN     "resumen" TEXT,
ADD COLUMN     "soloLecturaImagen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "temaPrincipal" TEXT,
ADD COLUMN     "tipoNorma" TEXT;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_reformaAId_fkey" FOREIGN KEY ("reformaAId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
