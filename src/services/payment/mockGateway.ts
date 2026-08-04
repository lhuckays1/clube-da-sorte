import { IPaymentGateway, PixPaymentResult } from "./gateway.interface";

export class MockGateway implements IPaymentGateway {
  nome = "MOCK";

  async generatePix(params: {
    pedidoId: number;
    valor: number;
    nomeComprador: string;
    cpfComprador?: string;
    telefoneComprador: string;
    credenciaisJson: string;
    ambiente: "SANDBOX" | "PRODUCTION";
  }): Promise<PixPaymentResult> {
    const txid = `MOCK-TXID-${Date.now()}-${params.pedidoId}`;
    const valorFormatado = params.valor.toFixed(2);
    const cleanName = params.nomeComprador
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .substring(0, 15)
      .toUpperCase();

    const copiaCola = `00020101021226580014br.gov.bcb.pix0136e6eb7b03-f09b-4680-bc4e-7b7cf1612e2b5204000053039865405${valorFormatado}5802BR59${cleanName.length
      .toString()
      .padStart(2, "0")}${cleanName}6009SAO_PAULO62190515${txid}`;

    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(copiaCola)}`;

    return {
      txid,
      qrCode,
      copiaCola,
      expiresIn: 900, // 15 min
    };
  }
}
