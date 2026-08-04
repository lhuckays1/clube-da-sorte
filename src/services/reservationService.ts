import { OrderRepository } from "../repositories/orderRepository";
import { RaffleRepository } from "../repositories/raffleRepository";
import { BuyerRepository } from "../repositories/buyerRepository";
import { broadcastTicketUpdate, broadcastPaymentConfirmed } from "../websocket";
import { prisma } from "../db";

function formatTicketNumber(num: number, totalSize: number): string {
  const digits = totalSize.toString().length;
  const paddingLength = Math.max(2, digits - 1);
  return num.toString().padStart(paddingLength, "0");
}

export class ReservationService {
  /**
   * Evaluates pricing with matching wholesale/combo discounts
   */
  static calculatePrice(ticketCount: number, valorPorNumero: number, combos: any[]) {
    let valorTotal = ticketCount * valorPorNumero;

    const matchingCombo = combos
      .filter((c) => ticketCount >= c.quantidade)
      .reduce((best, current) => (current.quantidade > (best?.quantidade || 0) ? current : best), null as any);

    if (matchingCombo) {
      const comboPrice = matchingCombo.valorFinal;
      const countInCombo = Math.floor(ticketCount / matchingCombo.quantidade);
      const remainder = ticketCount % matchingCombo.quantidade;
      valorTotal = countInCombo * comboPrice + remainder * valorPorNumero;
    }

    return valorTotal;
  }

  /**
   * Reserve process containing database validation & double-booking prevention wrapper
   */
  static async reserve(params: {
    rifaId: number;
    numeros?: string[];
    quantidade?: number;
    nomeComprador: string;
    telefoneComprador: string;
    cidadeComprador: string;
    estadoComprador: string;
    cpfComprador?: string;
    cupom?: string;
  }) {
    const {
      rifaId,
      numeros,
      quantidade,
      nomeComprador,
      telefoneComprador,
      cidadeComprador,
      estadoComprador,
      cpfComprador,
      cupom,
    } = params;

    const rifa = await RaffleRepository.findById(rifaId);
    if (!rifa) throw new Error("Rifa não localizada.");
    if (rifa.status !== "ATIVO") throw new Error("Esta campanha não está aberta para novas compras.");

    // Prevent reservation on already taken tickets
    const takenMap = await OrderRepository.getActiveNumbersMap(rifa.id);
    let resolvedNumbers: string[] = [];

    if (Array.isArray(numeros) && numeros.length > 0) {
      resolvedNumbers = numeros.map((n) => n.trim());
      for (const num of resolvedNumbers) {
        if (takenMap.has(num)) {
          throw new Error(`O número [ ${num} ] já se encontra indisponível.`);
        }
        const numericIndex = parseInt(num);
        if (isNaN(numericIndex) || numericIndex < 0 || numericIndex >= rifa.quantidadeTotal) {
          throw new Error(`Número inválido para esta rifa: ${num}`);
        }
      }
    } else if (quantidade && quantidade > 0) {
      // Auto-assign random available numbers
      const availableNumbers: string[] = [];
      for (let i = 0; i < rifa.quantidadeTotal; i++) {
        const numStr = formatTicketNumber(i, rifa.quantidadeTotal);
        if (!takenMap.has(numStr)) {
          availableNumbers.push(numStr);
        }
      }

      if (availableNumbers.length < quantidade) {
        throw new Error(`Apenas ${availableNumbers.length} números restantes nesta rifa.`);
      }

      // Shuffle or slice
      resolvedNumbers = availableNumbers.slice(0, quantidade);
    } else {
      throw new Error("Selecione algum número ou informe uma quantidade para prosseguir.");
    }

    // Resolve Comprador record
    let comprador = await BuyerRepository.findByPhone(telefoneComprador);
    if (!comprador) {
      comprador = await BuyerRepository.create({
        nome: nomeComprador,
        telefone: telefoneComprador,
        cidade: cidadeComprador,
        estado: estadoComprador,
        cpf: cpfComprador,
      });
    } else {
      comprador = await BuyerRepository.update(comprador.id, {
        nome: nomeComprador,
        cidade: cidadeComprador,
        estado: estadoComprador,
        cpf: cpfComprador || comprador.cpf,
      });
    }

    // Load custom dynamic reservation timeframe from config
    const timeConf = await prisma.configuracao.findUnique({ where: { chave: "tempo_reserva" } });
    const reserveMinutes = parseInt(timeConf?.valor || "15");
    const expirationDate = new Date(Date.now() + reserveMinutes * 60 * 1000);

    let valorTotal = this.calculatePrice(resolvedNumbers.length, rifa.valorPorNumero, rifa.combos);

    // Securely apply promotional coupons
    if (cupom && cupom.trim()) {
      const couponConf = await prisma.configuracao.findUnique({ where: { chave: "cupons_promo" } });
      if (couponConf) {
        try {
          const list = JSON.parse(couponConf.valor);
          if (Array.isArray(list)) {
            const match = list.find((c: any) => c.codigo.trim().toUpperCase() === cupom.trim().toUpperCase());
            if (match) {
              const discountPercent = parseFloat(match.descontoPct || "0");
              if (discountPercent > 0 && discountPercent <= 100) {
                valorTotal = valorTotal * (1 - discountPercent / 100);
              }
            }
          }
        } catch (err) {
          console.error("Error parsing cupons_promo schema from DB configuration:", err);
        }
      }
    }

    const orderHash = `PED-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    // Execute atomic transaction creation & unique constraint enforcement
    const pedido = await OrderRepository.createOrderWithReservation({
      hash: orderHash,
      compradorId: comprador.id,
      valorTotal,
      expiracaoPix: expirationDate,
      rifaId: rifa.id,
      numeros: resolvedNumbers,
      quantidade: resolvedNumbers.length,
      valorUnitario: rifa.valorPorNumero,
    });

    // Broadcast reserved tickets dynamically
    broadcastTicketUpdate(rifa.id, {
      numbers: resolvedNumbers,
      status: "RESERVADO",
    });

    return {
      pedido,
      comprador,
      resolvedNumbers,
      valorTotal,
      expirationDate,
    };
  }

  /**
   * Release and void expired reservations
   */
  static async cleanupExpiredReservations() {
    const now = new Date();

    const expiredOrders = await prisma.pedido.findMany({
      where: {
        status: "PENDENTE",
        expiracaoPix: { lt: now },
      },
      include: {
        itens: true,
      },
    });

    if (expiredOrders.length === 0) return 0;

    console.log(`[ReservationService] Cancelando ${expiredOrders.length} pedidos pendentes expirados...`);

    for (const order of expiredOrders) {
      await OrderRepository.cancelOrder(order.id);

      // Notify clients the tickets are liberated
      for (const item of order.itens) {
        const released = item.numeros.split(",").map((n) => n.trim()).filter(Boolean);
        broadcastTicketUpdate(item.rifaId, {
          numbers: released,
          status: "DISPONIVEL",
        });
      }
    }

    return expiredOrders.length;
  }
}
