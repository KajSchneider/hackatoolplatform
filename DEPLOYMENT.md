# Deployment Guide — Hackatool

Deze guide beschrijft twee dingen:

1. **Platform deployment** — het Hackatool platform zelf live zetten (Vercel + Supabase Postgres)
2. **Project deployment** — hoe gebruikers hun in de IDE gebouwde projecten live zetten (GitHub Pages)

---

## 1. Platform deployment (Vercel)

### Voorbereiding

1. Push de code naar een GitHub repository
2. Maak een Postgres database aan (bijv. [Neon](https://neon.tech), [Supabase](https://supabase.com) of Vercel Postgres)
3. Wijzig de Prisma datasource in `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

4. Genereer migraties: `npx prisma migrate dev --name init`

### Vercel setup

1. Importeer de repository op [vercel.com](https://vercel.com)
2. Framework preset: **Next.js** (wordt automatisch gedetecteerd)
3. Voeg de environment variables toe (zie hieronder)
4. Deploy

### Environment variables (productie)

| Variabele | Verplicht | Beschrijving |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `AUTH_SECRET` | ✅ | Genereer nieuw: `npx auth secret` — **niet** de dev-waarde hergebruiken |
| `ENCRYPTION_KEY` | ✅ | 64 hex chars — genereer nieuw: `openssl rand -hex 32` |
| `NEXTAUTH_URL` | ✅ | Productie-URL, bijv. `https://hackatool.example.com` |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | ⬜ | Platform-keys voor credit-gebruik |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | ⬜ | GitHub OAuth login |

> ⚠️ Als je `ENCRYPTION_KEY` wijzigt, kunnen bestaande versleutelde keys (custom endpoints,
> GitHub PATs) niet meer ontsleuteld worden. Gebruikers moeten ze opnieuw invoeren.

### Productie-checklist

- [ ] Postgres i.p.v. SQLite (+ `prisma migrate deploy` in de build)
- [ ] Nieuwe `AUTH_SECRET` en `ENCRYPTION_KEY` via secret manager
- [ ] S3-compatible storage voor uploads (lokale schijf werkt niet op Vercel serverless)
- [ ] Redis voor rate limiting (in-memory werkt niet over meerdere serverless instances)
- [ ] OAuth redirect URLs bijwerken (GitHub) naar de productie-URL

---

## 2. Project deployment (GitHub Pages) — voor gebruikers

Gebruikers kunnen hun IDE-projecten met één klik live zetten naar GitHub Pages.

### Voor gebruikers: repo koppelen & deployen

1. Open een project in de IDE en klik **GitHub koppelen** in de header
2. Vul owner, repo name, branch en een GitHub Personal Access Token (PAT) in
3. Klik **Deploy** — projectbestanden worden naar de repo gepusht en GitHub Pages ingeschakeld
4. Na de deploy verschijnt de public URL (**View Live**)
5. Bekijk de geschiedenis via de **Deployments** link

**Limiet:** max 25 deployments per gebruiker. Opnieuw deployen update dezelfde repo/branch.

### Public API key (optioneel)

Wil je dat je gepubliceerde app AI-functionaliteit gebruikt? Genereer dan een public API key:

1. Ga naar de **Deployments** pagina van je project
2. Klik **Public API key** bij een geslaagde deployment
3. Kopieer de key (`hk_deploy_...`) — deze wordt maar één keer getoond

Gebruik in je gepubliceerde app:

```js
const res = await fetch("https://<hackatool-domein>/api/v1/deploy/<jouw-key>/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Hallo!" }],
  }),
});
const data = await res.json(); // { content, usage }
```

Voeg `"stream": true` toe voor een streaming response.

**Beveiliging & limieten:**

- De key wordt als SHA-256 hash opgeslagen; kwijt = intrekken en nieuwe aanmaken
- Rate limit: 100 requests/min per deployment
- De key gebruikt de custom endpoints van de hackathon — usage wordt gelogd per hackathon
- Key intrekken kan altijd via de Deployments pagina

> ⚠️ **Let op:** een public API key in frontend-code is zichtbaar voor iedereen die je app
> bezoekt. Gebruik hem alleen voor apps waar dat acceptabel is (hackathon demo's), en trek
> hem in na afloop.
