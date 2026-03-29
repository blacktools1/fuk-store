# Deploy Multi-Tenant na VPS

## Visão Geral

Um único processo Node.js serve **N lojas** simultaneamente. O Nginx recebe todos os domínios e encaminha para a mesma porta 3000. O app identifica a loja pelo header `Host`.

```
loja1.com  ─┐
loja2.com  ──┤── Nginx (80/443) ──► Next.js :3000 ──► data/tenants/loja1.com/
painel.com ─┘                                       ──► data/tenants/loja2.com/
```

---

## 1. Preparar o servidor

```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 (gerenciador de processos)
npm install -g pm2

# Nginx
sudo apt install nginx -y
```

---

## 2. Clonar e instalar o projeto

```bash
git clone https://github.com/vinitakeuti/freedom-ecommerce.git /srv/store
cd /srv/store
npm install
```

---

## 3. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
nano .env.local   # preencher com suas senhas reais
```

---

## 4. Migrar dados existentes (se tiver)

Se você já tem produtos/configurações em `data/store-data.json`:

```bash
node scripts/migrate-tenant.mjs seudominio.com.br
```

---

## 5. Build e iniciar com PM2

```bash
npm run build

pm2 start npm --name "store" -- start
pm2 save
pm2 startup   # configura PM2 para iniciar no boot
```

---

## 6. Configurar Nginx

Crie `/etc/nginx/sites-available/store`:

```nginx
server {
    listen 80;
    server_name _;          # captura TODOS os domínios apontados para este IP

    client_max_body_size 10M;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/store /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. SSL com Certbot (HTTPS gratuito)

```bash
sudo apt install certbot python3-certbot-nginx -y

# Para cada domínio:
sudo certbot --nginx -d loja1.com.br -d www.loja1.com.br
sudo certbot --nginx -d painel.seudominio.com
```

O Certbot atualiza o Nginx automaticamente com o bloco HTTPS.

---

## 8. Adicionar uma nova loja

1. Acesse `https://painel.seudominio.com` (Painel Master)
2. Clique em **+ Nova Loja** e informe o domínio (ex: `loja2.com.br`)
3. No provedor DNS da `loja2.com.br`, crie um registro **A** apontando para o IP da VPS
4. Obtenha o certificado SSL: `sudo certbot --nginx -d loja2.com.br`
5. Acesse `https://loja2.com.br/admin` para configurar produtos, logo, cores, etc.

**Não é necessário reiniciar o servidor para cada nova loja.**

---

## Estrutura de dados

```
data/
  tenants/
    loja1.com.br/
      store-data.json    ← config + produtos + banners
    loja2.com.br/
      store-data.json

public/
  uploads/
    loja1.com.br/        ← imagens enviadas pela loja 1
    loja2.com.br/        ← imagens enviadas pela loja 2
```

---

## Comandos úteis

```bash
pm2 status              # ver status do processo
pm2 logs store          # ver logs em tempo real
pm2 restart store       # reiniciar após atualização de código

# Atualizar o código:
git pull
npm install
npm run build
pm2 restart store
```
