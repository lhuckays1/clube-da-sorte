export interface PixPaymentResult {
  txid: string;
  qrCode: string; // Base64 or Image URL
  copiaCola: string;
  expiresIn: number; // in seconds
}

export interface IPaymentGateway {
  nome: string;
  generatePix(params: {
    pedidoId: number;
    valor: number;
    nomeComprador: string;
    cpfComprador?: string;
    telefoneComprador: string;
    credenciaisJson: string;
    ambiente: "SANDBOX" | "PRODUCTION";
  }): Promise<PixPaymentResult>;
}
