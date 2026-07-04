# Hackatool — AI Platform

Multi-tenant AI-platform: hackathons, teams, AI-chat, IDE, workflows en REST API.
Gebouwd met Next.js 15, TypeScript, Prisma en de Vercel AI SDK.

**Productie:** Vercel (serverless) + Supabase (Postgres). Lokaal: SQLite of Supabase.

**Data structuur:** Hackathon → Group → User (drie-niveau hiërarchie)

Zie [ARCHITECTURE.md](./ARCHITECTURE.md) voor het technisch ontwerp.

## Features

### Fase 1 — Fundament
- Registratie/login (e-mail + wachtwoord, optioneel GitHub OAuth)
- **Hackathons** aanmaken met start-/einddatum
- **Groups** (teams) binnen hackathons aanmaken
- **Multi-membership:** gebruikers kunnen lid zijn van meerdere hackathons en groups
- Streaming AI-chat met modelkeuze (OpenAI GPT-4o, Anthropic Claude 3.5)
- Conversatiegeschiedenis per group
- **Custom Endpoints:** eigen API keys per hackathon, versleuteld opgeslagen (AES-256-GCM)

### Fase 2 — API, files & chatbots
- **REST API**: `POST /api/v1/chat` met Bearer-token authenticatie (streaming en non-streaming)
- **API tokens**: per hackathon aan te maken; alleen SHA-256 hash wordt opgeslagen
- **Custom chatbots**: eigen naam, systeem-prompt en model; selecteerbaar in de chat
- **Bestanden**: upload/download/verwijderen per hackathon (max 10 MB, lokale opslag in `uploads/`)
- **Usage logging**: prompt/completion tokens per request in `UsageLog`

### Fase 3 — IDE & apps (Devin-achtig)
- **Projecten**: aanmaken per group met naam, slug en beschrijving
- **IDE UI**: Monaco editor met file tree, create/delete files, auto-save
- **AI Agent**: chat-interface die projectbestanden leest en code genereert/wijzigt
- **Preview**: iframe-based runtime voor HTML/JS/CSS bestanden
- **GitHub integratie**: repo koppelen met encrypted PAT (owner, repo, branch)

### Fase 4 — Workflows (agent pipelines)
- **Workflows**: aanmaken per hackathon met naam, beschrijving en optionele cron schedule
- **Workflow builder**: stappen definiëren (prompt, agent, tool) met JSON config
- **Execution engine**: sequentiële uitvoering met logging, status tracking (pending/running/completed/failed)
- **Runs**: workflow runs geschiedenis met input/output en error logging
- **Handmatige triggers**: run workflow on-demand via UI

### Fase 5 — Admin & Management
- **Platform admin:** gebruikers beheren, hackathons aanmaken, user-to-hackathon/group assignments
- **Admin UI:** user detail pagina, hackathon overzicht, group management
- **Audit logging:** action tracking per user/hackathon (create, update, delete, run, etc.)
- **RBAC:** admin role voor platform beheer

### Fase 7 — Project deployment (GitHub Pages)
- **GitHub koppeling:** gebruikers koppelen een GitHub repo via PAT (owner, repo, branch)
- **Deploy vanuit de IDE:** één klik deploy van projectbestanden naar GitHub + GitHub Pages (public URL)
- **Deployment history:** overzicht per project met status (pending/deployed/failed) en delete
- **Limiet:** max 25 deployments per gebruiker
- **Public API key (optioneel):** per deployment een `hk_deploy_*` key aanmaken voor de public API
- **Public API:** `POST /api/v1/deploy/<key>/chat` — chat endpoint voor gepubliceerde apps (100 req/min)

## Starten

```bash
npm install
npm run db:push   # maakt de SQLite database aan
npm run dev       # http://localhost:3000
```

## Configuratie (.env)

| Variabele | Beschrijving |
|---|---|
| `DATABASE_URL` | SQLite voor dev (`file:./dev.db`); Postgres voor productie |
| `AUTH_SECRET` | Auth.js secret — genereer met `npx auth secret` |
| `ENCRYPTION_KEY` | 64 hex chars (32 bytes) voor AES-256 key-encryptie |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Platform-keys voor credit-gebruik (optioneel) |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth (optioneel) |

> Voor productie: vervang de dev-secrets in `.env`, en wijzig de Prisma datasource
> provider naar `postgresql`.

## Tests

Unit-tests draaien met [Vitest](https://vitest.dev):

```bash
npm test          # eenmalig draaien
npm run test:watch
```

Tests staan naast de code als `*.test.ts` (bv. `src/lib/crypto.test.ts`). Ze worden
na elke **major update** gedraaid (zie [ARCHITECTURE.md](./ARCHITECTURE.md#teststrategie)).

## REST API gebruiken

1. Maak een token aan via **API Tokens** in het hackathon menu
2. Roep de API aan:

```bash
curl -X POST http://localhost:3000/api/v1/chat \
  -H "Authorization: Bearer hk_..." \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Hallo!"}]}'
```

Voeg `"stream": true` toe voor een streaming response.

## Roadmap

- ~~**Fase 1**: auth, hackathons, groups, streaming chat, custom endpoints~~ ✅
- ~~**Fase 2**: per-tenant API endpoints, file-beheer, custom chatbots~~ ✅
- ~~**Fase 3**: Devin-achtige IDE met AI-agent, sandbox, GitHub-integratie~~ ✅
- ~~**Fase 4**: AI agent pipelines (workflows)~~ ✅
- ~~**Fase 5**: Admin & management, audit logging, RBAC~~ ✅
- ~~**Fase 6**: Data structuur refactor (Hackathon → Group → User)~~ ✅
- ~~**Fase 7**: Project deployment naar GitHub Pages + public deploy API~~ ✅
- ~~**Fase 7.1**: Deployment hardening (oude routes opgeruimd, tests)~~ ✅
- ~~**Fase 7.2**: Top-down rol-model (alleen admins maken hackathons aan met beheerder)~~ ✅
- **Toekomst**: Stripe billing, productie-hardening
