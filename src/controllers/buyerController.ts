import { Request, Response } from "express";
import { BuyerRepository } from "../repositories/buyerRepository";

export class BuyerController {
  static async listAdmin(req: Request, res: Response) {
    try {
      const compradores = await BuyerRepository.listAll();

      const hydratedBuyers = compradores.map((c) => {
        const paidOrders = c.pedidos.filter((p) => p.status === "PAGO");
        const totalSpent = paidOrders.reduce((sum, p) => sum + p.valorTotal, 0);
        return {
          id: c.id,
          nome: c.nome,
          telefone: c.telefone,
          cidade: c.cidade,
          estado: c.estado,
          cpf: c.cpf,
          totalGasto: totalSpent,
          quantidadeDeCompras: paidOrders.length,
        };
      });

      res.json(hydratedBuyers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
