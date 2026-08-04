import { prisma } from "../db";

export class BuyerRepository {
  static async findByPhone(telefone: string) {
    return prisma.comprador.findUnique({
      where: { telefone: telefone.trim() },
    });
  }

  static async create(data: {
    nome: string;
    telefone: string;
    cidade: string;
    estado: string;
    cpf?: string | null;
  }) {
    return prisma.comprador.create({
      data: {
        nome: data.nome.trim(),
        telefone: data.telefone.trim(),
        cidade: data.cidade.trim(),
        estado: data.estado.trim(),
        cpf: data.cpf ? data.cpf.trim() : null,
      },
    });
  }

  static async update(
    id: number,
    data: {
      nome?: string;
      cidade?: string;
      estado?: string;
      cpf?: string | null;
    }
  ) {
    return prisma.comprador.update({
      where: { id },
      data,
    });
  }

  static async listAll() {
    return prisma.comprador.findMany({
      include: {
        pedidos: {
          include: {
            itens: {
              include: {
                rifa: true,
              }
            }
          }
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
