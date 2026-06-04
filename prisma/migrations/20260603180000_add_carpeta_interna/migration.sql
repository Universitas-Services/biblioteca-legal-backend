-- CreateTable
CREATE TABLE "CarpetaInterna" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "gcsUri" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL,
    "eliminado" BOOLEAN NOT NULL DEFAULT false,
    "fechaEliminacion" TIMESTAMP(3),
    "subcarpetaNormaId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarpetaInterna_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarpetaInterna_subcarpetaNormaId_idx" ON "CarpetaInterna"("subcarpetaNormaId");

-- CreateIndex
CREATE UNIQUE INDEX "CarpetaInterna_parentId_slug_key" ON "CarpetaInterna"("parentId", "slug");

-- AddForeignKey
ALTER TABLE "CarpetaInterna" ADD CONSTRAINT "CarpetaInterna_subcarpetaNormaId_fkey" FOREIGN KEY ("subcarpetaNormaId") REFERENCES "SubcarpetaNorma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarpetaInterna" ADD CONSTRAINT "CarpetaInterna_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CarpetaInterna"("id") ON DELETE CASCADE ON UPDATE CASCADE;
