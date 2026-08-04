import { prisma } from "../db";

export class GatewayRepository {
  static async listAll() {
    return prisma.gatewayPagamento.findMany({
      orderBy: { id: "asc" },
    });
  }

  static async findActive() {
    return prisma.gatewayPagamento.findFirst({
      where: { ativo: true },
    });
  }

  static async findById(id: number) {
    return prisma.gatewayPagamento.findUnique({
      where: { id },
    });
  }

  static async findByNome(nome: string) {
    return prisma.gatewayPagamento.findFirst({
      where: { nome },
    });
  }

  static async create(data: {
    nome: string;
    ambiente?: string;
    credenciais: string;
    taxaFixa?: number;
    taxaPercent?: number;
    ativo?: boolean;
  }) {
    return prisma.gatewayPagamento.create({
      data: {
        nome: data.nome,
        ambiente: data.ambiente || "SANDBOX",
        credenciais: data.credenciais,
        taxaFixa: data.taxaFixa ?? 0.0,
        taxaPercent: data.taxaPercent ?? 0.0,
        ativo: data.ativo ?? true,
      },
    });
  }

  static async update(
    id: number,
    data: {
      nome?: string;
      ambiente?: string;
      credenciais?: string;
      taxaFixa?: number;
      taxaPercent?: number;
      ativo?: boolean;
    }
  ) {
    return prisma.gatewayPagamento.update({
      where: { id },
      data,
    });
  }

  static async setActiveOnly(id: number) {
    return prisma.$transaction(async (tx) => {
      // Disable all first
      await tx.gatewayPagamento.updateMany({
        data: { ativo: false },
      });

      // Enable target gateway
      return tx.gatewayPagamento.update({
        where: { id },
        data: { ativo: true },
      });
    });
  }
}
