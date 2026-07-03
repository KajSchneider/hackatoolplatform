# Rollen en Rechten

Dit document beschrijft de verschillende rollen en rechten in het Hackatool platform.

## Hackathon Datums

Team beheerders (owner/admin) kunnen start- en einddatums instellen voor hun hackathon via de team naam editor in de sidebar.

**Actief status:**
- Als geen datums zijn ingesteld: team is altijd actief
- Als startdatum is ingesteld: team is pas actief vanaf startdatum
- Als einddatum is ingesteld: team is niet meer actief na einddatum
- Status wordt getoond in de sidebar (● Actief / ● Inactief)

**Beperkingen bij inactieve hackathon:**
- Gebruikers kunnen wel inloggen en team data bekijken
- Chat API calls worden geblokkeerd (403 - "Hackathon is niet actief")
- Workflow runs worden geblokkeerd (403 - "Hackathon is niet actief")
- Projecten en bestanden kunnen wel bekeken/bewerkt worden (geen API calls)
- Chatbots kunnen wel bekeken/bewerkt worden (geen API calls)

## Platform Level Rollen

### User
- **Standaard rol** voor alle gebruikers
- Kan teams aanmaken en deelnemen aan teams
- Kan projecten, workflows, chatbots en chats aanmaken binnen teams

### Admin
- **Platform beheerder**
- Kan gebruikers aanmaken en beheren via `/admin/users`
- Kan gebruikers direct aan teams toevoegen bij aanmaken
- Heeft toegang tot alle teams en functionaliteit
- Heeft toegang tot alle data van alle gebruikers (chats, projecten, workflows, chatbots, bestanden)

## Team Level Rollen

### Owner
- **Eigenaar van het team**
- Kan team naam bewerken
- Kan teamleden toevoegen en verwijderen
- Kan rollen van teamleden wijzigen
- Heeft volledige toegang tot alle team resources
- Kan teams verwijderen

### Admin
- **Team beheerder**
- Kan teamleden toevoegen en verwijderen
- Kan rollen van teamleden wijzigen (behalve owner)
- Heeft volledige toegang tot alle team resources
- Heeft toegang tot alle data van teamleden binnen het team (chats, projecten, workflows, chatbots, bestanden)
- Kan team niet verwijderen

### Member
- **Teamlid**
- Heet toegang tot team resources (chats, projecten, workflows, chatbots, bestanden)
- Kan eigen resources aanmaken en bewerken
- Kan resources delen met team (indien eigenaar)
- Kan geen teamleden beheren
- Kan team niet verwijderen

## Resource Sharing

Binnen teams kunnen resources optioneel gedeeld worden met andere teamleden:

### Chat
- **Shared**: Alle teamleden kunnen het gesprek bekijken
- **Not Shared**: Alleen de eigenaar kan het gesprek bekijken
- Alleen de eigenaar kan de sharing status wijzigen

### Project
- **Shared**: Alle teamleden kunnen het project bekijken en bewerken
- **Not Shared**: Alleen de eigenaar kan het project bekijken en bewerken
- Alleen de eigenaar kan de sharing status wijzigen

### Workflow
- **Shared**: Alle teamleden kunnen de workflow bekijken en uitvoeren
- **Not Shared**: Alleen de eigenaar kan de workflow bekijken en uitvoeren
- Alleen de eigenaar kan de sharing status wijzigen

### Chatbot
- **Shared**: Alle teamleden kunnen de chatbot gebruiken in chats
- **Not Shared**: Alleen de eigenaar kan de chatbot gebruiken
- Alleen de eigenaar kan de sharing status wijzigen

### Bestanden (Files)
- Bestanden zijn altijd team-scoped via `StoredFile.teamId`
- Alle teamleden hebben automatisch toegang tot alle bestanden binnen het team

## Rechten Matrix

| Actie | Platform Admin | Team Owner | Team Admin | Team Member |
|-------|----------------|------------|-----------|-------------|
| Gebruikers aanmaken | ✅ | ❌ | ❌ | ❌ |
| Teams aanmaken | ✅ | ✅ | ✅ | ✅ |
| Team naam bewerken | ✅ | ✅ | ❌ | ❌ |
| Team verwijderen | ✅ | ✅ | ❌ | ❌ |
| Teamleden toevoegen | ✅ | ✅ | ✅ | ❌ |
| Teamleden verwijderen | ✅ | ✅ | ✅ | ❌ |
| Rollen wijzigen | ✅ | ✅ | ✅ | ❌ |
| Chats aanmaken | ✅ | ✅ | ✅ | ✅ |
| Chats delen | ✅ | ✅ | ✅ | ✅ (eigen) |
| Chats verwijderen | ✅ | ✅ | ✅ | ✅ (eigen) |
| Projecten aanmaken | ✅ | ✅ | ✅ | ✅ |
| Projecten delen | ✅ | ✅ | ✅ | ✅ (eigen) |
| Projecten verwijderen | ✅ | ✅ | ✅ | ✅ (eigen) |
| Workflows aanmaken | ✅ | ✅ | ✅ | ✅ |
| Workflows delen | ✅ | ✅ | ✅ | ✅ (eigen) |
| Workflows verwijderen | ✅ | ✅ | ✅ | ✅ (eigen) |
| Chatbots aanmaken | ✅ | ✅ | ✅ | ✅ |
| Chatbots delen | ✅ | ✅ | ✅ | ✅ (eigen) |
| Chatbots verwijderen | ✅ | ✅ | ✅ | ✅ (eigen) |
| Bestanden uploaden | ✅ | ✅ | ✅ | ✅ |
| Bestanden bekijken | ✅ | ✅ | ✅ | ✅ |

## API Routes

### Platform Admin
- `POST /api/admin/users` - Gebruiker aanmaken (optioneel met team)
- `GET /api/admin/users` - Alle gebruikers lijst

### Team Management
- `PUT /api/teams` - Team naam wijzigen (owner/admin)
- `POST /api/teams/{slug}/users` - User toevoegen aan team (owner/admin)
- `GET /api/teams/{slug}/users` - Teamleden lijst (owner/admin)

### Resource Sharing
- `PUT /api/chat/{conversationId}/share` - Chat sharing toggle
- `PUT /api/teams/{slug}/projects/{projectId}` - Project sharing toggle
- `PUT /api/teams/{slug}/workflows/{workflowId}` - Workflow sharing toggle
- `PUT /api/teams/{slug}/bots/{botId}` - Chatbot sharing toggle

## Beveiliging

- Alle API routes controleren team membership via `requireMembership()`
- Platform admins (`User.role === "admin"`) hebben toegang tot alle teams en alle data
- Team admins (`Membership.role === "owner"` of `"admin"`) hebben toegang tot alle data binnen hun team
- Resource sharing wordt gecontroleerd bij het tonen van resources
- Eigenaren kunnen altijd hun eigen resources bewerken/verwijderen
- `requirePlatformAdmin()` helper voor platform admin checks
- `requireTeamAdmin()` helper voor team admin checks
