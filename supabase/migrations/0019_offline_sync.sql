-- ============================================================================
-- Migration 0019 : Support du mode hors-ligne (identifiants d'idempotence)
-- QHSE Duo Sénégal
-- ============================================================================
-- Un ouvrier peut déclarer un incident sans réseau : la donnée est mise en
-- file d'attente localement (IndexedDB) puis envoyée dès que la connexion
-- revient. client_generated_id est généré côté appareil AVANT tout envoi et
-- permet de reconnaître un renvoi (retry après coupure) sans créer de
-- doublon, y compris si le premier envoi avait en réalité réussi côté
-- serveur mais que l'accusé de réception n'était jamais arrivé jusqu'à
-- l'appareil.

alter table public.incidents add column client_generated_id uuid unique;
alter table public.incident_photos add column client_generated_id uuid unique;
alter table public.incident_voice_notes add column client_generated_id uuid unique;

create index incidents_client_generated_id_idx on public.incidents (client_generated_id);
