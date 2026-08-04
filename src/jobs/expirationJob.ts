import cron from "node-cron";
import { ReservationService } from "../services/reservationService";

export function initExpirationJob() {
  console.log("Iniciando cron job de expiração automática de reservas...");

  // Runs every minute to sweep and liberate stagnant pending tickets
  cron.schedule("* * * * *", async () => {
    try {
      const cancelledCount = await ReservationService.cleanupExpiredReservations();
      if (cancelledCount > 0) {
        console.log(`[ExpirationJob] Sucesso: ${cancelledCount} pedidos pendentes expirados foram limpos.`);
      }
    } catch (error) {
      console.error("[ExpirationJob] Erro ao executar varredura de expiração:", error);
    }
  });
}
