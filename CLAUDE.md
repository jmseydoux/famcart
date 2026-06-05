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
- [ ] Authentification (Supabase Auth + JWT)
- [ ] API REST (routes CRUD : articles, fournisseurs, sessions)
- [ ] Interface utilisateur (pages : liste de courses, session courses, historique)
- [ ] Temps réel (Supabase Realtime)

## Instructions pour reprendre la session

1. Installe Node.js LTS et GitHub CLI si ce n'est pas fait
2. Place ce fichier dans un dossier `famcart/`
3. Ouvre ce dossier dans VS Code avec Claude Code
4. Claude lira automatiquement ce fichier et aura le contexte complet
5. Dis simplement : "On reprend le projet FamCart, on en est à l'étape X"
