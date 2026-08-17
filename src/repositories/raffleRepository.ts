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

    // Cotas Premiadas
    temCotasPremiadas: boolean;
    quantidadeCotasPremiadas: number;
    valorCotaPremiada: number;
  }) {
    const quantidadeCotas = data.temCotasPremiadas
      ? data.quantidadeCotasPremiadas
      : 0;

    const valorCota = data.temCotasPremiadas
      ? data.valorCotaPremiada
      : 0;

    if (data.temCotasPremiadas) {
      if (
        !Number.isInteger(quantidadeCotas) ||
        quantidadeCotas < 1 ||
        quantidadeCotas > data.quantidadeTotal
      ) {
        throw new Error(
          `A quantidade de cotas premiadas deve estar entre 1 e ${data.quantidadeTotal}.`
        );
      }

      if (!Number.isFinite(valorCota) || valorCota <= 0) {
        throw new Error(
          "O valor de cada cota premiada deve ser maior que zero."
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      // 1. Criar a rifa
      const rifa = await tx.rifa.create({
        data: {
          titulo: data.titulo,
          descricao: data.descricao,
          regulamento: data.regulamento,
          valorPorNumero: data.valorPorNumero,
          quantidadeTotal: data.quantidadeTotal,
          dataSorteio: data.dataSorteio,
          metodoSorteio: data.metodoSorteio,
          status: "ATIVO",

          // Configuração das Cotas Premiadas
          temCotasPremiadas: data.temCotasPremiadas,
          quantidadeCotasPremiadas: quantidadeCotas,
          valorCotaPremiada: valorCota,
        },
      });

      // 2. Se a rifa não possui cotas premiadas,
      // não criar nenhum registro.
      if (!data.temCotasPremiadas) {
        return rifa;
      }

      // 3. Criar a lista completa de números possíveis.
      //
      // Exemplo:
      // quantidadeTotal = 350
      //
      // 0 ... 349
      const numerosDisponiveis = Array.from(
        { length: data.quantidadeTotal },
        (_, index) => index
      );

      // 4. Embaralhamento Fisher-Yates
      for (let i = numerosDisponiveis.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [numerosDisponiveis[i], numerosDisponiveis[j]] = [
          numerosDisponiveis[j],
          numerosDisponiveis[i],
        ];
      }

      // 5. Selecionar somente a quantidade configurada
      const numerosPremiados = numerosDisponiveis
        .slice(0, quantidadeCotas)
        .map((numero) =>
          numero < 100
            ? String(numero).padStart(2, "0")
            : String(numero)
        );

      // 6. Criar as Cotas Premiadas
      await tx.cotaPremiada.createMany({
        data: numerosPremiados.map((numero) => ({
          rifaId: rifa.id,
          numero,
          premio: valorCota,
          status: "DISPONIVEL",
        })),
      });

      return rifa;
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
