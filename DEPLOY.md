# Guia de Implantação e Deploy em Produção (VPS Ubuntu)

Este guia detalha o passo a passo completo para publicar este sistema profissional de rifas online em um servidor VPS rodando Linux **Ubuntu 20.04 ou superior**, utilizando **PM2**, **Nginx**, **Certbot (SSL Grátis)** e migrando de SQLite para um banco de dados relacional **MySQL**.

---

## 🚀 Requisitos Prévios no Servidor Ubuntu
Conecte-se à sua VPS Ubuntu e execute os comandos iniciais de atualização:
```bash
sudo apt update && sudo apt upgrade -y
```

### 1. Instalar Node.js (V20 LTS) e Git
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
node -v # Deve exibir v20.x
```

### 2. Instalar MySQL Server
```bash
sudo apt install mysql-server -y
sudo mysql_secure_installation
```
Crie a database e o usuário para o sistema no terminal do MySQL (`sudo mysql`):
```sql
CREATE DATABASE IF NOT EXISTS rifas_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rifa_user'@'localhost' IDENTIFIED BY 'SenhAr0busT@_2026';
GRANT ALL PRIVILEGES ON rifas_db.* TO 'rifa_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 🛠️ Configuração da Aplicação no Servidor

### 1. Clonar o Repositório e Instalar Dependências
```bash
git clone https://seu-repositorio-github.com/projeto.git /var/www/rifas
cd /var/www/rifas
npm install
```

### 2. Configurar Variáveis de Ambiente (`.env`)
Renomeie o arquivo `.env.example` para `.env` e preencha as credenciais reais:
```bash
cp .env.example .env
nano .env
```
Substitua as informações:
```env
# Altere o endereço para apontar para o seu MySQL recém-configurado
DATABASE_URL="mysql://rifa_user:SenhAr0busT@_2026@localhost:3306/rifas_db"

# Defina uma chave criptográfica forte para segurança JWT
JWT_SECRET="UM_HASH_EXTREMAMENTE_LONGO_E_ALEATORIO_PARA_A_SEGURANCA"

# Domínio do seu site de rifas
APP_URL="https://seusite.com.br"
```

### 3. Migrar Banco de Dados
Gere os clientes nativos do Prisma ORM e aplique as migrations no banco de dados de produção:
```bash
npx prisma generate
npx prisma migrate deploy
```

---

## 📦 Compilação e Gerenciamento com PM2

### 1. Instalar o PM2 Globalmente
```bash
sudo npm install -y -g pm2
```

### 2. Compilar Aplicação (Vite e Backend Server)
```bash
npm run build
```
O comando cria a pasta `/dist` que contém:
- O painel SPA da área do cliente compile-optimizado.
- O backend Express em CJS standalone no arquivo `server.cjs` (sem resoluções de caminho lentas).

### 3. Iniciar com PM2 Multi-Cluster
Inicie o servidor rodando em cluster (distribuído entre os núcleos de processamento):
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```
*(Ative o startup script fornecido no terminal para garantir reinicialização em caso de falha física da VPS).*

---

## 🌐 Configuração do Proxy Reverso Nginx

### 1. Instalar Nginx
```bash
sudo apt install nginx -y
```

### 2. Configurar Hosts Virtuais do Site
Crie uma configuração customizada desabilitando a página padrão e aplicando a configuração definitiva contida no arquivo `nginx.conf`:
```bash
sudo rm /etc/nginx/sites-enabled/default
sudo nano /etc/nginx/sites-available/rifas
```
Cole as especificações do proxy reverso de produção estruturado para os domínios oficiais (já presente no arquivo `nginx.conf` do projeto):
```nginx
# 1. FRONTEND APP & GENERAL WEBSITE PORTS
server {
    listen 80;
    server_name clubedasorte.athominfotech.com.br www.clubedasorte.athominfotech.com.br;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    client_max_body_size 12M;
}

# 2. SEPARATED API DOMAIN SPECIFICATIONS FOR WEB PORTALS
server {
    listen 80;
    server_name api.clubedasorte.athominfotech.com.br;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    client_max_body_size 12M;
}
```
Ative e reinicie o Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/rifas /etc/nginx/sites-enabled/
sudo nginx -t # Deve indicar sucesso sintático
sudo systemctl restart nginx
```

### 3. Instalar Certificado SSL Grátis (Let's Encrypt HTTPS)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d clubedasorte.athominfotech.com.br -d www.clubedasorte.athominfotech.com.br -d api.clubedasorte.athominfotech.com.br
```
*(Siga as instruções, informe seu e-mail e ative a opção de redirecionamento automático para HTTPS).*

Pronto! Seu site está operacional na VPS em produção de alta fidelidade!
Para acompanhar logs em tempo real, use `pm2 logs`.
Para monitorizar status no terminal, use `pm2 monit`.
Para gerenciar backups do banco de dados, você também possui o script `/schema.sql`.
