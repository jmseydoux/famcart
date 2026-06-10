# FamCart — Contexte projet

## Résumé de la session initiale

Ce projet a été défini lors d'une session Claude Code sur une autre machine.
L'objectif est d'apprendre à construire une webapp complète (frontend + backend + données persistantes + hébergement).

## Cas d'utilisation

**FamCart** : application de gestion de listes de courses pour un ménage.

### Fonctionnalités définies

- Les membres d'un ménage partagent une liste de courses active
- N'importe quel membre peut ajouter des articles (avec quantité, unité, fournisseur optionnel)
- Les fournisseurs (magasins) sont gérés comme une liste propre au ménage (ex: Lidl, Carrefour)
- Un membre peut démarrer une session "courses" : il coche les articles achetés ou indisponibles
- À la fin de la session, elle est archivée dans l'historique
- Les mises à jour sont visibles en temps réel pour tous les membres
- Les membres rejoignent le ménage via un code d'invitation simple

### Modèle de données

| Entité | Champs clés |
|---|---|
| Household | id, name, invite_code |
| User | id, email, name, household_id |
| Supplier | id, name, household_id |
| ShoppingItem | id, name, quantity, unit, requested_by (user_id), supplier_id, status (pending/bought/unavailable), household_id, created_at |
| ShoppingSession | id, household_id, shopper_id, started_at, ended_at |
| SessionItem | id, session_id, item_id, status (bought/unavailable/skipped), note |

## Pile technique choisie

### Frontend
- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- TanStack Query (gestion état serveur)
- Supabase Realtime (synchronisation en temps réel)

### Backend
- Node.js + Express + TypeScript
- Prisma ORM
- JWT auth via Supabase Auth

### Base de données
- PostgreSQL hébergé sur Supabase (free tier)
- Supabase Realtime pour les subscriptions live

## Hébergement (100% gratuit)

| Service | Rôle |
|---|---|
| Vercel | Frontend React |
| Render | Backend Node.js/Express |
| Supabase | PostgreSQL + Auth + Realtime |
| GitHub Actions | CI/CD (tests + déploiement auto sur push main) |

### Note Render
Le free tier endort le backend après 15 min d'inactivité → cold start ~30s. Acceptable pour un projet d'apprentissage.

## Structure du projet (monorepo)

```
famcart/
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   └── package.json
├── backend/           # Node.js + Express + TypeScript
│   ├── src/
│   └── package.json
├── .github/
│   └── workflows/     # GitHub Actions CI/CD
├── .gitignore
└── CLAUDE.md          # ce fichier
```

## Profil utilisateur

- Niveau : intermédiaire en développement web
- Objectif : apprendre (pas juste un projet portfolio)
- Ecosystème de prédilection : JavaScript / TypeScript
- Contrainte budget : free tier uniquement

## État d'avancement

- [x] Cas d'utilisation défini
- [x] Pile technique choisie
- [x] Modèle de données esquissé
- [x] Prérequis installés : Node.js v18, GitHub CLI
- [x] Création du repo GitHub : https://github.com/jmseydoux/famcart
- [x] Initialisation du projet (frontend + backend)
- [x] Configuration Supabase (DB + migration initiale)
- [x] Déploiement initial
  - Frontend : https://famcart.vercel.app
  - Backend  : https://famcart-backend.onrender.com
- [x] Connexion backend → Supabase opérationnelle
  - Utiliser l'URL du **connection pooler** Supabase (Supabase → Connect → Session mode), pas l'URL directe
  - L'URL directe (`db.xxx.supabase.co:5432`) n'est pas accessible depuis Render (free tier)
  - Format : `postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require`
  - La variable `DATABASE_URL` sur Render doit pointer vers le pooler
- [x] Authentification (Supabase Auth + vérification token via REST API)
  - Node.js 18 incompatible avec `@supabase/supabase-js` v2.107+ (requiert Node 20)
  - Solution : vérification du token via `GET /auth/v1/user` avec la secret key, sans librairie
  - Variables backend requises : `SUPABASE_URL` + `SUPABASE_SECRET_KEY` (secret key du dashboard)
- [x] Google OAuth
  - Configurer dans Google Cloud Console : ajouter `https://[PROJECT_REF].supabase.co/auth/v1/callback` aux Authorized redirect URIs
  - Activer le provider Google dans Supabase Dashboard → Authentication → Providers
  - Ajouter les redirect URLs dans Supabase → Authentication → URL Configuration : `http://localhost:5173` et `https://famcart.vercel.app`
- [x] Application complète implémentée (juin 2026)
  - Schéma Prisma complet (PlatformInvitation, User, Household, HouseholdMember, HouseholdInvitation, Supplier, Product, ShoppingList, ListItem, ShoppingSession, SessionItem, Notification)
  - Backend : toutes les routes API (auth, admin, households, products, lists, sessions, notifications)
  - Frontend : pages Register, Home, HouseholdView, ShoppingListView, ShoppingMode, ProductCatalog, History, HouseholdSettings, Admin + About, DbStatus conservées
  - Navigation mobile-first avec barre d'onglets en bas
  - Multi-ménages, rôles Admin/Membre, Super-Admin
  - Invitations plateforme + ménage avec code à 6 caractères
  - Mode courses : cochage article par article, rafraîchissement manuel, report automatique
- [x] v0.4 — Outillage et observabilité (juin 2026)
  - Page Diag (`/diag`) : 5 checks en parallèle (env frontend, session auth, health backend, diag complet, API authentifiée)
  - Route backend `/diag` : uptime, Node version, env vars, counts toutes les tables Prisma
  - Bouton Feedback flottant (toutes les pages) : formulaire → crée une issue GitHub via API
  - Route backend `/feedback` (auth requise) : appelle `api.github.com` avec `GITHUB_TOKEN`
  - Vercel Analytics intégré (`@vercel/analytics`)

## Bootstrap du premier Super-Admin

1. Ajouter `SUPER_ADMIN_SECRET=votre-secret` dans les variables d'env du backend (Render)
2. Se connecter → naviguer vers `/admin`
3. Bouton "Bootstrap Super-Admin" → saisir le secret
4. L'utilisateur connecté devient Super-Admin

## Prochaines étapes

- [ ] Configurer `GITHUB_TOKEN` sur Render pour activer le feedback in-app
- [ ] Créer les premières invitations plateforme depuis `/admin`

## Instructions pour reprendre la session

1. Installe Node.js LTS et GitHub CLI si ce n'est pas fait
2. Place ce fichier dans un dossier `famcart/`
3. Ouvre ce dossier dans VS Code avec Claude Code
4. Claude lira automatiquement ce fichier et aura le contexte complet
5. Dis simplement : "On reprend le projet FamCart, on en est à l'étape X"
