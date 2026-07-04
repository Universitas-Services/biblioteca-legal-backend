-- AlterEnum
ALTER TYPE "EstadoCategoria" RENAME TO "EstadoAprobacion";
ALTER TYPE "EstadoAprobacion" ADD VALUE 'RECHAZADA';

-- CreateTable
CREATE TABLE "Etiqueta" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" "EstadoAprobacion" NOT NULL DEFAULT 'SUGERIDA',
    "sugeridoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Etiqueta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Etiqueta_nombre_key" ON "Etiqueta"("nombre");

-- CreateTable
CREATE TABLE "_DocumentoToEtiqueta" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_DocumentoToEtiqueta_AB_unique" ON "_DocumentoToEtiqueta"("A", "B");

-- CreateIndex
CREATE INDEX "_DocumentoToEtiqueta_B_index" ON "_DocumentoToEtiqueta"("B");

-- AddForeignKey
ALTER TABLE "Etiqueta" ADD CONSTRAINT "Etiqueta_sugeridoPorId_fkey" FOREIGN KEY ("sugeridoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentoToEtiqueta" ADD CONSTRAINT "_DocumentoToEtiqueta_A_fkey" FOREIGN KEY ("A") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentoToEtiqueta" ADD CONSTRAINT "_DocumentoToEtiqueta_B_fkey" FOREIGN KEY ("B") REFERENCES "Etiqueta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =========================================================================
-- Data Migration: Migrate existing 'etiquetas' strings into Etiqueta model
-- =========================================================================

-- Ensure gen_random_uuid() is available (Postgres 13+)
-- Insert unique tags into Etiqueta table with APROBADA state
INSERT INTO "Etiqueta" ("id", "nombre", "estado", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    tag_name,
    'APROBADA',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT unnest(etiquetas) AS tag_name
    FROM "Documento"
    WHERE etiquetas IS NOT NULL
) AS unique_tags
ON CONFLICT ("nombre") DO NOTHING;

-- Link Documento with Etiqueta in the many-to-many table
INSERT INTO "_DocumentoToEtiqueta" ("A", "B")
SELECT 
    d."id",
    e."id"
FROM "Documento" d
JOIN LATERAL unnest(d."etiquetas") AS tag_name ON true
JOIN "Etiqueta" e ON e."nombre" = tag_name
WHERE d."etiquetas" IS NOT NULL
ON CONFLICT DO NOTHING;

-- =========================================================================
-- Schema Cleanup: Remove array column
-- =========================================================================

-- AlterTable
ALTER TABLE "Documento" DROP COLUMN "etiquetas";
