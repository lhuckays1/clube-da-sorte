import { Request, Response } from "express";
import { UserRepository } from "../repositories/userRepository";
import { AdminLogRepository } from "../repositories/adminLogRepository";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

export class UserController {

  static async list(req: Request, res: Response) {
    try {
      const usuarios = await UserRepository.listAll();

      res.json(usuarios);

    } catch (error: any) {

      res.status(500).json({
        error: error.message,
      });

    }
  }

  static async create(req: Request, res: Response) {
    try {

      const {
        nome,
        email,
        senha,
      } = req.body;

      if (!nome || !email || !senha) {
        return res.status(400).json({
          error: "Todos os campos são obrigatórios.",
        });
      }

      const existe = await UserRepository.findByEmail(email);

      if (existe) {
        return res.status(400).json({
          error: "Já existe um usuário com este e-mail.",
        });
      }

      const usuario = await UserRepository.create({
        nome,
        email,
        senha,
      });

      const user = (req as AuthenticatedRequest).user;

      await AdminLogRepository.create({
        usuarioId: user?.id,
        acao: "CREATE_USER",
        detalhes: `Criou o usuário ${usuario.nome} (${usuario.email})`,
      });

      res.json(usuario);

    } catch (error: any) {

      res.status(500).json({
        error: error.message,
      });

    }
  }

  static async update(req: Request, res: Response) {

    try {

      const id = parseInt(req.params.id);

      const {
        nome,
        email,
      } = req.body;

      const usuario = await UserRepository.findById(id);

      if (!usuario) {
        return res.status(404).json({
          error: "Usuário não encontrado.",
        });
      }

      const atualizado = await UserRepository.update(id, {
        nome,
        email,
      });

      const user = (req as AuthenticatedRequest).user;

      await AdminLogRepository.create({
        usuarioId: user?.id,
        acao: "UPDATE_USER",
        detalhes: `Atualizou o usuário ${atualizado.nome}`,
      });

      res.json(atualizado);

    } catch (error: any) {

      res.status(500).json({
        error: error.message,
      });

    }

  }

  static async updatePassword(req: Request, res: Response) {

    try {

      const id = parseInt(req.params.id);

      const { senha } = req.body;

      if (!senha) {
        return res.status(400).json({
          error: "Informe a nova senha.",
        });
      }

      await UserRepository.updatePassword(id, senha);

      const user = (req as AuthenticatedRequest).user;

      await AdminLogRepository.create({
        usuarioId: user?.id,
        acao: "CHANGE_USER_PASSWORD",
        detalhes: `Alterou a senha do usuário ID ${id}`,
      });

      res.json({
        success: true,
      });

    } catch (error: any) {

      res.status(500).json({
        error: error.message,
      });

    }

  }

  static async delete(req: Request, res: Response) {

    try {

      const id = parseInt(req.params.id);

      const user = (req as AuthenticatedRequest).user;

        if (user?.id === id) {
        return res.status(400).json({
            error: "Você não pode excluir o próprio usuário.",
        });
        }

      const usuario = await UserRepository.findById(id);

      if (!usuario) {
        return res.status(404).json({
          error: "Usuário não encontrado.",
        });
      }

      await UserRepository.delete(id);

      await AdminLogRepository.create({
        usuarioId: user?.id,
        acao: "DELETE_USER",
        detalhes: `Excluiu o usuário ${usuario.nome}`,
      });

      res.json({
        success: true,
      });

    } catch (error: any) {

      res.status(500).json({
        error: error.message,
      });

    }

  }

}