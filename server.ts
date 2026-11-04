
import express from "express";
import http from "http";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import bcryptjs from "bcryptjs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { apiRouter } from "./src/api";
import { initWebSocket } from "./src/websocket";
import { initExpirationJob } from "./src/jobs/expirationJob";
import { prisma } from "./src/db";


// Load local environment configurations
dotenv.config();

// Fail-fast checks for essential production environment variables
if (!process.env.JWT_SECRET) {
  console.error("❌ ERRO CRÍTICO DE PRODUÇÃO: JWT_SECRET não foi definido nas variáveis de ambiente!");
  process.exit(1);
}

const PORT = Number(process.env.PORT || 4100);
const HOST = process.env.HOST || "127.0.0.1";

async function bootstrap() {

  const app = express();

  // Cloudflare / Proxy reverso
  app.set("trust proxy", "loopback");

  const server = http.createServer(app);

  // 1. Initial essential parsing & security middlewares
  
  // Custom CORS domain constraints (allowing APP_URL, localhost and dynamic preview run.app subdomains)
  const allowedOrigins = [
    process.env.APP_URL ? new URL(process.env.APP_URL).origin : undefined,
    "http://localhost:3000",
    "http://localhost:5173",
  ].filter(Boolean) as string[];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (
          !origin ||
          allowedOrigins.includes(origin)
        ) {
          callback(null, true);
        } else {
          callback(new Error("CORS: Requisição restrita por diretrizes de segurança de produção"));
        }
      },
      credentials: true,
    })
  );

  // Apply Helmet HTTP headers defense (with CSP/COEP disabled to allow iframe dev previews and external image loads)
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false,
    })
  );

  // API rate limiter against brute-force / spamming
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per 15 mins
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Muitas requisições originadas deste IP, por favor tente novamente mais tarde.",
    },
  });

  app.use("/api", apiLimiter);

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // 2. Automated startup seeding (Zero-Setup frictionless UX)
  try {
    const configCount = await prisma.configuracao.count();
    if (configCount === 0) {
      const defaultConfigs = [
        { chave: "site_name", valor: "Clube da Sorte" },
        { chave: "logo", valor: "" },
        { chave: "banner", valor: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1200&q=80" },
        { chave: "whatsapp", valor: "5511999999999" },
        { chave: "instagram", valor: "rifas_brasil" },
        { chave: "facebook", valor: "" },
        { chave: "telegram", valor: "" },
        { chave: "tempo_reserva", valor: "15" },
        { chave: "cor_principal", valor: "#4f46e5" },
        { chave: "cor_secundaria", valor: "#10b981" },
        { chave: "gateway_ativo", valor: "NONE" },
      ];

      for (const config of defaultConfigs) {
        await prisma.configuracao.create({
          data: config,
        });
      }
      console.log("🚀 Semente do Banco de Dados: Configurações de branding inicializadas!");
    } else {
      const dbSiteName = await prisma.configuracao.findUnique({
        where: { chave: "site_name" },
      });
      if (dbSiteName && dbSiteName.valor === "Rifas Online Br") {
        await prisma.configuracao.update({
          where: { chave: "site_name" },
          data: { valor: "Clube da Sorte" },
        });
        console.log("🚀 Semente do Banco de Dados: Atualizado site_name para Clube da Sorte!");
      }
    }

    // No active/mock payment provider is created automatically in production.
  } catch (error) {
    console.error("⚠️ Alerta na inicialização da semente do Banco de Dados:", error);
  }

  // 3. Register our backend REST APIs
  app.use("/api", apiRouter);

  // 4. Initialize WebSocket Server
  initWebSocket(server);

  // 5. Initialize node-cron background expiration jobs
  initExpirationJob();

  // 6. Integrate Vite Dev Server in dev, or serve Vite compiled files in production
  if (process.env.NODE_ENV !== "production") {
    console.log("Modo Desenvolvimento: Integrando Vite Dev Server middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Modo Produção: Servindo apenas os arquivos públicos de dist/...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // Serve SPA index.html for any other route requests
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // 7. Fire up the engine!
  server.listen(PORT, HOST, () => {
    console.log(`====================================================`);
    console.log(` SERVER INICIALIZADO COM SUCESSO! `);
    console.log(` Ouvindo em: http://${HOST}:${PORT} `);
    console.log(`====================================================`);
  });
}

bootstrap().catch((error) => {
  console.error("❌ Falha fatal no bootstrap do servidor Express:", error);
});
