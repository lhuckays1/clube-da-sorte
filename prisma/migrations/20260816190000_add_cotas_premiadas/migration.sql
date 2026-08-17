-- CreateTable
CREATE TABLE "CotaPremiada" (
    "id" SERIAL NOT NULL,
    "rifaId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "premio" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISPONIVEL',
    "pedidoId" INTEGER,
    "compradorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "premiadoEm" TIMESTAMP(3),

    CONSTRAINT "CotaPremiada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CotaPremiada_rifaId_idx" ON "CotaPremiada"("rifaId");

-- CreateIndex
CREATE INDEX "CotaPremiada_rifaId_status_idx" ON "CotaPremiada"("rifaId", "status");

-- CreateIndex
CREATE INDEX "CotaPremiada_pedidoId_idx" ON "CotaPremiada"("pedidoId");

-- CreateIndex
CREATE INDEX "CotaPremiada_compradorId_idx" ON "CotaPremiada"("compradorId");

-- CreateIndex
CREATE UNIQUE INDEX "CotaPremiada_rifaId_numero_key" ON "CotaPremiada"("rifaId", "numero");

-- AddForeignKey
ALTER TABLE "CotaPremiada" ADD CONSTRAINT "CotaPremiada_rifaId_fkey" FOREIGN KEY ("rifaId") REFERENCES "Rifa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotaPremiada" ADD CONSTRAINT "CotaPremiada_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotaPremiada" ADD CONSTRAINT "CotaPremiada_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "Comprador"("id") ON DELETE SET NULL ON UPDATE CASCADE;