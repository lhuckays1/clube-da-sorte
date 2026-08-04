import { IPaymentGateway, PixPaymentResult } from "./gateway.interface";
import { MockGateway } from "./mockGateway";
import { MercadoPagoGateway } from "./mercadoPagoGateway";
import { AsaasGateway } from "./asaasGateway";
import { GatewayRepository } from "../../repositories/gatewayRepository";

export class PixService {
  private static gateways: Record<string, IPaymentGateway> = {
    MOCK: new MockGateway(),
    MERCADO_PAGO: new MercadoPagoGateway(),
    ASAAS: new AsaasGateway(),
  };

  /**
   * Generates PIX payment using currently active gateway
   */
  static async generatePix(params: {
    pedidoId: number;
    valor: number;
    nomeComprador: string;
    cpfComprador?: string;
    telefoneComprador: string;
  }): Promise<PixPaymentResult> {
    // 1. Fetch configured active gateway from our database
    const activeGatewayRecord = await GatewayRepository.findActive();

    const gatewayName = activeGatewayRecord?.nome || "MOCK";
    const credentialsStr = activeGatewayRecord?.credenciais || "{}";
    const ambienteVal = (activeGatewayRecord?.ambiente || "SANDBOX") as "SANDBOX" | "PRODUCTION";

    console.log(`[PixService] Utilizando gateway ativo: ${gatewayName} (${ambienteVal})`);

    const executor = this.gateways[gatewayName] || this.gateways["MOCK"];

    return executor.generatePix({
      pedidoId: params.pedidoId,
      valor: params.valor,
      nomeComprador: params.nomeComprador,
      cpfComprador: params.cpfComprador,
      telefoneComprador: params.telefoneComprador,
      credenciaisJson: credentialsStr,
      ambiente: ambienteVal,
    });
  }
}
