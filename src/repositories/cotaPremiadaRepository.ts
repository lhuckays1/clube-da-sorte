import { prisma } from "../db";

export class CotaPremiadaRepository {

  static async create(data: {
    rifaId: number;
    numero: string;
    premio: number;
  }) {
    return prisma.cotaPremiada.create({
      data: {
        rifaId: data.rifaId,
        numero: data.numero,
        premio: data.premio,
        status: "DISPONIVEL",
      },
    });
  }

  static async createMany(
    data: {
      rifaId: number;
      numero: string;
      premio: number;
    }[]
  ) {
    return prisma.cotaPremiada.createMany({
      data: data.map((item) => ({
        rifaId: item.rifaId,
        numero: item.numero,
        premio: item.premio,
        status: "DISPONIVEL",
      })),
      skipDuplicates: true,
    });
  }

  static async listByRifa(rifaId: number) {
    return prisma.cotaPremiada.findMany({
      where: {
        rifaId,
      },
      include: {
        pedido: true,
        comprador: true,
      },
      orderBy: {
        numero: "asc",
      },
    });
  }

  static async findById(id: number) {
    return prisma.cotaPremiada.findUnique({
      where: {
        id,
      },
      include: {
        pedido: true,
        comprador: true,
        rifa: true,
      },
    });
  }

  static async findByNumero(rifaId: number, numero: string) {
    return prisma.cotaPremiada.findUnique({
      where: {
        rifaId_numero: {
          rifaId,
          numero,
        },
      },
      include: {
        pedido: true,
        comprador: true,
      },
    });
  }

  static async listDisponiveis(rifaId: number) {
    return prisma.cotaPremiada.findMany({
      where: {
        rifaId,
        status: "DISPONIVEL",
      },
      orderBy: {
        numero: "asc",
      },
    });
  }

  static async marcarComoPremiada(
    id: number,
    pedidoId: number,
    compradorId: number
  ) {
    return prisma.cotaPremiada.update({
      where: {
        id,
      },
      data: {
        status: "PREMIADA",
        pedidoId,
        compradorId,
        premiadoEm: new Date(),
      },
    });
  }

  static async cancelar(id: number) {
    return prisma.cotaPremiada.update({
      where: {
        id,
      },
      data: {
        status: "CANCELADA",
      },
    });
  }

  static async delete(id: number) {
    return prisma.cotaPremiada.delete({
      where: {
        id,
      },
    });
  }

  static async deleteByRifa(rifaId: number) {
    return prisma.cotaPremiada.deleteMany({
      where: {
        rifaId,
      },
    });
  }
}