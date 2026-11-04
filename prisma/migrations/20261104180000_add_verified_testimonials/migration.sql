CREATE TABLE "Depoimento" (
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "nomePublico" TEXT NOT NULL,
    "mensagem" VARCHAR(600) NOT NULL,
    "avaliacao" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revisadoEm" TIMESTAMP(3),
    "revisadoPor" INTEGER,

    CONSTRAINT "Depoimento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Depoimento_pedidoId_key" ON "Depoimento"("pedidoId");
CREATE INDEX "Depoimento_status_createdAt_idx" ON "Depoimento"("status", "createdAt");

ALTER TABLE "Depoimento"
ADD CONSTRAINT "Depoimento_pedidoId_fkey"
FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
