import { Request, Response } from "express";
import { prisma } from "../db";

export class DashboardController {
  static async getStats(req: Request, res: Response) {
    try {
      const allPaidOrders = await prisma.pedido.findMany({
        where: { status: "PAGO" },
        include: { itens: true },
      });

      const allPendingOrders = await prisma.pedido.findMany({
        where: { status: "PENDENTE" },
        include: { itens: true },
      });

      // Income Totals
      const totalArrecadado = allPaidOrders.reduce((sum, p) => sum + p.valorTotal, 0);

      // Period Sales Calculators
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const salesToday = allPaidOrders
        .filter((p) => p.updatedAt >= startOfToday)
        .reduce((sum, p) => sum + p.valorTotal, 0);

      const salesThisMonth = allPaidOrders
        .filter((p) => p.updatedAt >= startOfMonth)
        .reduce((sum, p) => sum + p.valorTotal, 0);

      const totalCompradores = await prisma.comprador.count();
      const activeRifasCount = await prisma.rifa.count({ where: { status: "ATIVO" } });
      const finishedRifasCount = await prisma.rifa.count({ where: { status: "FINALIZADO" } });

      // Daily historic metrics (last 7 days of sales)
      const salesLastDays = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

        const dayTotalPaid = allPaidOrders
          .filter((p) => p.updatedAt >= dayStart && p.updatedAt <= dayEnd)
          .reduce((sum, p) => sum + p.valorTotal, 0);

        salesLastDays.push({
          data: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          vendas: dayTotalPaid,
        });
      }

      res.json({
        metrics: {
          totalArrecadado,
          salesToday,
          salesThisMonth,
          pedidosPendentes: allPendingOrders.length,
          pedidosPagos: allPaidOrders.length,
          totalCompradores,
          activeRifasCount,
          finishedRifasCount,
        },
        chartData: salesLastDays,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
