-- AlterTable
ALTER TABLE "User" ALTER COLUMN "especialidades" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "TemaPrincipal" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "gcsUri" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemaPrincipal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubcarpetaNorma" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "gcsUri" TEXT NOT NULL,
    "temaPrincipalId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubcarpetaNorma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemaPrincipal_nombre_key" ON "TemaPrincipal"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "TemaPrincipal_slug_key" ON "TemaPrincipal"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SubcarpetaNorma_temaPrincipalId_slug_key" ON "SubcarpetaNorma"("temaPrincipalId", "slug");

-- AddForeignKey
ALTER TABLE "SubcarpetaNorma" ADD CONSTRAINT "SubcarpetaNorma_temaPrincipalId_fkey" FOREIGN KEY ("temaPrincipalId") REFERENCES "TemaPrincipal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
