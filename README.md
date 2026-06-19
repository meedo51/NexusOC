# NexusOC — Next-Generation AI Code Assistant

> **Aurora Glassmorphism meets Cyber-Minimalism.** A visually breathtaking, production-ready Dockerized web application that provides an integrated AI-powered coding environment with workspace management, file editing, and real-time AI chat streaming.

![Version](https://img.shields.io/badge/version-1.0.0-purple?style=flat-square)
![Stack](https://img.shields.io/badge/stack-Next.js%2014%20%7C%20FastAPI%20%7C%20PostgreSQL-teal?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

---

## Features

### Core
- **Multi-Workspace Management** — Create, rename, delete, and switch between isolated workspaces. Each workspace has its own file tree, chat history, and AI context.
- **AI-Powered Code Assistant** — Streaming chat responses via Server-Sent Events (SSE). The AI is context-aware — it reads the files in your workspace to provide relevant answers. Markdown rendering with syntax-highlighted code blocks.
- **Integrated Code Editor** — Monaco Editor (the engine behind VS Code) with a custom dark theme (`nexusoc-dark`), syntax highlighting, bracket colorization, minimap, and multi-cursor support.
- **Visual File Tree** — Hierarchical file explorer with drag-and-drop upload, file icons, syntax-highlighted previews, and inline delete.
- **Apply to Editor** — One-click "Apply" button on AI-generated code blocks to inject code directly into the active editor file.

### UI/UX
- **Aurora Glassmorphism** — Animated mesh gradient background (purple, blue, teal) with frosted glass panels using `backdrop-filter: blur(24px)`.
- **Neon Accents** — Glowing borders and shadows on active elements, buttons, and panels.
- **Responsive Layout** — Mobile-first adaptable three-panel design (sidebar, file tree, editor + chat). Panels collapse intelligently based on viewport width.
- **Smooth Animations** — Framer Motion micro-interactions for panel transitions, message entry, and typing indicators.
- **Custom Typography** — Inter (UI) and JetBrains Mono (code) with ligature support.

### Infrastructure
- **100% Dockerized** — Six containers managed by Docker Compose: Caddy (reverse proxy), Frontend (Next.js), Backend (FastAPI), PostgreSQL, Redis, and persistent volumes.
- **Auto-SSL** — Caddy with Cloudflare DNS challenge provides automatic HTTPS certificates for `ai.xus.me`.
- **Production Backend** — FastAPI with async SQLAlchemy, uvloop, and 4 workers. PostgreSQL for persistence, Redis for caching/pub-sub.
- **OpenAI Compatible** — Swap to any OpenAI-compatible provider (local Ollama, Azure, Anthropic via proxy) by changing `OPENAI_BASE_URL`.

---

## Architecture

```
                        ┌─────────────┐
                        │   Internet   │
                        │  :4443/443   │
                        └──────┬──────┘
                               │
                        ┌──────▼──────┐
                        │    Caddy    │  ← Auto-SSL (Cloudflare)
                        │  (Reverse   │
                        │   Proxy)    │
                        └──┬──────┬──┘
                           │      │
              ┌────────────▼┐  ┌──▼────────────┐
              │   Frontend  │  │   Backend     │
              │  Next.js 14 │  │  FastAPI      │
              │  :3000      │  │  :8000        │
              └─────────────┘  └──┬──────┬─────┘
                                  │      │
                     ┌────────────▼┐  ┌──▼────────────┐
                     │ PostgreSQL  │  │    Redis       │
                     │  :5432      │  │   :6379       │
                     └─────────────┘  └───────────────┘
```

### Services

| Service    | Container          | Host Port | Role                              |
|------------|--------------------|-----------|-----------------------------------|
| **Caddy**  | `nexusoc-caddy`    | `4443:443`           | Reverse proxy, SSL termination    |
| **Frontend** | `nexusoc-frontend` | —         | Next.js 14 SPA                    |
| **Backend** | `nexusoc-backend`  | —         | FastAPI REST + SSE streaming      |
| **PostgreSQL** | `nexusoc-db`    | —         | Primary database                  |
| **Redis**  | `nexusoc-redis`    | —         | Caching, pub/sub                  |

---

## Directory Structure

```
nexusoc/
├── docker-compose.yml          # Service orchestration
├── .env.example                # Environment variable template
├── setup.sh                    # One-click AlmaLinux 10 deploy
├── .gitignore
│
├── caddy/
│   └── Caddyfile               # Reverse proxy config with auto-SSL
│
├── backend/                    # Python FastAPI backend
│   ├── Dockerfile              # Multi-stage build (Python 3.12)
│   ├── requirements.txt
│   ├── alembic.ini             # Database migration config
│   ├── alembic/
│   │   ├── env.py              # Async Alembic environment
│   │   ├── script.py.mako
│   │   └── versions/
│   └── app/
│       ├── main.py             # FastAPI app, lifespan, CORS
│       ├── config.py           # Pydantic Settings (env-driven)
│       ├── database.py         # SQLAlchemy async engine + Redis
│       ├── models/             # SQLAlchemy ORM models
│       │   ├── workspace.py    # Workspace, File
│       │   └── chat.py         # ChatSession, Message
│       ├── schemas/            # Pydantic request/response
│       │   ├── workspace.py
│       │   └── chat.py
│       ├── routers/            # API endpoints
│       │   ├── health.py       # GET  /api/health
│       │   ├── workspaces.py   # CRUD /api/workspaces
│       │   ├── chat.py         # SSE  /api/chat/stream
│       │   └── files.py        # CRUD /api/files
│       └── services/           # Business logic
│           ├── ai_service.py   # OpenAI streaming via httpx
│           └── file_service.py # File storage, MIME detection
│
└── frontend/                   # Next.js 14 TypeScript SPA
    ├── Dockerfile              # Multi-stage build (standalone output)
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts      # Custom Aurora theme
    ├── next.config.js          # Standalone output, security headers
    ├── postcss.config.js
    ├── .eslintrc.json
    └── src/
        ├── app/
        │   ├── layout.tsx      # Root layout with Aurora background
        │   ├── page.tsx        # Three-panel responsive layout
        │   └── globals.css     # Aurora, Glassmorphism, Neon styles
        ├── components/
        │   ├── ui/             # GlassPanel, NeonButton, TopBar
        │   ├── workspace/      # Sidebar, FileTree
        │   ├── chat/           # ChatInterface, MessageBubble
        │   └── editor/         # CodeEditor (Monaco)
        ├── lib/
        │   ├── api.ts          # REST client + SSE stream parser
        │   ├── store.ts        # Zustand state management
        │   └── utils.ts        # Helpers (cn, formatFileSize, getFileIcon)
        └── types/              # TypeScript interfaces
```

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Linux server | AlmaLinux 10 (RHEL 10) | Other RHEL derivatives may work |
| Docker | 24+ | Installed automatically by `setup.sh` |
| Docker Compose | v2+ | Included in docker-compose-plugin |
| Domain | `ai.xus.me` | Pointed to your server IP |
| Cloudflare API Token | DNS:Edit | For automatic SSL certificate |
| OpenAI API Key | — | Or any OpenAI-compatible provider |

---

## Quick Start (AlmaLinux 10)

### 1. Clone & Configure

```bash
# Clone the repository
git clone https://github.com/your-org/nexusoc.git /opt/nexusoc
cd /opt/nexusoc

# Create environment file from template
cp .env.example .env
```

### 2. Edit `.env`

```env
# ─── Database ──────────────────────────────────────────────────────
DB_PASSWORD=Generate_A_Strong_Random_Password_Here

# ─── AI Provider (OpenAI-compatible) ───────────────────────────────
OPENAI_API_KEY=sk-your-actual-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4-turbo-preview

# ─── Caddy Cloudflare DNS Challenge (for SSL) ──────────────────────
CF_API_TOKEN=your-cloudflare-api-token-with-dns-edit-perms
```

### 3. Run Setup

```bash
# Make executable and run as root
chmod +x setup.sh
sudo bash setup.sh
```

The script will:
1. Update system packages
2. Install Docker Engine from the official RHEL repository
3. Configure `firewalld` to open ports 80, 443, and 4096
4. Set SELinux context for Docker volumes (if enforcing)
5. Pull images and launch all containers
6. Display the access URL

### 4. Access

```
https://ai.xus.me:4443
```

> Because Caddy terminates SSL inside the container and maps host port `4096` → container port `443`, you must include `:4443` in the URL unless you configure an external load balancer or NAT rule.

---

## Manual Deployment (Any Linux with Docker)

```bash
# 1. Clone and configure
git clone https://github.com/your-org/nexusoc.git
cd nexusoc
cp .env.example .env
nano .env  # Fill in your values

# 2. Launch all services
docker compose pull
docker compose up -d --build

# 3. Verify health
docker compose ps
docker compose logs -f
```

---

## API Reference

### Health

```
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected"
}
```

### Workspaces

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/workspaces` | List all workspaces |
| `POST` | `/api/workspaces` | Create workspace |
| `GET` | `/api/workspaces/{id}` | Get workspace details |
| `PATCH` | `/api/workspaces/{id}` | Update workspace |
| `DELETE` | `/api/workspaces/{id}` | Delete workspace |
| `GET` | `/api/workspaces/{id}/context` | Get workspace AI context |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat/sessions` | Create chat session |
| `GET` | `/api/chat/sessions/{workspace_id}` | List sessions |
| `GET` | `/api/chat/sessions/{session_id}/messages` | Get messages |
| `POST` | `/api/chat/stream` | **SSE streaming chat** |

### Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/files/{workspace_id}` | List files in workspace |
| `POST` | `/api/files/{workspace_id}/upload` | Upload file (multipart) |
| `PUT` | `/api/files/{workspace_id}/{file_id}/content` | Update file content |
| `GET` | `/api/files/{workspace_id}/{file_id}/download` | Download file |
| `DELETE` | `/api/files/{workspace_id}/{file_id}` | Delete file |

---

## Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_PASSWORD` | ✅ | — | PostgreSQL password |
| `OPENAI_API_KEY` | ✅ | — | OpenAI API key |
| `CF_API_TOKEN` | ✅ | — | Cloudflare API token for DNS challenge |
| `OPENAI_BASE_URL` | — | `https://api.openai.com/v1` | OpenAI-compatible API base URL |
| `OPENAI_MODEL` | — | `gpt-4-turbo-preview` | Model ID for chat completions |
| `LOG_LEVEL` | — | `INFO` | Backend log level (DEBUG, INFO, WARNING) |

### Ports

| Host Port | Container Port | Service |
|-----------|----------------|---------|
| `4443` | `443` | Caddy (HTTPS) |

> To change the external port, edit `docker-compose.yml` line 9 and update `setup.sh`'s `PORT` variable.

---

## Using with Local LLMs (Ollama)

NexusOC is provider-agnostic. To use a local model:

```env
OPENAI_BASE_URL=http://host.docker.internal:11434/v1
OPENAI_MODEL=llama3.1:70b
```

Or configure a sidecar container running vLLM, LocalAI, or Ollama.

---

## Development

### Backend (without Docker)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Run with hot reload
uvicorn app.main:app --reload --port 8000
```

### Frontend (without Docker)

```bash
cd frontend
npm install
npm run dev
```

### Database Migrations

```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

> The app auto-creates tables on startup via `Base.metadata.create_all()`. Alembic is available for schema versioning in production.

---

## Security

- **HTTPS only** — Caddy enforces TLS 1.3 with auto-renewing certificates
- **Security headers** — HSTS, X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- **No secrets in code** — All credentials go through environment variables
- **SELinux support** — `setup.sh` applies `container_file_t` context for Docker volumes
- **Firewalld** — Only ports 80, 443, 4096 are exposed
- **Non-root containers** — Both backend and frontend run as unprivileged users (`nexusoc:1001`, `nextjs:1001`)

---

## Troubleshooting

### "Connection refused" when accessing the URL
```bash
# Check if containers are running
docker compose ps

# Check logs
docker compose logs -f

# Verify firewall
sudo firewall-cmd --zone=public --list-ports
```

### SSL certificate not provisioning
```bash
# Check Caddy logs
docker compose logs caddy -f

# Verify Cloudflare API token has DNS:Edit permission for your domain
# Ensure DNS A record points to your server IP
```

### AI chat returns errors
```bash
# Check backend logs
docker compose logs backend -f

# Verify OPENAI_API_KEY in .env
# Verify OPENAI_BASE_URL is reachable from the container
```

### Database connection failure
```bash
# Check database health
docker compose exec db pg_isready -U nexusoc

# Verify DB_PASSWORD matches between .env and docker-compose.yml
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **UI Animation** | Framer Motion |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) |
| **Markdown** | react-markdown, remark-gfm, react-syntax-highlighter |
| **State** | Zustand |
| **Backend** | Python 3.12, FastAPI, uvicorn + uvloop |
| **ORM** | SQLAlchemy 2.0 (async), asyncpg |
| **AI Streaming** | httpx, sse-starlette |
| **Database** | PostgreSQL 16, Redis 7 |
| **Reverse Proxy** | Caddy 2 (auto-SSL via Cloudflare DNS) |
| **Containerization** | Docker, Docker Compose |

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with ❤️ for the open-source AI coding community.
</p>
