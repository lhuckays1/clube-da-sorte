import { Request, Response } from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is missing!");
}

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        res.status(400).json({ error: "E-mail e senha são obrigatórios" });
        return;
      }

      const usuario = await prisma.usuario.findUnique({
        where: { email },
      });

      if (!usuario) {
        res.status(401).json({ error: "E-mail ou senha incorretos" });
        return;
      }

      const isValid = bcryptjs.compareSync(senha, usuario.senha);
      if (!isValid) {
        res.status(401).json({ error: "E-mail ou senha incorretos" });
        return;
      }

      const token = jwt.sign(
        { id: usuario.id, email: usuario.email, nome: usuario.nome },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        user: {
          id: usuario.id,
          email: usuario.email,
          nome: usuario.nome,
        },
        token,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async me(req: Request, res: Response) {
    const customReq = req as AuthenticatedRequest;
    res.json({ user: customReq.user });
  }
}
