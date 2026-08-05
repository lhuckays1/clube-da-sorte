import { prisma } from "../db";

export class RaffleRepository {
  static async findById(id: number) {
    return prisma.rifa.findUnique({
      where: { id },
      include: {
        imagens: true,
        combos: true,
        ganhadores: true,
        sorteios: true,
      },
    });
  }

  static async listAll(status?: string) {
    return prisma.rifa.findMany({
      where: status ? { status } : undefined,
      include: {
        imagens: true,
        combos: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async create(data: {
    titulo: string;
    descricao: string;
    regulamento: string;
    valorPorNumero: number;
    quantidadeTotal: number;
    dataSorteio?: Date | null;
    metodoSorteio: string;
  }) {
    return prisma.rifa.create({
      data: {
        titulo: data.titulo,
        descricao: data.descricao,
        regulamento: data.regulamento,
        valorPorNumero: data.valorPorNumero,
        quantidadeTotal: data.quantidadeTotal,
        dataSorteio: data.dataSorteio,
        metodoSorteio: data.metodoSorteio,
        status: "ATIVO",
      },
    });
  }

  static async update(
    id: number,
    data: {
      titulo?: string;
      descricao?: string;
      regulamento?: string;
      valorPorNumero?: number;
      status?: string;
      dataSorteio?: Date | null;
      metodoSorteio?: string;
      resultado?: string | null;
    }
  ) {
    return prisma.rifa.update({
      where: { id },
      data,
    });
  }

  static async delete(id: number) {
    return prisma.rifa.delete({
      where: { id },
    });
  }

  static async createImages(rifaId: number, urls: string[]) {
    return Promise.all(
      urls.map((url, idx) =>
        prisma.imagemRifa.create({
          data: {
            rifaId,
            url,
            isPrincipal: idx === 0,
          },
        })
      )
    );
  }

  static async deleteImages(rifaId: number) {
    return prisma.imagemRifa.deleteMany({
      where: { rifaId },
    });
  }

  static async createCombo(rifaId: number, data: { nome: string; quantidade: number; desconto: number; valorFinal: number }) {
    return prisma.combo.create({
      data: {
        rifaId,
        nome: data.nome,
        quantidade: data.quantidade,
        desconto: data.desconto,
        valorFinal: data.valorFinal,
      },
    });
  }
  static async listCombos(rifaId: number) {
    return prisma.combo.findMany({
      where: {
        rifaId,
      },
      orderBy: {
        quantidade: "asc",
      },
    });
  }

  static async updateCombo(
    id: number,
    data: {
      nome?: string;
      quantidade?: number;
      desconto?: number;
      valorFinal?: number;
    }
  ) {
    return prisma.combo.update({
      where: {
        id,
      },
      data,
    });
  }

  static async deleteCombo(id: number) {
    return prisma.combo.delete({
      where: { id },
    });
  }

  static async createSorteio(rifaId: number, data: { tituloSorteio: string }) {
    return prisma.sorteio.create({
      data: {
        rifaId,
        tituloSorteio: data.tituloSorteio,
        status: "PENDENTE",
      },
    });
  }

  static async updateSorteioRealizado(id: number, numeroGanhador: string, dadosExtras?: string) {
    return prisma.sorteio.update({
      where: { id },
      data: {
        numeroGanhador,
        dadosExtras,
        status: "REALIZADO",
        dataSorteioReal: new Date(),
      },
    });
  }

  static async findSorteioById(id: number) {
    return prisma.sorteio.findUnique({
      where: { id },
    });
  }

  static async listSorteiosByRaffle(rifaId: number) {
    return prisma.sorteio.findMany({
      where: { rifaId },
      include: { ganhadores: true },
    });
  }
}
