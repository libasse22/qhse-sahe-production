import type { WorkPermitType, QuestionnaireQuestion, SafetyMeasure } from "@/lib/types/permits";

export const PERMIT_QUESTIONNAIRES: Record<WorkPermitType, QuestionnaireQuestion[]> = {
  hauteur: [
    { id: "h_methode", label: "Méthode de travail connue et maîtrisée par tous les intervenants", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "h_hauteur_cat", label: "Hauteur de travail", type: "select", options: ["< 10 m", "10-19 m", "> 20 m"] },
    { id: "h_hauteur_exacte", label: "Hauteur exacte estimée", type: "number", unit: "m" },
    { id: "h_protection_chute", label: "Protection contre les chutes prévue et installée", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "h_equipement_mobile", label: "Utilisation d'un équipement mobile de levage de personnes", type: "yes_no" },
    { id: "h_nacelle", label: "Nacelle (PEMP) vérifiée", type: "yes_no" },
    { id: "h_plateforme", label: "Plateforme individuelle roulante (PIR) conforme", type: "yes_no" },
    { id: "h_echafaudage", label: "Échafaudage réceptionné et conforme (fiche verte)", type: "compliance", critical: true, blockingValue: "non_conforme" },
    { id: "h_echelle", label: "Utilisation d'échelle / escabeau (uniquement pour accès)", type: "yes_no" },
    { id: "h_operator_qual", label: "Opérateurs qualifiés et habilités (CACES / Formation Hauteur)", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "h_ancrage", label: "Point d'ancrage certifié (12 kN minimum)", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "h_harnais", label: "Harnais anti-chute avec absorbeur d'énergie", type: "yes_no", critical: true },
    { id: "h_longe", label: "Double longe avec connecteurs grands ouvertures", type: "yes_no", critical: true },
    { id: "h_inspection_before", label: "Inspection visuelle des équipements (EPI) avant utilisation", type: "compliance", critical: true, blockingValue: "non_conforme" },
    { id: "h_briefing", label: "Prise de connaissance et signature des consignes de sécurité", type: "yes_no", critical: true, blockingValue: "non" },
  ],

  point_chaud: [
    { id: "pc_permis_feu", label: "Permis de Feu spécifique exigé et complété", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "pc_sources_inflammation", label: "Sources d'inflammation identifiées (soudure, meulage, découpe)", type: "yes_no", critical: true },
    { id: "pc_combustibles_eloignes", label: "Matériaux combustibles éloignés à 10 m ou protégés par bâches ignifugées", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "pc_test_gaz", label: "Test gaz / Détection d'atmosphère explosive réalisé", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "pc_mesure_lie", label: "Mesure LIE (%)", type: "number", unit: "% LIE" },
    { id: "pc_mesure_o2", label: "Mesure Oxygène O2 (%)", type: "number", unit: "% O2" },
    { id: "pc_ventilation", label: "Ventilation suffisante de la zone", type: "yes_no" },
    { id: "pc_extincteurs", label: "Extincteurs appropriés (Poudre/CO2) immédiatement disponibles à proximité", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "pc_fire_watch", label: "Vigile / Guetteur incendie dédié (Fire Watch) présent", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "pc_surveillance_pendant", label: "Surveillance continue pendant l'exécution des travaux", type: "yes_no", critical: true },
    { id: "pc_surveillance_apres", label: "Surveillance planifiée 30 à 60 min après arrêt des travaux", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "pc_inhibition_detection", label: "Inhibition temporaire de la détection incendie de zone validée", type: "yes_no" },
  ],

  espace_confine: [
    { id: "ec_espace_id", label: "Espace confiné formellement identifié et balisé", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "ec_autorisation_entree", label: "Autorisation préalable d'entrée signée", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "ec_analyse_atmo", label: "Analyse atmosphérique préalable obligatoire", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "ec_valeur_o2", label: "Teneur en Oxygène (O2) [Objectif: 19.5% - 22%]", type: "number", unit: "%" },
    { id: "ec_valeur_lie", label: "Teneur Gaz Inflammables (LIE) [Max: 0%]", type: "number", unit: "% LIE" },
    { id: "ec_valeur_toxiques", label: "Mesures Gaz Toxiques (H2S, CO ppm)", type: "text" },
    { id: "ec_ventilation_forcee", label: "Ventilation mécanique forcée en service", type: "yes_no", critical: true },
    { id: "ec_consignation_purge", label: "Consignation / Isolement / Purge des conduites et énergies", type: "compliance", critical: true, blockingValue: "non_conforme" },
    { id: "ec_surveillant_exterieur", label: "Surveillant d'accès permanent désigné à l'extérieur", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "ec_entrants_id", label: "Registre des entrants tenus à jour à l'extérieur", type: "yes_no" },
    { id: "ec_moyens_secours", label: "Équipement de secours (Tripode, Treuil d'extraction, ARI) prêt", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "ec_plan_sauvetage", label: "Plan de sauvetage et d'évacuation d'urgence testé", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "ec_controle_continu", label: "Détecteur 4-gaz portable porté en continu par les entrants", type: "yes_no", critical: true, blockingValue: "non" },
  ],

  electrique: [
    { id: "el_installation_id", label: "Installation électrique & Sources d'énergie identifiées", type: "yes_no", critical: true },
    { id: "el_consignation", label: "Consignation électrique (Séparation, Condamnation, VAT)", type: "compliance", critical: true, blockingValue: "non_conforme" },
    { id: "el_loto", label: "Cadenassage & Étiquetage LOTO posés avec clés uniques", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "el_vat", label: "Vérification d'Absence de Tension (VAT) réalisée avec appareil contrôlé", type: "compliance", critical: true, blockingValue: "non_conforme" },
    { id: "el_mises_a_la_terre", label: "Mise à la terre et en court-circuit (MALT/CC) posée si nécessaire", type: "yes_no" },
    { id: "el_personne_habilitee", label: "Intervenants titulaires du titre d'habilitation électrique requis (BR/BC/B2V)", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "el_epi_electrique", label: "EPI isolants (Gants 1000V, Écran Facial anti-arc, Tapis isolant)", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "el_remise_service", label: "Procédure de déconsignation et remise sous tension contrôlée", type: "yes_no", critical: true },
  ],

  consignation_loto: [
    { id: "loto_sources_energies", label: "Toutes les énergies identifiées (Électrique, Mécanique, Hydraulique, Pneumatique)", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "loto_condamnation", label: "Pose des cadenas personnels LOTO et étiquettes d'avertissement", type: "compliance", critical: true, blockingValue: "non_conforme" },
    { id: "loto_dissipation", label: "Purge / Purge de pression / Dissipation des énergies résiduelles", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "loto_test_zero", label: "Test d'état zéro d'énergie (Essai de redémarrage)", type: "compliance", critical: true, blockingValue: "non_conforme" },
  ],

  excavation: [
    { id: "ex_reseaux_identifies", label: "Réseaux enterrés (électricité, gaz, eau) localisés sur plans (DICT)", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "ex_profondeur", label: "Profondeur maximale prévue", type: "number", unit: "m" },
    { id: "ex_stabilite_terrain", label: "Stabilité des terres évaluée / Risque d'éboulement", type: "compliance", critical: true, blockingValue: "non_conforme" },
    { id: "ex_blindage_talutage", label: "Blindage ou talutage des parois obligatoire si profondeur > 1.30 m", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "ex_acces_balisage", label: "Échelles d'accès/sortie et balisage rigide du contour", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "ex_engins", label: "Distance de sécurité minimale pour la circulation des engins lourd (2m)", type: "yes_no", critical: true },
  ],

  get fouille() {
    return this.excavation;
  },

  levage: [
    { id: "lev_charge_poids", label: "Poids de la charge et centre de gravité connus", type: "number", unit: "kg" },
    { id: "lev_appareil_conforme", label: "Grue / Appareil de levage contrôlé (VGP à jour)", type: "compliance", critical: true, blockingValue: "non_conforme" },
    { id: "lev_accessoires", label: "Élingues, crochets et manilles inspectés et en bon état", type: "compliance", critical: true, blockingValue: "non_conforme" },
    { id: "lev_operateurs", label: "Grutier qualifié CACES & Élingueur / Signaleur désigné", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "lev_zone_balisee", label: "Périmètre de survol de la charge rigoureusement balisé", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "lev_survol_interdit", label: "Interdiction absolue de survol des personnes", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "lev_meteo", label: "Vitesse du vent compatible avec l'abaque de levage (< 50 km/h)", type: "yes_no", critical: true, blockingValue: "non" },
  ],

  toiture: [
    { id: "toit_acces_securise", label: "Moyen d'accès à la toiture sécurisé et fixé", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "toit_resistance", label: "Résistance de la couverture / plaques vérifiée (risque de rupture)", type: "compliance", critical: true, blockingValue: "non_conforme" },
    { id: "toit_ligne_vie", label: "Ligne de vie ou ancrages fixes opérationnels sur toiture", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "toit_zones_fragiles", label: "Plaques translucides / Skydomes balisés et protégés par platelage", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "toit_chute_objets", label: "Balisage et arrêt de charge en bas de toiture", type: "yes_no" },
  ],

  tuyauterie: [
    { id: "tuy_ligne_id", label: "Identification fluide, pression et température du fluide", type: "text" },
    { id: "tuy_vidange_purge", label: "Vidange, purge et dépressurisation totale de la tronçon", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "tuy_isolement_loto", label: "Mise en place de joints pleins (platines) ou vannes bloquées", type: "compliance", critical: true, blockingValue: "non_conforme" },
    { id: "tuy_test_pression_zero", label: "Vérification visuelle du manomètre à 0 bar", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "tuy_risque_chimique", label: "Protection contre les projections résiduelles d'acides/solvants", type: "yes_no", critical: true },
  ],

  maconnerie: [
    { id: "mac_structure_stabile", label: "Évaluation de la stabilité des structures avant démolition/maçonnerie", type: "compliance", critical: true, blockingValue: "non_conforme" },
    { id: "mac_etaiement", label: "Étaiement et soutènement provisoire installés et calculés", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "mac_chute_objets", label: "Filet anti-chute de gravois et casquette de protection posés", type: "yes_no" },
  ],

  chimique: [
    { id: "chim_fds", label: "Fiche de Données de Sécurité (FDS) disponible et lue par les équipes", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "chim_epi_specifique", label: "Combinaison étanche, gants chimiques et masque respiratoire ABEK", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "chim_douche_rince_oeil", label: "Douche de sécurité & rince-œil testés et opérationnels à proximité", type: "yes_no", critical: true, blockingValue: "non" },
  ],

  autre: [
    { id: "aut_analyse_specifique", label: "Analyse Spécifique des Risques (APR/JSA) réalisée", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "aut_consignes", label: "Consignes de sécurité spécifiques communiquées", type: "yes_no", critical: true, blockingValue: "non" },
    { id: "aut_materiel_conforme", label: "Outillage et matériels spécifiques inspectés et conformes", type: "compliance", critical: true },
  ],
};

export const STANDARD_BEFORE_MEASURES: SafetyMeasure[] = [
  { id: "b_auth", label: "Permis de travail formellement approuvé et signé", checked: false, critical: true },
  { id: "b_loto", label: "Consignation / Isolement des énergies effectué", checked: false, critical: true },
  { id: "b_apr", label: "Analyse préliminaire des risques (APR) communiquée aux intervenants", checked: false, critical: true },
  { id: "b_balisage", label: "Zone d'intervention balisée et signalisée", checked: false },
  { id: "b_epi", label: "EPI obligatoires et spécifiques contrôlés et revêtus", checked: false, critical: true },
  { id: "b_briefing", label: "Briefing sécurité (Toolbox talk / Quart d'heure sécurité) réalisé", checked: false },
  { id: "b_urgences", label: "Moyens de communication et d'urgence (extincteur, alarme) identifiés", checked: false, critical: true },
];

export const STANDARD_DURING_MEASURES: SafetyMeasure[] = [
  { id: "d_energies", label: "Contrôle continu du maintien du verrouillage des énergies", checked: false, critical: true },
  { id: "d_surveillance", label: "Surveillance visuelle de la zone d'intervention", checked: false },
  { id: "d_gas", label: "Contrôle atmosphérique continu (si espace confiné ou point chaud)", checked: false, critical: true },
  { id: "d_balisage", label: "Vérification du maintien du balisage de sécurité", checked: false },
  { id: "d_permis_affichage", label: "Affichage visible du permis sur le lieu de travail", checked: false },
];

export const STANDARD_AFTER_MEASURES: SafetyMeasure[] = [
  { id: "a_nettoyage", label: "Nettoyage et rangement complet du chantier", checked: false },
  { id: "a_dechets", label: "Évacuation réglementaire des déchets et emballages", checked: false },
  { id: "a_outils", label: "Inventaire et retrait de tous les outils et matériels", checked: false },
  { id: "a_loto_removal", label: "Déconsignation / Retrait des cadenas LOTO et inhibitions selon procédure", checked: false, critical: true },
  { id: "a_inspection_finale", label: "Inspection finale de la zone avec le responsable de secteur", checked: false, critical: true },
  { id: "a_remise_service", label: "Autorisation de remise en service sous tension / en production", checked: false, critical: true },
];

export const DEFAULT_EPI_LIST = [
  { id: "casque", label: "Casque de chantier jugulaire (EN 397)" },
  { id: "chaussures", label: "Chaussures de sécurité S3 (EN ISO 20345)" },
  { id: "vetements", label: "Vêtements de travail haute visibilité (EN 471)" },
  { id: "lunettes", label: "Lunettes de protection (EN 166)" },
  { id: "ecran_facial", label: "Écran facial anti-projections / Arc électrique" },
  { id: "bruit", label: "Protections auditives (Bouchons / Casque anti-bruit)" },
  { id: "gants_manutention", label: "Gants de manutention mécanique" },
  { id: "gants_isolants", label: "Gants isolants électriques (IEC 60903)" },
  { id: "gants_chimiques", label: "Gants de protection chimique" },
  { id: "harnais", label: "Harnais de sécurité anti-chute (EN 361)" },
  { id: "double_longe", label: "Double longe avec absorbeur d'énergie (EN 355)" },
  { id: "masque_fpp3", label: "Masque respiratoire FFP3 / Anti-poussières" },
  { id: "masque_gaz", label: "Masque avec cartouches ABEK1P3" },
  { id: "ari", label: "Appareil Respiratoire Isolant (ARI)" },
  { id: "atex_comm", label: "Moyens de communication certifiés ATEX" },
];
