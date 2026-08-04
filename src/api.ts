import { Router } from "express";
import { authMiddleware } from "./middlewares/authMiddleware";
import { AuthController } from "./controllers/authController";
import { RaffleController } from "./controllers/raffleController";
import { OrderController } from "./controllers/orderController";
import { BuyerController } from "./controllers/buyerController";
import { ConfigController } from "./controllers/configController";
import { DashboardController } from "./controllers/dashboardController";
import { prisma } from "./db";

export const apiRouter = Router();

// ==========================================
// PUBLIC ROUTES
// ==========================================
apiRouter.get("/configuracoes", ConfigController.getPublicConfigs);
apiRouter.get("/rifas", RaffleController.listPublic);
apiRouter.get("/rifas/:id", RaffleController.getDetails);
apiRouter.get("/rifas/:id/numbers", RaffleController.getTakenNumbers);
apiRouter.post("/pedidos", OrderController.create);
apiRouter.get("/pedidos/:hash", OrderController.getByHash);
apiRouter.get("/compras", OrderController.searchHistory);

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

// Dynamic Buyer Ranking calculated from successful paid invoices
apiRouter.get("/pedidos/ranking", async (req, res) => {
  try {
    const ranking = await prisma.$queryRaw<any[]>`
      SELECT 
        c.id AS "compradorId",
        c.nome AS "nome",
        c.cidade AS "cidade",
        c.estado AS "estado",
        SUM(it.quantidade)::int AS "bilhetes"
      FROM "Pedido" p
      JOIN "Comprador" c ON p."compradorId" = c.id
      JOIN "ItemPedido" it ON it."pedidoId" = p.id
      WHERE p.status = 'PAGO'
      GROUP BY c.id, c.nome, c.cidade, c.estado
      ORDER BY "bilhetes" DESC
      LIMIT 5
    `;

    const formattedRanking = ranking.map((r: any) => {
      const nameParts = (r.nome || "").split(" ");
      let maskedName = nameParts[0];
      if (nameParts.length > 1) {
        maskedName += " " + nameParts[1][0] + ".";
      }
      
      return {
        nome: maskedName,
        cidade: r.cidade,
        estado: r.estado,
        bilhetes: Number(r.bilhetes || 0),
      };
    });

    res.json(formattedRanking);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Unified Webhook for automated payment reconciliation
apiRouter.post("/webhook/pix", OrderController.handleWebhook);


// ==========================================
// ADMINISTRATIVE PORTAL ENTRANCES (JWT SIGNED)
// ==========================================
apiRouter.post("/admin/login", AuthController.login);
apiRouter.get("/admin/me", authMiddleware, AuthController.me);

// Statistics and Insights Dashboard
apiRouter.get("/admin/dashboard", authMiddleware, DashboardController.getStats);

// Campaigns management CRUD
apiRouter.post("/admin/rifas", authMiddleware, RaffleController.create);
apiRouter.put("/admin/rifas/:id", authMiddleware, RaffleController.update);
apiRouter.post("/admin/rifas/:id/duplicar", authMiddleware, RaffleController.duplicate);
apiRouter.delete("/admin/rifas/:id", authMiddleware, RaffleController.delete);
apiRouter.post("/admin/rifas/:id/sortear", authMiddleware, RaffleController.executeDraw);

// Combos and Offers
apiRouter.post("/admin/combos", authMiddleware, RaffleController.addCombo);
apiRouter.delete("/admin/combos/:id", authMiddleware, RaffleController.deleteCombo);

// Orders validation control
apiRouter.get("/admin/pedidos", authMiddleware, OrderController.listAdmin);
apiRouter.post("/admin/pedidos/:id/aprovar", authMiddleware, OrderController.approve);
apiRouter.post("/admin/pedidos/:id/cancelar", authMiddleware, OrderController.cancel);

// Buyers and history analytics
apiRouter.get("/admin/compradores", authMiddleware, BuyerController.listAdmin);

// General configuration switches
apiRouter.post("/admin/configuracoes", authMiddleware, ConfigController.saveConfigs);

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
