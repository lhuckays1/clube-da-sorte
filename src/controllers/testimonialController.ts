import { Request, Response } from "express";
import { prisma } from "../db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { AdminLogRepository } from "../repositories/adminLogRepository";

const orderCodePattern = /^PED-(?:[0-9A-F]{48}|[A-Z0-9]{7}-[0-9]{4})$/;

function publicName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || "Participante";
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export class TestimonialController {
  static async listPublic(_req: Request, res: Response) {
    try {
      const testimonials = await prisma.depoimento.findMany({
        where: { status: "APROVADO" },
        select: { id: true, nomePublico: true, mensagem: true, avaliacao: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 12,
      });
      return res.json(testimonials);
    } catch {
      return res.status(500).json({ error: "Não foi possível carregar os depoimentos" });
    }
  }

  static async submit(req: Request, res: Response) {
    const orderCode = String(req.body?.codigoPedido || "").trim().toUpperCase();
    const message = String(req.body?.mensagem || "").trim();
    const rating = Number(req.body?.avaliacao);

    if (!orderCodePattern.test(orderCode)) {
      return res.status(400).json({ error: "Informe o código completo de um pedido pago" });
    }
    if (message.length < 10 || message.length > 600) {
      return res.status(400).json({ error: "O depoimento deve ter entre 10 e 600 caracteres" });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Escolha uma avaliação de 1 a 5 estrelas" });
    }

    try {
      const order = await prisma.pedido.findUnique({
        where: { hash: orderCode },
        select: { id: true, status: true, comprador: { select: { nome: true } } },
      });
      if (!order || order.status !== "PAGO") {
        return res.status(404).json({ error: "Não encontramos uma compra paga com esse código" });
      }

      const testimonial = await prisma.depoimento.create({
        data: {
          pedidoId: order.id,
          nomePublico: publicName(order.comprador.nome),
          mensagem: message,
          avaliacao: rating,
        },
        select: { id: true },
      });
      return res.status(201).json({ success: true, id: testimonial.id, message: "Depoimento recebido. Ele ficará visível após a revisão da equipe." });
    } catch (error: any) {
      if (error?.code === "P2002") {
        return res.status(409).json({ error: "Este pedido já enviou um depoimento" });
      }
      return res.status(500).json({ error: "Não foi possível enviar o depoimento" });
    }
  }

  static async listAdmin(req: Request, res: Response) {
    try {
      const status = String(req.query.status || "PENDENTE");
      if (!["PENDENTE", "APROVADO", "REJEITADO"].includes(status)) {
        return res.status(400).json({ error: "Filtro de situação inválido" });
      }
      const testimonials = await prisma.depoimento.findMany({
        where: { status },
        select: { id: true, nomePublico: true, mensagem: true, avaliacao: true, status: true, createdAt: true, revisadoEm: true },
        orderBy: { createdAt: "asc" },
        take: 100,
      });
      return res.json(testimonials);
    } catch {
      return res.status(500).json({ error: "Não foi possível carregar a fila de depoimentos" });
    }
  }

  static async review(req: Request, res: Response) {
    const id = Number(req.params.id);
    const status = String(req.body?.status || "");
    if (!Number.isSafeInteger(id) || id <= 0 || !["APROVADO", "REJEITADO"].includes(status)) {
      return res.status(400).json({ error: "Ação de revisão inválida" });
    }

    try {
      const updated = await prisma.depoimento.updateMany({
        where: { id, status: "PENDENTE" },
        data: { status, revisadoEm: new Date(), revisadoPor: (req as AuthenticatedRequest).user?.id ?? null },
      });
      if (updated.count !== 1) {
        return res.status(404).json({ error: "Depoimento pendente não encontrado" });
      }
      await AdminLogRepository.create({
        usuarioId: (req as AuthenticatedRequest).user?.id,
        acao: status === "APROVADO" ? "TESTIMONIAL_APPROVED" : "TESTIMONIAL_REJECTED",
        detalhes: `${status === "APROVADO" ? "Aprovou" : "Rejeitou"} o depoimento ${id}`,
      });
      return res.json({ success: true, status });
    } catch {
      return res.status(500).json({ error: "Não foi possível revisar o depoimento" });
    }
  }
}
