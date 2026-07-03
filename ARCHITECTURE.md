# Architectuur — Hackatool

> Dit document wordt bijgehouden per fase. Laatste update: Fase 7 — Project deployment naar Netlify + public deploy API.

## Stack

| Laag | Technologie |
|---|---|
| Framework | Next.js 15 (App Router, React 19, full-stack) |
| Taal | TypeScript (strict) |
| Database | SQLite via Prisma (dev) — Postgres voor productie |
| Auth | NextAuth v5 (JWT-sessies, Credentials + optioneel GitHub OAuth) |
| AI | Vercel AI SDK v4 (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/react`) |
| Styling | Tailwind CSS v3, lucide-react icons |
| File storage | Lokale schijf (`uploads/`) — S3-compatible voor productie |
| IDE | Monaco Editor (`@monaco-editor/react`) |
| Tests | Vitest (unit) — `*.test.ts` naast de code |

## Mappenstructuur

```
src/
  auth.ts                  # NextAuth config (providers, callbacks)
  middleware.ts            # (nog niet aanwezig — route-bescherming zit in pages)
  lib/
    prisma.ts              # Prisma client singleton
    crypto.ts              # AES-256-GCM encrypt/decrypt voor custom endpoint keys
    teams.ts               # slug-generatie + membership-checks
    models.ts              # ondersteunde AI-modellen + provider-mapping
    ai.ts                  # gedeelde model-resolver (custom endpoints), usage logging
    tokens.ts              # platform-token generatie (hk_*) + SHA-256 hashing
    deployments.ts         # deployment constants, hk_deploy_* key generatie, Netlify URL-keuze
    oauth-state.ts         # OAuth state generatie/validatie (HMAC-signed cookie) voor Netlify CSRF-bescherming
    storage.ts             # file opslag/lezen/verwijderen op schijf
  components/              # client components (ChatLayout, EndpointManager, TokenManager, IDE, GitHubSettings, ...)
  app/
    page.tsx               # landing
    login/ register/       # auth-pagina's
    dashboard/             # hackathons overzicht (admin kan teams aanmaken)
    admin/                 # platform admin UI (users, hackathons aanmaken met beheerder, groups)
    t/[slug]/              # hackathon-scoped UI
      groups/              # groups overzicht + aanmaken
      groups/[groupSlug]/  # group-scoped UI
        chat/ chat/[id]/   # streaming chat + historie
        files/              # file-beheer
        projects/           # projecten overzicht + aanmaken
        projects/[id]/     # IDE met Monaco editor, AI agent, preview
        workflows/          # workflows overzicht + aanmaken
        workflows/[id]/     # workflow details + runs
      settings/endpoints/  # custom endpoints CRUD
    settings/netlify/      # Netlify account koppeling (OAuth connect/disconnect)
    api/
      auth/[...nextauth]/  # NextAuth handlers
      register/            # account aanmaken
      admin/               # admin API routes (users, hackathons aanmaken met beheerder, groups)
      teams/               # hackathon CRUD
      teams/[slug]/groups/ # group CRUD
      teams/[slug]/endpoints/  # custom endpoints CRUD
      teams/[slug]/groups/[groupSlug]/projects/  # project CRUD
      teams/[slug]/groups/[groupSlug]/projects/[id]/files/  # projectbestanden CRUD
      teams/[slug]/groups/[groupSlug]/projects/[id]/agent/  # AI agent endpoint
      teams/[slug]/groups/[groupSlug]/projects/[id]/preview/  # preview HTML generation
      teams/[slug]/groups/[groupSlug]/projects/[id]/github/  # GitHub connections CRUD
      teams/[slug]/groups/[groupSlug]/projects/[id]/deploy/  # Netlify deploy + deployments lijst
      teams/[slug]/groups/[groupSlug]/projects/[id]/deployments/[id]/api-key/  # public API key CRUD
      netlify/oauth/ netlify/callback/  # Netlify OAuth flow
      chat/                # interne streaming chat (sessie-auth)
      v1/chat/             # publieke REST API (Bearer-token auth)
      v1/deploy/[key]/chat/  # publieke deploy API (hk_deploy_* key auth)
```

## Datamodel (Prisma)

```
User ──< Membership >── Team (Hackathon)
         │                    │
         └──< GroupMembership >── Group
                                    │
        ┌────────┬─────────────────┼────────┬──────────┬──────────┬──────────┬──────────┐
     ApiKey  PlatformToken  Conversation  StoredFile  Chatbot  Project  Workflow  AuditLog
                              │                                  │         │
                           Message                          ProjectFile WorkflowStep
                                                              │         │
                                                         GitHubConnection WorkflowRun
(UsageLog ook per Team)
```

- **User**: e-mail + bcrypt-hash; GitHub-users worden bij eerste login aangemaakt
- **Team (Hackathon)**: tenant-grens; alles is hackathon-scoped; `credits` (start 100), start-/einddatum
- **Group**: team binnen hackathon; projects zijn group-scoped
- **Membership**: user-to-hackathon lidmaatschap (`owner`/`admin`/`member`)
- **GroupMembership**: user-to-group lidmaatschap (`owner`/`admin`/`member`)
- **ApiKey**: Custom endpoint key, AES-256-GCM versleuteld, uniek per (hackathon, provider)
- **PlatformToken**: REST API token; alleen SHA-256 hash opgeslagen, prefix voor herkenning
- **Conversation/Message**: chathistorie; `chatbotId` optioneel voor custom bots
- **Chatbot**: naam + systeem-prompt + model
- **StoredFile**: metadata; bytes op schijf onder `uploads/<teamId>/`
- **UsageLog**: tokens per request (`source`: chat | api)
- **Project**: IDE-project met naam, slug, status (draft/published), runtimeUrl; **groupId** (niet teamId)
- **ProjectFile**: tekstbestanden in project (path, content); uniek per (project, path)
- **GitHubConnection**: GitHub repo koppeling met encrypted PAT (owner, repo, branch)
- **Workflow**: pipeline met naam, beschrijving, optionele cron schedule
- **WorkflowStep**: stap in pipeline (type: prompt/agent/tool, config als JSON, execution order)
- **WorkflowRun**: uitvoering van workflow met status (pending/running/completed/failed), input/output, error logging
- **AuditLog**: action tracking per user/hackathon (action, resource, resourceId, metadata)
- **NetlifyAccount**: per-user Netlify koppeling; access token AES-256-GCM versleuteld
- **Deployment**: Netlify deployment per project (status, url, siteId, deployId, `createdById`,
  optionele `publicApiKey` hash voor de publieke deploy API); max 25 per user

## Kernflows

### AI-key resolutie (`lib/ai.ts`)
1. Custom endpoint key van de hackathon voor het model → gebruik die
2. Anders platform-key uit env (`OPENAI_API_KEY`/`ANTHROPIC_API_KEY`) → kost 1 credit
3. Geen van beide → foutmelding (400/402)

### Interne chat (`/api/chat`)
- Sessie-auth + membership-check op `teamSlug` (hackathon)
- Optionele chatbot: systeem-prompt + model-override
- Conversation wordt aangemaakt bij eerste bericht; id via `x-conversation-id` response header
- User- en assistant-berichten worden gepersisteerd; usage gelogd in `onFinish`

### Publieke REST API (`/api/v1/chat`)
- `Authorization: Bearer hk_...` → SHA-256 lookup in `PlatformToken`
- Zelfde key-resolutie en credit-logica als interne chat
- `stream: true` → data stream response; anders JSON met `content` + `usage`
- `lastUsedAt` wordt bijgewerkt per request

### IDE (`/t/[slug]/groups/[groupSlug]/projects/[id]`)
- Membership-check op group (via groupMembership)
- Projectbestanden worden opgehaald via API en getoond in file tree
- Monaco editor met auto-save bij wijzigingen
- Preview toggle: iframe laadt `/api/teams/[slug]/groups/[groupSlug]/projects/[id]/preview`

### AI Agent (`/api/teams/[slug]/groups/[groupSlug]/projects/[id]/agent`)
- Leest alle projectbestanden als context
- System prompt instructeert AI om file paths en complete code te geven
- Streaming response via Vercel AI SDK
- Gebruikt custom endpoint of platform-key (zelfde resolutie als chat)

### Preview (`/api/teams/[slug]/groups/[groupSlug]/projects/[id]/preview`)
- Genereert HTML pagina uit projectbestanden
- `index.html` body content wordt gebruikt als basis
- CSS bestanden worden in `<style>` tags geïnjecteerd
- JS bestanden worden in `<script>` tags geïnjecteerd

### GitHub Integratie (`/api/teams/[slug]/groups/[groupSlug]/projects/[id]/github`)
- POST: koppel repo met owner, repo, branch, PAT (encrypted)
- GET: lijst van verbonden repos (tokens gemaskeerd)
- DELETE: ontkoppel repo
- PAT wordt AES-256-GCM versleuteld opgeslagen

### Workflows (`/api/teams/[slug]/workflows`)
- GET: lijst van workflows met steps en recente runs
- POST: maak nieuwe workflow met naam, beschrijving, optionele cron schedule
- Membership-check op hackathon

### Workflow Steps (`/api/teams/[slug]/workflows/[id]/steps`)
- GET: lijst van steps gesorteerd op execution order
- POST: voeg stap toe met type (prompt/agent/tool), config (JSON), order
- Config wordt als JSON string opgeslagen

### Workflow Execution (`/api/teams/[slug]/workflows/[id]/run`)
- POST: trigger workflow run met optionele input
- Maakt WorkflowRun aan met status "running"
- Voert steps sequentieel uit:
  - Prompt steps: AI aanroep met model uit config, context van vorige steps
  - Agent steps: (nog niet geïmplementeerd)
  - Tool steps: (nog niet geïmplementeerd)
- Update run met status, outputs, error, completedAt
- Logt audit entry met action "run"

### Admin User Management (`/api/admin/users`)
- GET: lijst van alle users met memberships en groupMemberships
- POST: maak nieuwe user aan met e-mail en wachtwoord
- User-to-hackathon assignments via `/api/admin/users/[userId]/hackathons`
- User-to-group assignments via `/api/admin/users/[userId]/groups`

### Admin Hackathon Management (`/api/admin/teams`)
- GET: lijst van alle hackathons met memberships, groups, projects
- POST: maak nieuwe hackathon aan met naam, beheerder (owner), start-/einddatum
- Alleen platform admins (`User.role = "admin"`) kunnen hackathons aanmaken

### Group Management (`/api/teams/[slug]/groups`)
- GET: lijst van groups binnen hackathon met members en projects
- POST: maak nieuwe group aan met naam en slug
- Creator wordt automatisch group admin

### Project Deployment (`/api/teams/[slug]/groups/[groupSlug]/projects/[id]/deploy`)
- Vereist gekoppeld Netlify account (`/settings/netlify` → OAuth flow via `/api/netlify/oauth`)
- Membership-check op hackathon; limiet: max 25 deployments per user (`createdById`)
- Projectbestanden worden gezipt (JSZip) en geüpload naar de Netlify Deploy API
- Netlify site wordt hergebruikt per project (siteId van vorige deployment), anders nieuw aangemaakt
- Status-flow: `pending` → `deployed` (met `ssl_url`) of `failed` bij fouten
- Deployment history + delete via `/t/[slug]/groups/[groupSlug]/projects/[id]/deployments`

### Publieke Deploy API (`/api/v1/deploy/[key]/chat`)
- Optionele `hk_deploy_*` key per deployment (alleen SHA-256 hash in DB); aanmaken/intrekken via UI
- Geen sessie nodig: bedoeld voor gepubliceerde apps die AI-functionaliteit aanroepen
- Zelfde model-resolutie (custom endpoints van de hackathon) + usage logging
- Rate limiting: 100 req/min per deployment

## Security

- **Custom endpoint keys**: AES-256-GCM met `ENCRYPTION_KEY` (32 bytes); nooit terug naar de client
- **API tokens**: alleen hash in DB; volledige token eenmalig getoond bij aanmaken
- **GitHub PATs**: AES-256-GCM versleuteld opgeslagen in `GitHubConnection`
- **Netlify tokens**: AES-256-GCM versleuteld opgeslagen in `NetlifyAccount`
- **Deploy API keys**: alleen SHA-256 hash in DB (`Deployment.publicApiKey`); eenmalig getoond
- **Tenant-isolatie**: elke query/route filtert op `teamId` na membership-check (`requireMembership`)
- **Multi-membership**: gebruikers kunnen lid zijn van meerdere hackathons en groups
- **Wachtwoorden**: bcrypt (cost 10)
- **Input-validatie**: zod op alle mutatie-endpoints
- **Rate limiting**: 100 req/min per API token, 60 req/min per user/team voor chat
- **Audit logging**: action tracking voor compliance en debugging
- **RBAC**: admin role voor platform beheer, owner/admin/member voor hackathons/groups
- **Top-down model**: alleen platform admins kunnen hackathons (teams) aanmaken en daar een beheerder (owner) aanwijzen; gewone users worden door admin toegevoegd aan hackathons
- **OAuth state hardening**: Netlify OAuth flow gebruikt een HMAC-signed `state` cookie
  ter bescherming tegen CSRF-aanvallen (`lib/oauth-state.ts`)
- **Bekende beperkingen (nog open)**: dev-secrets in `.env`, SQLite niet geschikt voor productie-concurrency,
  geen echte sandbox-isolatie (preview draait in iframe zonder container-isolatie),
  in-memory rate limiting (Redis voor productie)

## Productie-checklist

- [ ] Postgres i.p.v. SQLite (datasource provider wijzigen + migraties)
- [ ] `AUTH_SECRET` en `ENCRYPTION_KEY` regenereren via secret manager
- [ ] S3-compatible storage i.p.v. lokale schijf
- [ ] Redis voor rate limiting (i.p.v. in-memory)
- [ ] Stripe billing gekoppeld aan credits

## Teststrategie

- **Framework**: Vitest (node-omgeving), config in `vitest.config.ts`, env-setup in `vitest.setup.ts`
- **Locatie**: tests staan als `*.test.ts` naast de broncode (co-located)
- **Dekking nu** (`src/lib/`): `crypto` (encrypt/decrypt round-trip, random IV, tamper-detectie, masking),
  `tokens` (prefix/hash-consistentie, uniciteit), `models` (provider-mapping), `teams` (`slugify`),
  `projects` (slug generatie, GitHub repo/owner validatie), `workflows` (step types, run statuses, JSON parsing),
  `ratelimit` (request limiting, blocking, identifier separation), `rbac` (role hierarchy, access checks),
  `deployments` (status validatie, deploy key generatie/hashing, Netlify URL-keuze),
  `oauth-state` (state generatie, HMAC-validatie, tamper-detectie)
- **Werkafspraak**: `npm test` wordt gedraaid **na elke major update** (nieuwe feature, datamodel-wijziging,
  refactor van een lib of API-route). Bij wijziging van gedrag worden de bijbehorende tests eerst
  aangepast/uitgebreid. Tests mogen niet verzwakt of verwijderd worden zonder expliciete reden.
- **Volgende stappen**: integratietests voor API-routes (token-auth, membership-isolatie) met een
  test-database; component-tests voor IDE, GitHubSettings en WorkflowBuilder.

## Faselog

| Fase | Status | Inhoud |
|---|---|---|
| 1 | ✅ | Auth, hackathons, groups, streaming chat, custom endpoints |
| 2 | ✅ | REST API + tokens, file-beheer, custom chatbots, usage logging |
| 3 | ✅ | IDE met AI-agent, sandbox runtime, preview, GitHub-integratie |
| 4 | ✅ | Agent-pipeline-builder met runs, logging, scheduling |
| 5 | ✅ | Admin & management, audit logging, RBAC |
| 6 | ✅ | Data structuur refactor (Hackathon → Group → User) |
| 7 | ✅ | Project deployment naar Netlify + public deploy API |
| 7.1 | ✅ | Deployment hardening: oude routes opgeruimd, OAuth state CSRF-fix, tests voor oauth-state |
| 7.2 | ✅ | Top-down rol-model: alleen admins maken hackathons aan met beheerder |
| Toekomst | ⏳ | Stripe billing, productie-hardening |
