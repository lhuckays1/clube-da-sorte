export const RAFFLE_CREDIT_MIGRATION_TYPE = "MIGRACAO_CREDITOS_RIFA_7_PARA_9_V1";
export const RAFFLE_REVENUE_TRANSFER_TYPE = "RECEITA_TRANSFERIDA_PARA_MIGRACAO_RIFA_7_PARA_9_V1";

type GatewayMetadata = Record<string, unknown>;

function parseGatewayMetadata(raw: string | null | undefined): GatewayMetadata | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as GatewayMetadata
      : null;
  } catch {
    return null;
  }
}

export function isCreditMigrationOrder(raw: string | null | undefined): boolean {
  return parseGatewayMetadata(raw)?.tipo === RAFFLE_CREDIT_MIGRATION_TYPE;
}

export function isRevenueTransferredSourceOrder(raw: string | null | undefined): boolean {
  const transfer = parseGatewayMetadata(raw)?.receitaTransferida;
  return !!transfer && typeof transfer === "object" && !Array.isArray(transfer)
    && (transfer as Record<string, unknown>).tipo === RAFFLE_REVENUE_TRANSFER_TYPE;
}

export function getOrderFinancialLabel(raw: string | null | undefined): "CREDITO_MIGRADO" | "RECEITA_TRANSFERIDA" | null {
  if (isCreditMigrationOrder(raw)) return "CREDITO_MIGRADO";
  if (isRevenueTransferredSourceOrder(raw)) return "RECEITA_TRANSFERIDA";
  return null;
}

