import { Request, Response } from "express";
import { prisma } from "../db";
import { GatewayRepository } from "../repositories/gatewayRepository";
import { AdminLogRepository } from "../repositories/adminLogRepository";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

export class ConfigController {
  static async getPublicConfigs(req: Request, res: Response) {
    try {
      const configs = await prisma.configuracao.findMany();
      const configMap: Record<string, string> = {};
      configs.forEach((c) => {
        configMap[c.chave] = c.valor;
      });

      const responseObj: Record<string, any> = {
        site_name: configMap.site_name || "Clube da Sorte",
        logo: configMap.logo || "",
        banner: configMap.banner || "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1200&q=80",
        whatsapp: configMap.whatsapp || "5511999999999",
        instagram: configMap.instagram || "clube_da_sorte",
        facebook: configMap.facebook || "",
        telegram: configMap.telegram || "",
        tempo_reserva: parseInt(configMap.tempo_reserva || "15"),
        cor_principal: configMap.cor_principal || "#4f46e5",
        cor_secundaria: configMap.cor_secundaria || "#10b981",
        banners: configMap.banners || "[]",
      };

      res.json(responseObj);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async validateCoupon(req: Request, res: Response) {
    try {
      const code = String(req.body?.codigo || "").trim().toUpperCase();
      if (!/^[A-Z0-9_-]{2,32}$/.test(code)) return res.status(400).json({ error: "Código de cupom inválido" });
      const config = await prisma.configuracao.findUnique({ where: { chave: "cupons_promo" } });
      const coupons = config ? JSON.parse(config.valor) : [];
      const match = Array.isArray(coupons) ? coupons.find((coupon: any) => String(coupon.codigo || "").trim().toUpperCase() === code) : undefined;
      const discount = Number(match?.descontoPct);
      if (!match || !Number.isFinite(discount) || discount <= 0 || discount > 100) return res.status(404).json({ error: "Cupom não localizado ou indisponível" });
      return res.json({ codigo: code, descontoPct: discount });
    } catch {
      return res.status(500).json({ error: "Não foi possível validar o cupom" });
    }
  }

  static async getAdminConfigs(_req: Request, res: Response) {
    try {
      const configs = await prisma.configuracao.findMany();
      res.json(Object.fromEntries(configs.map(({ chave, valor }) => [chave, valor])));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async saveConfigs(req: Request, res: Response) {
    try {
      const data = req.body;
      const user = (req as AuthenticatedRequest).user;

      for (const key of Object.keys(data)) {
        const value = String(data[key]);
        if (key === "gateway_ativo") {
          if (value === "NONE") {
            await prisma.gatewayPagamento.updateMany({ data: { ativo: false } });
          } else {
            const gateway = await GatewayRepository.findByNome(value);
            if (!gateway) return res.status(400).json({ error: "Configure primeiro as credenciais do gateway" });
            if (value === "MOCK" && (process.env.NODE_ENV === "production" || process.env.ALLOW_MOCK_PAYMENTS !== "true" || gateway.ambiente !== "SANDBOX")) {
              return res.status(400).json({ error: "Pagamentos simulados estão desabilitados" });
            }
            await GatewayRepository.setActiveOnly(gateway.id);
          }
        }
        await prisma.configuracao.upsert({
          where: { chave: key },
          update: { valor: value },
          create: { chave: key, valor: value },
        });
      }

      await AdminLogRepository.create({
        usuarioId: user?.id,
        acao: "SAVE_CONFIGS",
        detalhes: `Configurações gerais atualizadas. Chaves editadas: ${Object.keys(data).join(", ")}`,
      });

      res.json({ success: true, message: "Configurações gravadas com sucesso" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async listGateways(req: Request, res: Response) {
    try {
      const gws = await GatewayRepository.listAll();
      res.json(gws.map(({ credenciais, ...gateway }) => ({ ...gateway, credentialsConfigured: Boolean(credenciais) })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async configureGateway(req: Request, res: Response) {
    try {
      const { id, nome, ambiente, credenciais, taxaFixa, taxaPercent, ativo } = req.body;
      const user = (req as AuthenticatedRequest).user;

      let gw;
      if (id) {
        gw = await GatewayRepository.update(parseInt(id), {
          nome,
          ambiente,
          credenciais,
          taxaFixa: taxaFixa ? parseFloat(taxaFixa) : undefined,
          taxaPercent: taxaPercent ? parseFloat(taxaPercent) : undefined,
          ativo,
        });
      } else {
        gw = await GatewayRepository.create({
          nome,
          ambiente,
          credenciais,
          taxaFixa: taxaFixa ? parseFloat(taxaFixa) : undefined,
          taxaPercent: taxaPercent ? parseFloat(taxaPercent) : undefined,
          ativo,
        });
      }

      if (ativo) {
        await GatewayRepository.setActiveOnly(gw.id);
        // Sync config model to preserve compatibility with legacy frontend checks
        await prisma.configuracao.upsert({
          where: { chave: "gateway_ativo" },
          update: { valor: nome },
          create: { chave: "gateway_ativo", valor: nome },
        });
      }

      await AdminLogRepository.create({
        usuarioId: user?.id,
        acao: "CONFIGURE_GATEWAY",
        detalhes: `Configurou o gateway de pagamento: ${nome} (Ativo: ${ativo || false})`,
      });

      const { credenciais: _secret, ...safeGateway } = gw;
      res.json({ success: true, gateway: { ...safeGateway, credentialsConfigured: true } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getAdminLogs(req: Request, res: Response) {
    try {
      const logs = await AdminLogRepository.listAll();
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
