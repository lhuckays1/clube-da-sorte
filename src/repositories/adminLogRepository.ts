import { prisma } from "../db";

export class AdminLogRepository {
  static async create(data: {
    usuarioId?: number;
    acao: string;
    detalhes: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.logAdmin.create({
      data: {
        usuarioId: data.usuarioId || null,
        acao: data.acao,
        detalhes: data.detalhes,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  static async listAll() {
    return prisma.logAdmin.findMany({
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
