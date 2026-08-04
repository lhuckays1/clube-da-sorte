-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rifa" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "regulamento" TEXT NOT NULL,
    "valorPorNumero" DOUBLE PRECISION NOT NULL,
    "quantidadeTotal" INTEGER NOT NULL,
    "dataSorteio" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "metodoSorteio" TEXT NOT NULL DEFAULT 'AVULSO',
    "resultado" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rifa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImagemRifa" (
    "id" SERIAL NOT NULL,
    "rifaId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "isPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImagemRifa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Combo" (
    "id" SERIAL NOT NULL,
    "rifaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "desconto" DOUBLE PRECISION NOT NULL,
    "valorFinal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Combo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comprador" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "cpf" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comprador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" SERIAL NOT NULL,
    "hash" TEXT NOT NULL,
    "compradorId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "pixQrCode" TEXT,
    "pixCopiaCola" TEXT,
    "pixTxid" TEXT,
    "gatewayMeta" TEXT,
    "expiracaoPix" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "rifaId" INTEGER NOT NULL,
    "numeros" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valorUnitario" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ganhador" (
    "id" SERIAL NOT NULL,
    "rifaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "numeroPremiado" TEXT NOT NULL,
    "dataSorteio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fotoPremioUrl" TEXT,
    "fotoEntregaUrl" TEXT,
    "depoimento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sorteioId" INTEGER,

    CONSTRAINT "Ganhador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracao" (
    "id" SERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatewayPagamento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "ambiente" TEXT NOT NULL DEFAULT 'SANDBOX',
    "credenciais" TEXT NOT NULL,
    "taxaFixa" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "taxaPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GatewayPagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sorteio" (
    "id" SERIAL NOT NULL,
    "rifaId" INTEGER NOT NULL,
    "tituloSorteio" TEXT NOT NULL,
    "dataSorteioReal" TIMESTAMP(3),
    "numeroGanhador" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "dadosExtras" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sorteio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAdmin" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER,
    "acao" TEXT NOT NULL,
    "detalhes" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Arquivo" (
    "id" SERIAL NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "nomeUnico" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "bucket" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Arquivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumeroBilhete" (
    "id" SERIAL NOT NULL,
    "rifaId" INTEGER NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVADO',
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumeroBilhete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Rifa_status_idx" ON "Rifa"("status");

-- CreateIndex
CREATE INDEX "Rifa_createdAt_idx" ON "Rifa"("createdAt");

-- CreateIndex
CREATE INDEX "ImagemRifa_rifaId_idx" ON "ImagemRifa"("rifaId");

-- CreateIndex
CREATE INDEX "Combo_rifaId_idx" ON "Combo"("rifaId");

-- CreateIndex
CREATE UNIQUE INDEX "Comprador_telefone_key" ON "Comprador"("telefone");

-- CreateIndex
CREATE INDEX "Comprador_telefone_idx" ON "Comprador"("telefone");

-- CreateIndex
CREATE INDEX "Comprador_createdAt_idx" ON "Comprador"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_hash_key" ON "Pedido"("hash");

-- CreateIndex
CREATE INDEX "Pedido_compradorId_idx" ON "Pedido"("compradorId");

-- CreateIndex
CREATE INDEX "Pedido_status_idx" ON "Pedido"("status");

-- CreateIndex
CREATE INDEX "Pedido_createdAt_idx" ON "Pedido"("createdAt");

-- CreateIndex
CREATE INDEX "Pedido_pixTxid_idx" ON "Pedido"("pixTxid");

-- CreateIndex
CREATE INDEX "ItemPedido_pedidoId_idx" ON "ItemPedido"("pedidoId");

-- CreateIndex
CREATE INDEX "ItemPedido_rifaId_idx" ON "ItemPedido"("rifaId");

-- CreateIndex
CREATE INDEX "Ganhador_rifaId_idx" ON "Ganhador"("rifaId");

-- CreateIndex
CREATE INDEX "Ganhador_sorteioId_idx" ON "Ganhador"("sorteioId");

-- CreateIndex
CREATE UNIQUE INDEX "Configuracao_chave_key" ON "Configuracao"("chave");

-- CreateIndex
CREATE INDEX "Configuracao_chave_idx" ON "Configuracao"("chave");

-- CreateIndex
CREATE INDEX "GatewayPagamento_ativo_idx" ON "GatewayPagamento"("ativo");

-- CreateIndex
CREATE INDEX "Sorteio_rifaId_idx" ON "Sorteio"("rifaId");

-- CreateIndex
CREATE INDEX "Sorteio_status_idx" ON "Sorteio"("status");

-- CreateIndex
CREATE INDEX "LogAdmin_usuarioId_idx" ON "LogAdmin"("usuarioId");

-- CreateIndex
CREATE INDEX "LogAdmin_acao_idx" ON "LogAdmin"("acao");

-- CreateIndex
CREATE INDEX "LogAdmin_createdAt_idx" ON "LogAdmin"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Arquivo_nomeUnico_key" ON "Arquivo"("nomeUnico");

-- CreateIndex
CREATE INDEX "Arquivo_nomeUnico_idx" ON "Arquivo"("nomeUnico");

-- CreateIndex
CREATE INDEX "NumeroBilhete_pedidoId_idx" ON "NumeroBilhete"("pedidoId");

-- CreateIndex
CREATE INDEX "NumeroBilhete_rifaId_status_idx" ON "NumeroBilhete"("rifaId", "status");

-- CreateIndex
CREATE INDEX "NumeroBilhete_expiraEm_status_idx" ON "NumeroBilhete"("expiraEm", "status");

-- CreateIndex
CREATE UNIQUE INDEX "NumeroBilhete_rifaId_numero_key" ON "NumeroBilhete"("rifaId", "numero");

-- AddForeignKey
ALTER TABLE "ImagemRifa" ADD CONSTRAINT "ImagemRifa_rifaId_fkey" FOREIGN KEY ("rifaId") REFERENCES "Rifa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combo" ADD CONSTRAINT "Combo_rifaId_fkey" FOREIGN KEY ("rifaId") REFERENCES "Rifa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "Comprador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_rifaId_fkey" FOREIGN KEY ("rifaId") REFERENCES "Rifa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ganhador" ADD CONSTRAINT "Ganhador_rifaId_fkey" FOREIGN KEY ("rifaId") REFERENCES "Rifa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ganhador" ADD CONSTRAINT "Ganhador_sorteioId_fkey" FOREIGN KEY ("sorteioId") REFERENCES "Sorteio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sorteio" ADD CONSTRAINT "Sorteio_rifaId_fkey" FOREIGN KEY ("rifaId") REFERENCES "Rifa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAdmin" ADD CONSTRAINT "LogAdmin_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NumeroBilhete" ADD CONSTRAINT "NumeroBilhete_rifaId_fkey" FOREIGN KEY ("rifaId") REFERENCES "Rifa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NumeroBilhete" ADD CONSTRAINT "NumeroBilhete_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
