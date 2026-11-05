import { createRequire } from "node:module";

// Reattributes real paid revenue from raffle #7 to the credit orders in #9.
// Default mode is read-only. The original provider orders and their values are
// preserved; reporting code excludes the credit copies from global cash totals.

const projectRequire = createRequire('/opt/clubedasorte/package.json');
projectRequire('dotenv').config({ path: '/opt/clubedasorte/.env.runtime', quiet: true });
const { PrismaClient, Prisma } = projectRequire('@prisma/client');
const prisma = new PrismaClient();

const SOURCE_ID = 7;
const TARGET_ID = 9;
const MIGRATION_TYPE = 'MIGRACAO_CREDITOS_RIFA_7_PARA_9_V1';
const TRANSFER_TYPE = 'RECEITA_TRANSFERIDA_PARA_MIGRACAO_RIFA_7_PARA_9_V1';
const EXPECTED_SOURCE_ORDER_IDS = [94, 95, 96, 97, 98];
const EXPECTED_MIGRATED_ORDER_IDS = [104, 105, 106];
const APPLY = process.argv.includes('--apply');

function parseMeta(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : { gatewayMetaOriginalRaw: raw };
  } catch {
    return { gatewayMetaOriginalRaw: raw };
  }
}

async function load(db) {
  const [sourceOrders, migrationOrders, sourceRaffle, targetRaffle, paidOrders] = await Promise.all([
    db.pedido.findMany({
      where: { id: { in: EXPECTED_SOURCE_ORDER_IDS } },
      include: { itens: true }, orderBy: { id: 'asc' },
    }),
    db.pedido.findMany({
      where: { id: { in: EXPECTED_MIGRATED_ORDER_IDS } },
      include: { itens: true, bilhetes: true }, orderBy: { id: 'asc' },
    }),
    db.rifa.findUnique({ where: { id: SOURCE_ID }, select: { id: true } }),
    db.rifa.findUnique({ where: { id: TARGET_ID }, select: { id: true, valorPorNumero: true, cotasPremiadas: { select: { numero: true } } } }),
    db.pedido.findMany({ where: { status: 'PAGO' }, select: { id: true, valorTotal: true, gatewayMeta: true } }),
  ]);
  return { sourceOrders, migrationOrders, sourceRaffle, targetRaffle, paidOrders };
}

function validate(data) {
  const { sourceOrders, migrationOrders, targetRaffle } = data;
  if (!data.sourceRaffle || !targetRaffle) throw new Error('Rifa #7 ou #9 ausente.');
  if (sourceOrders.length !== 5 || sourceOrders.some(o => o.status !== 'PAGO' || o.itens.length !== 1 || o.itens[0].rifaId !== SOURCE_ID)) {
    throw new Error('Pedidos fonte ou itens da rifa #7 divergiram do esperado.');
  }
  if (migrationOrders.length !== 3) throw new Error('Não encontrei os três pedidos migrados esperados.');

  const sourceById = new Map(sourceOrders.map(o => [o.id, o]));
  const sourceIdsSeen = new Set();
  const targetPrizeNumbers = new Set(targetRaffle.cotasPremiadas.map(p => p.numero));
  let sourcePaidTotal = 0;
  for (const order of sourceOrders) sourcePaidTotal += order.valorTotal;

  const assignments = migrationOrders.map(order => {
    const meta = parseMeta(order.gatewayMeta);
    if (meta.tipo !== MIGRATION_TYPE || order.status !== 'PAGO' || order.compradorId == null || order.itens.length !== 1 || order.itens[0].rifaId !== TARGET_ID) {
      throw new Error(`Pedido migrado ${order.id} não corresponde à migração conhecida.`);
    }
    const originalIds = Array.isArray(meta.pedidosOrigem) ? meta.pedidosOrigem.map(Number) : [];
    if (!originalIds.length || originalIds.some(id => sourceIdsSeen.has(id))) throw new Error(`Origem duplicada ou ausente no pedido ${order.id}.`);
    let originalAmount = 0;
    for (const id of originalIds) {
      const original = sourceById.get(id);
      if (!original || original.compradorId !== order.compradorId) throw new Error(`Pedido fonte ${id} não corresponde ao comprador do crédito.`);
      sourceIdsSeen.add(id);
      originalAmount += original.valorTotal;
    }
    const item = order.itens[0];
    const numbers = item.numeros.split(',').map(n => n.trim()).filter(Boolean);
    if (numbers.length !== item.quantidade || order.bilhetes.length !== item.quantidade || order.bilhetes.some(t => t.rifaId !== TARGET_ID || t.status !== 'PAGO' || !numbers.includes(t.numero))) {
      throw new Error(`Bilhetes do pedido migrado ${order.hash} não conferem.`);
    }
    if (numbers.some(n => targetPrizeNumbers.has(n))) throw new Error(`Pedido ${order.hash} contém cota premiada da #9.`);
    return { order, originalIds, originalAmount, item };
  });

  if (EXPECTED_SOURCE_ORDER_IDS.some(id => !sourceIdsSeen.has(id)) || sourceIdsSeen.size !== 5) throw new Error('Os cinco pedidos pagos de origem não foram cobertos uma única vez.');
  if (Math.abs(assignments.reduce((sum, x) => sum + x.originalAmount, 0) - sourcePaidTotal) > 0.00001) throw new Error('Soma atribuída diverge da receita original.');
  return { assignments, sourcePaidTotal, migrationTickets: assignments.reduce((n, x) => n + x.item.quantidade, 0) };
}

async function main() {
  const current = await load(prisma);
  const plan = validate(current);
  const alreadyMarked = current.sourceOrders.filter(o => parseMeta(o.gatewayMeta).receitaTransferida?.tipo === TRANSFER_TYPE);
  const migrationTotalNow = plan.assignments.reduce((sum, x) => sum + x.order.valorTotal, 0);
  const recognizedCashNow = current.paidOrders.filter(o => parseMeta(o.gatewayMeta).tipo !== MIGRATION_TYPE).reduce((sum, o) => sum + o.valorTotal, 0);

  console.log(JSON.stringify({
    mode: APPLY ? 'APPLY' : 'PLAN_READ_ONLY',
    sourceRaffle: SOURCE_ID,
    targetRaffle: TARGET_ID,
    originalPaidOrderCount: current.sourceOrders.length,
    migrationOrderCount: plan.assignments.length,
    migratedTickets: plan.migrationTickets,
    amountToAttribute: Number(plan.sourcePaidTotal.toFixed(2)),
    migrationOrdersCurrentAmount: Number(migrationTotalNow.toFixed(2)),
    globalRevenueBefore: Number(recognizedCashNow.toFixed(2)),
    globalRevenueAfter: Number(recognizedCashNow.toFixed(2)),
    revenueAttributedToRaffle9After: Number(plan.sourcePaidTotal.toFixed(2)),
    existingSourceTransferMarkers: alreadyMarked.length,
    assignments: plan.assignments.map(x => ({ migrationOrder: x.order.hash, sourceOrderIds: x.originalIds, creditedAmount: Number(x.originalAmount.toFixed(2)), tickets: x.item.quantidade })),
    originalProviderOrderValuesWillChange: false,
  }, null, 2));

  if (!APPLY) {
    console.log('Prévia somente leitura. Nenhum dado foi alterado.');
    return;
  }

  await prisma.$transaction(async tx => {
    const fresh = await load(tx);
    const checked = validate(fresh);
    const transferAt = new Date().toISOString();
    for (const assignment of checked.assignments) {
      const migrationMeta = parseMeta(assignment.order.gatewayMeta);
      await tx.pedido.update({ where: { id: assignment.order.id }, data: { valorTotal: assignment.originalAmount } });
      await tx.itemPedido.update({ where: { id: assignment.item.id }, data: { valorUnitario: fresh.targetRaffle.valorPorNumero } });
      for (const sourceId of assignment.originalIds) {
        const source = fresh.sourceOrders.find(o => o.id === sourceId);
        const sourceMeta = parseMeta(source.gatewayMeta);
        sourceMeta.receitaTransferida = {
          tipo: TRANSFER_TYPE,
          destinoRifaId: TARGET_ID,
          pedidoMigradoId: assignment.order.id,
          pedidoMigradoHash: assignment.order.hash,
          aplicadoEm: transferAt,
        };
        await tx.pedido.update({ where: { id: sourceId }, data: { gatewayMeta: JSON.stringify(sourceMeta) } });
      }
      // Preserve the migration's identifying metadata. This field documents
      // that the amount is an attribution and must not be counted as new cash.
      migrationMeta.receitaAtribuida = assignment.originalAmount;
      await tx.pedido.update({ where: { id: assignment.order.id }, data: { gatewayMeta: JSON.stringify(migrationMeta) } });
    }
    await tx.logAdmin.create({ data: {
      acao: 'ATRIBUICAO_RECEITA_MIGRACAO_RIFA_7_PARA_9',
      detalhes: JSON.stringify({ sourceRaffleId: SOURCE_ID, targetRaffleId: TARGET_ID, amount: checked.sourcePaidTotal, originalOrders: EXPECTED_SOURCE_ORDER_IDS, migrationOrders: EXPECTED_MIGRATED_ORDER_IDS, duplicatedGlobalRevenue: false, appliedAt: transferAt }),
    } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  const after = await load(prisma);
  const verified = validate(after);
  const recognizedAfter = after.paidOrders.filter(o => parseMeta(o.gatewayMeta).tipo !== MIGRATION_TYPE).reduce((sum, o) => sum + o.valorTotal, 0);
  const attributedAfter = verified.assignments.reduce((sum, x) => sum + x.order.valorTotal, 0);
  const valid = Math.abs(recognizedAfter - verified.sourcePaidTotal) < 0.00001 && Math.abs(attributedAfter - verified.sourcePaidTotal) < 0.00001 && verified.assignments.every(x => parseMeta(x.order.gatewayMeta).receitaAtribuida === x.originalAmount) && after.sourceOrders.every(o => parseMeta(o.gatewayMeta).receitaTransferida?.tipo === TRANSFER_TYPE);
  console.log(JSON.stringify({ mode: 'APPLIED', valid, globalRevenue: Number(recognizedAfter.toFixed(2)), raffle9Revenue: Number(attributedAfter.toFixed(2)), originalSourceValuesPreserved: after.sourceOrders.every(o => o.status === 'PAGO'), migratedTickets: verified.migrationTickets }, null, 2));
  if (!valid) process.exitCode = 2;
}

main().catch(error => { console.error(error.message || error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());

