# FamCart

Application de gestion de listes de courses pour un ménage. Les membres partagent des listes par fournisseur, ajoutent des articles, et consultent l'historique des courses passées.

## Fonctionnalités

- Authentification via Supabase Auth (inscription / connexion par email)
- Création ou rejoindre un ménage via un code d'invitation
- Plusieurs listes de courses ouvertes en parallèle (une par fournisseur)
- Ajout d'articles avec quantité et unité
- Historique des listes clôturées
- Sessions de courses (à venir) : cocher les articles achetés ou indisponibles
- Synchronisation en temps réel entre les membres (à venir)

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styles | Tailwind CSS v3 |
| État serveur | TanStack Query |
| Backend | Node.js 18 + Express 5 + TypeScript |
| ORM | Prisma 5 |
| Base de données | PostgreSQL via Supabase |
| Auth | Supabase Auth (vérification token via REST API) |

## Hébergement

| Service | Rôle | URL |
|---|---|---|
| Vercel | Frontend | https://famcart.vercel.app |
| Render | Backend API | https://famcart-backend.onrender.com |
| Supabase | PostgreSQL + Auth | — |

> Le backend est sur le free tier Render : cold start ~30s après 15 min d'inactivité.

## Structure du projet

```
famcart/
├── frontend/
│   └── src/
│       ├── contexts/AuthContext.tsx   # Session Supabase + sync user
│       ├── lib/
│       │   ├── api.ts                 # Wrapper fetch avec token JWT
│       │   ├── supabase.ts            # Client Supabase
│       │   └── version.ts             # APP_VERSION
│       ├── components/
│       │   ├── Layout.tsx             # Entête + nav
│       │   └── ProtectedRoute.tsx     # Gardes RequireAuth / RequireHousehold
│       ├── pages/
│       │   ├── Login.tsx / Signup.tsx
│       │   ├── Setup.tsx              # Créer ou rejoindre un ménage
│       │   ├── Home.tsx               # Listes ouvertes
│       │   ├── ListDetail.tsx         # Articles d'une liste
│       │   ├── History.tsx            # Listes clôturées
│       │   ├── About.tsx
│       │   └── DbStatus.tsx
│       └── App.tsx
├── backend/
│   └── src/
│       ├── middleware/auth.ts         # Vérification token Supabase
│       ├── lib/
│       │   ├── prisma.ts
│       │   └── supabase.ts            # verifySupabaseToken via REST
│       ├── routes/
│       │   ├── auth.ts                # POST /auth/sync
│       │   ├── households.ts          # GET|POST /households, POST /households/join
│       │   ├── lists.ts               # CRUD listes + articles
│       │   ├── suppliers.ts           # CRUD fournisseurs
│       │   └── status.ts
│       └── index.ts
├── prisma/
│   └── schema.prisma
└── CLAUDE.md
```

## Modèle de données

```
Household ──< User
          ──< Supplier
          ──< ShoppingList >── Supplier
                            >── User (creator)
                            ──< ShoppingItem >── User (requested_by)
          ──< ShoppingSession >── ShoppingList
                              >── User (shopper)
                              ──< SessionItem >── ShoppingItem
```

## Développement local

### Prérequis

- Node.js v18+
- Un projet Supabase avec les variables d'environnement configurées

### Installation

```bash
# Frontend
cd frontend && npm install && npm run dev   # http://localhost:5173

# Backend
cd backend && npm install && npm run dev    # http://localhost:3000
```

### Variables d'environnement

**`backend/.env`**
```
DATABASE_URL="postgresql://..."        # Pooler Supabase (Connect → Session mode)
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SECRET_KEY="sb_secret_..."
PORT=3000
```

> **Important** : utilise l'URL du **connection pooler** Supabase (pas l'URL directe).
> Format : `postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require`

**`frontend/.env.local`**
```
VITE_SUPABASE_URL="https://xxx.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJ..."
VITE_API_URL="http://localhost:3000"
```

### Commandes Prisma

```bash
cd backend
npm run db:generate  # Régénérer le client Prisma
npm run db:studio    # Ouvrir Prisma Studio
```

## État d'avancement

- [x] Infrastructure (repo, monorepo, CI/CD)
- [x] Frontend scaffoldé (React + Tailwind)
- [x] Backend scaffoldé (Express + Prisma + schéma DB)
- [x] Base de données Supabase configurée
- [x] Déploiement initial (Vercel + Render)
- [x] Connexion backend → Supabase opérationnelle (pooler)
- [x] Authentification (Supabase Auth — inscription, connexion, JWT)
- [x] Ménages (créer, rejoindre via code d'invitation)
- [x] API REST (listes, articles, fournisseurs)
- [x] Interface utilisateur (home, liste, historique)
- [ ] Sessions de courses (cocher les articles pendant les courses)
- [ ] Temps réel (Supabase Realtime)
- [ ] Gestion des fournisseurs dans l'UI
