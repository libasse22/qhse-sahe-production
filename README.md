# QHSE Duo Sénégal — MVP

## État d'avancement
- ✅ Module 0 — Socle du projet (Next.js 16, TypeScript strict, Tailwind, shadcn)
- ✅ Module 1 — Authentification Supabase (inscription, connexion, déconnexion, rôles, validation admin)
- ✅ Module 2 — Gestion des incidents (déclaration, détail, modification, cycle de vie)
- ✅ Module 3 — Actions correctives (création, assignation, suivi de statut)
- ✅ Module 4 — Dashboard statistiques (répartitions gravité/statut/catégorie, actions en retard)
- ✅ Module 5 — Gestion des utilisateurs (rôles, suspension/réactivation, liste complète)
- ✅ Module 6 — Upload photos (pièces jointes aux incidents via Supabase Storage)
- ✅ Module 7 — Messages vocaux (enregistrement/écoute via Supabase Storage)
- ✅ Module 8 — Entreprises & sites (multi-établissement, base du schéma)
- ✅ Module 9 — Interface Ouvrier dédiée (déclaration ultra-simple par icônes/couleurs, photo caméra, message vocal)
- ✅ Module 10 — Recherche et filtres sur la liste des incidents (Responsable QHSE)
- ✅ Module 11 — Politique QHSE : diffusion, versions, accusés de lecture, taux de lecture (ISO 9001/14001/45001 §5.2)
- ✅ Module 12 — Programme d'audit interne : planification, auditeur assigné, constats (ISO 9001 §9.2)
- ✅ Module 13 — Registre des risques : matrice de criticité probabilité × gravité (ISO 31000, 9001 §6.1, 14001 §6.1.2, 45001 §6.1.2)
- ✅ Module 14 — Objectifs & indicateurs QHSE : cibles mesurables et suivi d'avancement (ISO 9001/14001/45001 §6.2)
- ✅ Module 15 — Parties intéressées & obligations de conformité (ISO 14001 §4.2 / §6.1.3)
- ✅ Module 16 — Revues de direction : comptes-rendus (ISO 9001/14001/45001 §9.3)
- ✅ Module 17 — Bibliothèque documentaire QHSE (ISO 9001 §7.5)
- ✅ Module 18 — Identité visuelle distinctive (typographie Archivo/Public Sans/IBM Plex Mono, signature "chevrons de sécurité")
- ✅ Module 19 — Politique QHSE : ajout d'un document PDF en complément ou à la place du texte
- ✅ Module 20 — Paramètres : nom et logo de l'application modifiables par l'admin, adaptable à toute entreprise
- ✅ Module 21 — Rôles & permissions configurables : l'admin peut créer des rôles personnalisés avec des permissions à la carte, en plus des 3 rôles système historiques
- ✅ Module 22 — Permissions granulaires étendues à tout le reste de l'application (incidents, actions, audits, risques, objectifs, conformité, revues, documents, politique, utilisateurs, rôles, paramètres)
- ✅ Module 23 — Mode hors-ligne pour l'espace Ouvrier : déclaration (texte + photos + message vocal) sans réseau, envoi automatique au retour de la connexion
- ✅ Module 24 — QR codes équipements : fiche équipement scannable, signalement pré-rempli en un geste
- ✅ Module 25 — Notifications temps réel (incident/action assignée, nouvelle politique) + export CSV (incidents, actions correctives)

## QR codes équipements (module 24)

Chaque équipement (`/equipements`) a une fiche avec un QR imprimable
généré via une API publique gratuite (aucune librairie npm à installer).
Le QR encode l'URL `/scan/{id}` : le scanner avec l'appareil photo natif
d'un téléphone (aucune app dédiée) ouvre cette fiche, qui propose
directement de signaler un problème pré-rempli pour cet équipement. Un
utilisateur non connecté qui scanne est redirigé vers `/login` puis
renvoyé automatiquement sur la bonne page après connexion (paramètre
`next`, middleware mis à jour).

## Notifications temps réel (module 25)

Générées automatiquement par des triggers SQL (incident assigné, action
corrective assignée, nouvelle politique publiée) et poussées en direct au
navigateur via Supabase Realtime — pas de rechargement de page nécessaire.
Cloche visible dans les deux espaces (Responsable QHSE et Ouvrier).

## Export CSV (module 25)

Bouton "Exporter CSV" sur les listes Incidents et Actions correctives —
génération 100 % côté navigateur à partir des données déjà affichées
(aucun aller-retour serveur, aucune dépendance ajoutée), au format
compatible Excel français (séparateur `;`, encodage UTF-8 avec BOM).

## Mode hors-ligne (module 23)

Un ouvrier peut déclarer un incident (gravité, lieu, description, photos,
message vocal) même sans réseau. Le formulaire tente d'abord un envoi
immédiat ; en cas d'échec réseau, tout (y compris les photos et
l'enregistrement vocal, sous forme de fichiers) est mis en file d'attente
locale dans le navigateur (IndexedDB, aucune dépendance externe ajoutée).
Un bandeau en haut de l'espace Ouvrier indique le nombre de signalements en
attente ; l'envoi se relance automatiquement dès que la connexion revient
(évènement navigateur + relance périodique de sécurité toutes les 45s pour
les cas où le navigateur ne détecte pas correctement le retour réseau,
ex. portails captifs). Chaque signalement porte un identifiant généré sur
l'appareil (`client_generated_id`, migration 0019) qui empêche tout doublon
si l'envoi est retenté plusieurs fois.

**Limite connue :** si la connexion est perdue *entre* la création de
l'incident et la fin de l'envoi des pièces jointes (cas rare), une
nouvelle tentative peut renvoyer les photos/messages vocaux déjà transmis
avec succès, créant un doublon de pièce jointe (l'incident lui-même n'est
jamais dupliqué). Facilement supprimable a posteriori depuis la fiche de
l'incident.

## Permissions granulaires (module 22)

Les policies RLS qui reposaient sur `is_qhse_or_admin()` (admin ou manager
QHSE, sans distinction) ont été remplacées par des vérifications
`has_permission(code)` précises, module par module. Un rôle personnalisé
n'a donc plus accès qu'à ce qui est explicitement coché pour lui — avant
cette migration, tout rôle rattaché à l'espace « Responsable QHSE » héritait
de facto de tous les droits QHSE quelles que soient ses permissions
cochées. Aucune régression pour les 3 rôles système : ils possèdent déjà
(migration 0017) exactement les permissions nécessaires. Les pages
(boutons, formulaires, menu latéral) ont été mises à jour en parallèle pour
n'afficher que ce que l'utilisateur peut réellement faire.

## Rôles & permissions configurables

Les rôles historiques (`admin`, `manager_qhse`, `employe`) restent la base du
routage (espace Terrain vs Responsable QHSE) — **aucune régression** sur
l'existant. Par-dessus, un catalogue de permissions et une table `roles`
permettent à l'admin de créer des rôles personnalisés (ex : « Auditeur
externe ») rattachés à l'un des 3 espaces, avec un sous-ensemble précis de
permissions. Accessible depuis `/admin/roles`. Un rôle système ne peut pas
être supprimé ni voir ses permissions modifiées ; un rôle personnalisé peut
librement évoluer. L'assignation d'un rôle à un utilisateur (`/admin/utilisateurs`)
met à jour en même temps l'enum historique — tout le reste de l'application
continue de fonctionner sans modification.

## Adapter l'application à une autre entreprise

Tout le nom codé en dur a été retiré du code : le nom et le logo sont stockés
en base (table `app_settings`, une seule ligne) et modifiables depuis
`/parametres` (réservé admin) — ils s'appliquent immédiatement partout :
menu, pages de connexion/inscription, titre de l'onglet du navigateur. Le
premier admin de chaque déploiement peut donc renommer l'application et
déposer son propre logo sans toucher au code.

## Identité visuelle

La charte s'inspire de la signalétique de sécurité industrielle plutôt que
des gabarits génériques : bleu atelier profond en couleur principale, jaune
de sécurité réservé à un seul motif signature (chevrons noir/jaune), typo
Archivo (titres) + Public Sans (texte) + IBM Plex Mono (codes/chiffres). Les
polices sont chargées via `next/font/google` dans `app/layout.tsx` — aucune
clé ni compte externe requis, elles sont mises en cache au build.

## Deux espaces distincts

- **`/ouvrier/*`** — réservé au rôle `employe`. Déclaration en 3 gestes (gravité,
  localisation, envoi), ajout de photo/message vocal après coup, liste
  visuelle de ses propres signalements. Aucune saisie de texte n'est
  obligatoire.
- **`/dashboard`, `/incidents`, `/actions`, `/admin/*`** — réservé aux rôles
  `manager_qhse` et `admin`. Vue complète, filtres, statistiques, gestion des
  utilisateurs.

La redirection après connexion se fait automatiquement selon le rôle
(`lib/services/auth.service.ts` → `signIn`).

## Installation

```bash
npm install
cp .env.local.example .env.local
```

Renseigne `.env.local` avec l'URL et la clé anonyme de ton projet Supabase
(Project Settings → API).

## Base de données

Dans le SQL editor de ton projet Supabase, exécute **dans l'ordre** le contenu de :

```
supabase/migrations/0001_auth_profiles.sql
supabase/migrations/0002_incidents.sql
supabase/migrations/0003_actions_correctives.sql
supabase/migrations/0004_incident_photos.sql
supabase/migrations/0005_companies_sites.sql
supabase/migrations/0006_incident_voice_notes.sql
supabase/migrations/0007_qhse_policy.sql
supabase/migrations/0008_profiles_qhse_read.sql
supabase/migrations/0009_audits.sql
supabase/migrations/0010_risks.sql
supabase/migrations/0011_qhse_objectives.sql
supabase/migrations/0012_interested_parties.sql
supabase/migrations/0013_management_reviews.sql
supabase/migrations/0014_documents.sql
supabase/migrations/0015_qhse_policy_pdf.sql
supabase/migrations/0016_app_settings.sql
supabase/migrations/0017_roles_permissions.sql
supabase/migrations/0018_permission_based_rls.sql
supabase/migrations/0019_offline_sync.sql
supabase/migrations/0020_equipment.sql
supabase/migrations/0021_notifications.sql
```

La migration `0014` crée aussi automatiquement le bucket de stockage privé
`qhse-documents`.

Les migrations `0004` et `0006` créent aussi automatiquement les buckets de
stockage privés `incident-photos` et `incident-voice-notes` (pas de
manipulation manuelle nécessaire dans l'onglet Storage du dashboard
Supabase).

⚠️ Si tu avais déjà un compte créé **avant** d'exécuter les migrations, son
profil n'existe pas encore dans `public.profiles`. Corrige-le avec :
```sql
insert into public.profiles (id, email, full_name, role, status)
select id, email, coalesce(raw_user_meta_data->>'full_name', ''), 'admin', 'active'
from auth.users
where id not in (select id from public.profiles);
```

## Créer le premier administrateur

1. Lance l'app (`npm run dev`) et crée un compte via `/signup`.
2. Dans le SQL editor Supabase :
   ```sql
   update public.profiles set role = 'admin', status = 'active'
   where email = 'ton.email@exemple.com';
   ```
3. Reconnecte-toi : tu accèdes au dashboard et à "Comptes en attente".

## Lancer le projet

```bash
npm run dev
```

## Vérifications avant de passer au module suivant

```bash
npm run typecheck   # 0 erreur TypeScript attendue
npm run lint         # 0 erreur ESLint attendue
npm run build        # build de production sans erreur
```

Puis test manuel du parcours complet :
1. Inscription d'un nouvel utilisateur → redirection vers `/en-attente`.
2. Connexion avec un compte `pending` → reste bloqué sur `/en-attente`.
3. Connexion avec le compte admin → accès à `/admin/utilisateurs-en-attente`,
   validation du compte en attente avec un rôle.
4. Reconnexion avec le compte nouvellement validé → accès à `/dashboard`.
5. Créer un incident (`/incidents/nouveau`) → apparaît dans `/incidents` et sur
   le dashboard.
6. En tant qu'admin ou manager QHSE : ouvrir l'incident, changer son statut,
   l'assigner à un utilisateur, ajouter une action corrective, ajouter une
   photo.
7. En tant que responsable d'une action : la faire passer « En cours » puis
   « Terminée » depuis `/actions`.
8. En tant qu'admin : gérer les rôles/suspensions depuis
   `/admin/utilisateurs`.
9. Déconnexion → retour à `/login`.

## Notes techniques Modules 2-6

- **RLS** : chaque table (`incidents`, `actions_correctives`,
  `incident_photos`) a ses propres policies. Un `employe` ne voit que ses
  incidents/actions ; `manager_qhse` et `admin` voient tout.
- **Photos** : bucket privé, upload direct navigateur → Storage via URL
  signée (`createSignedUploadUrl`), affichage via URL signée temporaire
  (1h). Aucune clé de service n'est exposée côté client.
- **Actions correctives** : un trigger SQL (`protect_action_fields`)
  empêche un responsable non-QHSE de modifier autre chose que le statut de
  son action.

Remonte-moi toute erreur de compilation ou de comportement observée, je
corrige immédiatement.
