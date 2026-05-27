-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "TemaPrincipal" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "gcsUri" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemaPrincipal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubcarpetaNorma" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "gcsUri" TEXT NOT NULL,
    "temaPrincipalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubcarpetaNorma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RevisorTemas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TemaPrincipal_nombre_key" ON "TemaPrincipal"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "TemaPrincipal_slug_key" ON "TemaPrincipal"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SubcarpetaNorma_temaPrincipalId_slug_key" ON "SubcarpetaNorma"("temaPrincipalId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "_RevisorTemas_AB_unique" ON "_RevisorTemas"("A", "B");

-- CreateIndex
CREATE INDEX "_RevisorTemas_B_index" ON "_RevisorTemas"("B");

-- AddForeignKey
ALTER TABLE "SubcarpetaNorma" ADD CONSTRAINT "SubcarpetaNorma_temaPrincipalId_fkey" FOREIGN KEY ("temaPrincipalId") REFERENCES "TemaPrincipal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RevisorTemas" ADD CONSTRAINT "_RevisorTemas_A_fkey" FOREIGN KEY ("A") REFERENCES "TemaPrincipal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RevisorTemas" ADD CONSTRAINT "_RevisorTemas_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
