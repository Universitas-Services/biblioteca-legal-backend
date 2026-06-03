-- AlterTable
ALTER TABLE "TemaPrincipal" ADD COLUMN "descripcion" TEXT,
ADD COLUMN "eliminado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "fechaEliminacion" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SubcarpetaNorma" ADD COLUMN "descripcion" TEXT,
ADD COLUMN "eliminado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "fechaEliminacion" TIMESTAMP(3);
