# FamCart

Application de gestion de listes de courses pour un ménage. Les membres partagent une liste commune, cochent les articles en temps réel pendant les courses, et consultent l'historique des sessions passées.

## Fonctionnalités

- Liste de courses partagée entre les membres d'un ménage
- Ajout d'articles avec quantité, unité et fournisseur (magasin)
- Sessions de courses : cocher les articles achetés ou indisponibles
- Historique des sessions archivées
- Synchronisation en temps réel entre les membres
- Rejoindre un ménage via un code d'invitation

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styles | Tailwind CSS v3 + shadcn/ui |
| État serveur | TanStack Query |
| Backend | Node.js + Express 5 + TypeScript |
| ORM | Prisma 5 |
| Base de données | PostgreSQL via Supabase |
| Auth | Supabase Auth + JWT |
| Temps réel | Supabase Realtime |

## Hébergement

| Service | Rôle | URL |
|---|---|---|
| Vercel | Frontend | https://famcart.vercel.app |
| Render | Backend API | https://famcart-backend.onrender.com |
| Supabase | PostgreSQL + Auth + Realtime | — |

> Le backend est sur le free tier Render : cold start ~30s après 15 min d'inactivité.

## Structure du projet

```
famcart/
├── frontend/                  # React + TypeScript + Vite
│   ├── src/
│   │   ├── lib/utils.ts       # Utilitaire cn() pour shadcn/ui
│   │   └── App.tsx
│   ├── tailwind.config.js
│   └── vite.config.ts
├── backend/                   # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── index.ts           # Point d'entrée, GET /health
│   │   └── lib/prisma.ts      # Client Prisma
│   ├── prisma/
│   │   ├── schema.prisma      # Modèle de données complet
│   │   └── migrations/        # Migrations SQL
│   └── tsconfig.json
└── CLAUDE.md                  # Contexte projet pour Claude Code
```

## Modèle de données

```
Household ──< User
          ──< Supplier
          ──< ShoppingItem >── Supplier
                            >── User (requested_by)
          ──< ShoppingSession >── User (shopper)
                              ──< SessionItem >── ShoppingItem
```

## Développement local

### Prérequis

- Node.js v18+
- Un projet Supabase avec les variables d'environnement configurées

### Installation

```bash
# Frontend
cd frontend
npm install
npm run dev        # http://localhost:5173

# Backend
cd backend
npm install
npm run dev        # http://localhost:3000
```

### Variables d'environnement

**`backend/.env`**
```
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
PORT=3000
```

> **Important Supabase** : utilise l'URL du **connection pooler** (disponible dans Supabase → Connect → Session mode), pas l'URL directe. L'URL directe (`db.xxx.supabase.co:5432`) n'est pas accessible depuis Render. Format attendu :
> `postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require`

**`frontend/.env.local`**
```
VITE_SUPABASE_URL="https://xxx.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJ..."
VITE_API_URL="http://localhost:3000"
```

### Commandes Prisma utiles

```bash
cd backend
npm run db:migrate   # Appliquer les migrations
npm run db:generate  # Régénérer le client Prisma
npm run db:studio    # Ouvrir Prisma Studio (interface visuelle DB)
```

## État d'avancement

- [x] Infrastructure (repo, monorepo, CI/CD)
- [x] Frontend scaffoldé (React + Tailwind + shadcn/ui)
- [x] Backend scaffoldé (Express + Prisma + schéma DB)
- [x] Base de données Supabase configurée et migrée
- [x] Déploiement initial (Vercel + Render)
- [x] Connexion backend → Supabase opérationnelle (pooler)
- [ ] Authentification (inscription / connexion)
- [ ] API REST (articles, fournisseurs, sessions)
- [ ] Interface utilisateur
- [ ] Temps réel (Supabase Realtime)