import bcryptjs from "bcryptjs";
import { prisma } from "../db";

export class UserRepository {

  static async listAll() {
    return prisma.usuario.findMany({
      orderBy: {
        nome: "asc",
      },
      select: {
        id: true,
        nome: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  static async findById(id: number) {
    return prisma.usuario.findUnique({
      where: { id },
    });
  }

  static async findByEmail(email: string) {
    return prisma.usuario.findUnique({
      where: {
        email,
      },
    });
  }

  static async create(data: {
    nome: string;
    email: string;
    senha: string;
  }) {

    const senhaHash = bcryptjs.hashSync(data.senha, 10);

    return prisma.usuario.create({
      data: {
        nome: data.nome,
        email: data.email,
        senha: senhaHash,
      },
    });

  }

  static async update(
    id: number,
    data: {
      nome?: string;
      email?: string;
    }
  ) {

    return prisma.usuario.update({
      where: {
        id,
      },
      data,
    });

  }

  static async updatePassword(
    id: number,
    senha: string
  ) {

    const senhaHash = bcryptjs.hashSync(senha, 10);

    return prisma.usuario.update({
      where: {
        id,
      },
      data: {
        senha: senhaHash,
      },
    });

  }

  static async delete(id: number) {
    return prisma.usuario.delete({
      where: {
        id,
      },
    });
  }

}