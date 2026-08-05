import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    nome: string;
  };
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    return next(new Error("JWT_SECRET environment variable is missing!"));
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Token de autorização não fornecido",
    });
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      error: "Formato de token inválido. Use 'Bearer <TOKEN>'",
    });
  }

  try {
    const decoded = jwt.verify(parts[1], JWT_SECRET) as {
      id: number;
      email: string;
      nome: string;
    };

    (req as AuthenticatedRequest).user = decoded;

    next();
  } catch {
    return res.status(403).json({
      error: "Token inválido ou expirado",
    });
  }
}