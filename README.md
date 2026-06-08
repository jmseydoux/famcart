# FamCart — Banc de test infrastructure

Application minimaliste servant à valider l'infrastructure complète : authentification, backend, base de données et frontend.

## Fonctionnalités

- Authentification via Supabase Auth : email/mot de passe et Google OAuth
- Tableau de bord affichant l'état en temps réel des 4 composants (auth, backend, DB, frontend)
- Page de détail du statut de la base de données (tables et comptages)
- Page "À propos" avec la stack technique

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styles | Tailwind CSS v3 |
| État serveur | TanStack Query |
| Backend | Node.js 18 + Express 5 + TypeScript |
| ORM | Prisma 5 |
| Base de données | PostgreSQL via Supabase |
| Auth | Supabase Auth (email + Google OAuth) |

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
│       │   └── ProtectedRoute.tsx     # Garde RequireAuth
│       ├── pages/
│       │   ├── Login.tsx              # Email + Google OAuth
│       │   ├── Home.tsx               # Dashboard infrastructure
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
│       │   └── status.ts              # GET /status (stats DB)
│       └── index.ts                   # GET /health
├── prisma/
│   └── schema.prisma
└── CLAUDE.md
```

## Développement local

### Prérequis

- Node.js v18+
- Un projet Supabase avec les variables d'environnement configurées
- Provider Google activé dans Supabase Authentication → Providers

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

### Redirect URLs pour Google OAuth

Dans Supabase Dashboard → **Authentication → URL Configuration**, ajouter :
- Site URL : `https://famcart.vercel.app`
- Redirect URLs : `http://localhost:5173`, `https://famcart.vercel.app`

### Commandes Prisma

```bash
cd backend
npm run db:generate  # Régénérer le client Prisma
npm run db:studio    # Ouvrir Prisma Studio
```

## Routes backend

| Méthode | Route | Description |
|---|---|---|
| GET | /health | Health check (latence mesurée par le frontend) |
| GET | /status | Stats des tables PostgreSQL |
| POST | /auth/sync | Créer/mettre à jour l'utilisateur après connexion |
