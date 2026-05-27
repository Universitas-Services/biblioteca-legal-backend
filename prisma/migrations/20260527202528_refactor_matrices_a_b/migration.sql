/*
  Warnings:

  - You are about to drop the column `descripcion` on the `MatrizA` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `MatrizA` table. All the data in the column will be lost.
  - You are about to drop the column `palabrasClave` on the `MatrizA` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `MatrizB` table. All the data in the column will be lost.
  - You are about to drop the column `esAgora` on the `MatrizB` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `MatrizB` table. All the data in the column will be lost.
  - You are about to drop the column `palabrasClave` on the `MatrizB` table. All the data in the column will be lost.
  - Added the required column `nombreProducto` to the `MatrizA` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipoSolucion` to the `MatrizA` table without a default value. This is not possible if the table is not empty.
  - Added the required column `urlDestino` to the `MatrizA` table without a default value. This is not possible if the table is not empty.
  - Added the required column `autorArticulo` to the `MatrizB` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tituloArticulo` to the `MatrizB` table without a default value. This is not possible if the table is not empty.
  - Added the required column `urlDestinoAgora` to the `MatrizB` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoSolucion" AS ENUM ('CURSO', 'MODELO_DESCARGABLE', 'EVENTO');

-- AlterTable
ALTER TABLE "MatrizA" DROP COLUMN "descripcion",
DROP COLUMN "nombre",
DROP COLUMN "palabrasClave",
ADD COLUMN     "categoriasKeywords" TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN     "nombreProducto" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "tipoSolucion" "TipoSolucion" NOT NULL DEFAULT 'CURSO',
ADD COLUMN     "urlDestino" TEXT NOT NULL DEFAULT '';

-- Remove temporary defaults (enforce NOT NULL without defaults going forward)
ALTER TABLE "MatrizA" ALTER COLUMN "nombreProducto" DROP DEFAULT;
ALTER TABLE "MatrizA" ALTER COLUMN "tipoSolucion" DROP DEFAULT;
ALTER TABLE "MatrizA" ALTER COLUMN "urlDestino" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MatrizB" DROP COLUMN "descripcion",
DROP COLUMN "esAgora",
DROP COLUMN "nombre",
DROP COLUMN "palabrasClave",
ADD COLUMN     "autorArticulo" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "categoriasKeywords" TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN     "tituloArticulo" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "urlDestinoAgora" TEXT NOT NULL DEFAULT '';

-- Remove temporary defaults
ALTER TABLE "MatrizB" ALTER COLUMN "autorArticulo" DROP DEFAULT;
ALTER TABLE "MatrizB" ALTER COLUMN "tituloArticulo" DROP DEFAULT;
ALTER TABLE "MatrizB" ALTER COLUMN "urlDestinoAgora" DROP DEFAULT;
