import { Router } from "express";
import { authMiddleware } from "./middlewares/authMiddleware";
import { AuthController } from "./controllers/authController";
import { RaffleController } from "./controllers/raffleController";
import { OrderController } from "./controllers/orderController";
import { BuyerController } from "./controllers/buyerController";
import { ConfigController } from "./controllers/configController";
import { DashboardController } from "./controllers/dashboardController";
import { UserController } from "./controllers/userController";
import { CotaPremiadaController } from "./controllers/cotaPremiadaController";
import { TestimonialController } from "./controllers/testimonialController";
import { prisma } from "./db";
import rateLimit from "express-rate-limit";

export const apiRouter = Router();

// ==========================================
// PUBLIC ROUTES
// ==========================================
apiRouter.get("/configuracoes", ConfigController.getPublicConfigs);
apiRouter.get("/rifas", RaffleController.listPublic);
apiRouter.get("/rifas/:id", RaffleController.getDetails);
apiRouter.get("/rifas/:id/numbers", RaffleController.getTakenNumbers);
apiRouter.get("/depoimentos", TestimonialController.listPublic);
apiRouter.post("/depoimentos", rateLimit({ windowMs: 60 * 60 * 1000, limit: 3, standardHeaders: true, legacyHeaders: false }), TestimonialController.submit);
apiRouter.post("/pedidos", OrderController.create);
apiRouter.post("/cupons/validar", rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false }), ConfigController.validateCoupon);
// This static route must precede /pedidos/:hash, which would otherwise catch "ranking".
apiRouter.get("/pedidos/ranking", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  try {
    const ranking = await prisma.$queryRaw<any[]>`
      SELECT c.id AS "compradorId", c.nome AS "nome", c.cidade AS "cidade", c.estado AS "estado",
        COUNT(b.id)::int AS "bilhetes"
      FROM "Pedido" p
      JOIN "Comprador" c ON p."compradorId" = c.id
      JOIN "NumeroBilhete" b ON b."pedidoId" = p.id
      WHERE p.status = 'PAGO' AND b.status = 'PAGO'
      GROUP BY c.id, c.nome, c.cidade, c.estado
      ORDER BY "bilhetes" DESC, c.id ASC
      LIMIT 5
    `;
    res.json(ranking.map((buyer: any) => {
      const parts = String(buyer.nome || "").trim().split(/\s+/).filter(Boolean);
      return {
        nome: parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0] || "Participante",
        cidade: buyer.cidade,
        estado: buyer.estado,
        bilhetes: Number(buyer.bilhetes || 0),
      };
    }));
  } catch {
    res.status(500).json({ error: "Não foi possível carregar o ranking" });
  }
});
apiRouter.get("/estatisticas-publicas", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  try {
    const [pedidosPagos, cotasConfirmadas, buyers] = await Promise.all([
      prisma.pedido.count({ where: { status: "PAGO" } }),
      prisma.numeroBilhete.count({ where: { status: "PAGO" } }),
      prisma.$queryRaw<Array<{ count: number }>>`SELECT COUNT(DISTINCT "compradorId")::int AS count FROM "Pedido" WHERE status = 'PAGO'`,
    ]);
    res.json({ pedidosPagos, cotasConfirmadas, compradoresConfirmados: Number(buyers[0]?.count || 0) });
  } catch {
    res.status(500).json({ error: "Não foi possível carregar os números confirmados" });
  }
});
apiRouter.get("/pedidos/:hash", OrderController.getByHash);
apiRouter.get("/compras", rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false }), OrderController.searchHistory);

// Public Ganhadores listing
apiRouter.get("/ganhadores", async (req, res) => {
  try {
    const list = await prisma.ganhador.findMany({
      include: { rifa: true },
      orderBy: { dataSorteio: "desc" },
    });
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Unified Webhook for automated payment reconciliation
const webhookLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
apiRouter.post("/webhook/pix", webhookLimiter, OrderController.handleWebhook);
apiRouter.post("/webhook/asaas", webhookLimiter, OrderController.handleWebhook);
apiRouter.post("/webhook/mercadopago", webhookLimiter, OrderController.handleMercadoPagoWebhook);


// ==========================================
// ADMINISTRATIVE PORTAL ENTRANCES (JWT SIGNED)
// ==========================================
apiRouter.post("/admin/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false }), AuthController.login);
apiRouter.get("/admin/me", authMiddleware, AuthController.me);

// Statistics and Insights Dashboard
apiRouter.get("/admin/dashboard", authMiddleware, DashboardController.getStats);
apiRouter.get("/admin/depoimentos", authMiddleware, TestimonialController.listAdmin);
apiRouter.patch("/admin/depoimentos/:id", authMiddleware, TestimonialController.review);

// Campaigns management CRUD
apiRouter.post("/admin/rifas", authMiddleware, RaffleController.create);
apiRouter.put("/admin/rifas/:id", authMiddleware, RaffleController.update);
apiRouter.post("/admin/rifas/:id/duplicar", authMiddleware, RaffleController.duplicate);
apiRouter.delete("/admin/rifas/:id", authMiddleware, RaffleController.delete);
apiRouter.post("/admin/rifas/:id/sortear", authMiddleware, RaffleController.executeDraw);

// Combos and Offers
apiRouter.post(
  "/admin/combos",
  authMiddleware,
  RaffleController.addCombo
);

apiRouter.get(
  "/admin/rifas/:id/combos",
  authMiddleware,
  RaffleController.listCombos
);

apiRouter.put(
  "/admin/combos/:id",
  authMiddleware,
  RaffleController.updateCombo
);

apiRouter.delete(
  "/admin/combos/:id",
  authMiddleware,
  RaffleController.deleteCombo
);

// Cotas Premiadas
apiRouter.post(
  "/admin/cotas-premiadas",
  authMiddleware,
  CotaPremiadaController.create
);

apiRouter.get(
  "/admin/rifas/:rifaId/cotas-premiadas",
  authMiddleware,
  CotaPremiadaController.listByRifa
);

apiRouter.get(
  "/admin/cotas-premiadas/:id",
  authMiddleware,
  CotaPremiadaController.getById
);

apiRouter.get(
  "/admin/rifas/:rifaId/cotas-premiadas/numero/:numero",
  authMiddleware,
  CotaPremiadaController.getByNumero
);

apiRouter.get(
  "/admin/rifas/:rifaId/cotas-premiadas/disponiveis",
  authMiddleware,
  CotaPremiadaController.listDisponiveis
);

apiRouter.put(
  "/admin/cotas-premiadas/:id/premiar",
  authMiddleware,
  CotaPremiadaController.marcarComoPremiada
);

apiRouter.put(
  "/admin/cotas-premiadas/:id/cancelar",
  authMiddleware,
  CotaPremiadaController.cancelar
);

apiRouter.delete(
  "/admin/cotas-premiadas/:id",
  authMiddleware,
  CotaPremiadaController.delete
);

// Orders validation control
apiRouter.get("/admin/pedidos", authMiddleware, OrderController.listAdmin);
apiRouter.post("/admin/pedidos/:id/aprovar", authMiddleware, OrderController.approve);
apiRouter.post("/admin/pedidos/:id/cancelar", authMiddleware, OrderController.cancel);

// Buyers and history analytics
apiRouter.get("/admin/compradores", authMiddleware, BuyerController.listAdmin);

// ==========================================
// USERS MANAGEMENT
// ==========================================

// Listar usuários
apiRouter.get(
  "/admin/users",
  authMiddleware,
  UserController.list
);

// Criar usuário
apiRouter.post(
  "/admin/users",
  authMiddleware,
  UserController.create
);

// Atualizar usuário
apiRouter.put(
  "/admin/users/:id",
  authMiddleware,
  UserController.update
);

// Alterar senha
apiRouter.patch(
  "/admin/users/:id/password",
  authMiddleware,
  UserController.updatePassword
);

// Excluir usuário
apiRouter.delete(
  "/admin/users/:id",
  authMiddleware,
  UserController.delete
);

// General configuration switches
apiRouter.post("/admin/configuracoes", authMiddleware, ConfigController.saveConfigs);
apiRouter.get("/admin/configuracoes", authMiddleware, ConfigController.getAdminConfigs);

// High-Performance Multi-Gateway switches configurations
apiRouter.get("/admin/gateways", authMiddleware, ConfigController.listGateways);
apiRouter.post("/admin/gateways", authMiddleware, ConfigController.configureGateway);

// Audit Administrative Logs Tracking
apiRouter.get("/admin/logs", authMiddleware, ConfigController.getAdminLogs);

// Custom Winners management back-channels
apiRouter.post("/admin/ganhadores", authMiddleware, async (req, res) => {
  try {
    const { rifaId, nome, cidade, estado, numeroPremiado, fotoPremioUrl, fotoEntregaUrl, depoimento } = req.body;
    if (!rifaId || !nome || !numeroPremiado) {
      res.status(400).json({ error: "Rifa, nome e número premiado são obrigatórios" });
      return;
    }
    const winner = await prisma.ganhador.create({
      data: {
        rifaId: parseInt(rifaId),
        nome,
        cidade,
        estado,
        numeroPremiado,
        fotoPremioUrl: fotoPremioUrl || "",
        fotoEntregaUrl: fotoEntregaUrl || "",
        depoimento: depoimento || "",
      },
    });
    res.json(winner);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete("/admin/ganhadores/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.ganhador.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
