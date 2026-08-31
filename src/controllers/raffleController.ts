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
        temCotasPremiadas,
        quantidadeCotasPremiadas,
        valorCotaPremiada,
      } = req.body;

      if (!titulo || !valorPorNumero || !quantidadeTotal) {
        res.status(400).json({ error: "Campos obrigatórios de Rifa ausentes" });
        return;
      }

      const quantidadeTotalNumerica = parseInt(quantidadeTotal);
      const valorPorNumeroNumerico = parseFloat(valorPorNumero);

      const temCotasPremiadasNumerico = Boolean(temCotasPremiadas);

      const quantidadeCotasNumerica = temCotasPremiadasNumerico
        ? parseInt(quantidadeCotasPremiadas)
        : 0;

      const valorCotaNumerico = temCotasPremiadasNumerico
        ? parseFloat(valorCotaPremiada)
        : 0;

      if (
        !Number.isInteger(quantidadeTotalNumerica) ||
        quantidadeTotalNumerica < 1
      ) {
        res.status(400).json({
          error: "A quantidade total de números da rifa é inválida.",
        });
        return;
      }

      if (
        temCotasPremiadasNumerico &&
        quantidadeCotasNumerica > quantidadeTotalNumerica
      ) {
        res.status(400).json({
          error: `A quantidade de cotas premiadas não pode ser maior que a quantidade total da rifa (${quantidadeTotalNumerica}).`,
        });
        return;
      }

      if (
        temCotasPremiadasNumerico &&
        (!Number.isFinite(valorCotaNumerico) || valorCotaNumerico <= 0)
      ) {
        res.status(400).json({
          error: "O valor de cada cota premiada deve ser maior que zero.",
        });
        return;
      }

      const r = await RaffleRepository.create({
        titulo,
        descricao: descricao || "",
        regulamento: regulamento || "",
        valorPorNumero: valorPorNumeroNumerico,
        quantidadeTotal: quantidadeTotalNumerica,
        dataSorteio: dataSorteio ? new Date(dataSorteio) : null,
        metodoSorteio: metodoSorteio || "AVULSO",

        temCotasPremiadas: temCotasPremiadasNumerico,
        quantidadeCotasPremiadas: quantidadeCotasNumerica,
        valorCotaPremiada: valorCotaNumerico,
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
        temCotasPremiadas: false,
        quantidadeCotasPremiadas: 0,
        valorCotaPremiada: 0,
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

    // ==========================================
    // 1. BUSCAR RIFA
    // ==========================================

    const rifa = await RaffleRepository.findById(id);

    if (!rifa) {
      res.status(404).json({
        error: "Rifa não encontrada",
      });
      return;
    }

    // Segurança: impedir novo sorteio de rifa já finalizada
    if (rifa.status === "FINALIZADO") {
      res.status(400).json({
        error:
          "Esta rifa já está finalizada. A apuração não pode ser executada novamente.",
      });
      return;
    }

    // ==========================================
    // 2. BUSCAR NÚMEROS PAGOS
    // ==========================================

    const numMap = await OrderRepository.getActiveNumbersMap(id);

    const paidTickets: string[] = [];

    numMap.forEach((status, num) => {
      if (status === "PAGO") {
        paidTickets.push(num);
      }
    });

    if (paidTickets.length === 0) {
      res.status(400).json({
        error: "Nenhum número pago foi encontrado nesta rifa.",
      });
      return;
    }

    let winningNumber = "";
    let resultadoOriginal: string | null = null;
    let calculoApuracao: string | null = null;

    // ==========================================
    // 3. SORTEIO AUTOMÁTICO
    // ==========================================

    if (
      metodo === "AUTOMATICO" ||
      rifa.metodoSorteio === "AUTOMATICO"
    ) {
      const randIdx = Math.floor(
        Math.random() * paidTickets.length
      );

      winningNumber = paidTickets[randIdx];

      calculoApuracao =
        `Sorteio automático entre ${paidTickets.length} cotas pagas. ` +
        `Número selecionado: ${winningNumber}`;
    }

    // ==========================================
    // 4. APURAÇÃO MANUAL / LOTERIA FEDERAL
    // ==========================================

    else if (metodo === "MANUAL" || numeroVencedorManual) {

      if (
        numeroVencedorManual === undefined ||
        numeroVencedorManual === null ||
        String(numeroVencedorManual).trim() === ""
      ) {
        res.status(400).json({
          error: "Informe o resultado para realizar a apuração.",
        });
        return;
      }

      // Guarda o resultado original informado
      resultadoOriginal = String(numeroVencedorManual).trim();

      // Remove qualquer caractere que não seja número
      const resultadoLimpo = resultadoOriginal.replace(/\D/g, "");

      if (!resultadoLimpo) {
        res.status(400).json({
          error:
            "Resultado inválido. Informe apenas números para realizar a apuração.",
        });
        return;
      }

      // Converte para número
      const resultadoNumerico = Number(resultadoLimpo);

      if (!Number.isSafeInteger(resultadoNumerico)) {
        res.status(400).json({
          error:
            "Resultado inválido ou muito grande para ser processado.",
        });
        return;
      }

      // Quantidade total de números da rifa
      const quantidadeTotal = Number(rifa.quantidadeTotal);

      if (
        !Number.isInteger(quantidadeTotal) ||
        quantidadeTotal <= 0
      ) {
        res.status(400).json({
          error:
            "A rifa possui uma quantidade total de cotas inválida.",
        });
        return;
      }

      // ==========================================
      // REGRA DE CONVERSÃO
      //
      // Exemplo:
      // Resultado: 008932
      // Número: 8932
      // Total de cotas: 300
      //
      // 8932 % 300 = 232
      // ==========================================

      const numeroConvertido =
        resultadoNumerico % quantidadeTotal;

      // ==========================================
      // FORMATA O NÚMERO CONFORME A FAIXA DA RIFA
      // ==========================================
      //
      // Exemplos:
      // 100 cotas  → 00 até 99     → 2 dígitos
      // 300 cotas  → 000 até 299   → 3 dígitos
      // 1.000 cotas → 000 até 999  → 3 dígitos
      // 10.000 cotas → 0000 até 9999 → 4 dígitos
      //

      const quantidadeDigitos = String(quantidadeTotal - 1).length;

      winningNumber = String(numeroConvertido).padStart(
        quantidadeDigitos,
        "0"
      );

      calculoApuracao =
        `${resultadoLimpo} % ${quantidadeTotal} = ${numeroConvertido}`;
    }

    // ==========================================
    // 5. MÉTODO INVÁLIDO
    // ==========================================

    else {
      res.status(400).json({
        error:
          "Forma de sorteio inválida ou nenhum número especificado.",
      });
      return;
    }

    // ==========================================
    // 6. PROCURAR EXATAMENTE A COTA VENCEDORA
    // ==========================================

    const bilheteVencedor =
      await prisma.numeroBilhete.findFirst({
        where: {
          rifaId: id,
          numero: winningNumber,
          status: "PAGO",
        },
        include: {
          pedido: {
            include: {
              comprador: true,
            },
          },
        },
      });

    // ==========================================
    // 7. SEGURANÇA:
    // NÃO FINALIZAR SEM GANHADOR
    // ==========================================

    if (!bilheteVencedor) {
      res.status(400).json({
        error:
          `O número apurado (${winningNumber}) não possui uma cota paga. ` +
          `A rifa NÃO foi finalizada.`,
        resultadoOriginal,
        numeroApurado: winningNumber,
        calculo: calculoApuracao,
      });
      return;
    }

    // ==========================================
    // 8. DEFINIR GANHADOR
    // ==========================================

    const winnerCompradorName =
      nomeVencedorSelec ||
      bilheteVencedor.pedido.comprador.nome;

    const winnerCity =
      cidadeVencedorSelec ||
      bilheteVencedor.pedido.comprador.cidade;

    const winnerState =
      estadoVencedorSelec ||
      bilheteVencedor.pedido.comprador.estado;

    // ==========================================
    // 9. CRIAR REGISTRO DO SORTEIO
    // SOMENTE DEPOIS DE VALIDAR O GANHADOR
    // ==========================================

    const dadosAuditoria = {
      ...req.body,
      resultadoOriginal,
      numeroApurado: winningNumber,
      calculoApuracao,
      quantidadeTotal: rifa.quantidadeTotal,
      regra:
        metodo === "MANUAL"
          ? "resultado % quantidadeTotal"
          : "sorteio automático entre cotas pagas",
    };

    const sorteioSorteado =
      await RaffleRepository.createSorteio(id, {
        tituloSorteio: `Sorteio Oficial - ${rifa.titulo}`,
      });

    await RaffleRepository.updateSorteioRealizado(
      sorteioSorteado.id,
      winningNumber,
      JSON.stringify(dadosAuditoria)
    );

    // ==========================================
    // 10. ATUALIZAR RIFA
    // ==========================================

    await RaffleRepository.update(id, {
      status: "FINALIZADO",
      resultado: winningNumber,
    });

    // ==========================================
    // 11. CRIAR GANHADOR
    // ==========================================

    const winnerData = await prisma.ganhador.create({
      data: {
        rifaId: id,
        sorteioId: sorteioSorteado.id,
        nome: winnerCompradorName,
        cidade: winnerCity,
        estado: winnerState,
        numeroPremiado: winningNumber,
        fotoPremioUrl:
          fotoPremioUrl ||
          "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=400&q=80",
        fotoEntregaUrl: fotoEntregaUrl || "",
        depoimento:
          depoimento || "Fiquei muito feliz em ganhar!",
      },
    });

    // ==========================================
    // 12. ATUALIZAR CLIENTES EM TEMPO REAL
    // ==========================================

    broadcastRaffleStatusUpdate(id, "FINALIZADO");

    // ==========================================
    // 13. LOG ADMINISTRATIVO
    // ==========================================

    const user =
      (req as AuthenticatedRequest).user;

    await AdminLogRepository.create({
      usuarioId: user?.id,
      acao: "DRAW_EXECUTION",
      detalhes:
        `Sorteio concluído na Rifa: "${rifa.titulo}" ` +
        `(ID: ${id}). ` +
        `Resultado informado: ${resultadoOriginal || "AUTOMÁTICO"}. ` +
        `Número apurado: ${winningNumber}. ` +
        `Vencedor: ${winnerCompradorName}`,
    });

    // ==========================================
    // 14. RETORNO
    // ==========================================

    res.json({
      success: true,

      resultadoOriginal,

      winningNumber,

      calculo: calculoApuracao,

      winner: winnerData,

      sorteio: sorteioSorteado,

      mensagem:
        `Apuração realizada com sucesso. ` +
        `Número vencedor: ${winningNumber}`,
    });

  } catch (error: any) {
    console.error(
      "Erro ao executar apuração:",
      error
    );

    res.status(500).json({
      error:
        error.message ||
        "Erro interno ao realizar a apuração.",
    });
  }
  }
}
