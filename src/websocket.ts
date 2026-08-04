import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";

let io: SocketIOServer | null = null;

export function initWebSocket(server: HTTPServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket conectado: ${socket.id}`);

    // Join a specific raffle room to receive real-time ticket statuses
    socket.on("join-rifa", (rifaId: string) => {
      socket.join(`rifa-${rifaId}`);
      console.log(`Socket ${socket.id} entrou no canal da rifa: ${rifaId}`);
    });

    socket.on("disconnect", () => {
      console.log(`Socket desconectado: ${socket.id}`);
    });
  });

  return io;
}

export function getWebSocket(): SocketIOServer | null {
  return io;
}

export function broadcastTicketUpdate(rifaId: number, data: { numbers: string[]; status: "RESERVADO" | "PAGO" | "DISPONIVEL" }) {
  if (io) {
    io.to(`rifa-${rifaId}`).emit("ticket-update", data);
  }
}

export function broadcastRaffleStatusUpdate(rifaId: number, status: string) {
  if (io) {
    io.emit("raffle-status-update", { rifaId, status });
  }
}

export function broadcastPaymentConfirmed(pedidoHash: string, data: { complainant: string; numbers: string[]; total: number }) {
  if (io) {
    io.emit("payment-confirmed", { pedidoHash, ...data });
  }
}
