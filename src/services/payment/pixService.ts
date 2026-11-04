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

    const gatewayName = activeGatewayRecord?.nome;
    const credentialsStr = activeGatewayRecord?.credenciais || "{}";
    const ambienteVal = (activeGatewayRecord?.ambiente || "SANDBOX") as "SANDBOX" | "PRODUCTION";

    if (!gatewayName || !this.gateways[gatewayName]) {
      if (process.env.NODE_ENV !== "production" && process.env.ALLOW_MOCK_PAYMENTS === "true") {
        return this.gateways.MOCK.generatePix({ ...params, credenciaisJson: "{}", ambiente: "SANDBOX" });
      }
      throw new Error("Nenhum gateway de pagamento válido está configurado.");
    }
    if (gatewayName === "MOCK" && (process.env.NODE_ENV === "production" || process.env.ALLOW_MOCK_PAYMENTS !== "true" || ambienteVal !== "SANDBOX")) {
      throw new Error("Pagamentos simulados estão desabilitados neste ambiente.");
    }

    const executor = this.gateways[gatewayName];

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
