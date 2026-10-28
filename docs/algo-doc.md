# Explication des algorithmes — ImmoPlan

Ce document explique en détail le fonctionnement des algorithmes utilisés dans ImmoPlan, notamment la **similarité cosinus** (recommandation) et la **recherche multi-critères** (recherche).

---

## 1. Algorithme de Similarité Cosinus

**Fichier :** `immoplan-backend/src/modules/recommandation/recommandation.service.ts`

### 1.1 Principe mathématique

La similarité cosinus mesure la similarité entre deux vecteurs dans un espace multidimensionnel. Elle est calculée comme le **cosinus de l'angle** entre les deux vecteurs.

```
cos(θ) = (A · B) / (||A|| × ||B||)

Où :
- A · B = produit scalaire = Σ(Ai × Bi)
- ||A|| = norme euclidienne = √Σ(Ai²)
- ||B|| = norme euclidienne = √Σ(Bi²)
```

**Résultat :** une valeur entre **0** (pas similaire) et **1** (identique). Plus la valeur est proche de 1, plus les annonces sont similaires.

### 1.2 Interface FeatureVector (lignes 11-22)

```typescript
interface FeatureVector {
  typeBien: number[];    // Encodage one-hot du type de bien (10 dimensions)
  prixNorm: number;      // Prix normalisé entre 0 et 1
  service: number;       // Service : location = 0, vente = 1
  villeId: number;       // ID de la ville (comparé comme dimension booléenne)
  surfaceNorm: number;   // Surface normalisée entre 0 et 1
}
```

Chaque annonce est représentée par un vecteur de **14 dimensions** :
- **10 dimensions** pour le type de bien (one-hot encoding : une seule dimension vaut 1, les autres 0)
- **1 dimension** pour le prix normalisé
- **1 dimension** pour le service (location/vente)
- **1 dimension** pour la correspondance de ville
- **1 dimension** pour la surface normalisée

### 1.3 buildFeatureVector() — Lignes 438-454

```typescript
private static buildFeatureVector(annonce: {
    type_bien: string; prix: unknown; service: string;
    ville_id: number; surface_m2: unknown;
  }): FeatureVector {
```

**Rôle :** Convertit une annonce (objet brut de la BDD) en vecteur de caractéristiques numériques.

**Explication ligne par ligne :**

| Ligne | Code | Explication |
|-------|------|-------------|
| 442 | `const typeBien = new Array(PROPERTY_TYPES.length).fill(0);` | Crée un tableau de 10 éléments (appartement, maison, villa, studio, duplex, bureau, local_commercial, terrain, entrepôt, autre) remplis de 0. |
| 443 | `const typeIndex = PROPERTY_TYPES.indexOf(annonce.type_bien);` | Cherche l'index du type de bien dans la liste fixe des 10 types. Ex : "appartement" → index 0, "maison" → index 1. |
| 445 | `if (typeIndex >= 0) typeBien[typeIndex] = 1;` | **One-hot encoding :** met la valeur à 1 à la position correspondant au type de bien. Ex : pour une villa → `[0,0,1,0,0,0,0,0,0,0]`. |
| 449 | `prixNorm: Math.min(Number(annonce.prix) / MAX_PRIX, 1)` | Normalise le prix entre 0 et 1 : prix ÷ 5 milliards Ariary, plafonné à 1. |
| 450 | `service: annonce.service === 'location' ? 1 : 0` | Convertit le service en valeur binaire : location = 1, vente = 0. |
| 451 | `villeId: annonce.ville_id` | Conserve l'ID de la ville (dimension spéciale : comparée en booléen). |
| 452 | `surfaceNorm: Math.min(Number(annonce.surface_m2) / MAX_SURFACE, 1)` | Normalise la surface : surface ÷ 10 000 m², plafonné à 1. |

### 1.4 cosineSimilarity() — Lignes 465-503

```typescript
private static cosineSimilarity(a: FeatureVector, b: FeatureVector): number {
```

**Rôle :** Calcule la similarité cosinus entre deux vecteurs de caractéristiques.

**Explication ligne par ligne :**

| Lignes | Code | Explication |
|--------|------|-------------|
| 467-473 | `const vecA = [...a.typeBien, a.prixNorm, a.service, a.villeId === b.villeId ? 1 : 0, a.surfaceNorm]` | **Aplatit le FeatureVector A** en un tableau plat de 14 nombres. La ville est comparée : si les deux vecteurs ont la même ville → 1, sinon 0. |
| 474-480 | `const vecB = [...b.typeBien, b.prixNorm, b.service, 1, b.surfaceNorm]` | **Aplatit le FeatureVector B** de la même façon. La dimension ville vaut toujours 1 car la comparaison a déjà été faite dans vecA. |
| 483-486 | `let dotProduct = 0; let normA = 0; let normB = 0;` | Initialise les accumulateurs pour le produit scalaire et les normes. |
| 488-492 | `for (let i = 0; i < vecA.length; i++) { dotProduct += vecA[i] * vecB[i]; normA += vecA[i] * vecA[i]; normB += vecB[i] * vecB[i]; }` | **Boucle unique** calculant simultanément : (1) Produit scalaire : somme de Ai×Bi, (2) Norme carrée de A : somme de Ai², (3) Norme carrée de B : somme de Bi². |
| 495-496 | `normA = Math.sqrt(normA); normB = Math.sqrt(normB);` | Racine carrée pour obtenir les normes euclidiennes. |
| 499 | `if (normA === 0 \|\| normB === 0) return 0;` | Protection contre la division par zéro (vecteur nul). |
| 502 | `return dotProduct / (normA * normB);` | **Similarité cosinus** = produit scalaire ÷ (norme de A × norme de B). |

### 1.5 buildUserProfile() — Lignes 343-433

**Rôle :** Construit le **profil de préférences** d'un chercheur à partir de ses interactions passées (historique, likes, sauvegardes).

**Explication étape par étape :**

| Lignes | Explication |
|--------|-------------|
| 345-362 | **Récupération des 50 dernières interactions** : charge en parallèle l'historique, les likes et les sauvegardes via Prisma (limit 50 chacun). |
| 365-368 | **Collecte des IDs uniques** : fusionne tous les IDs d'annonces interagies dans un Set pour éviter les doublons. |
| 370-387 | **Profil neutre** : si aucune interaction, crée un profil neutre où chaque type a une probabilité égale (0.1), prix=0.5, service=0.5, surface=0.5. Les préférences explicites surchargent ces valeurs. |
| 396-411 | **Agrégation** : pour chaque annonce interagie, comptabilise le type de bien, accumule les prix/services/surfaces, et compte les villes. |
| 413-423 | **Normalisation** : convertit les comptages en distributions (proportions). La ville dominante est celle avec le plus d'interactions. |
| 424-431 | **Surpondération** : les préférences explicites (prix_min/max, service, ville_id) priment sur les préférences inférées de l'historique. |

### 1.6 getFeedPersonnalise() — Lignes 166-260

**Algorithme complet du feed personnalisé :**

```
1. Vérifier le cache Redis (feed:v3:{chercheurId})
2. Charger les préférences explicites du chercheur
3. Si préférences incomplètes → retourner vide (incompletePreferences: true)
4. Construire le profil utilisateur via buildUserProfile()
5. Récupérer toutes les annonces publiées correspondant aux préférences
6. Exclure les annonces déjà vues
7. Pour chaque annonce :
   a. Calculer le vecteur de caractéristiques (buildFeatureVector)
   b. Calculer la similarité cosinus avec le profil utilisateur
   c. Calculer le score de récence (max 180 jours)
   d. Score combiné = 55% similarité + 45% récence
8. Trier les annonces par score décroissant
9. Paginer les résultats (cursor-based)
10. Mettre en cache Redis (TTL 300s)
```

**Pondération du score (lignes 229-230) :**
```typescript
const combinedScore = 0.55 * similarity + 0.45 * Math.max(0, recencyScore);
```
- **55%** de similarité cosinus (pertinence des caractéristiques)
- **45%** de récence (fraîcheur de l'annonce, score décroît linéairement sur 180 jours)

### 1.7 getSimilaires() — Lignes 265-337

**Algorithme de recherche d'annonces similaires :**

```
1. Trouver la dernière annonce vue par l'utilisateur (annonce_vues trié par viewed_at DESC)
2. Si aucune vue → retourner vide
3. Charger les détails de l'annonce cible
4. Construire le vecteur de caractéristiques de la cible
5. Charger toutes les autres annonces publiées
6. Pour chaque candidate :
   a. Construire son vecteur de caractéristiques
   b. Calculer la similarité cosinus avec la cible
7. Trier les candidates par similarité décroissante
8. Filtrer (similarité > 0) et limiter au nombre demandé (défaut 12, max 50)
```

---

## 2. Fonction search() — Recherche multi-critères

**Fichier :** `immoplan-backend/src/modules/recherche/recherche.service.ts`

### 2.1 Vue d'ensemble

La fonction `search()` implémente une **recherche multi-critères** qui combine plusieurs algorithmes :
- **Filtres SQL dynamiques** avec paramètres typés (sécurité anti-injection)
- **Recherche textuelle plein texte** via `to_tsvector` (PostgreSQL)
- **Filtrage géographique** par distance Haversine (sans PostGIS)
- **Élargissement BFS** sur les quartiers adjacents
- **Filtrage par fourchette de prix** via BST (Binary Search Tree)
- **Cache Redis** avec hash MD5 de la requête

### 2.2 Explication ligne par ligne

#### Initialisation et cache (lignes 49-58)

| Ligne | Code | Explication |
|-------|------|-------------|
| 49 | `const { cursor, limit } = parsePagination(query);` | Extrait le curseur de pagination et la limite (défaut: 20, max: 100). |
| 51 | `const queryHash = crypto.createHash('md5').update(JSON.stringify(query)).digest('hex');` | Génère un hash MD5 unique de la requête pour servir de clé de cache. |
| 52 | `const cacheKey = 'recherche:${queryHash}';` | Clé Redis : "recherche:" + hash MD5. |
| 53-58 | `cached = await redis.get(cacheKey); if (cached) return JSON.parse(cached);` | Si le cache existe, retourne le résultat directement (gain de performance). |

#### Construction des conditions SQL dynamiques (lignes 60-122)

**Ligne 60 :** Conditions de base :
```typescript
const conditions: string[] = ["a.statut = 'publiee'", "a.geom IS NOT NULL", "a.geom <> ''"];
```
- Seules les annonces **publiées** avec des **coordonnées géographiques** valides sont cherchables.

**Lignes 61-62 :** `params` et `paramIndex` :
- Le tableau `params` stocke les valeurs des paramètres SQL (sécurité : jamais de concaténation directe)
- `paramIndex` est un compteur ($1, $2, $3...) pour les paramètres PostgreSQL

**Filtres conditionnels :**

| Lignes | Query param | Condition SQL générée |
|--------|-------------|----------------------|
| 64-68 | `query.service` | `a.service = $1::service_type` (location ou vente) |
| 69-73 | `query.type_bien` | `a.type_bien = $2::property_type` |
| 74-78 | `query.ville_id` | `a.ville_id = $3` |
| 79-83 | `query.surface_min` | `a.surface_m2 >= $4` |
| 84-88 | `query.surface_max` | `a.surface_m2 <= $5` |
| 89-93 | `query.nb_chambres_min` | `a.nb_chambres >= $6` |

#### Recherche textuelle plein texte (lignes 95-101)

```typescript
`to_tsvector('french', coalesce(a.titre,'') || ' ' || coalesce(a.description,'')) @@ plainto_tsquery('french', $${paramIndex})`
```

- **`to_tsvector('french', ...)`** : convertit le texte (titre + description) en un vecteur de **lexèmes** (mots normalisés) pour la langue française. Ex : "appartements" → "appartement".
- **`plainto_tsquery('french', ...)`** : convertit la requête utilisateur en une requête plein texte.
- **Opérateur `@@`** : vérifie si le document correspond à la requête (similarité sémantique, pas une simple sous-chaîne).

#### Filtrage géographique Haversine (lignes 103-117)

**Étapes :**
1. Convertir `rayon_km` en mètres : `rayonM = Number(query.rayon_km) * 1000`
2. Extraire les coordonnées du champ `geom` (format TEXT `POINT(lng lat)`) via `sqlPointCoords()`
3. Ajouter une condition SQL Haversine qui calcule la distance à vol d'oiseau

**Fonction `sqlPointCoords()` (geoUtils.ts lignes 113-119) :**
```typescript
return {
  lng: `CAST(split_part(trim(trailing ')' from split_part(a.geom, '(', 2)), ' ', 1) AS double precision)`,
  lat: `CAST(split_part(trim(trailing ')' from split_part(a.geom, '(', 2)), ' ', 2) AS double precision)`,
};
```
Extrait `lng` et `lat` depuis un champ TEXT comme `"POINT(47.5 -18.9)"` → split sur '(' → trim ')' → split sur ' '.

**Fonction `sqlHaversineWithinMeters()` (geoUtils.ts lignes 124-136) :**
```typescript
`(6371000 * 2 * ASIN(LEAST(1::float8, SQRT(
    POWER(SIN(RADIANS((${latCol} - ${latParam}) / 2)), 2) +
    COS(RADIANS(${latParam})) * COS(RADIANS(${latCol})) *
    POWER(SIN(RADIANS((${lngCol} - ${lngParam}) / 2)), 2)
)))) <= ${maxMetersParam}`
```
Implémente la **formule de Haversine** directement en SQL :
- `6371000` = rayon de la Terre en mètres
- La formule calcule la distance en mètres entre deux points GPS (lat1,lng1 et lat2,lng2)
- La comparaison `<= maxMetersParam` filtre les annonces dans le rayon demandé

#### Pagination cursor-based (lignes 119-123)

```typescript
if (cursor) { conditions.push('a.created_at < $${paramIndex}::timestamptz'); }
```
- Le curseur est une date ISO (extraite du dernier résultat de la page précédente)
- On récupère uniquement les annonces **plus anciennes** que ce curseur
- Pas d'OFFSET : performances O(1) quel que soit le nombre de pages

#### Tri (lignes 125-128)

| `query.sort` | Order BY |
|-------------|----------|
| (non défini) | `a.published_at DESC` (date de publication) |
| `prix_asc` | `a.prix ASC` (du moins cher au plus cher) |
| `prix_desc` | `a.prix DESC` (du plus cher au moins cher) |
| `note_desc` | `a.note_moyenne DESC NULLS LAST` (meilleure note en premier) |

#### Élargissement BFS sur les quartiers (lignes 130-157)

**Principe :** Si le quartier demandé contient moins de 5 annonces, on élargit automatiquement aux quartiers voisins via un **parcours BFS** (Breadth-First Search).

```
Étapes :
1. Compter les annonces dans le quartier demandé
2. Si count < 5 :
   a. Charger les quartiers voisins (getNeighborEdges)
   b. Construire un graphe de voisinage (buildGraph)
   c. Parcourir le graphe en BFS jusqu'à 3 niveaux (bfsByLevel)
   d. Ajouter tous les IDs de quartiers trouvés
3. Filtrer les annonces sur tous les quartiers (initial + voisins)
```

**Fonction `getNeighborEdges()` (lignes 199-226) :**
1. Charge tous les quartiers (filtrés par ville si spécifié)
2. Parse les coordonnées de chaque quartier (depuis `zone` ou `geom`)
3. Pour chaque paire de quartiers, calcule la distance Haversine
4. Si distance ≤ 100 mètres → paire de voisins `[idA, idB]`

**buildGraph (bfs.ts lignes 30-48) :**
- Construit une **liste d'adjacence** (Map<number, number[]>) à partir des paires
- Relation **bidirectionnelle** : si A est voisin de B, alors B est voisin de A

**bfsByLevel (bfs.ts lignes 121-137) :**
- Parcourt le graphe niveau par niveau
- Niveau 0 = quartier demandé
- Niveau 1 = voisins directs (distance ≤ 100m)
- Niveau 2 = voisins des voisins
- Niveau 3 = voisins des voisins des voisins

**Algorithme BFS (bfs.ts lignes 69-110) :**
```
1. Initialiser : file ← [nœud_départ, niveau 0], visités ← {nœud_départ}
2. Tant que la file n'est pas vide :
   a. Retirer [nœud_courant, niveau] de la file (FIFO)
   b. Ajouter le nœud aux résultats
   c. Si niveau < profondeur_max :
      - Pour chaque voisin non visité :
        * Marquer comme visité
        * Ajouter à la file avec niveau+1
```

#### Exécution de la requête SQL (lignes 159-172)

```typescript
const sqlQuery = `
  SELECT ${ANNONCES_SELECT},
    v.nom as ville_nom, q.nom as quartier_nom,
    (SELECT cloudinary_url FROM annonce_photos WHERE annonce_id = a.id ORDER BY ordre LIMIT 1) as thumbnail
  FROM annonces a
  LEFT JOIN villes v ON v.id = a.ville_id
  LEFT JOIN quartiers q ON q.id = a.quartier_id
  WHERE ${conditions.join(' AND ')}
  ORDER BY ${orderBy}
  LIMIT $${paramIndex}`;
```

- La requête complète est construite dynamiquement avec toutes les conditions
- `ANNONCES_SELECT` (lignes 24-29) définit les 20 colonnes récupérées
- `LEFT JOIN` avec villes et quartiers pour les noms
- Sous-requête pour récupérer la première photo (thumbnail)
- On demande `limit + 1` éléments pour déterminer `hasMore`

#### Filtrage BST par prix (lignes 174-182)

```typescript
if (query.prix_min || query.prix_max) {
  const bst = new BST<AnnonceResult>();
  for (const annonce of annonces) {
    bst.insert(prixToNumber(annonce.prix), annonce);
  }
  annonces = bst.rangeSearch(minPrix, maxPrix);
}
```

**Pourquoi un BST ?** Le filtre de prix utilise un **Binary Search Tree** plutôt qu'un filtre SQL car le prix en BDD peut être stocké sous différents types (number, BigInt, Prisma Decimal). Le BST permet un filtrage en mémoire après la requête.

**Algorithme BST (bst.ts) :**

- **`insert(key, value)`** (lignes 38-70) : insère une annonce dans l'arbre avec le prix comme clé de tri
  - Si arbre vide → la nouvelle annonce devient racine
  - Sinon : parcourt l'arbre : si key < current.key → va à gauche, sinon va à droite
  - Insère quand un emplacement null est trouvé

- **`rangeSearch(minKey, maxKey)`** (lignes 81-86) : recherche toutes les annonces dont le prix est dans [min, max]
  - Parcours in-order **élagué** (ignore les branches hors fourchette)
  - Complexité : O(log n + k) où k est le nombre de résultats

**Algorithme `rangeSearchHelper` (lignes 91-114) :**
```
rangeSearchHelper(noeud, min, max, résultats) :
  1. Si noeud est null → retour
  2. Si noeud.key > min → explorer le sous-arbre gauche (résultats potentiels plus petits)
  3. Si noeud.key est dans [min, max] → ajouter la valeur
  4. Si noeud.key < max → explorer le sous-arbre droit (résultats potentiels plus grands)
```

#### Construction de la réponse paginée (lignes 184-195)

```typescript
const result = buildPaginatedResponse(annonces, limit, (item) => new Date(item.created_at).toISOString());
```

**Fonction `buildPaginatedResponse()` (pagination.ts lignes 51-71) :**
- Si `annonces.length > limit` → il y a une page suivante (hasMore = true)
- Prend les `limit` premiers éléments
- Extrait le curseur du dernier élément (`created_at` en ISO)
- Format retourné :
```json
{
  "data": [...],
  "meta": {
    "nextCursor": "2024-01-15T10:30:00.000Z",
    "hasMore": true
  }
}
```

**Cache Redis (lignes 190-194) :**
- Stocke le résultat avec TTL de **60 secondes**
- Best-effort : si Redis est indisponible, ignore l'erreur

### 2.3 Schéma récapitulatif du flux complet search()

```
Requête utilisateur (query params)
       │
       ▼
┌─────────────────────────────┐
│  1. Vérification cache      │
│     Redis (hash MD5)        │←─ Si trouvé → retour direct
└─────────────────┬───────────┘
                  │ (pas de cache)
                  ▼
┌─────────────────────────────┐
│  2. Construction conditions │
│     SQL dynamiques          │
│     • Paramètres typés      │
│     • to_tsvector (texte)   │
│     • Haversine (distance)  │
│     • Cursor (pagination)   │
└─────────────────┬───────────┘
                  │
                  ▼
┌─────────────────────────────┐
│  3. Élargissement BFS       │
│     Si < 5 annonces :       │
│     • Voisins niveau 1      │
│     • Voisins niveau 2      │
│     • Voisins niveau 3      │
└─────────────────┬───────────┘
                  │
                  ▼
┌─────────────────────────────┐
│  4. Exécution SQL           │
│     • SELECT + JOIN         │
│     • WHERE conditions      │
│     • ORDER BY ${sort}      │
│     • LIMIT ${limit + 1}    │
└─────────────────┬───────────┘
                  │
                  ▼
┌─────────────────────────────┐
│  5. Filtrage BST par prix   │
│     (si prix_min/max)       │
│     • Insertion O(log n)    │
│     • RangeSearch O(k)      │
└─────────────────┬───────────┘
                  │
                  ▼
┌─────────────────────────────┐
│  6. Réponse paginée         │
│     • hasMore, nextCursor   │
│     • Cache Redis 60s       │
└─────────────────────────────┘
                  │
                  ▼
            Résultat JSON