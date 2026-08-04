import { IPaymentGateway, PixPaymentResult } from "./gateway.interface";

export class AsaasGateway implements IPaymentGateway {
  nome = "ASAAS";

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
        // Fallback
      }

      const apiKey = credentials.apiKey || process.env.ASAAS_API_KEY;
      const baseUrl = params.ambiente === "PRODUCTION" 
              ? "https://www.asaas.com/api/v3" 
              : "https://sandbox.asaas.com/api/v3";

      if (!apiKey || apiKey === "YOUR_ASAAS_KEY") {
        const txid = `ASAAS-MOCK-${Date.now()}-${params.pedidoId}`;
        const copiaCola = `00020101021226580014br.gov.bcb.pix0136asaas-mock-7b03-f09b-4680-bc4e-7b7cf1612e2b5204000053039865405${params.valor.toFixed(
          2
        )}5802BR5908ASAAS_S6009SAO_PAULO62190515${txid}`;
        return {
          txid,
          qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(copiaCola)}`,
          copiaCola,
          expiresIn: 900,
        };
      }

      // Real integration API requests for Asaas:
      // 1. Create a Customer
      const customerRes = await fetch(`${baseUrl}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: apiKey,
        },
        body: JSON.stringify({
          name: params.nomeComprador,
          cpfCnpj: params.cpfComprador?.replace(/\D/g, "") || "00000000000",
          mobilePhone: params.telefoneComprador,

          notificationDisabled: true
        }),
      });

      if (!customerRes.ok) {
        const text = await customerRes.text();
        throw new Error(`Asaas Customer Creation failed: ${text}`);
      }

      const customerData = await customerRes.json();
      const customerId = customerData.id;

      // 2. Create the Billing/Payment charge
      const paymentRes = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: apiKey,
        },
        body: JSON.stringify({
          customer: customerId,
          billingType: "PIX",
          value: params.valor,
          dueDate: new Date(Date.now() + 15 * 60 * 1000).toISOString().split("T")[0], // Today
          description: `Pedido #${params.pedidoId} Clube da Sorte`,
          externalReference: String(params.pedidoId),
        }),
      });

      if (!paymentRes.ok) {
        const text = await paymentRes.text();
        throw new Error(`Asaas Payment Creation failed: ${text}`);
      }

      const paymentData = await paymentRes.json();
      const paymentId = paymentData.id;

      // 3. Get the PIX QR Code & CopyPaste string
      const pixKeyRes = await fetch(`${baseUrl}/payments/${paymentId}/pixQrCode`, {
        method: "GET",
        headers: {
          access_token: apiKey,
        },
      });

      if (!pixKeyRes.ok) {
        const text = await pixKeyRes.text();
        throw new Error(`Asaas PIX code request failed: ${text}`);
      }

      const qrCodeData = await pixKeyRes.json();

      return {
        txid: paymentId,
        qrCode: qrCodeData.encodedImage 
                 ? `data:image/png;base64,${qrCodeData.encodedImage}`
                 : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeData.payload || "")}`,
        copiaCola: qrCodeData.payload || "",
        expiresIn: 900,
      };
    } catch (err: any) {
      console.error("Erro ao gerar PIX com Asaas Gateway:", err);
      throw err;
    }
  }
}
