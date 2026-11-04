import { Request, Response } from "express";
import { OrderRepository } from "../repositories/orderRepository";
import { ReservationService } from "../services/reservationService";
import { PixService } from "../services/payment/pixService";
import { AdminLogRepository } from "../repositories/adminLogRepository";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { broadcastTicketUpdate, broadcastPaymentConfirmed } from "../websocket";
import { prisma } from "../db";
import crypto from "node:crypto";
import { GatewayRepository } from "../repositories/gatewayRepository";

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

      const fullOrder = await OrderRepository.findByHash(updatedOrder.hash);
      res.json(publicOrder(fullOrder));
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

      res.json(publicOrder(pedido));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async searchHistory(req: Request, res: Response) {
    try {
      const search = String(req.query.search || "").trim();

      if (search.startsWith("PED-")) {
        if (search.length > 80) return res.status(400).json({ error: "Código de pedido inválido" });
        const order = await OrderRepository.findByHash(search);
        return res.json(order ? [publicOrder(order)] : []);
      }

      // Mantém consulta para clientes, mas só aceita identificador completo e exato.
      const buyers = await prisma.comprador.findMany({
        where: { OR: [{ telefone: search }, { cpf: search }] },
        select: { id: true },
        take: 25,
      });
      if (!buyers.length) return res.json([]);
      const orders = await OrderRepository.findHistoryByBuyerIds(buyers.map(({ id }) => id));
      res.json(orders.map(publicOrder));
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

      if (order.status !== "PENDENTE") {
        res.status(409).json({ error: "Pedido não está pendente" });
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
/**
 * Webhook Asaas
 */
static async handleWebhook(req: Request, res: Response) {
  try {
    const event = req.body?.event;
    const payment = req.body?.payment;
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
    const receivedToken = req.header("asaas-access-token") || "";
    if (!expectedToken || !receivedToken || !safeEqual(receivedToken, expectedToken)) {
      return res.status(401).json({ error: "Webhook não autenticado" });
    }

    if (!payment) {
      return res.status(400).json({ error: "Pagamento não informado" });
    }

    // Eventos que confirmam pagamento
    if (
      event !== "PAYMENT_RECEIVED" &&
      event !== "PAYMENT_CONFIRMED"
    ) {
      return res.status(200).json({ success: true, ignored: true });
    }

    const pedidoId = Number(payment.externalReference);

    if (!pedidoId || Number.isNaN(pedidoId)) {
      return res.status(400).json({ error: "externalReference inválido" });
    }

    const order = await OrderRepository.findById(pedidoId);

      if (!order) {
        return res.status(404).json({ error: "Pedido não localizado" });
      }

    if (!payment.id || !order.pixTxid || order.pixTxid !== payment.id) {
      return res.status(400).json({ error: "Cobrança não corresponde ao pedido" });
    }

    if (order.status === "PAGO") return res.status(200).json({ success: true, duplicate: true });
    if (order.status !== "PENDENTE" || order.expiracaoPix < new Date()) {
      await AdminLogRepository.create({ acao: "LATE_PAYMENT_REVIEW", detalhes: `Pagamento recebido para pedido ${order.hash} fora do estado pendente; verificar no provedor.` });
      return res.status(200).json({ success: true, reviewRequired: true });
    }

    // Independently confirm the current charge with Asaas before changing local state.
    const asaasConfig = await GatewayRepository.findByNome("ASAAS");
    let configuredAsaasKey = "";
    try { configuredAsaasKey = JSON.parse(asaasConfig?.credenciais || "{}").apiKey || ""; } catch {}
    const apiKey = process.env.ASAAS_API_KEY || configuredAsaasKey;
    if (!apiKey) return res.status(503).json({ error: "Verificação do provedor indisponível" });
    const asaasEnvironment = process.env.ASAAS_ENV || asaasConfig?.ambiente || "SANDBOX";
    const baseUrl = asaasEnvironment === "PRODUCTION" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
    const providerRes = await fetch(`${baseUrl}/payments/${encodeURIComponent(payment.id)}`, { headers: { access_token: apiKey } });
    if (!providerRes.ok) return res.status(502).json({ error: "Não foi possível verificar a cobrança" });
    const verified = await providerRes.json() as any;
    if (String(verified.id) !== order.pixTxid || String(verified.externalReference) !== String(order.id) || !["RECEIVED", "CONFIRMED"].includes(verified.status) || Math.round(Number(verified.value) * 100) !== Math.round(order.valorTotal * 100) || verified.currency && verified.currency !== "BRL") {
      return res.status(400).json({ error: "Cobrança não confere com o pedido" });
    }

    const approved = await OrderRepository.approveOrder(order.id);

    // Atualiza frontend em tempo real
    if (order.itens && order.itens.length > 0) {
      for (const item of order.itens) {
        const nums = item.numeros
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean);

        try {
          broadcastTicketUpdate(item.rifaId, {
            numbers: nums,
            status: "PAGO",
          });

          broadcastPaymentConfirmed(approved.hash, {
            complainant: order.comprador.nome,
            numbers: nums,
            total: approved.valorTotal,
          });

        } catch (socketError) {
          // Erro de socket NÃO pode impedir confirmação do pagamento
          console.error(
            "[ASAAS WEBHOOK] Erro no broadcast Socket:",
            socketError
          );
        }
      }
    }

    // Log administrativo também não deve impedir resposta ao Asaas
    try {
      await AdminLogRepository.create({
        acao: "ASAAS_WEBHOOK",
        detalhes:
          `Pagamento confirmado. Pedido: ${approved.hash} | ` +
          `PaymentId: ${payment.id}`,
      });
    } catch (logError) {
      console.error(
        "[ASAAS WEBHOOK] Erro ao criar log administrativo:",
        logError
      );
    }

    return res.status(200).json({
      success: true,
      message: "Pagamento confirmado"
    });

  } catch (error: any) {

    console.error("[ASAAS WEBHOOK] Falha de processamento:", error?.message || "erro interno");

    // Sempre responde JSON para o Asaas
    return res.status(500).json({
      success: false,
      error: "Erro interno ao processar webhook"
    });
  }
}

static async handleMercadoPagoWebhook(req: Request, res: Response) {
  try {
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    const signature = req.header("x-signature") || "";
    const requestId = req.header("x-request-id") || "";
    const dataId = String(req.query["data.id"] || req.body?.data?.id || "").toLowerCase();
    if (!secret || !signature || !requestId || !dataId) return res.status(401).json({ error: "Notificação sem assinatura válida" });

    const parts = Object.fromEntries(signature.split(",").map((part) => part.trim().split("=", 2) as [string, string]));
    if (!parts.ts || !parts.v1) return res.status(401).json({ error: "Assinatura inválida" });
    const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;
    const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
    if (!safeEqual(expected, parts.v1)) return res.status(401).json({ error: "Assinatura inválida" });

    if (req.body?.type !== "payment" && req.query.topic !== "payment") return res.status(200).json({ success: true, ignored: true });
    const mpConfig = await GatewayRepository.findByNome("MERCADO_PAGO");
    let configuredMpToken = "";
    try { configuredMpToken = JSON.parse(mpConfig?.credenciais || "{}").accessToken || ""; } catch {}
    const accessToken = process.env.MERCADO_PAGO_TOKEN || configuredMpToken;
    if (!accessToken) return res.status(503).json({ error: "Verificação do provedor indisponível" });
    const providerRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!providerRes.ok) return res.status(502).json({ error: "Não foi possível verificar o pagamento" });
    const payment = await providerRes.json() as any;
    if (payment.status !== "approved") return res.status(200).json({ success: true, ignored: true });
    const orderId = Number(payment.external_reference);
    if (!Number.isSafeInteger(orderId) || orderId <= 0) return res.status(400).json({ error: "Referência do pedido inválida" });
    const order = await OrderRepository.findById(orderId);
    if (!order || order.pixTxid !== String(payment.id) || Math.round(Number(payment.transaction_amount) * 100) !== Math.round(order.valorTotal * 100) || payment.currency_id !== "BRL") {
      return res.status(400).json({ error: "Pagamento não corresponde ao pedido" });
    }
    if (order.status === "PAGO") return res.status(200).json({ success: true, duplicate: true });
    if (order.status !== "PENDENTE" || order.expiracaoPix < new Date()) {
      await AdminLogRepository.create({ acao: "LATE_PAYMENT_REVIEW", detalhes: `Pagamento Mercado Pago recebido para pedido ${order.hash} fora do estado pendente; verificar no provedor.` });
      return res.status(200).json({ success: true, reviewRequired: true });
    }
    const approved = await OrderRepository.approveOrder(order.id);
    for (const item of order.itens) {
      const numbers = item.numeros.split(",").map((n) => n.trim()).filter(Boolean);
      broadcastTicketUpdate(item.rifaId, { numbers, status: "PAGO" });
      broadcastPaymentConfirmed(approved.hash, { complainant: order.comprador.nome, numbers, total: approved.valorTotal });
    }
    await AdminLogRepository.create({ acao: "MERCADO_PAGO_WEBHOOK", detalhes: `Pagamento confirmado para pedido ${approved.hash}.` });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("[Mercado Pago webhook] Falha de processamento:", error?.message || "erro interno");
    return res.status(500).json({ error: "Erro interno ao processar webhook" });
  }
}
}

function safeEqual(a: string, b: string): boolean {
  const ah = crypto.createHash("sha256").update(a).digest();
  const bh = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ah, bh);
}

function publicOrder(order: any) {
  if (!order) return order;
  return {
    id: order.id, hash: order.hash, status: order.status, valorTotal: order.valorTotal,
    pixQrCode: order.pixQrCode, pixCopiaCola: order.pixCopiaCola,
    expiracaoPix: order.expiracaoPix, createdAt: order.createdAt,
    comprador: { nome: order.comprador?.nome, cidade: order.comprador?.cidade, estado: order.comprador?.estado },
    itens: order.itens?.map((item: any) => ({ ...item, rifa: item.rifa ? { id: item.rifa.id, titulo: item.rifa.titulo, imagens: item.rifa.imagens } : undefined })),
    cotasPremiadas: order.cotasPremiadas?.map((cota: any) => ({ id: cota.id, rifaId: cota.rifaId, numero: cota.numero, premio: cota.premio, status: cota.status, premiadoEm: cota.premiadoEm })),
  };
}
