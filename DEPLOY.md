# Deploy do Clube da Sorte (VPS Ubuntu + systemd + Cloudflare Tunnel)

A aplicação usa Node.js, Vite e PostgreSQL/Prisma. O Tunnel existente encaminha o domínio para o serviço local na porta 4100. Não exponha PostgreSQL nem a porta da aplicação diretamente na internet.

## Variáveis

Configure `/opt/clubedasorte/.env.runtime` fora do Git, com permissões restritas (`chmod 600`). Use uma base de testes separada para validar migrações e pagamentos antes de produção.

Variáveis obrigatórias:

- `NODE_ENV=production`
- `HOST=127.0.0.1`
- `PORT=4100`
- `APP_URL=https://clubedasorte.athomoinfotech.com.br`
- `DATABASE_URL=postgresql://...`
- `JWT_SECRET` aleatório com pelo menos 32 bytes
- `ASAAS_WEBHOOK_TOKEN` aleatório com pelo menos 32 caracteres (configurar o mesmo token no webhook Asaas)
- `MERCADO_PAGO_WEBHOOK_SECRET` se Mercado Pago estiver habilitado

Credenciais do provedor também podem ser configuradas no registro de gateway do painel. Não coloque segredos reais neste arquivo do repositório.

## Atualização

1. Faça backup do banco e da aplicação.
2. Atualize o checkout para o commit desejado.
3. Execute `npm ci`, `npx prisma generate` e `npx prisma migrate deploy` apontando primeiro para o banco de testes.
4. Execute `npm run build`; confirme `dist/` (frontend) e `build/server.cjs` (servidor). O backend e seus mapas de fonte não devem ficar dentro da pasta pública `dist/`.
5. Inicie a versão com `npm start` e valide o fluxo usando apenas credenciais e pagamentos de teste.
6. Repita migrações e build em produção somente depois que o banco de testes e a aplicação forem validados.
7. Reinicie `clubedasorte.service` e verifique `systemctl status clubedasorte` e `journalctl -u clubedasorte`.

O serviço systemd deve usar `WorkingDirectory=/opt/clubedasorte`, `EnvironmentFile=/opt/clubedasorte/.env.runtime`, `User=juvenal` e `ExecStart=/usr/bin/node /opt/clubedasorte/build/server.cjs`. O Tunnel deve apontar para `http://127.0.0.1:4100`.

## Webhooks

- Asaas: `https://api.clubedasorte.athomoinfotech.com.br/api/webhook/asaas` (ou domínio principal), evento de pagamento recebido/confirmado e autenticação com `ASAAS_WEBHOOK_TOKEN`.
- Mercado Pago: `https://api.clubedasorte.athomoinfotech.com.br/api/webhook/mercadopago`; configure o segredo de assinatura em `MERCADO_PAGO_WEBHOOK_SECRET`.

O sistema consulta a cobrança diretamente no provedor e compara pedido, valor e moeda antes de marcar como pago. Não use webhooks para confirmar pagamento manualmente.
