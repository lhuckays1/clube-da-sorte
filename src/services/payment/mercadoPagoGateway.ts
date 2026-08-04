import { IPaymentGateway, PixPaymentResult } from "./gateway.interface";

export class MercadoPagoGateway implements IPaymentGateway {
  nome = "MERCADO_PAGO";

  async generatePix(params: {
    pedidoId: number;
    valor: number;
    nomeComprador: string;
    cpfComprador?: string;
    telefoneComprador: string;
    credenciaisJson: string;
    ambiente: "SANDBOX" | "PRODUCTION";
  }): Promise<PixPaymentResult> {
    try {
      let credentials: any = {};
      try {
        credentials = JSON.parse(params.credenciaisJson);
      } catch (e) {
        // Fallback or unparsed
      }

      const accessToken = credentials.accessToken || process.env.MERCADO_PAGO_TOKEN;

      // If no valid environment credentials or is MOCK, execute high-fidelity simulation
      if (!accessToken || accessToken === "YOUR_MERCADO_PAGO_TOKEN") {
        const txid = `MP-MOCK-${Date.now()}-${params.pedidoId}`;
        const copiaCola = `00020101021226580014br.gov.bcb.pix0136mp-mock-7b03-f09b-4680-bc4e-7b7cf1612e2b5204000053039865405${params.valor.toFixed(
          2
        )}5802BR5915MERCADO_PAGO_S6009SAO_PAULO62190515${txid}`;
        return {
          txid,
          qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(copiaCola)}`,
          copiaCola,
          expiresIn: 900,
        };
      }

      // Real integration API request
      const response = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          transaction_amount: params.valor,
          payment_method_id: "pix",
          description: `Compra do pedido #${params.pedidoId} no Clube da Sorte`,
          notification_url: `${process.env.APP_URL || "https://clubedasorte.athominfotech.com.br"}/api/webhook/mercadopago`,
          payer: {
            email: `${params.telefoneComprador}@clubedasorte.com`,
            first_name: params.nomeComprador.split(" ")[0],
            last_name: params.nomeComprador.split(" ").slice(1).join(" ") || "Silva",
            identification: {
              type: "CPF",
              number: params.cpfComprador?.replace(/\D/g, "") || "00000000000",
            },
          },
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`MercadoPago API Error: ${errBody}`);
      }

      const data = await response.json();
      
      return {
        txid: String(data.id),
        qrCode: data.point_of_interaction?.transaction_data?.qr_code_base64 
                 ? `data:image/png;base64,${data.point_of_interaction.transaction_data.qr_code_base64}`
                 : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.point_of_interaction?.transaction_data?.qr_code || "")}`,
        copiaCola: data.point_of_interaction?.transaction_data?.qr_code || "",
        expiresIn: 900,
      };
    } catch (error: any) {
      console.error("Erro ao gerar PIX com MercadoPago Gateway:", error);
      throw error;
    }
  }
}
