import { Request, Response } from "express";
import { OrderRepository } from "../repositories/orderRepository";
import { ReservationService } from "../services/reservationService";
import { PixService } from "../services/payment/pixService";
import { AdminLogRepository } from "../repositories/adminLogRepository";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { broadcastTicketUpdate, broadcastPaymentConfirmed } from "../websocket";
import { prisma } from "../db";

export class OrderController {
  static async create(req: Request, res: Response) {
    try {
      const {
        rifaId,
        numeros,
        quantidade,
        nome,
        telefone,
        cidade,
        estado,
        cpf,
        cupom,
      } = req.body;

      if (!rifaId || !nome || !telefone || !cidade || !estado) {
        res.status(400).json({ error: "Dados incompletos para criação do pedido" });
        return;
      }

      // 1. Reserve numbers securely via transactional Service
      const reservation = await ReservationService.reserve({
        rifaId: parseInt(rifaId),
        numeros,
        quantidade: quantidade ? parseInt(quantidade) : undefined,
        nomeComprador: nome,
        telefoneComprador: telefone,
        cidadeComprador: cidade,
        estadoComprador: estado,
        cpfComprador: cpf,
        cupom: cupom,
      });

      // 2. Generate PIX dynamically using DB-configured gateway!
      const pixPayment = await PixService.generatePix({
        pedidoId: reservation.pedido.id,
        valor: reservation.valorTotal,
        nomeComprador: reservation.comprador.nome,
        cpfComprador: reservation.comprador.cpf || undefined,
        telefoneComprador: reservation.comprador.telefone,
      });

      // 3. Save generated PIX data to order
      const updatedOrder = await OrderRepository.updatePixData(reservation.pedido.id, {
        txid: pixPayment.txid,
        qrCode: pixPayment.qrCode,
        copiaCola: pixPayment.copiaCola,
      });

      const fullOrder = await OrderRepository.findById(updatedOrder.id);
      res.json(fullOrder);
    } catch (error: any) {
      console.error("[OrderController] Erro no Checkout:", error);
      res.status(400).json({ error: error.message });
    }
  }

  static async getByHash(req: Request, res: Response) {
    try {
      const { hash } = req.params;
      const pedido = await OrderRepository.findByHash(hash);

      if (!pedido) {
        res.status(404).json({ error: "Pedido não localizado" });
        return;
      }

      res.json(pedido);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async searchHistory(req: Request, res: Response) {
    try {
      const search = String(req.query.search || "").trim();

      if (!search) {
        res.status(400).json({ error: "Forneça o CPF, telefone ou código do pedido para pesquisar" });
        return;
      }

      if (search.startsWith("PED-")) {
        const p = await OrderRepository.findByHash(search);
        res.json(p ? [p] : []);
        return;
      }

      // Lookup buyers
      const buyers = await prisma.comprador.findMany({
        where: {
          OR: [
            { telefone: { contains: search } },
            { cpf: { contains: search } },
          ],
        },
      });

      if (buyers.length === 0) {
        res.json([]);
        return;
      }

      const orders = await OrderRepository.findHistoryByBuyerIds(buyers.map((b) => b.id));
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async listAdmin(req: Request, res: Response) {
    try {
      const status = req.query.status ? String(req.query.status) : undefined;
      const search = req.query.search ? String(req.query.search).trim() : undefined;

      const items = await OrderRepository.listAll({ status, search });
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async approve(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const order = await OrderRepository.findById(id);

      if (!order) {
        res.status(404).json({ error: "Pedido não localizado" });
        return;
      }

      const approved = await OrderRepository.approveOrder(id);

      // Web Socket Broadcaster
      for (const item of order.itens) {
        const nums = item.numeros.split(",").map((n) => n.trim()).filter(Boolean);
        broadcastTicketUpdate(item.rifaId, {
          numbers: nums,
          status: "PAGO",
        });

        broadcastPaymentConfirmed(approved.hash, {
          complainant: order.comprador.nome,
          numbers: nums,
          total: approved.valorTotal,
        });
      }

      // Log action
      const user = (req as AuthenticatedRequest).user;
      await AdminLogRepository.create({
        usuarioId: user?.id,
        acao: "MANUAL_APPROVE",
        detalhes: `Aprovou manualmente o pedido Hash: "${approved.hash}" (Valor: R$ ${approved.valorTotal})`,
      });

      res.json(approved);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async cancel(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const order = await OrderRepository.findById(id);

      if (!order) {
        res.status(404).json({ error: "Pedido não localizado" });
        return;
      }

      const cancelled = await OrderRepository.cancelOrder(id);

      // Web Socket Broadcaster
      for (const item of order.itens) {
        const nums = item.numeros.split(",").map((n) => n.trim()).filter(Boolean);
        broadcastTicketUpdate(item.rifaId, {
          numbers: nums,
          status: "DISPONIVEL",
        });
      }

      // Log action
      const user = (req as AuthenticatedRequest).user;
      await AdminLogRepository.create({
        usuarioId: user?.id,
        acao: "MANUAL_CANCEL",
        detalhes: `Cancelou o pedido Hash: "${order.hash}" liberando os números: ${order.itens.map((it) => it.numeros).join(",")}`,
      });

      res.json(cancelled);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Unified PIX Gateway webhook processor
   */
  /**
 * Webhook Asaas
 */
static async handleWebhook(req: Request, res: Response) {
  try {
    console.log(
      "[ASAAS WEBHOOK]",
      JSON.stringify(req.body, null, 2)
    );

    const event = req.body.event;
    const payment = req.body.payment;

    if (!payment) {
      res.status(400).json({
        error: "Pagamento não informado"
      });
      return;
    }

    // Processa apenas pagamentos recebidos
    if (
      event !== "PAYMENT_RECEIVED" &&
      event !== "PAYMENT_CONFIRMED"
    ) {
      res.json({
        success: true,
        ignored: true,
        event,
      });
      return;
    }

    const pedidoId = Number(payment.externalReference);

    if (!pedidoId) {
      res.status(400).json({
        error: "externalReference não encontrado"
      });
      return;
    }

    const order = await OrderRepository.findById(pedidoId);

    if (!order) {
      res.status(404).json({
        error: "Pedido não localizado"
      });
      return;
    }

    if (order.status === "PAGO") {
      res.json({
        success: true,
        message: "Pedido já aprovado"
      });
      return;
    }

    const approved = await OrderRepository.approveOrder(order.id);

    // Atualiza frontend em tempo real
    for (const item of order.itens) {
      const nums = item.numeros
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);

      broadcastTicketUpdate(item.rifaId, {
        numbers: nums,
        status: "PAGO",
      });

      broadcastPaymentConfirmed(approved.hash, {
        complainant: order.comprador.nome,
        numbers: nums,
        total: approved.valorTotal,
      });
    }

    await AdminLogRepository.create({
      acao: "ASAAS_WEBHOOK",
      detalhes:
        `Pagamento confirmado. Pedido: ${approved.hash} | ` +
        `PaymentId: ${payment.id}`,
    });

    res.json({
      success: true,
      message: "Pagamento confirmado"
    });

  } catch (error: any) {
    console.error("[ASAAS WEBHOOK ERROR]", error);

    res.status(500).json({
      error: error.message
    });
  }
}
}
