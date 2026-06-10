# FamCart v0.4

Application de gestion de listes de courses partagées pour un ménage.

## Fonctionnalités

- **Authentification** — email/mot de passe et Google OAuth via Supabase Auth
- **Multi-ménages** — rejoindre ou créer un ménage via code d'invitation à 6 caractères
- **Listes de courses** — créer, partager, ajouter des articles avec quantité, unité et fournisseur
- **Mode courses** — cocher les articles achetés ou indisponibles, archivage automatique en fin de session
- **Catalogue produits** — produits propres au ménage, avec catégories et fournisseurs
- **Historique** — sessions de courses archivées consultables
- **Notifications** — alertes en temps réel pour les membres du ménage
- **Rôles** — Admin/Membre par ménage, Super-Admin pour la plateforme
- **Invitations plateforme** — accès contrôlé par codes d'invitation
- **Diagnostic** — page `/diag` testant chaque couche de l'application (frontend, backend, DB, auth)
- **Feedback** — bouton flottant pour signaler un bug ou suggérer une amélioration (crée une issue GitHub)
- **Analytics** — Vercel Analytics intégré

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
| Analytics | Vercel Analytics |

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
│       ├── contexts/AuthContext.tsx
│       ├── lib/
│       │   ├── api.ts                 # Wrapper fetch avec token JWT
│       │   ├── supabase.ts
│       │   └── version.ts             # APP_VERSION
│       ├── components/
│       │   ├── Layout.tsx             # Header + nav (pages standalone)
│       │   ├── HouseholdLayout.tsx    # Header + bottom nav (contexte ménage)
│       │   ├── FeedbackButton.tsx     # Bouton flottant + modal feedback
│       │   └── ProtectedRoute.tsx
│       └── pages/
│           ├── Login.tsx / Register.tsx
│           ├── Home.tsx               # Liste des ménages
│           ├── HouseholdView.tsx      # Listes de courses du ménage
│           ├── ShoppingListView.tsx   # Détail d'une liste
│           ├── ShoppingMode.tsx       # Mode courses actif
│           ├── ProductCatalog.tsx
│           ├── History.tsx
│           ├── HouseholdSettings.tsx
│           ├── Admin.tsx              # Super-Admin
│           ├── Diag.tsx               # Diagnostic de l'application
│           ├── About.tsx
│           └── DbStatus.tsx
├── backend/
│   └── src/
│       ├── middleware/auth.ts
│       ├── lib/
│       │   ├── prisma.ts
│       │   ├── supabase.ts
│       │   └── version.ts
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── admin.ts
│       │   ├── households.ts
│       │   ├── products.ts
│       │   ├── lists.ts
│       │   ├── sessions.ts
│       │   ├── notifications.ts
│       │   ├── feedback.ts            # POST /feedback → GitHub issue
│       │   ├── diag.ts                # GET /diag
│       │   └── status.ts              # GET /status
│       └── index.ts
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
SUPER_ADMIN_SECRET="votre-secret"
GITHUB_TOKEN="ghp_..."                 # Token GitHub (repo scope) pour le feedback
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

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | /health | — | Health check |
| GET | /status | — | Stats des tables PostgreSQL |
| GET | /diag | — | Diagnostic complet (DB, env, uptime) |
| POST | /auth/sync | ✓ | Créer/mettre à jour l'utilisateur |
| POST | /feedback | ✓ | Créer une issue GitHub |
| GET | /households | ✓ | Liste des ménages de l'utilisateur |
| POST | /households | ✓ | Créer un ménage |
| GET | /notifications | ✓ | Notifications de l'utilisateur |
| … | /households/:hid/lists | ✓ | Listes de courses |
| … | /households/:hid/products | ✓ | Catalogue produits |

## Bootstrap Super-Admin

1. Ajouter `SUPER_ADMIN_SECRET=votre-secret` dans les variables d'env Render
2. Se connecter → naviguer vers `/admin`
3. Bouton "Bootstrap Super-Admin" → saisir le secret
