import { prisma } from "../db";

export class OrderRepository {
  static async findById(id: number) {
    return prisma.pedido.findUnique({
      where: { id },
      include: {
        comprador: true,
        itens: {
          include: {
            rifa: true,
          },
        },
        bilhetes: true,
        cotasPremiadas: {
          where: {
            status: "PREMIADA",
          },
          orderBy: {
            numero: "asc",
          },
        },
      },
    });
  }

  static async findByHash(hash: string) {
    return prisma.pedido.findUnique({
      where: { hash },
      include: {
        comprador: true,
        itens: {
          include: {
            rifa: {
              include: {
                imagens: true,
              },
            },
          },
        },
        bilhetes: true,
        cotasPremiadas: {
          where: {
            status: "PREMIADA",
          },
          orderBy: {
            numero: "asc",
          },
        },
      },
    });
  }

  static async findByTxid(pixTxid: string) {
    return prisma.pedido.findFirst({
      where: { pixTxid },
      include: {
        comprador: true,
        itens: {
          include: {
            rifa: true,
          },
        },
        bilhetes: true,
      },
    });
  }

  static async listAll(filters?: { status?: string; search?: string }) {
    const queryWhere: any = {};

    if (filters?.status) {
      queryWhere.status = filters.status;
    }

    if (filters?.search) {
      const search = filters.search.trim();
      queryWhere.OR = [
        { hash: { contains: search } },
        {
          comprador: {
            OR: [
              { nome: { contains: search } },
              { telefone: { contains: search } },
              { cpf: { contains: search } },
            ],
          },
        },
      ];
    }

    return prisma.pedido.findMany({
      where: queryWhere,
      include: {
        comprador: true,
        itens: {
          include: {
            rifa: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async findHistoryByBuyerIds(buyerIds: number[]) {
    return prisma.pedido.findMany({
      where: { compradorId: { in: buyerIds } },
      include: {
        comprador: true,
        itens: {
          include: {
            rifa: {
              include: { imagens: true },
            },
          },
        },
        cotasPremiadas: {
          where: {
            status: "PREMIADA",
          },
          orderBy: {
            numero: "asc",
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * High-Performance Double-booking prevention atomic transaction
   */
  static async createOrderWithReservation(data: {
    hash: string;
    compradorId: number;
    valorTotal: number;
    expiracaoPix: Date;
    rifaId: number;
    numeros: string[];
    quantidade: number;
    valorUnitario: number;
  }) {
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      // 1. Delete ALL expired reservations on these exact numbers to clean up our unique index slot
      await tx.numeroBilhete.deleteMany({
        where: {
          rifaId: data.rifaId,
          numero: { in: data.numeros },
          status: "RESERVADO",
          expiraEm: { lt: now },
        },
      });

      // 2. Check if ANY of these numbers are still reserved (not expired) or already paid
      const activeReservations = await tx.numeroBilhete.findMany({
        where: {
          rifaId: data.rifaId,
          numero: { in: data.numeros },
          OR: [
            { status: "PAGO" },
            {
              status: "RESERVADO",
              expiraEm: { gt: now },
            },
          ],
        },
      });

      if (activeReservations.length > 0) {
        const taken = activeReservations.map((ar) => ar.numero).join(", ");
        throw new Error(`Infelizmente, os números [ ${taken} ] já estão reservados ou foram pagos.`);
      }

      // 3. Create the Order
      const pedido = await tx.pedido.create({
        data: {
          hash: data.hash,
          compradorId: data.compradorId,
          status: "PENDENTE",
          valorTotal: data.valorTotal,
          expiracaoPix: data.expiracaoPix,
          itens: {
            create: {
              rifaId: data.rifaId,
              numeros: data.numeros.join(","),
              quantidade: data.quantidade,
              valorUnitario: data.valorUnitario,
            },
          },
        },
        include: {
          itens: true,
        },
      });

      // 4. Batch Create the unique NumeroBilhete tickets associated to the Order
      const ticketRecords = data.numeros.map((num) => ({
        rifaId: data.rifaId,
        pedidoId: pedido.id,
        numero: num,
        status: "RESERVADO",
        expiraEm: data.expiracaoPix,
      }));

      await tx.numeroBilhete.createMany({
        data: ticketRecords,
      });

      return pedido;
    });
  }

  static async updatePixData(pedidoId: number, data: { txid: string; qrCode: string; copiaCola: string }) {
    return prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        pixTxid: data.txid,
        pixQrCode: data.qrCode,
        pixCopiaCola: data.copiaCola,
      },
    });
  }

  static async approveOrder(id: number) {
    return prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUnique({
        where: { id },
        include: {
          itens: true,
        },
      });

      if (!pedido) {
        throw new Error("Pedido não encontrado");
      }

      // Pedido já processado.
      // Isso também protege contra webhook duplicado.
      if (pedido.status === "PAGO") {
        return pedido;
      }

      // 1. Atualiza o pedido para PAGO
      const updatedOrder = await tx.pedido.update({
        where: { id },
        data: {
          status: "PAGO",
        },
      });

      // 2. Atualiza todos os bilhetes vinculados ao pedido para PAGO
      await tx.numeroBilhete.updateMany({
        where: {
          pedidoId: id,
        },
        data: {
          status: "PAGO",
        },
      });

      // 3. Verifica se algum dos números comprados possui Cota Premiada
      for (const item of pedido.itens) {
        const numeros = item.numeros
          .split(",")
          .map((numero) => numero.trim())
          .filter(Boolean);

        if (numeros.length === 0) {
          continue;
        }

        const cotasPremiadas = await tx.cotaPremiada.findMany({
          where: {
            rifaId: item.rifaId,
            numero: {
              in: numeros,
            },
            status: "DISPONIVEL",
          },
        });

        // 4. Marca automaticamente as cotas encontradas como PREMIADA
        for (const cota of cotasPremiadas) {
          await tx.cotaPremiada.update({
            where: {
              id: cota.id,
            },
            data: {
              status: "PREMIADA",
              pedidoId: pedido.id,
              compradorId: pedido.compradorId,
              premiadoEm: new Date(),
            },
          });
        }
      }

      return updatedOrder;
    });
  }

  static async cancelOrder(id: number) {
    return prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.pedido.update({
        where: { id },
        data: { status: "CANCELADO" },
      });

      // Delete the temporary reservation records to liberate the unique constraint slots
      await tx.numeroBilhete.deleteMany({
        where: { pedidoId: id },
      });

      return updatedOrder;
    });
  }

  static async getActiveNumbersMap(rifaId: number): Promise<Map<string, "RESERVADO" | "PAGO">> {
    const now = new Date();
    
    const activeTickets = await prisma.numeroBilhete.findMany({
      where: {
        rifaId,
        OR: [
          { status: "PAGO" },
          {
            status: "RESERVADO",
            expiraEm: { gt: now },
          },
        ],
      },
    });

    const numMap = new Map<string, "RESERVADO" | "PAGO">();
    for (const t of activeTickets) {
      numMap.set(t.numero, t.status as "RESERVADO" | "PAGO");
    }
    return numMap;
  }
}
