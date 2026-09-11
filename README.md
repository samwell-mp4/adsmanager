# Browser Manager 🌐

Plataforma própria para gerenciamento de perfis de navegadores remotos isolados, com persistência de dados/cookies, suporte a proxies dedicados (HTTP/HTTPS/SOCKS5 com autenticação), controle visual via noVNC e automação integrada com Playwright/CDP.

---

## 🏗️ Arquitetura do Sistema

```
+-------------------------------------------------------------------------------+
|                             Frontend (React + Vite)                           |
|      - Gerenciamento de Perfis (Status, Ações, VNC Integrado)                 |
|      - Gerenciamento & Teste de Proxies                                       |
|      - Logs & Eventos em Tempo Real                                           |
+---------------------------------------+---------------------------------------+
                                        | REST / WebSocket
                                        v
+-------------------------------------------------------------------------------+
|                          Backend API (Fastify + TypeScript)                   |
|  - ProfileController, ProxyController, AutomationController                   |
|  - BrowserManager (Orquestração de ciclo de vida e estado)                     |
|  - DockerManager (dockerode: criação, monitoramento e remoção de containers)  |
|  - PortManager (Alocação dinâmica e segura de portas VNC/noVNC/CDP)           |
|  - AutomationService (Playwright connectOverCDP para inspeção/navegação)      |
+-------------------+-------------------+-------------------+-------------------+
                    |                   |                   |
                    v                   v                   v
            +---------------+   +---------------+   +-----------------------+
            |  PostgreSQL   |   | Docker Socket |   | Volumes Persistentes  |
            |  Migrations   |   | (/var/run/    |   | /data/browser-        |
            |  SQL reais    |   |  docker.sock) |   | profiles/{uuid}       |
            +---------------+   +---------------+   +-----------------------+
                                        |
                 +----------------------+----------------------+
                 |                                             |
                 v                                             v
    +---------------------------+                 +---------------------------+
    | Container: Profile 001    |                 | Container: Profile 002    |
    |  - Xvfb (:99)             |                 |  - Xvfb (:99)             |
    |  - Fluxbox                |                 |  - Fluxbox                |
    |  - x11vnc (:5900)         |                 |  - x11vnc (:5900)         |
    |  - websockify/noVNC(:6080)|                 |  - websockify/noVNC(:6080)|
    |  - Local Proxy Bridge     |                 |  - Local Proxy Bridge     |
    |  - Chromium (:9222 CDP)   |                 |  - Chromium (:9222 CDP)   |
    |    Volume: /home/browser/ |                 |    Volume: /home/browser/ |
    |            profile        |                 |            profile        |
    +---------------------------+                 +---------------------------+
```

---

## 📁 Estrutura de Diretórios

```
browser-manager/
├── apps/
│   ├── api/                     # Backend Fastify + TypeScript
│   │   ├── src/
│   │   │   ├── config/          # Variáveis de ambiente e portas
│   │   │   ├── controllers/     # Profile, Proxy e Health controllers
│   │   │   ├── db/              # Pool PostgreSQL e runner de migrations
│   │   │   ├── managers/        # DockerManager, BrowserManager, PortManager
│   │   │   ├── repositories/    # Camada de dados SQL (Profiles, Proxies, Events)
│   │   │   ├── routes/          # Definições de rotas Fastify
│   │   │   ├── services/        # ProxyTester e Playwright CDP Automation
│   │   │   ├── types/           # Tipagens estritas TypeScript
│   │   │   └── server.ts        # Ponto de entrada do backend
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                     # Frontend React + Vite + TailwindCSS
│       ├── src/
│       │   ├── components/      # Navbar, StatusBadge, Modais de Criação
│       │   ├── pages/           # Perfis, Detalhes com noVNC, Proxies
│       │   ├── services/        # Cliente HTTP da API
│       │   ├── types/           # Tipos compartilhados
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── Dockerfile
│       ├── nginx.conf
│       ├── package.json
│       └── vite.config.ts
├── database/
│   └── migrations/              # Migrations SQL versionadas
│       ├── 001_create_proxies.sql
│       ├── 002_create_profiles.sql
│       └── 003_create_events.sql
├── docker/
│   └── browser/                 # Runtime do perfil de navegador
│       ├── Dockerfile           # Imagem base Debian + Chrome + noVNC + Fluxbox
│       ├── entrypoint.sh        # Orquestração e Graceful SIGTERM
│       └── proxy-forwarder.js   # Forwarder local para autenticação de proxy
├── docker-compose.yml           # Orquestrador multi-container
├── .env.example                 # Exemplo de configuração
├── .env                         # Configuração ativa
└── README.md
```

---

## 🚀 Endpoints da API

### Saúde
- `GET /health` -> Verifica conectividade do PostgreSQL e Docker Socket

### Perfis de Navegador
- `GET /api/profiles` -> Lista todos os perfis com status real atualizado
- `GET /api/profiles/:id` -> Detalhes completos do perfil
- `POST /api/profiles` -> Cria um novo perfil (`status: 'stopped'`)
- `PATCH /api/profiles/:id` -> Atualiza configurações do perfil
- `DELETE /api/profiles/:id` -> Para container (se ativo) e remove perfil
- `POST /api/profiles/:id/start` -> Inicia container, aloca portas e Chromium
- `POST /api/profiles/:id/stop` -> Para container preservando o volume
- `POST /api/profiles/:id/restart` -> Reinicia o perfil
- `PUT /api/profiles/:id/proxy` -> Atualiza proxy e reinicia se ativo mantendo dados
- `GET /api/profiles/:id/status` -> Consulta status do container
- `GET /api/profiles/:id/vnc` -> Retorna URL de acesso ao noVNC
- `GET /api/profiles/:id/cdp` -> Retorna endpoint do CDP
- `GET /api/profiles/:id/events` -> Retorna histórico de auditoria
- `GET /api/profiles/:id/pages` -> Lista abas abertas via Playwright CDP
- `POST /api/profiles/:id/navigate` -> Navega para uma URL via Playwright CDP

### Proxies
- `GET /api/proxies` -> Lista proxies cadastrados
- `GET /api/proxies/:id` -> Detalhes do proxy
- `POST /api/proxies` -> Cadastra novo proxy (HTTP/HTTPS/SOCKS5 com usuário e senha)
- `PATCH /api/proxies/:id` -> Atualiza proxy
- `DELETE /api/proxies/:id` -> Remove proxy
- `POST /api/proxies/:id/test` -> Realiza conexão HTTP pelo proxy e afere IP e latência

---

## ⚙️ Variáveis de Ambiente (.env)

```env
PORT=3001
HOST=0.0.0.0
DATABASE_URL=postgres://adsmanager:Samuca03146555%40@adsmanager_adsmanager:5432/adsmanager?sslmode=disable
PROFILES_DATA_DIR=/data/browser-profiles
BROWSER_IMAGE=browser-profile:latest
NOVNC_PORT_START=6100
NOVNC_PORT_END=6999
CDP_PORT_START=9200
CDP_PORT_END=9999
VNC_PORT_START=5901
VNC_PORT_END=6099
PROFILE_MEMORY_MB=1024
PROFILE_CPU_LIMIT=1.0
```

---

## 🛠️ Como Iniciar na Sua VPS / Docker

### 1. Construir a Imagem Base do Browser Profile
```bash
docker build -t browser-profile:latest ./docker/browser
```

### 2. Subir os Serviços com Docker Compose
```bash
docker compose up -d --build
```

Acesse o painel web em:
- **Painel Web:** `http://seu-ip-ou-dominio:8080`
- **API Backend:** `http://seu-ip-ou-dominio:3001`
- **Health Check:** `http://seu-ip-ou-dominio:3001/health`
