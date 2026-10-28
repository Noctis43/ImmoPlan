<div align="center">

# 🏠 ImmoPlan

**Le réseau social immobilier pour Madagascar**

Publiez, cherchez, discutez et planifiez vos visites : annonces géolocalisées, recherche multi-critères, recommandations personnalisées, messagerie et notifications en temps réel.

![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.19-000000?logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5.14-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D?logo=redis&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101?logo=socketdotio&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-Desktop-47848F?logo=electron&logoColor=white)
![License](https://img.shields.io/badge/Licence-MIT-green)

</div>

---

## 📑 Sommaire

1. [Présentation](#-présentation)
2. [Fonctionnalités](#-fonctionnalités)
3. [Architecture](#-architecture)
4. [Stack technique](#-stack-technique)
5. [Structure du dépôt](#-structure-du-dépôt)
6. [Prérequis](#-prérequis)
7. [Installation et lancement](#-installation-et-lancement)
8. [Variables d'environnement](#-variables-denvironnement)
9. [Base de données](#-base-de-données)
10. [API REST](#-api-rest)
11. [Temps réel (Socket.IO)](#-temps-réel-socketio)
12. [Tâches de fond (BullMQ)](#-tâches-de-fond-bullmq)
13. [Algorithmes](#-algorithmes)
14. [Cache et clés Redis](#-cache-et-clés-redis)
15. [Règles métier](#-règles-métier)
16. [Sécurité](#-sécurité)
17. [Frontend](#-frontend)
18. [Application desktop (Electron)](#-application-desktop-electron)
19. [Scripts disponibles](#-scripts-disponibles)
20. [État du projet et points d'attention](#-état-du-projet-et-points-dattention)
21. [Auteur et licence](#-auteur-et-licence)

---

## 🎯 Présentation

**ImmoPlan** est une plateforme immobilière conçue pour le marché malgache. Elle met en relation deux types de profils :

| Profil | Rôle dans la plateforme |
|---|---|
| **Offreur** | Propriétaire, bailleur ou agent : publie des annonces (location / vente), gère ses photos, répond aux demandes de visite, suit ses statistiques. |
| **Chercheur** | Futur locataire ou acquéreur : explore le feed et la carte, recherche avec des filtres avancés, like / sauvegarde / note des annonces, contacte les offreurs et planifie des visites. |

Le projet est un **monorepo** composé de trois parties :

- **`immoplan-backend`** : API REST Express + Socket.IO + workers BullMQ (TypeScript).
- **`immoplan-frontend`** : application web React + Vite (TypeScript), disponible en français, malgache et anglais.
- **`electron`** : coque desktop qui embarque le build du frontend et le relie au backend.

Le dépôt contient aussi `docs/algo-doc.md`, une explication détaillée, ligne par ligne, des algorithmes de **similarité cosinus** et de **recherche multi-critères**.

---

## ✨ Fonctionnalités

### Pour tous les utilisateurs

- **Authentification complète** : inscription (18 ans minimum), connexion, déconnexion, rafraîchissement silencieux du token, mot de passe oublié / réinitialisation, changement de mot de passe, suppression de compte, code 2FA par e-mail, connexion Google OAuth 2.0 (côté backend).
- **Feed d'annonces** paginé par curseur avec défilement infini.
- **Carte interactive** (Leaflet) avec annonces dans la zone visible et points d'intérêt.
- **Recherche multi-critères** : texte libre (plein texte français), service, type de bien, ville, quartier, prix, surface, chambres, rayon géographique, tri.
- **Messagerie en temps réel** liée à une annonce, avec indicateur de saisie, accusés de lecture et envoi de médias.
- **Notifications en temps réel** (Socket.IO), avec cloche, flux et marquage lu / non lu.
- **Profils publics** des offreurs avec leurs annonces et leurs avis.
- **Likes** sur les annonces et **partage** (suivi par plateforme).
- **Interface multilingue** (`fr`, `mg`, `en`), thème sombre / clair, responsive (barre de navigation basse sur mobile).

### Côté chercheur

- **Recommandations personnalisées** : feed calculé par similarité cosinus + récence, à partir des préférences explicites (service, ville, fourchette de prix) et de l'historique d'interactions.
- **Annonces similaires** à la dernière annonce consultée et **annonces tendances**.
- **Sauvegardes** d'annonces et **historique de navigation** (pile LIFO limitée à 20 éléments, stockée dans Redis).
- **Demandes de visite** avec créneaux contrôlés et possibilité d'accepter une contre-proposition.
- **Avis et notes** (1 avis par annonce et par chercheur), modifiables.
- **Recherche d'offreurs** (`/trouver-offreur`).

### Côté offreur

- **Publication d'annonces** avec géolocalisation (latitude / longitude), jusqu'à **15 photos** hébergées sur Cloudinary, réordonnables.
- **Cycle de vie des annonces** : `brouillon` → `publiee` → `suspendue` / `archivee` / `vendue_louee`.
- **Gestion des visites** : confirmer, contre-proposer une autre date, annuler avec motif, marquer comme effectuée.
- **Tableau de bord** : statistiques globales, performances par annonce (vues, likes, avis), agenda des visites, derniers messages.

---

## 🏗 Architecture

```
┌──────────────────────────────┐        ┌──────────────────────────────┐
│  Application web (React)     │        │  Application desktop         │
│  Vite · port 5173            │        │  Electron                    │
│                              │◄───────┤  serveur statique :5174      │
└──────────────┬───────────────┘ charge └──────────────┬───────────────┘
               │ HTTP /api  +  WebSocket /socket.io    │ proxy /api, /socket.io
               ▼                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                Backend Express + Socket.IO  (port 3000)             │
│                                                                     │
│  helmet · CORS · rate limiting · Zod · JWT · Passport (Google)      │
│  13 modules métier  ·  algorithmes (BFS, BST, Stack, Queue, cosinus)│
│                                                                     │
│  Workers BullMQ : notifications · emails                            │
└───────┬───────────────┬──────────────────┬───────────────┬──────────┘
        │ Prisma        │ ioredis          │ SDK           │ SMTP
        ▼               ▼                  ▼               ▼
  PostgreSQL        Redis             Cloudinary       Nodemailer
  (Supabase)   cache · sessions ·     (photos,         (Gmail / SMTP)
               files BullMQ           avatars, médias)
                                      Firebase Admin
                                      (push FCM)
```

**Flux typique d'une notification** : une action métier (message, like, demande de visite…) crée une ligne `notifications` en base, ajoute un job dans la file BullMQ `notifications`, puis le worker pousse l'événement `notification:new` dans la room Socket.IO du destinataire et envoie un e-mail pour les événements critiques.

---

## 🧰 Stack technique

### Backend (`immoplan-backend`)

| Domaine | Technologies |
|---|---|
| Runtime / langage | Node.js ≥ 20, TypeScript 5.4 |
| Serveur HTTP | Express 4.19, Helmet, CORS, `express-rate-limit` |
| Validation | Zod |
| Base de données | PostgreSQL (Supabase) via Prisma 5.14 (schémas `auth` et `public`) |
| Cache, sessions, files | Redis via `ioredis`, BullMQ |
| Temps réel | Socket.IO 4.7 |
| Authentification | JWT (`jsonwebtoken`), `bcrypt` (coût 12), Passport (`passport-google-oauth20`, `passport-jwt`) |
| Médias | Cloudinary, Multer |
| Notifications | Nodemailer (e-mails), Firebase Admin (push FCM) |
| Logs | Winston |

### Frontend (`immoplan-frontend`)

| Domaine | Technologies |
|---|---|
| Framework | React 18.3, React Router 6.22, Vite 8 |
| Données serveur | TanStack React Query 5, Axios (intercepteurs JWT + refresh silencieux) |
| État local | Zustand 4 (stores `auth`, `chat`, `notifications`) |
| Cartographie | Leaflet 1.9, React-Leaflet 4 |
| Graphiques | Recharts 2 |
| Animations | Framer Motion 11 |
| Internationalisation | i18next 26, react-i18next 17 (`fr`, `mg`, `en`) |
| Temps réel | socket.io-client 4.7 |
| Divers | react-dropzone (upload), date-fns |

### Desktop (`electron`)

Electron (processus principal en CommonJS), mini-serveur HTTP Node avec `http-proxy` pour servir le build et relayer `/api` et `/socket.io`.

---

## 📂 Structure du dépôt

```
ImmoPlan/
├── LICENSE
├── README.md
├── docs/
│   └── algo-doc.md                 # Explication détaillée des algorithmes
├── electron/
│   ├── main.js                     # Processus principal (fenêtre, démarrage)
│   ├── preload.js                  # Pont sécurisé (window.immoplanDesktop)
│   ├── config.js                   # URLs, ports, timeouts (surchargeables par env)
│   ├── health-check.js             # Attente du backend (GET /api/health)
│   ├── static-server.js            # Serveur statique + proxy API / WebSocket
│   └── clean-release.js            # Nettoyage du dossier release/
├── immoplan-backend/
│   ├── .env.exemple                # Modèle de configuration
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma           # Modèle de données (introspecté)
│   │   ├── seed.js                 # Import des villes (villes.json)
│   │   ├── generate_quartiers.js   # Import des quartiers (quartiers.json)
│   │   ├── villes.json             # ~4 277 villes / localités de Madagascar
│   │   ├── quartiers.json          # ~1 427 quartiers
│   │   └── quartiers.geojson       # Données géographiques sources des quartiers
│   └── src/
│       ├── server.ts               # Démarrage : HTTP + Socket.IO + workers
│       ├── app.ts                  # Application Express, middlewares, routes
│       ├── algorithms/             # bfs.ts · bst.ts · queue.ts · stack.ts
│       ├── config/                 # env (Zod) · prisma · redis · cloudinary · firebase
│       ├── jobs/                   # notification.job.ts · email.job.ts
│       ├── middlewares/            # auth · role · validate · rateLimit · error
│       ├── modules/                # 13 modules (routes / controller / service / schema)
│       │   ├── auth/  profiles/  villes/  annonces/  interactions/
│       │   ├── visites/  messagerie/  notifications/  partages/
│       │   └── dashboard/  recherche/  recommandation/  statistiques/
│       ├── services/               # cloudinary · email · firebase
│       ├── socket/                 # index (auth JWT) · chat · notification
│       ├── types/                  # express.d.ts (req.user)
│       └── utils/                  # geoUtils · jsonSafe · logger · pagination
└── immoplan-frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.ts              # Mode web (proxy /api et /socket.io)
    ├── vite.config.electron.ts     # Mode Electron (base './', build vers dist/)
    └── src/
        ├── main.tsx · App.tsx · index.css
        ├── router/                 # Routes protégées / publiques (lazy loading)
        ├── pages/                  # Écrans (auth, annonces, profil, …)
        ├── components/             # annonces · chat · dashboard · geo · layout
        │                           # map · notifications · profile · search · share · ui
        ├── hooks/                  # useChat · useSocket · useNotifications · useTheme …
        ├── store/                  # Zustand : auth · chat · notifications
        ├── contexts/               # ShellLayoutContext
        └── lib/                    # api · socket · i18n · locale · format · queryClient …
```

Chaque module backend suit la même organisation : `*.routes.ts` (routage + middlewares), `*.controller.ts` (HTTP), `*.service.ts` (logique métier), `*.schema.ts` (validation Zod).

---

## ✅ Prérequis

| Outil | Version | Usage |
|---|---|---|
| **Node.js** | ≥ 20 (imposé par `engines`) | Backend, frontend, Electron |
| **npm** | fourni avec Node | Gestion des dépendances |
| **PostgreSQL** | compatible Supabase (schéma `auth` + `public`, extension `uuid-ossp`) | Base de données |
| **Redis** | 6+ recommandé | Cache, sessions, files BullMQ |
| **Compte Cloudinary** | — | Photos, avatars, médias de chat |
| **Projet Firebase** | compte de service | Admin SDK (push FCM) |
| **Projet Google Cloud** | identifiants OAuth 2.0 | Connexion Google |
| **Compte SMTP** | ex. Gmail avec mot de passe d'application | E-mails (2FA, réinitialisation, visites) |

> ⚠️ Les variables backend marquées ✅ plus bas sont **obligatoires** : la validation Zod au démarrage interrompt le serveur si l'une d'elles manque ou est invalide (`DIRECT_URL`, lue directement par Prisma, doit aussi être définie).

---

## 🚀 Installation et lancement

### 1. Cloner le dépôt

```bash
git clone https://github.com/Noctis43/ImmoPlan.git
cd ImmoPlan
```

### 2. Backend

```bash
cd immoplan-backend
npm install

# Créer le fichier de configuration à partir du modèle
cp .env.exemple .env          # Windows PowerShell : Copy-Item .env.exemple .env
```

Renseignez ensuite `.env` (voir [Variables d'environnement](#-variables-denvironnement)), puis :

```bash
# Générer le client Prisma
npm run prisma:generate

# Importer les villes puis les quartiers de Madagascar (une seule fois)
node prisma/seed.js
node prisma/generate_quartiers.js

# Lancer l'API en développement (rechargement automatique)
npm run dev
```

L'API écoute sur `http://localhost:3000`. Vérification :

```bash
curl http://localhost:3000/api/health
# {"status":"ok","timestamp":"...","version":"1.0.0"}
```

> ℹ️ `seed.js` et `generate_quartiers.js` utilisent la syntaxe ESM (`import`) alors que le package n'est pas déclaré `"type": "module"`. Avec une version récente de Node la détection automatique suffit ; sinon, lancez-les avec `node --experimental-default-type=module prisma/seed.js`.
>
> ℹ️ `generate_quartiers.js` doit être exécuté **après** `seed.js` : il rattache chaque quartier à une ville existante en cherchant le nom de la ville dans le nom du quartier, et ignore les quartiers sans correspondance.

**Mode production :**

```bash
npm run build      # compile TypeScript vers dist/
npm run start      # node dist/server.js
```

### 3. Frontend (web)

```bash
cd immoplan-frontend
npm install
npm run dev
```

L'application est servie sur `http://localhost:5173`. Le serveur Vite relaie `/api` et `/socket.io` vers `http://127.0.0.1:3000` (modifiable avec `VITE_PROXY_TARGET`).

Build de production :

```bash
npm run build      # tsc + vite build → dist/
npm run preview    # prévisualisation locale du build
```

### 4. Application desktop (optionnel)

Voir la section [Application desktop (Electron)](#-application-desktop-electron).

### 5. Ordre de démarrage recommandé

1. Démarrer **Redis** et vérifier l'accès à **PostgreSQL**.
2. Démarrer le **backend** (`npm run dev`).
3. Démarrer le **frontend** (`npm run dev`) ou l'application Electron.

---

## 🔐 Variables d'environnement

### Backend : `immoplan-backend/.env`

| Variable | Obligatoire | Défaut | Description |
|---|:---:|---|---|
| `DATABASE_URL` | ✅ | — | URL PostgreSQL (connexion poolée en production Supabase). |
| `DIRECT_URL` | ✅ | — | URL de connexion directe, utilisée par Prisma (`directUrl`). |
| `JWT_SECRET` | ✅ | — | Secret de signature des access tokens (**32 caractères minimum**). |
| `JWT_REFRESH_SECRET` | ✅ | — | Secret des refresh tokens (**32 caractères minimum**). |
| `JWT_ACCESS_TTL` |  | `900` | Durée de vie de l'access token, en secondes (15 min). |
| `JWT_REFRESH_TTL` |  | `2592000` | Durée de vie du refresh token, en secondes (30 jours). |
| `REDIS_URL` | ✅ | — | Ex. `redis://localhost:6379`. |
| `CLOUDINARY_CLOUD_NAME` | ✅ | — | Nom du cloud Cloudinary. |
| `CLOUDINARY_API_KEY` | ✅ | — | Clé API Cloudinary. |
| `CLOUDINARY_API_SECRET` | ✅ | — | Secret API Cloudinary. |
| `FIREBASE_PROJECT_ID` | ✅ | — | Identifiant du projet Firebase. |
| `FIREBASE_CLIENT_EMAIL` | ✅ | — | E-mail du compte de service (format e-mail valide). |
| `FIREBASE_PRIVATE_KEY` | ✅ | — | Clé privée du compte de service (avec les `\n`). |
| `GOOGLE_CLIENT_ID` | ✅ | — | Identifiant client OAuth 2.0. |
| `GOOGLE_CLIENT_SECRET` | ✅ | — | Secret client OAuth 2.0. |
| `GOOGLE_CALLBACK_URL` | ✅ | — | URL valide, ex. `http://localhost:3000/api/auth/google/callback`. |
| `SMTP_HOST` | ✅ | — | Ex. `smtp.gmail.com`. |
| `SMTP_PORT` |  | `587` | Port SMTP. |
| `SMTP_USER` | ✅ | — | Identifiant SMTP. |
| `SMTP_PASS` | ✅ | — | Mot de passe SMTP (mot de passe d'application pour Gmail). |
| `SMTP_FROM` | ✅ | — | Expéditeur, ex. `ImmoPlan <vous@gmail.com>`. |
| `PORT` |  | `3000` | Port du serveur. |
| `NODE_ENV` |  | `development` | `development`, `production` ou `test`. |
| `CORS_ORIGINS` |  | `http://localhost:5173` | Origines autorisées, séparées par des virgules. |
| `FRONTEND_URL` |  | — | URL du frontend (liens de réinitialisation, redirection OAuth). Repli : `http://localhost:5173`. |

> ⚠️ **Attention au nom de la variable d'expéditeur** : le code lit `SMTP_FROM` (voir `src/config/env.ts`), alors que le modèle `.env.exemple` contient `EMAIL_FROM`. Utilisez `SMTP_FROM` dans votre `.env`.

Exemple minimal pour un développement local :

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"

JWT_SECRET="<64 caractères hexadécimaux>"
JWT_REFRESH_SECRET="<64 autres caractères hexadécimaux>"

REDIS_URL="redis://localhost:6379"

CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

FIREBASE_PROJECT_ID="..."
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@votre_projet.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."
GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="vous@gmail.com"
SMTP_PASS="xxxx xxxx xxxx xxxx"
SMTP_FROM="ImmoPlan <vous@gmail.com>"

PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173,http://localhost:3001
FRONTEND_URL=http://localhost:5173
```

Générer des secrets JWT robustes :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend : variables Vite (optionnelles)

| Variable | Rôle |
|---|---|
| `VITE_API_URL` | Base de l'API. Défaut : `http://localhost:3000/api`. En mode Electron, utiliser `/api` (le mini-serveur fait le proxy). |
| `VITE_SOCKET_URL` | URL du serveur Socket.IO. Sinon déduite de `VITE_API_URL` (si absolue), puis de `window.location.origin`. |
| `VITE_PROXY_TARGET` | Cible du proxy de développement Vite (défaut `http://127.0.0.1:3000`). |

Les fichiers `.env`, `.env.local` et `.env.electron` sont ignorés par Git côté frontend.

### Electron : variables d'exécution (optionnelles)

| Variable | Défaut | Rôle |
|---|---|---|
| `IMMOPLAN_BACKEND_HEALTH_URL` | `http://127.0.0.1:3000/api/health` | URL de santé interrogée au démarrage. |
| `IMMOPLAN_BACKEND_URL` | `http://127.0.0.1:3000` | Cible du proxy `/api` et `/socket.io`. |
| `IMMOPLAN_BACKEND_WAIT_MS` | `120000` | Délai maximal d'attente du backend. |
| `ELECTRON_RENDERER_URL` | `http://127.0.0.1:5173` | URL du frontend en mode développement. |
| `ELECTRON_STATIC_PORT` | `5174` | Port du mini-serveur en production. |
| `ELECTRON_DEV` | — | `true` force le mode développement. |
| `ELECTRON_OPEN_DEVTOOLS` | — | `true` ouvre les DevTools (mode développement). |

---

## 🗄 Base de données

Le modèle est défini dans `immoplan-backend/prisma/schema.prisma` et couvre **deux schémas PostgreSQL** :

- **`auth`** : tables d'authentification de type Supabase (`users`, `sessions`, `identities`, `mfa_factors`, `one_time_tokens`, `oauth_*`, `webauthn_*`…). ImmoPlan y crée les comptes (mot de passe haché avec bcrypt dans `users.encrypted_password`).
- **`public`** : tables métier d'ImmoPlan.

> Le schéma est **introspecté** depuis une base existante (`npm run prisma:pull` met le fichier à jour). Le script SQL de création des tables, politiques et triggers n'est pas versionné dans ce dépôt : la base doit exister avec les tables décrites ci-dessous et l'extension `uuid-ossp` (utilisée par `uuid_generate_v4()`).

### Tables métier (`public`)

| Table | Rôle | Points clés |
|---|---|---|
| `profiles` | Profil applicatif lié à `auth.users` | `auth_user_id` unique, `email` unique, `profile_type` (`offreur` / `chercheur`), `is_active`, `is_verified`, `last_seen_at` |
| `annonces` | Annonces immobilières | `statut`, `service`, `type_bien`, `prix`, `surface_m2`, pièces, `geom` (texte), compteurs `nb_vues` / `nb_likes` / `nb_avis`, `note_moyenne`, dates de publication / archivage |
| `annonce_photos` | Photos d'une annonce | `cloudinary_url`, `cloudinary_public_id` (unique), `thumbnail_url`, `ordre` |
| `annonce_likes` | Likes | Unique `(annonce_id, chercheur_id)` |
| `annonce_vues` | Vues | Unique `(annonce_id, chercheur_id)` |
| `annonces_sauvegardees` | Favoris | Unique `(chercheur_id, annonce_id)` |
| `avis` | Notes et commentaires | `note` (SmallInt), unique `(annonce_id, chercheur_id)` |
| `visites` | Demandes de visite | Date / heure souhaitées, durée (30 min par défaut), date / heure confirmées, `statut`, motif d'annulation |
| `conversations` | Fils de discussion | Unique `(annonce_id, offreur_id, chercheur_id)`, `last_message_at` |
| `messages` | Messages | `statut` (`envoye` / `delivre` / `lu`), `media_url`, `media_type`, `read_at` |
| `notifications` | Notifications | `type`, `titre`, `corps`, liens optionnels (annonce, message, visite, avis), `action_url`, `is_read` |
| `historique_recherches` | Journal des consultations | `action_type`, index `(chercheur_id, created_at DESC)` |
| `partages` | Suivi des partages | `plateforme`, `chercheur_id` optionnel (partage anonyme possible) |
| `villes` | Référentiel des villes | `nom` unique, `geom`, `zone`, `code_postal` |
| `quartiers` | Référentiel des quartiers | Unique `(ville_id, nom)`, `geom`, `zone` |
| `points_interet` | Points d'intérêt | `osm_id` unique, `categorie`, `geom`, rattachement ville / quartier, `metadata` JSON |
| `nodes` / `edges` | Graphe routier (modèles `Node` / `Edge`) | Nœuds `(lat, lng)` et arêtes pondérées par `distance` |

### Énumérations

| Enum | Valeurs |
|---|---|
| `profile_type` | `offreur`, `chercheur` |
| `service_type` | `location`, `vente` |
| `property_type` | `appartement`, `maison`, `villa`, `studio`, `duplex`, `bureau`, `local_commercial`, `terrain`, `entrepot`, `autre` |
| `annonce_status` | `brouillon`, `publiee`, `suspendue`, `archivee`, `vendue_louee` |
| `visit_status` | `en_attente`, `contre_proposee`, `confirmee`, `annulee`, `effectuee` |
| `message_status` | `envoye`, `delivre`, `lu` |
| `notification_type` | `message`, `like`, `avis`, `demande_visite`, `visite_confirmee`, `visite_annulee`, `visite_effectuee`, `nouvelle_annonce`, `vue_annonce` |
| `poi_category` | `ecole`, `hopital`, `marche`, `transport`, `restaurant`, `banque`, `pharmacie`, `eglise`, `mosque`, `parc`, `supermarche`, `autre` |

### Relations principales

```
auth.users 1 ── 1 profiles
profiles   1 ── n annonces (offreur)
annonces   1 ── n annonce_photos · annonce_likes · annonce_vues · avis · visites
                  · conversations · partages · annonces_sauvegardees
conversations 1 ── n messages
villes     1 ── n quartiers · annonces · points_interet
quartiers  1 ── n annonces · points_interet
```

La plupart des clés étrangères vers `profiles` et `annonces` utilisent `ON DELETE CASCADE`.

### Conventions de géodonnées

- **Annonces** : `annonces.geom` est un champ **texte** au format `POINT(longitude latitude)` (écrit à la création / mise à jour à partir de `lat` et `lng`).
- **Villes et quartiers** : `geom` est un texte `"latitude,longitude"` (voir `villes.json` et `quartiers.json`).
- Les distances sont calculées **en SQL avec la formule de Haversine** (`src/utils/geoUtils.ts`), sans extension PostGIS.

### Données initiales

| Fichier | Contenu | Import |
|---|---|---|
| `prisma/villes.json` | ~4 277 villes et localités (`nom`, `zone`, `geom`) | `node prisma/seed.js` (par lots de 500, doublons ignorés) |
| `prisma/quartiers.json` | ~1 427 quartiers (`nom`, `zone`, `geom`) | `node prisma/generate_quartiers.js` (rattachement par nom de ville) |

---

## 📡 API REST

**URL de base :** `http://localhost:3000/api`

**Authentification :** en-tête `Authorization: Bearer <accessToken>`.
**Légende :** 🌐 public · 🔓 optionnellement authentifié · 🔒 authentifié · `chercheur` / `offreur` : rôle requis.

### Conventions

**Pagination par curseur** (feed, recherche, messages, notifications…) :

```
GET /api/annonces?limit=20&cursor=<valeur de meta.nextCursor>
```

```json
{
  "data": [ ... ],
  "meta": { "nextCursor": "2026-01-15T10:30:00.000Z", "hasMore": true }
}
```

La limite par défaut est de 20 éléments (maximum 100 selon l'endpoint ; 50 pour les recommandations).

**Erreurs :**

```json
{ "error": "Message lisible", "code": "CODE_MACHINE" }
```

Codes rencontrés : `AUTH_REQUIRED`, `TOKEN_EXPIRED`, `TOKEN_INVALID`, `TOKEN_REVOKED`, `INVALID_CREDENTIALS`, `EMAIL_EXISTS`, `AGE_MINIMUM`, `MISSING_PROFILE_TYPE`, `INVALID_2FA_CODE`, `INVALID_REFRESH_TOKEN`, `MISSING_PHOTOS`, `MAX_PHOTOS`, `VISITE_REQUIRED`, `INVALID_VISITE_SLOT`, `NOT_FOUND`, `FORBIDDEN`, `RATE_LIMIT_EXCEEDED`, `AUTH_RATE_LIMIT_EXCEEDED`, `UPLOAD_RATE_LIMIT_EXCEEDED`.

**Limites de débit (par IP, fenêtre d'une minute) :**

| Limiteur | Quota | S'applique à |
|---|---|---|
| Général | 100 requêtes | Toute l'API |
| Authentification | 10 requêtes | `register`, `login`, `forgot-password`, `reset-password` |
| Upload | 20 requêtes | Photos d'annonces, avatar |

### Santé

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/health` | 🌐 | Statut, horodatage et version de l'API |

### Authentification : `/auth`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/auth/register` | 🌐 | Inscription (`email`, `password`, `confirmPassword`, `nom`, `prenom`, `telephone`, `date_naissance`, `profile_type`, `recommandation_preferences?`) |
| POST | `/auth/login` | 🌐 | Connexion, retourne `profile`, `accessToken`, `refreshToken` |
| POST | `/auth/logout` | 🔓 | Révoque le refresh token et met le token d'accès sur liste noire |
| POST | `/auth/refresh` | 🌐 | Échange un refresh token contre une nouvelle paire de tokens |
| GET | `/auth/google` | 🌐 | Démarre le flux OAuth Google (scopes `profile`, `email`) |
| GET | `/auth/google/callback` | 🌐 | Callback Google, redirige vers `FRONTEND_URL/auth/callback?accessToken=…&refreshToken=…` |
| POST | `/auth/2fa/send` | 🔒 | Envoie un code à 6 chiffres par e-mail (valable 5 min) |
| POST | `/auth/2fa/verify` | 🔒 | Vérifie le code et marque le profil comme vérifié |
| POST | `/auth/forgot-password` | 🌐 | Envoie un lien de réinitialisation (valable 1 h) |
| POST | `/auth/reset-password` | 🌐 | Définit un nouveau mot de passe à partir du token |
| PATCH | `/auth/change-password` | 🔒 | Change le mot de passe (mot de passe actuel requis) |
| DELETE | `/auth/me` | 🔒 | Supprime le compte |

### Profils : `/profiles`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/profiles/me` | 🔒 | Mon profil |
| PUT | `/profiles/me` | 🔒 | Met à jour nom, prénom, téléphone, localisation… |
| PUT | `/profiles/me/avatar` | 🔒 | Téléverse l'avatar (champ `avatar`, 5 Mo max) |
| GET | `/profiles/offreurs` | 🔒 | Liste / recherche des offreurs |
| GET | `/profiles/:id` | 🌐 | Profil public |
| POST | `/profiles/:id/visit` | 🔒 | Enregistre une visite de profil |

### Géographie : `/geo`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/geo/villes` | 🌐 | Toutes les villes |
| GET | `/geo/villes/search?q=` | 🌐 | Recherche de ville (2 à 80 caractères) |
| GET | `/geo/villes/:id/quartiers` | 🌐 | Quartiers d'une ville |
| GET | `/geo/prix-moyens` | 🌐 | Prix moyen au m² par ville (filtres `ville_id`, `service`, `type_bien`) |

### Annonces : `/annonces`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/annonces` | 🔒 | Feed des annonces publiées (`service`, `cursor`, `limit`) |
| GET | `/annonces/carte` | 🌐 | Annonces dans une zone (`sw_lng`, `sw_lat`, `ne_lng`, `ne_lat`) |
| GET | `/annonces/me/annonces` | 🔒 `offreur` | Mes annonces, tous statuts confondus |
| GET | `/annonces/:id` | 🔒 | Détail d'une annonce |
| POST | `/annonces` | 🔒 `offreur` | Crée une annonce (avec `lat` / `lng`) |
| PUT | `/annonces/:id` | 🔒 `offreur` | Modifie une annonce |
| PATCH | `/annonces/:id/statut` | 🔒 `offreur` | Change le statut |
| POST | `/annonces/:id/photos` | 🔒 `offreur` | Téléverse jusqu'à 15 photos (champ `photos`, 10 Mo max chacune) |
| PATCH | `/annonces/:id/photos/reorder` | 🔒 `offreur` | Réordonne les photos (`photoIds`) |

### Recherche : `/recherche`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/recherche` | 🌐 | Recherche multi-critères |

Paramètres : `q`, `service`, `type_bien`, `prix_min`, `prix_max`, `surface_min`, `surface_max`, `nb_chambres_min`, `ville_id`, `quartier_id`, `lat`, `lng`, `rayon_km`, `disponible`, `sort` (`prix_asc`, `prix_desc`, `date_desc`, `note_desc`), `cursor`, `limit` (1 à 100).

Exemple :

```bash
curl "http://localhost:3000/api/recherche?q=villa%20jardin&service=vente&ville_id=1&prix_max=500000000&sort=prix_asc&limit=20"
```

### Recommandations : `/recommandation`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/recommandation/feed-personnalise` | 🔒 `chercheur` | Feed personnalisé (cosinus + récence) |
| GET | `/recommandation/similaires` | 🔒 `chercheur` | Annonces similaires à la dernière consultée |
| GET | `/recommandation/tendances` | 🌐 | Annonces tendances (vues, likes, récence) |
| GET | `/recommandation/preferences` | 🔒 `chercheur` | Préférences de recommandation |
| PUT | `/recommandation/preferences` | 🔒 `chercheur` | Définit `service`, `ville_id`, `prix_min`, `prix_max` |

### Interactions : `/interactions`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/interactions/annonces/:id/vue` | 🔒 `chercheur` | Enregistre une vue |
| POST | `/interactions/annonces/:id/vue/offreur` | 🔒 `offreur` | Enregistre une consultation côté offreur |
| GET | `/interactions/annonces/:id/vues` | 🔒 | Liste des vues |
| POST / DELETE | `/interactions/annonces/:id/like` | 🔒 `chercheur`, `offreur` | Ajoute / retire un like |
| GET | `/interactions/annonces/:id/likes` | 🌐 | Nombre de likes |
| GET | `/interactions/me/likes` | 🔒 `chercheur`, `offreur` | Mes likes |
| POST | `/interactions/annonces/:id/avis` | 🔒 `chercheur` | Publie un avis |
| GET | `/interactions/annonces/:id/avis` | 🌐 | Avis d'une annonce |
| PUT | `/interactions/avis/:id` | 🔒 `chercheur` | Modifie mon avis |
| GET | `/interactions/offreurs/:id/avis` | 🌐 | Avis reçus par un offreur |
| GET | `/interactions/annonces/:id/poi` | 🌐 | Points d'intérêt proches |
| POST / DELETE | `/interactions/annonces/:id/sauvegarder` | 🔒 `chercheur` | Sauvegarde / retire des favoris |
| GET | `/interactions/me/sauvegardes` | 🔒 `chercheur` | Mes favoris |
| POST | `/interactions/annonces/:id/historique` | 🔒 `chercheur` | Ajoute une consultation à l'historique |
| GET / DELETE | `/interactions/me/historique` | 🔒 `chercheur` | Lit / vide l'historique |

### Visites : `/visites`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/visites` | 🔒 `chercheur`, `offreur` | Demande de visite (`annonce_id`, `date_souhaitee`, `heure_debut` `HH:MM`, `duree_minutes` 15 à 240, `message_demande`) |
| GET | `/visites/me` | 🔒 | Mes visites (avec indicateur « passée ») |
| PATCH | `/visites/:id/confirmer` | 🔒 `offreur` | `{ "mode": "accepter_demande" }` ou `{ "mode": "contre_proposer", "date_confirmee", "heure_confirmee" }` |
| PATCH | `/visites/:id/accepter-contre-proposition` | 🔒 `chercheur`, `offreur` | Accepte la contre-proposition |
| PATCH | `/visites/:id/annuler` | 🔒 | Annule avec `raison_annulation` |
| PATCH | `/visites/:id/effectuer` | 🔒 `offreur` | Marque la visite comme effectuée |

### Messagerie : `/conversations`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/conversations` | 🔒 | Crée ou récupère la conversation liée à une annonce |
| GET | `/conversations` | 🔒 | Mes conversations |
| GET | `/conversations/:id` | 🔒 | Détail d'une conversation |
| GET | `/conversations/:id/messages` | 🔒 | Messages paginés |
| POST | `/conversations/:id/messages` | 🔒 | Envoie un message |
| PATCH | `/conversations/:id/messages/lu` | 🔒 | Marque les messages comme lus |
| POST | `/conversations/:id/messages/media` | 🔒 | Envoie un média (champ `media`, 10 Mo max) |

### Notifications : `/notifications`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/notifications` | 🔒 | Mes notifications (paginées) |
| GET | `/notifications/count` | 🔒 | Nombre de notifications non lues |
| PATCH | `/notifications/lire-tout` | 🔒 | Tout marquer comme lu |
| PATCH | `/notifications/:id/lire` | 🔒 | Marquer une notification comme lue |
| DELETE | `/notifications/:id` | 🔒 | Supprimer une notification |

### Partages : `/partages`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/partages/annonces/:id/partager` | 🔓 | Enregistre un partage (`plateforme`) |

### Tableaux de bord offreur : `/dashboard` et `/statistiques`

Toutes ces routes exigent un compte `offreur`.

| Méthode | Route | Description |
|---|---|---|
| GET | `/dashboard/stats` | Chiffres clés |
| GET | `/dashboard/annonces/performances` | Performances par annonce |
| GET | `/dashboard/visites/agenda` | Agenda des visites |
| GET | `/dashboard/messages/recents` | Derniers messages |
| GET | `/statistiques/dashboard` | Statistiques agrégées |
| GET | `/statistiques/performances` | Classement des annonces (`limit` 1 à 50) |

---

## 🔌 Temps réel (Socket.IO)

**Connexion :** même hôte et même port que l'API (3000), chemin `/socket.io`. Le token d'accès JWT est fourni dans `auth.token` du handshake (ou dans l'en-tête `Authorization: Bearer …`) ; sans token valide, la connexion est refusée.

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: accessToken },
});
```

À la connexion, chaque socket rejoint automatiquement la room personnelle `user:<profileId>`.

### Événements émis par le client

| Événement | Payload | Effet |
|---|---|---|
| `conversation:join` | `{ conversationId }` | Vérifie l'appartenance, rejoint la room `conv:<id>` et passe les messages reçus en « délivré » |
| `message:send` | `{ conversationId, contenu, mediaUrl?, mediaType? }` | Enregistre le message, le diffuse et notifie le destinataire |
| `message:read` | `{ conversationId }` | Marque les messages de l'interlocuteur comme lus |
| `user:typing` | `{ conversationId, isTyping }` | Relaye l'indicateur de saisie |
| `annonce:subscribe` / `annonce:unsubscribe` | `{ annonceId }` | Rejoint / quitte la room `annonce:<id>` |
| `notification:mark_read` | `{ notificationId }` | Renvoie un accusé aux sockets de l'utilisateur |

### Événements émis par le serveur

| Événement | Destinataires | Contenu |
|---|---|---|
| `conversation:joined` | Le socket demandeur | `{ conversationId }` |
| `message:new` | Room `conv:<id>` | Message complet (`id`, `senderId`, `contenu`, média, `statut`, `createdAt`) |
| `message:read_ack` | Room `conv:<id>` | `{ conversationId, readBy, readAt }` |
| `user:typing` | Autres membres de la room | `{ userId, conversationId, isTyping }` |
| `notification:new` | Room `user:<id>` | Notification |
| `notification:read_ack` | Room `user:<id>` | `{ notificationId }` |
| `error` | Le socket concerné | `{ message }` |

Paramètres de connexion : `pingInterval` 25 s, `pingTimeout` 60 s.

---

## ⚙ Tâches de fond (BullMQ)

Deux workers démarrent avec le serveur (`server.ts`) et s'appuient sur Redis.

| File | Concurrence | Jobs traités |
|---|:---:|---|
| `notifications` | 5 | Émission Socket.IO `notification:new` vers `user:<id>`, point d'extension pour le push FCM, e-mail pour les types critiques (`message`, `visite_confirmee`, `visite_annulee`) |
| `emails` | 3 | `2fa` (code de vérification), `passord_reset` (lien de réinitialisation), `visite` (confirmation / annulation), `generic` (sujet + HTML libres) |

Les jobs sont produits par les services `auth`, `visites` et `interactions`.

---

## 🧠 Algorithmes

ImmoPlan s'appuie sur plusieurs structures de données et algorithmes écrits à la main. La version détaillée, ligne par ligne, est dans **[`docs/algo-doc.md`](docs/algo-doc.md)**.

| Algorithme | Fichier | Utilisation |
|---|---|---|
| **Similarité cosinus** | `modules/recommandation/recommandation.service.ts` | Feed personnalisé et annonces similaires |
| **Recherche multi-critères** | `modules/recherche/recherche.service.ts` | Filtres SQL dynamiques paramétrés, plein texte, distance Haversine, tri, pagination par curseur |
| **BFS** (parcours en largeur) | `algorithms/bfs.ts` | Élargissement de la recherche aux quartiers voisins (jusqu'à 3 niveaux) |
| **BST** (arbre binaire de recherche) | `algorithms/bst.ts` | Filtrage des résultats par fourchette de prix (`rangeSearch`) |
| **Pile (Stack, LIFO)** | `algorithms/stack.ts` | Historique de navigation du chercheur (20 éléments max) |
| **File (Queue, FIFO)** | `algorithms/queue.ts` | File interne du BFS |

### Recommandation par similarité cosinus

Chaque annonce est transformée en un **vecteur de 14 dimensions** :

| Dimensions | Composante | Encodage |
|:---:|---|---|
| 10 | Type de bien | One-hot (un 1, neuf 0) |
| 1 | Prix | Normalisé `min(prix / 5 000 000 000, 1)` |
| 1 | Service | `location` = 1, `vente` = 0 |
| 1 | Ville | 1 si même ville, sinon 0 |
| 1 | Surface | Normalisée `min(surface / 10 000, 1)` |

```
cos(θ) = (A · B) / (‖A‖ × ‖B‖)
score  = 0,55 × similarité + 0,45 × récence      (récence : décroissance linéaire sur 180 jours)
```

Déroulé du feed personnalisé :

1. Lecture du cache Redis (`feed:v3:<chercheurId>`).
2. Chargement des préférences explicites. Si elles sont incomplètes, la réponse est vide avec `incompletePreferences: true`.
3. Construction du profil utilisateur à partir des 50 dernières interactions (historique, likes, sauvegardes) ; les préférences explicites priment sur l'inféré.
4. Récupération des annonces publiées correspondantes, exclusion de celles déjà vues.
5. Calcul du score combiné, tri décroissant, pagination par curseur, mise en cache (300 s).

### Recherche multi-critères

```
Requête ─► cache Redis (hash MD5) ─► conditions SQL dynamiques ─► élargissement BFS
        ─► exécution SQL ─► filtre BST par prix ─► réponse paginée + cache (60 s)
```

- Seules les annonces `publiee` disposant d'une position valide sont retournées.
- **Plein texte** : `to_tsvector('french', titre || ' ' || description) @@ plainto_tsquery('french', q)`.
- **Rayon** : distance de Haversine calculée en SQL à partir du champ `geom`.
- **BFS** : si le quartier demandé compte moins de 5 annonces, la recherche s'étend aux quartiers voisins (distance ≤ 100 m), sur 3 niveaux au maximum.
- **BST** : insertion des prix, puis parcours élagué en `O(log n + k)` pour extraire la fourchette `[prix_min, prix_max]`.
- **Pagination** : curseur sur `created_at`, sans `OFFSET`.

### Historique de navigation (pile LIFO)

À chaque consultation, l'identifiant de l'annonce est placé au sommet d'une pile bornée à 20 éléments, sans doublon, puis persisté dans la liste Redis `history:<chercheurId>`. La lecture restitue les annonces de la plus récente à la plus ancienne.

---

## 🧊 Cache et clés Redis

| Clé | Contenu | Durée |
|---|---|---|
| `rt:<profileId>` | Refresh token courant | `JWT_REFRESH_TTL` |
| `bl:<jti>` | Access token révoqué (liste noire) | Durée restante du token |
| `2fa:<profileId>` | Code 2FA | 300 s |
| `reset:<profileId>` | Token de réinitialisation | 3600 s |
| `reco_pref:<profileId>` | Préférences de recommandation | 1 an |
| `feed:v3:<profileId>` | Feed personnalisé | 300 s |
| `feed:publiee:…` | Pages du feed public | 60 s |
| `recherche:<md5>` | Résultat de recherche | 60 s |
| `history:<profileId>` | Pile de l'historique de navigation | persistante |

Les caches `feed:*` sont invalidés lors des changements d'annonces et d'interactions ; le cache de recherche expire de lui-même au bout de 60 s. L'écriture du cache de recherche est faite en *best effort* : une erreur Redis à ce moment ne fait pas échouer la requête.

---

## 📏 Règles métier

| Domaine | Règle |
|---|---|
| Inscription | Âge minimum **18 ans** ; e-mail unique ; `profile_type` obligatoire |
| Mots de passe | Hachés avec bcrypt (coût 12) |
| Publication | Une annonce ne peut passer en `publiee` qu'avec **au moins 3 photos** |
| Photos | **15 photos maximum** par annonce, 10 Mo par fichier, ordre modifiable |
| Clôture | Le statut `vendue_louee` exige **au moins une demande de visite** sur l'annonce |
| Visites : créneaux | Lundi au samedi **09:00 à 18:00**, dimanche **14:00 à 17:00** (UTC+03:00) |
| Visites : durée | 15 à 240 minutes (30 par défaut) |
| Visites : propriété | On ne peut pas demander une visite sur sa propre annonce |
| Visites : cycle | `en_attente` → `confirmee` ou `contre_proposee` → `confirmee` ; `annulee` (avec motif) ; `effectuee` uniquement depuis `confirmee`, par l'offreur |
| Avis | Un seul avis par chercheur et par annonce |
| Likes / vues / favoris | Un seul enregistrement par couple annonce / utilisateur |
| Conversations | Une conversation unique par triplet annonce / offreur / chercheur |

---

## 🛡 Sécurité

- **JWT à deux jetons** : access token court (15 min) + refresh token (30 jours) stocké côté serveur dans Redis, donc révocable. Chaque access token porte un identifiant `jti` pour la liste noire à la déconnexion.
- **Autorisation par rôle** : middleware `requireRole('offreur' | 'chercheur')`.
- **Validation systématique** des entrées avec Zod (corps, paramètres, query), et de l'environnement au démarrage.
- **En-têtes de sécurité** avec Helmet, **CORS** restreint à `CORS_ORIGINS` avec credentials.
- **Limitation de débit** à trois niveaux (général, authentification, upload).
- **Requêtes SQL paramétrées** pour la recherche (aucune concaténation de valeurs utilisateur).
- **Fichiers téléversés** : taille limitée, stockage temporaire supprimé après envoi vers Cloudinary.
- **Anti-énumération** : `forgot-password` répond de la même façon que l'e-mail existe ou non ; les erreurs de connexion ne distinguent pas e-mail inconnu et mot de passe erroné.
- **Arrêt propre** du serveur sur `SIGTERM` / `SIGINT` (délai de 10 s avant arrêt forcé).
- **Electron** : `contextIsolation` activé, `nodeIntegration` désactivé, `sandbox` activé, instance unique, liens externes ouverts dans le navigateur système.

**À ne jamais publier :** `.env`, clés Cloudinary, compte de service Firebase, secrets JWT et identifiants OAuth. Seul `.env.exemple` (sans valeurs réelles) doit être versionné.

---

## 🎨 Frontend

### Routes

| Chemin | Page | Accès |
|---|---|---|
| `/` | Accueil (aperçu du feed, recommandations, prix moyens) | Public |
| `/login`, `/register`, `/2fa`, `/forgot-password`, `/reset-password` | Authentification | Public (redirige vers `/annonces` si connecté) |
| `/annonces` | Feed | Connecté |
| `/annonces/carte` | Carte | Connecté |
| `/annonces/:id` | Détail d'une annonce | Connecté |
| `/annonces/publier` | Publication | Connecté (offreur) |
| `/recherche` | Recherche avancée | Connecté |
| `/recommandations` | Recommandations personnalisées | Connecté |
| `/messagerie`, `/messagerie/:id` | Messagerie | Connecté |
| `/visites` | Visites | Connecté |
| `/historique` | Historique de navigation | Connecté |
| `/notifications` | Notifications | Connecté |
| `/dashboard` | Tableau de bord | Connecté (offreur) |
| `/profil/:id` | Profil public | Connecté |
| `/trouver-offreur` | Recherche d'offreurs | Connecté |
| `/settings` | Paramètres du compte | Connecté |

Toutes les pages sont chargées à la demande (`React.lazy` + `Suspense` avec squelettes) et les pages connectées sont rendues dans un `AppShell` (barre latérale, barre de navigation, navigation basse sur mobile).

### Gestion de l'état et des données

- **React Query** pour le cache des appels API (clés distinctes par écran).
- **Zustand** : `auth` (utilisateur et tokens, persisté), `chat`, `notifications`.
- **Axios** : jeton ajouté automatiquement ; sur `401`, rafraîchissement silencieux avec file d'attente des requêtes en échec, puis déconnexion propre si le refresh échoue.
- **Socket.IO** : connexion unique partagée via un contexte (`SocketProvider`), hooks `useChat`, `useNotifications`, `useSocket`.

### Interface

- **Thèmes** sombre (par défaut) et clair, mémorisé dans `localStorage` (`immoplan-theme`).
- **Langues** : français, malgache, anglais, avec formats de dates et nombres adaptés à chaque langue.
- **Design** : palette ambre (`#F5A623`) sur fond sombre, polices Inter et Space Grotesk, curseur personnalisé, transitions de page animées.
- **Composants** : cartes d'annonces, galerie photo, réordonnancement des photos, fenêtre de chat avec indicateur de saisie, carte avec popups et couche de points d'intérêt, graphiques de performances, agenda des visites, modale de partage.

---

## 🖥 Application desktop (Electron)

L'application desktop charge le frontend dans une fenêtre native (1280 × 800, minimum 360 × 640). **Le backend n'est pas lancé par Electron** : il doit être démarré séparément. Au démarrage, Electron interroge `GET /api/health` (jusqu'à 120 s, toutes les 1,5 s) et affiche une boîte de dialogue d'aide si le serveur reste injoignable.

| Mode | Comportement |
|---|---|
| **Développement** (`ELECTRON_DEV=true` ou application non packagée) | Charge le serveur Vite (`http://127.0.0.1:5173`) |
| **Production** (packagée) | Sert `frontend/dist` via un mini-serveur local sur le port `5174` et relaie `/api` et `/socket.io` vers le backend |

Construire le frontend pour Electron :

```bash
cd immoplan-frontend
npm run build:electron      # tsc + vite build --config vite.config.electron.ts --mode electron
```

> ℹ️ Les sources d'Electron se trouvent dans `electron/`, mais le dépôt ne contient pas de `package.json` à la racine : les scripts de lancement et de packaging (par exemple `electron:build:frontend`, cité dans un message d'erreur de `static-server.js`) et les dépendances `electron` et `http-proxy` doivent y être déclarés avant de pouvoir lancer ou empaqueter l'application desktop.

---

## 📜 Scripts disponibles

### Backend : `immoplan-backend`

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement (`ts-node-dev`, rechargement automatique, mode `--transpile-only`) |
| `npm run build` | Compilation TypeScript vers `dist/` |
| `npm run start` | Démarre `dist/server.js` |
| `npm run prisma:generate` | Génère le client Prisma |
| `npm run prisma:pull` | Introspecte la base et met à jour `schema.prisma` |
| `npm run lint` | ESLint sur `src` |

### Frontend : `immoplan-frontend`

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement Vite (port 5173) |
| `npm run build` | Vérification TypeScript puis build de production |
| `npm run build:electron` | Build adapté à Electron (`base: './'`) |
| `npm run preview` | Prévisualise le build |
| `npm run lint` | ESLint (zéro avertissement toléré) |

### Electron

| Commande | Description |
|---|---|
| `node electron/clean-release.js` | Supprime le dossier `release/` |

---

## 🚧 État du projet et points d'attention

- **Tests automatisés** : aucun test n'est présent dans le dépôt pour le moment.
- **Script SQL de la base** : seul le schéma Prisma (introspecté) est versionné ; pas de migrations Prisma.
- **Desktop** : `package.json` racine à ajouter pour lancer et packager Electron (voir plus haut).
- **ESLint** : les scripts `lint` existent mais aucune configuration ESLint n'est versionnée côté backend, et le paquet `eslint` n'y est pas déclaré.
- **Connexion Google** : le backend redirige vers `FRONTEND_URL/auth/callback?accessToken=…&refreshToken=…`, route que le frontend ne déclare pas encore dans son routeur.
- **Push FCM** : le service Firebase est en place, mais le worker de notifications ne fait pour l'instant que journaliser l'envoi push.
- **Variable d'expéditeur** : `.env.exemple` utilise `EMAIL_FROM`, le code attend `SMTP_FROM`.

---

## 👤 Auteur et licence

Projet universitaire développé par **RASOANAIVO Andriantsoa Andy** ([@Noctis43](https://github.com/Noctis43)).

Distribué sous licence **MIT** : voir le fichier [`LICENSE`](LICENSE).

---

<div align="center">

Fait avec ❤️ pour l'immobilier malgache 🇲🇬

</div>
