-- ============================================================================
-- Migration 0022 : correction des profils sans role_id
-- QHSE Duo Sénégal
-- ============================================================================
-- La migration 0017 rattachait les profils existants à leur rôle système au
-- moment où elle s'exécutait. Tout profil créé (ou corrigé manuellement,
-- cf. requête de secours donnée en tout début de projet) après coup, ou
-- passé entre les mailles, s'est retrouvé avec role_id = null : le système
-- de permissions le traite alors comme n'ayant AUCUN droit, ce qui masque
-- des pages comme /parametres ou /admin/roles même pour un admin.
--
-- Cette migration est idempotente et sûre à réexécuter : elle ne touche
-- que les profils dont role_id est encore vide.

update public.profiles p
set role_id = r.id
from public.roles r
where p.role_id is null
  and r.is_system
  and (
    (p.role = 'admin' and r.name = 'Administrateur')
    or (p.role = 'manager_qhse' and r.name = 'Manager QHSE')
    or (p.role = 'employe' and r.name = 'Ouvrier')
  );
