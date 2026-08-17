import { Request, Response } from "express";
import { CotaPremiadaRepository } from "../repositories/cotaPremiadaRepository";
import { RaffleRepository } from "../repositories/raffleRepository";
import { AdminLogRepository } from "../repositories/adminLogRepository";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { prisma } from "../db";

export class CotaPremiadaController {
  static async create(req: Request, res: Response) {
    try {
        const { rifaId, numero, premio } = req.body;

        if (!rifaId || numero === undefined || premio === undefined) {
        res.status(400).json({
            error: "Informe a rifa, o número da cota e o valor do prêmio",
        });
        return;
        }

        // 1. Verifica se a rifa existe
        const rifa = await RaffleRepository.findById(Number(rifaId));

        if (!rifa) {
        res.status(404).json({
            error: "Rifa não encontrada",
        });
        return;
        }

        // 2. Normaliza e valida o número
        const numeroNumerico = Number(numero);

        if (
        !Number.isInteger(numeroNumerico) ||
        numeroNumerico < 0 ||
        numeroNumerico >= rifa.quantidadeTotal
        ) {
        res.status(400).json({
            error: `O número ${numero} não é válido para esta rifa. A numeração vai de 00 até ${rifa.quantidadeTotal - 1}.`,
        });
        return;
        }

        const numeroFormatado =
        numeroNumerico < 100
            ? String(numeroNumerico).padStart(2, "0")
            : String(numeroNumerico);

        // 3. Valida o prêmio
        const premioNumerico = Number(premio);

        if (!Number.isFinite(premioNumerico) || premioNumerico <= 0) {
        res.status(400).json({
            error: "Valor do prêmio inválido",
        });
        return;
        }

        // 4. Verifica se já existe Cota Premiada para esse número
        const existente = await CotaPremiadaRepository.findByNumero(
        Number(rifaId),
        numeroFormatado
        );

        if (existente) {
        res.status(409).json({
            error: "Esta cota já está cadastrada como premiada nesta rifa",
        });
        return;
        }

        // 5. Cria a Cota Premiada
        const cota = await CotaPremiadaRepository.create({
        rifaId: Number(rifaId),
        numero: numeroFormatado,
        premio: premioNumerico,
        });

        // 6. Registra no log administrativo
        const user = (req as AuthenticatedRequest).user;

        await AdminLogRepository.create({
        usuarioId: user?.id,
        acao: "CREATE_COTA_PREMIADA",
        detalhes: `Cota premiada cadastrada: "${numeroFormatado}" na Rifa ID: ${rifaId}. Prêmio: R$ ${premioNumerico.toFixed(2)}`,
        });

        res.status(201).json(cota);
    } catch (error: any) {
        res.status(500).json({
        error: error.message,
        });
    }
  }

  static async listByRifa(req: Request, res: Response) {
    try {
      const rifaId = parseInt(req.params.rifaId);

      if (!Number.isInteger(rifaId)) {
        res.status(400).json({
          error: "ID da rifa inválido",
        });
        return;
      }

      const rifa = await RaffleRepository.findById(rifaId);

      if (!rifa) {
        res.status(404).json({
          error: "Rifa não encontrada",
        });
        return;
      }

      const cotas = await CotaPremiadaRepository.listByRifa(rifaId);

      res.json(cotas);
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);

      if (!Number.isInteger(id)) {
        res.status(400).json({
          error: "ID da cota premiada inválido",
        });
        return;
      }

      const cota = await CotaPremiadaRepository.findById(id);

      if (!cota) {
        res.status(404).json({
          error: "Cota premiada não encontrada",
        });
        return;
      }

      res.json(cota);
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  }

  static async getByNumero(req: Request, res: Response) {
    try {
      const rifaId = parseInt(req.params.rifaId);
      const numero = String(req.params.numero || "").trim();

      if (!Number.isInteger(rifaId) || !numero) {
        res.status(400).json({
          error: "Rifa ou número da cota inválido",
        });
        return;
      }

      const cota = await CotaPremiadaRepository.findByNumero(
        rifaId,
        numero
      );

      if (!cota) {
        res.json({
          premiada: false,
          cota: null,
        });
        return;
      }

      res.json({
        premiada: true,
        cota,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  }

  static async listDisponiveis(req: Request, res: Response) {
    try {
      const rifaId = parseInt(req.params.rifaId);

      if (!Number.isInteger(rifaId)) {
        res.status(400).json({
          error: "ID da rifa inválido",
        });
        return;
      }

      const cotas = await CotaPremiadaRepository.listDisponiveis(rifaId);

      res.json(cotas);
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  }

  static async marcarComoPremiada(req: Request, res: Response) {
    try {
        const id = parseInt(req.params.id);
        const { pedidoId, compradorId } = req.body;

        if (!Number.isInteger(id)) {
        res.status(400).json({
            error: "ID da cota premiada inválido",
        });
        return;
        }

        if (!pedidoId || !compradorId) {
        res.status(400).json({
            error: "Pedido e comprador são obrigatórios",
        });
        return;
        }

        const pedidoIdNumerico = Number(pedidoId);
        const compradorIdNumerico = Number(compradorId);

        if (
        !Number.isInteger(pedidoIdNumerico) ||
        !Number.isInteger(compradorIdNumerico)
        ) {
        res.status(400).json({
            error: "Pedido ou comprador inválido",
        });
        return;
        }

        // 1. Localiza a cota
        const cota = await CotaPremiadaRepository.findById(id);

        if (!cota) {
        res.status(404).json({
            error: "Cota premiada não encontrada",
        });
        return;
        }

        // 2. A cota não pode ser premiada novamente
        if (cota.status === "PREMIADA") {
        res.status(409).json({
            error: "Esta cota já foi marcada como premiada",
        });
        return;
        }

        // 3. Busca o pedido
        const pedido = await prisma.pedido.findUnique({
        where: {
            id: pedidoIdNumerico,
        },
        include: {
            comprador: true,
            itens: true,
        },
        });

        if (!pedido) {
        res.status(404).json({
            error: "Pedido não encontrado",
        });
        return;
        }

        // 4. O pedido precisa estar pago
        if (pedido.status !== "PAGO") {
        res.status(400).json({
            error: "O pedido precisa estar com status PAGO para receber uma premiação",
        });
        return;
        }

        // 5. O comprador informado precisa ser o comprador do pedido
        if (pedido.compradorId !== compradorIdNumerico) {
        res.status(400).json({
            error: "O comprador informado não pertence ao pedido",
        });
        return;
        }

        // 6. Verifica se o pedido contém a Rifa da cota
        const itemDaRifa = pedido.itens.find(
        (item) => item.rifaId === cota.rifaId
        );

        if (!itemDaRifa) {
        res.status(400).json({
            error: "O pedido não possui itens desta rifa",
        });
        return;
        }

        // 7. Verifica se o pedido realmente contém o número da cota
        const numerosComprados = String(itemDaRifa.numeros || "")
        .split(",")
        .map((numero) => numero.trim())
        .filter(Boolean);

        const numeroFoiComprado = numerosComprados.includes(cota.numero);

        if (!numeroFoiComprado) {
        res.status(400).json({
            error: `O pedido não contém o número ${cota.numero}`,
        });
        return;
        }

        // 8. Todas as validações passaram.
        // Agora podemos registrar a premiação.
        const updated = await CotaPremiadaRepository.marcarComoPremiada(
        id,
        pedidoIdNumerico,
        compradorIdNumerico
        );

        const user = (req as AuthenticatedRequest).user;

        await AdminLogRepository.create({
        usuarioId: user?.id,
        acao: "MARK_COTA_PREMIADA",
        detalhes: `Cota premiada ID ${id} marcada como premiada. Número: ${cota.numero}, Rifa: ${cota.rifaId}, Pedido: ${pedidoIdNumerico}, Comprador: ${compradorIdNumerico}`,
        });

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({
        error: error.message,
        });
    }
  }

  static async cancelar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);

      if (!Number.isInteger(id)) {
        res.status(400).json({
          error: "ID da cota premiada inválido",
        });
        return;
      }

      const cota = await CotaPremiadaRepository.findById(id);

      if (!cota) {
        res.status(404).json({
          error: "Cota premiada não encontrada",
        });
        return;
      }

      if (cota.status === "PREMIADA") {
        res.status(409).json({
          error: "Uma cota já premiada não pode ser cancelada",
        });
        return;
      }

      const updated = await CotaPremiadaRepository.cancelar(id);

      const user = (req as AuthenticatedRequest).user;

      await AdminLogRepository.create({
        usuarioId: user?.id,
        acao: "CANCEL_COTA_PREMIADA",
        detalhes: `Cota premiada ID ${id} cancelada`,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);

      if (!Number.isInteger(id)) {
        res.status(400).json({
          error: "ID da cota premiada inválido",
        });
        return;
      }

      const cota = await CotaPremiadaRepository.findById(id);

      if (!cota) {
        res.status(404).json({
          error: "Cota premiada não encontrada",
        });
        return;
      }

      if (cota.status === "PREMIADA") {
        res.status(409).json({
          error: "Uma cota já premiada não pode ser excluída",
        });
        return;
      }

      await CotaPremiadaRepository.delete(id);

      const user = (req as AuthenticatedRequest).user;

      await AdminLogRepository.create({
        usuarioId: user?.id,
        acao: "DELETE_COTA_PREMIADA",
        detalhes: `Cota premiada removida: "${cota.numero}" (ID: ${id})`,
      });

      res.json({
        success: true,
        message: "Cota premiada excluída com sucesso",
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  }
}