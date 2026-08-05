import { Request, Response } from "express";
import { RaffleRepository } from "../repositories/raffleRepository";
import { OrderRepository } from "../repositories/orderRepository";
import { AdminLogRepository } from "../repositories/adminLogRepository";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { broadcastRaffleStatusUpdate } from "../websocket";
import { prisma } from "../db";

export class RaffleController {
  static async listPublic(req: Request, res: Response) {
    try {
      const statusFilter = req.query.status ? String(req.query.status) : undefined;
      const rifas = await RaffleRepository.listAll(statusFilter);

      const now = new Date();
      // Single aggregation query to fetch counts of sold and reserved tickets for all raffles (solving N+1 queries issue)
      const ticketCounts = await prisma.numeroBilhete.groupBy({
        by: ["rifaId", "status"],
        where: {
          OR: [
            { status: "PAGO" },
            {
              status: "RESERVADO",
              expiraEm: { gt: now },
            },
          ],
        },
        _count: {
          id: true,
        },
      });

      // Map group-by results into of O(1) memory lookup object
      const countsMap: Record<number, { vendidos: number; reservados: number }> = {};
      for (const r of rifas) {
        countsMap[r.id] = { vendidos: 0, reservados: 0 };
      }

      for (const group of ticketCounts) {
        const rId = group.rifaId;
        if (!countsMap[rId]) {
          countsMap[rId] = { vendidos: 0, reservados: 0 };
        }
        if (group.status === "PAGO") {
          countsMap[rId].vendidos = group._count.id;
        } else if (group.status === "RESERVADO") {
          countsMap[rId].reservados = group._count.id;
        }
      }

      const hydratedRifas = rifas.map((rifa) => {
        const counts = countsMap[rifa.id] || { vendidos: 0, reservados: 0 };
        return {
          ...rifa,
          vendidos: counts.vendidos,
          reservados: counts.reservados,
          disponiveis: Math.max(0, rifa.quantidadeTotal - (counts.vendidos + counts.reservados)),
        };
      });

      res.json(hydratedRifas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getDetails(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const rifa = await RaffleRepository.findById(id);

      if (!rifa) {
        res.status(404).json({ error: "Rifa não encontrada" });
        return;
      }

      const takenMap = await OrderRepository.getActiveNumbersMap(rifa.id);
      let paidCount = 0;
      let reservedCount = 0;

      takenMap.forEach((status) => {
        if (status === "PAGO") paidCount++;
        else reservedCount++;
      });

      res.json({
        ...rifa,
        vendidos: paidCount,
        reservados: reservedCount,
        disponiveis: Math.max(0, rifa.quantidadeTotal - (paidCount + reservedCount)),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getTakenNumbers(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const rifa = await RaffleRepository.findById(id);

      if (!rifa) {
        res.status(404).json({ error: "Rifa não encontrada" });
        return;
      }

      const takenMap = await OrderRepository.getActiveNumbersMap(rifa.id);
      const takenObj: Record<string, "RESERVADO" | "PAGO"> = {};
      takenMap.forEach((val, key) => {
        takenObj[key] = val;
      });

      res.json({
        rifaId: rifa.id,
        quantidadeTotal: rifa.quantidadeTotal,
        taken: takenObj,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const {
        titulo,
        descricao,
        regulamento,
        valorPorNumero,
        quantidadeTotal,
        dataSorteio,
        metodoSorteio,
        imagensUrls,
      } = req.body;

      if (!titulo || !valorPorNumero || !quantidadeTotal) {
        res.status(400).json({ error: "Campos obrigatórios de Rifa ausentes" });
        return;
      }

      const r = await RaffleRepository.create({
        titulo,
        descricao: descricao || "",
        regulamento: regulamento || "",
        valorPorNumero: parseFloat(valorPorNumero),
        quantidadeTotal: parseInt(quantidadeTotal),
        dataSorteio: dataSorteio ? new Date(dataSorteio) : null,
        metodoSorteio: metodoSorteio || "AVULSO",
      });

      if (Array.isArray(imagensUrls) && imagensUrls.length > 0) {
        await RaffleRepository.createImages(r.id, imagensUrls);
      } else {
        await RaffleRepository.createImages(r.id, [
          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
        ]);
      }

      // Log action
      const user = (req as AuthenticatedRequest).user;
      await AdminLogRepository.create({
        usuarioId: user?.id,
        acao: "CREATE_RIFA",
        detalhes: `Rifa criada: "${titulo}" (ID: ${r.id}, Valor: ${valorPorNumero})`,
      });

      res.json(r);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const {
        titulo,
        descricao,
        regulamento,
        valorPorNumero,
        status,
        dataSorteio,
        metodoSorteio,
        imagensUrls,
      } = req.body;

      const updatedRifa = await RaffleRepository.update(id, {
        titulo,
        descricao,
        regulamento,
        valorPorNumero: valorPorNumero ? parseFloat(valorPorNumero) : undefined,
        status,
        dataSorteio: dataSorteio ? new Date(dataSorteio) : undefined,
        metodoSorteio,
      });

      if (Array.isArray(imagensUrls)) {
        await RaffleRepository.deleteImages(id);
        if (imagensUrls.length > 0) {
          await RaffleRepository.createImages(id, imagensUrls);
        } else {
          await RaffleRepository.createImages(id, [
            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
          ]);
        }
      }

      if (status) {
        broadcastRaffleStatusUpdate(id, status);
      }

      // Log action
      const user = (req as AuthenticatedRequest).user;
      await AdminLogRepository.create({
        usuarioId: user?.id,
        acao: "UPDATE_RIFA",
        detalhes: `Rifa editada: "${titulo}" (ID: ${id}, Status: ${status})`,
      });

      res.json(updatedRifa);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async duplicate(req: Request, res: Response) {
    try {
      const sourceId = parseInt(req.params.id);
      const sourceRifa = await RaffleRepository.findById(sourceId);

      if (!sourceRifa) {
        res.status(404).json({ error: "Rifa origem não encontrada" });
        return;
      }

      const newRifa = await RaffleRepository.create({
        titulo: `${sourceRifa.titulo} (Cópia)`,
        descricao: sourceRifa.descricao,
        regulamento: sourceRifa.regulamento,
        valorPorNumero: sourceRifa.valorPorNumero,
        quantidadeTotal: sourceRifa.quantidadeTotal,
        metodoSorteio: sourceRifa.metodoSorteio,
        dataSorteio: sourceRifa.dataSorteio,
      });

      // Duplicate images
      if (sourceRifa.imagens.length > 0) {
        await RaffleRepository.createImages(
          newRifa.id,
          sourceRifa.imagens.map((img) => img.url)
        );
      }

      // Duplicate combos
      for (const combo of sourceRifa.combos) {
        await RaffleRepository.createCombo(newRifa.id, {
          nome: combo.nome,
          quantidade: combo.quantidade,
          desconto: combo.desconto,
          valorFinal: combo.valorFinal,
        });
      }

      // Log action
      const user = (req as AuthenticatedRequest).user;
      await AdminLogRepository.create({
        usuarioId: user?.id,
        acao: "DUPLICATE_RIFA",
        detalhes: `Duplicou a rifa ID: ${sourceId} para a nova ID: ${newRifa.id}`,
      });

      res.json(newRifa);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      
      const rifa = await RaffleRepository.findById(id);
      
      await RaffleRepository.delete(id);

      // Log action
      const user = (req as AuthenticatedRequest).user;
      await AdminLogRepository.create({
        usuarioId: user?.id,
        acao: "DELETE_RIFA",
        detalhes: `Excluiu permanentemente a Rifa: "${rifa?.titulo}" (ID: ${id})`,
      });

      res.json({ success: true, message: "Rifa excluída permanentemente" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async addCombo(req: Request, res: Response) {
    try {
      const { rifaId, nome, quantidade, desconto } = req.body;

      if (!rifaId || !nome || !quantidade || desconto === undefined) {
        res.status(400).json({ error: "Preencha todos os campos do combo promocional" });
        return;
      }

      const r = await RaffleRepository.findById(parseInt(rifaId));
      if (!r) {
        res.status(404).json({ error: "Rifa não localizada" });
        return;
      }

      const baseValue = parseInt(quantidade) * r.valorPorNumero;
      const descPct = parseFloat(desconto) / 100;
      const finalVal = baseValue * (1 - descPct);

      const combo = await RaffleRepository.createCombo(parseInt(rifaId), {
        nome,
        quantidade: parseInt(quantidade),
        desconto: parseFloat(desconto),
        valorFinal: finalVal,
      });

      // Log action
      const user = (req as AuthenticatedRequest).user;
      await AdminLogRepository.create({
        usuarioId: user?.id,
        acao: "ADD_COMBO",
        detalhes: `Combo cadastrado: "${nome}" (${quantidade} cotas com ${desconto}% de desconto) na Rifa ID: ${rifaId}`,
      });

      res.json(combo);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async listCombos(req: Request, res: Response) {
    try {
      const rifaId = parseInt(req.params.id);

      const rifa = await RaffleRepository.findById(rifaId);

      if (!rifa) {
        res.status(404).json({
          error: "Rifa não encontrada",
        });
        return;
      }

      const combos = await RaffleRepository.listCombos(rifaId);

      res.json(combos);
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  }

  static async updateCombo(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);

      const {
        nome,
        quantidade,
        desconto,
      } = req.body;

      const combo = await prisma.combo.findUnique({
        where: {
          id,
        },
        include: {
          rifa: true,
        },
      });

      if (!combo) {
        res.status(404).json({
          error: "Combo não encontrado",
        });
        return;
      }

      const valorBase =
        Number(quantidade) * combo.rifa.valorPorNumero;

      const valorFinal =
        valorBase * (1 - Number(desconto) / 100);

      const updated = await RaffleRepository.updateCombo(id, {
        nome,
        quantidade: Number(quantidade),
        desconto: Number(desconto),
        valorFinal,
      });

      // Log administrativo
      const user = (req as AuthenticatedRequest).user;

      await AdminLogRepository.create({
        usuarioId: user?.id,
        acao: "UPDATE_COMBO",
        detalhes: `Combo atualizado: "${nome}" (ID: ${id})`,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  }

  static async deleteCombo(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      await RaffleRepository.deleteCombo(id);

      // Log action
      const user = (req as AuthenticatedRequest).user;
      await AdminLogRepository.create({
        usuarioId: user?.id,
        acao: "DELETE_COMBO",
        detalhes: `Removeu o Combo promocional ID: ${id}`,
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async executeDraw(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const {
        numeroVencedorManual,
        metodo,
        nomeVencedorSelec,
        cidadeVencedorSelec,
        estadoVencedorSelec,
        fotoPremioUrl,
        fotoEntregaUrl,
        depoimento,
      } = req.body;

      const rifa = await RaffleRepository.findById(id);
      if (!rifa) {
        res.status(404).json({ error: "Rifa não encontrada" });
        return;
      }

      const numMap = await OrderRepository.getActiveNumbersMap(id);
      const paidTickets: string[] = [];
      numMap.forEach((status, num) => {
        if (status === "PAGO") paidTickets.push(num);
      });

      let winningNumber = "";

      if (metodo === "AUTOMATICO" || rifa.metodoSorteio === "AUTOMATICO") {
        if (paidTickets.length === 0) {
          res.status(400).json({ error: "Nenhum número foi pago nesta rifa para sorteio automático." });
          return;
        }
        const randIdx = Math.floor(Math.random() * paidTickets.length);
        winningNumber = paidTickets[randIdx];
      } else if (metodo === "MANUAL" || numeroVencedorManual) {
        winningNumber = String(numeroVencedorManual || "").trim();
      } else {
        res.status(400).json({ error: "Forma de sorteio inválido ou nenhum número especificado." });
        return;
      }

      // Create primary Sorteio record (from new schema)
      const sorteioSorteado = await RaffleRepository.createSorteio(id, {
        tituloSorteio: `Sorteio Oficial - ${rifa.titulo}`,
      });

      await RaffleRepository.updateSorteioRealizado(sorteioSorteado.id, winningNumber, JSON.stringify(req.body));

      let winnerCompradorName = nomeVencedorSelec || "Comprador de Sorteio";
      let winnerCity = cidadeVencedorSelec || "São Paulo";
      let winnerState = estadoVencedorSelec || "SP";

      // Match ticket owner
      const itemVencedor = await prisma.itemPedido.findFirst({
        where: {
          rifaId: id,
          pedido: { status: "PAGO" },
          numeros: { contains: winningNumber },
        },
        include: {
          pedido: { include: { comprador: true } },
        },
      });

      if (itemVencedor) {
        const numList = itemVencedor.numeros.split(",").map((n) => n.trim());
        if (numList.includes(winningNumber)) {
          winnerCompradorName = itemVencedor.pedido.comprador.nome;
          winnerCity = itemVencedor.pedido.comprador.cidade;
          winnerState = itemVencedor.pedido.comprador.estado;
        }
      }

      // Update Rifa and Winner fields in Prisma
      await RaffleRepository.update(id, {
        status: "FINALIZADO",
        resultado: winningNumber,
      });

      const winnerData = await prisma.ganhador.create({
        data: {
          rifaId: id,
          sorteioId: sorteioSorteado.id,
          nome: winnerCompradorName,
          cidade: winnerCity,
          estado: winnerState,
          numeroPremiado: winningNumber,
          fotoPremioUrl: fotoPremioUrl || "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=400&q=80",
          fotoEntregaUrl: fotoEntregaUrl || "",
          depoimento: depoimento || "Fiquei muito feliz em ganhar!",
        },
      });

      broadcastRaffleStatusUpdate(id, "FINALIZADO");

      // Log action
      const user = (req as AuthenticatedRequest).user;
      await AdminLogRepository.create({
        usuarioId: user?.id,
        acao: "DRAW_EXECUTION",
        detalhes: `Sorteio concluído na Rifa: "${rifa.titulo}" (ID: ${id}). Vencedor: ${winningNumber} (${winnerCompradorName})`,
      });

      res.json({
        success: true,
        winningNumber,
        winner: winnerData,
        sorteio: sorteioSorteado,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
