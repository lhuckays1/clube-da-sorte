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
              ? "https://api.asaas.com/v3" 
              : "https://api-sandbox.asaas.com/v3";

      if (!apiKey || apiKey === "YOUR_ASAAS_KEY") throw new Error("Credencial Asaas ausente; PIX não foi criado.");
      if (!params.cpfComprador || params.cpfComprador.replace(/\D/g, "").length !== 11) throw new Error("CPF válido é necessário para criar a cobrança Asaas.");

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
          cpfCnpj: params.cpfComprador.replace(/\D/g, ""),
          mobilePhone: params.telefoneComprador,

          notificationDisabled: true
        }),
      });

      if (!customerRes.ok) {
        throw new Error("Asaas customer creation failed");
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
        throw new Error("Asaas payment creation failed");
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
        throw new Error("Asaas PIX code request failed");
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
      console.error("Erro ao gerar PIX com Asaas Gateway:", err?.message || "erro interno");
      throw new Error("Não foi possível gerar o PIX. Verifique a configuração do gateway.");
    }
  }
}
