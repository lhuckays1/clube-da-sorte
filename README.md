# Clube da Sorte

Aplicação web para rifas e pagamentos Pix. Backend Node.js/Express, frontend React/Vite e PostgreSQL via Prisma.

## Desenvolvimento

1. `npm ci`
2. Configure `.env` com `DATABASE_URL`, `JWT_SECRET`, `APP_URL` e credenciais de sandbox.
3. `npx prisma generate`
4. `npx prisma migrate deploy`
5. `npm run dev`

Não use credenciais reais ou banco de produção durante desenvolvimento. Consulte [DEPLOY.md](DEPLOY.md) para atualizar a VPS.
