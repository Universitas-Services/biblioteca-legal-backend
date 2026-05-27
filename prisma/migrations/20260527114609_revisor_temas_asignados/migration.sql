-- CreateTable
CREATE TABLE "_RevisorTemas" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_RevisorTemas_AB_unique" ON "_RevisorTemas"("A", "B");

-- CreateIndex
CREATE INDEX "_RevisorTemas_B_index" ON "_RevisorTemas"("B");

-- AddForeignKey
ALTER TABLE "_RevisorTemas" ADD CONSTRAINT "_RevisorTemas_A_fkey" FOREIGN KEY ("A") REFERENCES "TemaPrincipal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RevisorTemas" ADD CONSTRAINT "_RevisorTemas_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
