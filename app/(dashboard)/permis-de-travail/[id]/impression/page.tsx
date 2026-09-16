import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getWorkPermitById,
  listWorkPermitWorkers,
  listWorkPermitHistory,
  listWorkPermitSignatures,
  checkPermitEpiCompliance,
} from "@/lib/services/permits.service";
import { listSituationProofs } from "@/lib/services/proofs.service";
import {
  PERMIT_TYPE_LABELS,
  SafetyMeasure,
} from "@/lib/types/permits";
import {
  PERMIT_QUESTIONNAIRES,
  DEFAULT_EPI_LIST,
} from "@/lib/constants/permit-questionnaires";
import { QrCode } from "@/components/equipment/qr-code";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  Building2,
  PhoneCall,
  UserCheck,
  HardHat,
  FileCheck2,
  History,
  HelpCircle,
  Wrench,
} from "lucide-react";
import { PrintButton } from "./print-button";

export default async function WorkPermitPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const permit = await getWorkPermitById(id);

  if (!permit) {
    notFound();
  }

  const [workers, historyEvents, proofs, signatures, epiCompliance] = await Promise.all([
    listWorkPermitWorkers(id),
    listWorkPermitHistory(id),
    listSituationProofs({ workPermitId: id }),
    listWorkPermitSignatures(id),
    checkPermitEpiCompliance(id),
  ]);

  // Dynamic Base URL for QR Code (Production Configurable)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://qhse-duo.sn";
  const qrUrl = `${baseUrl}/scan/permis/${permit.id}`;

  // Duration calculation
  const startMs = new Date(permit.startTime).getTime();
  const endMs = new Date(permit.endTime).getTime();
  const durationMs = endMs > startMs ? endMs - startMs : 0;
  const durationHours = durationMs / (1000 * 60 * 60);
  const hoursInt = Math.floor(durationHours);
  const minsInt = Math.round((durationHours - hoursInt) * 60);
  const durationFormatted = `${hoursInt}h${minsInt > 0 ? ` ${minsInt}min` : ""}`;
  const maxAllowedHours = permit.templateSnapshot?.maxValidityHours || 8;
  const isDurationExcessive = durationHours > maxAllowedHours;

  // Questionnaire questions & answers from permit template snapshot (immutable historical copy)
  const questions =
    permit.templateSnapshot?.questionnaires?.[permit.permitType] ||
    PERMIT_QUESTIONNAIRES[permit.permitType] ||
    [];
  const answers = permit.questionnaireAnswers || {};

  // Resolved EPI requirements
  const rawEpi = permit.epiRequirements;
  const selectedEpiIds: string[] = Array.isArray(rawEpi)
    ? rawEpi
    : typeof rawEpi === "object" && rawEpi !== null
    ? Object.entries(rawEpi)
        .filter(([, checked]) => Boolean(checked))
        .map(([key]) => key)
    : [];

  const catalogEpiList = permit.templateSnapshot?.epiList || DEFAULT_EPI_LIST;
  const resolvedEpiList = catalogEpiList.map((epi) => ({
    ...epi,
    checked: selectedEpiIds.includes(epi.id),
  }));

  const selectedEpiItems = resolvedEpiList.filter((e) => e.checked);

  // Proofs breakdown
  const proofsAvant = proofs.filter((p) => p.stage === "avant");
  const proofsPendant = proofs.filter((p) => p.stage === "pendant");
  const proofsApres = proofs.filter((p) => p.stage === "apres");

  function renderResponsibilityBadge(responsibility?: "EE" | "EU" | "CONJOINTE") {
    if (!responsibility) return null;
    if (responsibility === "EE") {
      return <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 print:bg-slate-200 print:text-black shrink-0">Resp. EE (Sous-traitant)</span>;
    }
    if (responsibility === "EU") {
      return <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300 print:bg-slate-200 print:text-black shrink-0">Resp. EU (Entreprise)</span>;
    }
    return <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-300 print:bg-slate-200 print:text-black shrink-0">Resp. Conjointe EE/EU</span>;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 sm:p-8 print:p-0 print:bg-white print:text-black font-sans text-slate-900">
      {/* NO-PRINT TOOLBAR */}
      <div className="max-w-5xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link href={`/permis-de-travail/${permit.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour au permis
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <PrintButton />
        </div>
      </div>

      {/* OFFICIAL INDUSTRIAL A4 PRINT SHEET (FORMULAIRE 2 PAGES) */}
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* ================================================================== */}
        {/* PAGE 1 : IDENTIFICATION, NATURE, QUESTIONNAIRES & EPI */}
        {/* ================================================================== */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-md print:shadow-none print:border-none print:p-0 print:text-black print:bg-white space-y-5 print:break-after-page">
          
          {/* EN-TÊTE INDUSTRIEL & BRANDING */}
          <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-3">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-8 w-8 text-emerald-600 print:text-black shrink-0" />
                  <div>
                    <span className="text-xl font-extrabold tracking-tight uppercase block">QHSE DUO SÉNÉGAL</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                      Référentiel : {permit.templateSnapshot?.templateName || "QHSE Duo Standard"} ({permit.templateSnapshot?.versionLabel || "v1.0"})
                    </span>
                  </div>
                </div>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-900 dark:text-white print:text-black mt-1">
                  PERMIS DE TRAVAIL & AUTORISATION D&apos;INTERVENTION
                </h1>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <div className="text-right">
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">NUMÉRO OFFICIEL PTW</span>
                  <span className="font-mono text-base font-black bg-slate-100 dark:bg-slate-800 print:bg-slate-100 text-slate-900 dark:text-white px-3 py-1 rounded border border-slate-300 block">
                    {permit.reference}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">DÉCISION :</span>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-black uppercase border ${
                    permit.decision === "AUTORISE" || permit.status === "approuve" || permit.status === "en_cours" || permit.status === "cloture"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 print:bg-slate-100 print:text-black"
                      : permit.decision === "NON_AUTORISE" || permit.status === "refuse"
                      ? "bg-red-100 text-red-800 border-red-300 print:bg-slate-100 print:text-black"
                      : "bg-amber-100 text-amber-900 border-amber-300 print:bg-slate-100 print:text-black"
                  }`}>
                    {permit.decision === "AUTORISE" || permit.status === "approuve" || permit.status === "en_cours" || permit.status === "cloture"
                      ? "🟢 AUTORISÉ"
                      : permit.decision === "NON_AUTORISE" || permit.status === "refuse"
                      ? "🔴 NON AUTORISÉ"
                      : "🟡 EN ATTENTE"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ALERTE DURAION DÉPASSÉE */}
          {isDurationExcessive && (
            <div className="rounded-lg border-2 border-red-600 bg-red-50 p-3 flex items-center gap-3 text-red-900 print:bg-slate-100 print:border-black print:text-black">
              <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 print:text-black" />
              <div className="text-xs">
                <span className="font-bold block uppercase text-red-700 print:text-black">
                  ⚠️ DÉPASSEMENT DE LA DURÉE MAXIMALE DE VALIDITÉ
                </span>
                <span>
                  La durée demandée ({durationFormatted}) excède le seuil maximal configuré pour ce modèle ({maxAllowedHours} heures).
                </span>
              </div>
            </div>
          )}

          {/* 1. IDENTIFICATION GÉNÉRALE & PLANIFICATION */}
          <div className="border border-slate-300 dark:border-slate-800 rounded-lg p-3.5 space-y-2.5 bg-slate-50/50 dark:bg-slate-900/40 print:bg-white">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-emerald-600 print:text-black" />
              1. Identification Générales & Planification Chantier
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              <div className="md:col-span-2">
                <span className="font-bold text-slate-500 uppercase block text-[9px]">Titre / Objet des travaux</span>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white block mt-0.5">{permit.title}</span>
              </div>

              <div>
                <span className="font-bold text-slate-500 uppercase block text-[9px]">Nature / Catégorie du Permis</span>
                <span className="font-black text-xs text-emerald-700 dark:text-emerald-400 print:text-black block mt-0.5 uppercase">
                  {PERMIT_TYPE_LABELS[permit.permitType]}
                </span>
              </div>

              <div className="md:col-span-3">
                <span className="font-bold text-slate-500 uppercase block text-[9px]">Description Détaillée des Opérations</span>
                <p className="text-slate-700 dark:text-slate-300 block mt-0.5 leading-relaxed bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 print:border-slate-300">
                  {permit.description || "Aucune description complémentaire renseignée."}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-500 uppercase block text-[9px]">Lieu / Zone Précise</span>
                <span className="font-semibold block mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  {permit.location || "Non renseigné"}
                </span>
              </div>

              <div>
                <span className="font-bold text-slate-500 uppercase block text-[9px]">Site QHSE</span>
                <span className="font-semibold block mt-0.5">{permit.siteName || "Site Principal"}</span>
              </div>

              <div>
                <span className="font-bold text-slate-500 uppercase block text-[9px]">Équipements / Machines Rattachées</span>
                <span className="font-semibold block mt-0.5 flex items-center gap-1">
                  <Wrench className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  {permit.equipmentName
                    ? `⚙️ ${permit.equipmentName}`
                    : permit.equipmentIds && permit.equipmentIds.length > 0
                    ? `⚙️ ${permit.equipmentIds.length} équipement(s) lié(s)`
                    : "Aucun équipement spécifique"}
                </span>
              </div>

              <div>
                <span className="font-bold text-slate-500 uppercase block text-[9px]">Entreprise Extérieure (EE) / Prestataire</span>
                <span className="font-semibold block mt-0.5 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  {permit.contractorCompany ? `${permit.contractorCompany}` : "Personnel Interne (Régie)"}
                </span>
              </div>

              <div>
                <span className="font-bold text-slate-500 uppercase block text-[9px]">Contact Urgence EE</span>
                <span className="font-semibold block mt-0.5 flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  {permit.contractorContactName || "—"}
                </span>
              </div>

              <div>
                <span className="font-bold text-slate-500 uppercase block text-[9px]">Téléphone Urgence EE</span>
                <span className="font-semibold block mt-0.5 flex items-center gap-1">
                  <PhoneCall className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  {permit.contractorContactPhone || "—"}
                </span>
              </div>

              <div>
                <span className="font-bold text-slate-500 uppercase block text-[9px]">Demandeur / Responsable Travaux</span>
                <span className="font-bold block mt-0.5 text-slate-900 dark:text-white">{permit.applicantName}</span>
              </div>

              <div>
                <span className="font-bold text-slate-500 uppercase block text-[9px]">Début d&apos;Autorisation</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white block mt-0.5">
                  {new Date(permit.startTime).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>

              <div>
                <span className="font-bold text-slate-500 uppercase block text-[9px]">Fin & Durée Autorisée</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white block mt-0.5">
                  {new Date(permit.endTime).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })} ({durationFormatted})
                </span>
              </div>
            </div>
          </div>

          {/* 2. QUESTIONNAIRE SPÉCIFIQUE & ANALYSE DE RISQUES */}
          {questions.length > 0 && (
            <div className="border border-slate-300 dark:border-slate-800 rounded-lg p-3.5 space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-emerald-600 print:text-black" />
                2. Questionnaire Spécifique & Conditions Critiques ({PERMIT_TYPE_LABELS[permit.permitType]})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {questions.map((q) => {
                  const ans = answers[q.id];
                  const isAnswered = ans !== undefined && ans !== null && String(ans).trim() !== "";
                  const isBlocking = q.blockingValue && isAnswered && String(ans).toLowerCase() === q.blockingValue.toLowerCase();

                  return (
                    <div
                      key={q.id}
                      className={`p-2 rounded border text-xs flex flex-col justify-between gap-1 ${
                        isBlocking
                          ? "border-red-500 bg-red-50 text-red-950 print:bg-slate-100 print:border-black print:text-black font-bold"
                          : isAnswered
                          ? "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 print:bg-white"
                          : "border-amber-300 bg-amber-50/30 dark:bg-amber-950/10 text-amber-900 print:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-slate-800 dark:text-slate-200 leading-snug">{q.label}</span>
                        {q.critical && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-300 uppercase shrink-0 print:bg-slate-200 print:text-black">
                            CRITIQUE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-[10px]">
                        <span className="text-slate-400 uppercase text-[9px]">Réponse :</span>
                        {isAnswered ? (
                          <span className={`font-extrabold uppercase ${isBlocking ? "text-red-700 print:text-black" : "text-emerald-700 dark:text-emerald-400 print:text-black"}`}>
                            {String(ans)} {q.unit || ""}
                          </span>
                        ) : (
                          <span className="italic text-slate-400 text-[9px]">Non renseigné</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. EPI REQUIS & EXIGENCES SÉCURITÉ */}
          <div className="border border-slate-300 dark:border-slate-800 rounded-lg p-3.5 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <HardHat className="h-4 w-4 text-emerald-600 print:text-black" />
                3. Équipements de Protection Individuelle (EPI) Obligatoires
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                epiCompliance.isCompliant ? "bg-emerald-100 text-emerald-800 border-emerald-300 print:bg-slate-100 print:text-black" : "bg-red-100 text-red-800 border-red-300 print:bg-slate-100 print:text-black"
              }`}>
                {epiCompliance.hasEpiRequirements ? (epiCompliance.isCompliant ? "🟢 CONFORME" : "🔴 NON CONFORME") : "⚪ EPI STANDARDS"}
              </span>
            </h2>

            {selectedEpiItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {selectedEpiItems.map((epi) => (
                  <div key={epi.id} className="p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 print:bg-white flex items-center gap-1.5">
                    <span className="font-black text-emerald-700 print:text-black">[X]</span>
                    <span className="font-semibold text-[10px] text-slate-800 dark:text-slate-200">{epi.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2 border rounded bg-slate-50 text-slate-600 text-[11px] italic">
                EPI généraux de chantier applicables : Casque, Chaussures de Sécurité S3, Gilet Haute Visibilité.
              </div>
            )}
          </div>

          {/* FOOTER BAS DE PAGE 1 */}
          <div className="border-t border-slate-400 pt-2 flex items-center justify-between text-[9px] text-slate-500 print:text-black font-mono">
            <span>DOCUMENT SÉCURISÉ QHSE DUO SÉNÉGAL — REF: {permit.reference}</span>
            <span>PAGE 1 SUR 2</span>
          </div>

        </div>

        {/* ================================================================== */}
        {/* PAGE 2 : MESURES AVANT/PENDANT/APRÈS, ÉMARGEMENT, SIGNATURES & QR */}
        {/* ================================================================== */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-md print:shadow-none print:border-none print:p-0 print:text-black print:bg-white space-y-5">
          
          {/* 4. MESURES DE PRÉVENTION AVANT / PENDANT / APRÈS (AVEC EE/EU) */}
          <div className="border border-slate-300 dark:border-slate-800 rounded-lg p-3.5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 print:text-black" />
              4. Programme des Mesures de Sécurité & Responsabilités (EE / EU)
            </h2>

            {/* AVANT TRAVAUX */}
            <div className="space-y-1.5">
              <span className="font-extrabold text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400 print:text-black block">
                🔴 Phase 1 : Mesures Préalables Obligatoires (AVANT Travaux)
              </span>
              {permit.beforeMeasures && permit.beforeMeasures.length > 0 ? (
                <div className="border border-slate-200 dark:border-slate-800 rounded divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">
                  {permit.beforeMeasures.map((m: SafetyMeasure, idx: number) => (
                    <div key={m.id || idx} className="p-1.5 flex items-center justify-between gap-2 bg-white dark:bg-slate-900 print:bg-white">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-400 w-4">{idx + 1}.</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{m.label}</span>
                        {renderResponsibilityBadge(m.responsibility)}
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        m.checked
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 print:bg-slate-100 print:text-black"
                          : "bg-amber-50 text-amber-800 border-amber-300 print:text-black"
                      }`}>
                        {m.checked ? "🟢 CONFORME" : "⚪ À VÉRIFIER"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] italic text-slate-400 border p-1.5 rounded">Aucune mesure préalable spécifiée.</p>
              )}
            </div>

            {/* PENDANT TRAVAUX */}
            <div className="space-y-1.5">
              <span className="font-extrabold text-[10px] uppercase tracking-wider text-blue-700 dark:text-blue-400 print:text-black block">
                🔵 Phase 2 : Surveillance & Contrôles Continues (PENDANT Travaux)
              </span>
              {permit.duringMeasures && permit.duringMeasures.length > 0 ? (
                <div className="border border-slate-200 dark:border-slate-800 rounded divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">
                  {permit.duringMeasures.map((m: SafetyMeasure, idx: number) => (
                    <div key={m.id || idx} className="p-1.5 flex items-center justify-between gap-2 bg-white dark:bg-slate-900 print:bg-white">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-400 w-4">{idx + 1}.</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{m.label}</span>
                        {renderResponsibilityBadge(m.responsibility)}
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        m.checked
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 print:bg-slate-100 print:text-black"
                          : "bg-amber-50 text-amber-800 border-amber-300 print:text-black"
                      }`}>
                        {m.checked ? "🟢 MAINTENU" : "⚪ À MAINTENIR"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] italic text-slate-400 border p-1.5 rounded">Aucune mesure continue spécifiée.</p>
              )}
            </div>

            {/* APRÈS TRAVAUX */}
            <div className="space-y-1.5">
              <span className="font-extrabold text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 print:text-black block">
                🟢 Phase 3 : Clôture & Déconsignation (APRÈS Travaux)
              </span>
              {permit.afterMeasures && permit.afterMeasures.length > 0 ? (
                <div className="border border-slate-200 dark:border-slate-800 rounded divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">
                  {permit.afterMeasures.map((m: SafetyMeasure, idx: number) => (
                    <div key={m.id || idx} className="p-1.5 flex items-center justify-between gap-2 bg-white dark:bg-slate-900 print:bg-white">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-400 w-4">{idx + 1}.</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{m.label}</span>
                        {renderResponsibilityBadge(m.responsibility)}
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        m.checked
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 print:bg-slate-100 print:text-black"
                          : "bg-amber-50 text-amber-800 border-amber-300 print:text-black"
                      }`}>
                        {m.checked ? "🟢 CONFORME" : "⚪ À INSPECTER"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] italic text-slate-400 border p-1.5 rounded">Aucune mesure de clôture spécifiée.</p>
              )}
            </div>
          </div>

          {/* 5. REGISTRE DES INTERVENANTS & ÉMARGEMENT */}
          <div className="border border-slate-300 dark:border-slate-800 rounded-lg p-3.5 space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center justify-between">
              <span>5. Intervenants Autorisés ({workers.length}) & Accusés Individuels d&apos;Émargement</span>
              <span className="text-[9px] font-normal text-slate-500">Prise de connaissance obligatoire</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-slate-300 dark:border-slate-800">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 text-slate-700 uppercase text-[9px]">
                    <th className="p-1.5 border border-slate-300 w-6">N°</th>
                    <th className="p-1.5 border border-slate-300">Nom & Prénom</th>
                    <th className="p-1.5 border border-slate-300">Qualification / Rôle</th>
                    <th className="p-1.5 border border-slate-300 text-center w-36">Statut Émargement</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((w, idx) => (
                    <tr key={w.id} className="bg-white dark:bg-slate-900 text-[11px]">
                      <td className="p-1.5 border border-slate-300 font-mono text-center text-[10px]">{idx + 1}</td>
                      <td className="p-1.5 border border-slate-300 font-bold">{w.workerName}</td>
                      <td className="p-1.5 border border-slate-300 text-slate-600">{w.roleOrQualification || "Intervenant Autorisé"}</td>
                      <td className="p-1.5 border border-slate-300 text-center font-mono text-[9px]">
                        {w.acknowledgementStatus === "acknowledged" ? (
                          <span className="text-emerald-700 font-bold">🟢 ACCUSÉ {w.acknowledgedAt ? `(${new Date(w.acknowledgedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })})` : ""}</span>
                        ) : w.acknowledgementStatus === "refused" ? (
                          <span className="text-red-600 font-bold">🔴 REFUSÉ</span>
                        ) : (
                          <span className="text-slate-400">[ Signature papier ]</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {workers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-2 border text-center italic text-slate-400 text-[10px]">
                        Aucun intervenant pré-enregistré dans la liste digitale.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. DÉCISION AUTORISÉ / NON AUTORISÉ ET MOTIF */}
          <div className="border-2 border-slate-900 dark:border-slate-100 rounded-lg p-3.5 space-y-2.5 bg-slate-50 dark:bg-slate-900/60 print:bg-white">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-300 pb-1">
              6. Décision Officielle d&apos;Autorisation d&apos;Intervention
            </h2>

            <div className="grid grid-cols-2 gap-4 text-xs font-bold text-center">
              <div className={`p-2 rounded border-2 uppercase ${
                permit.decision === "AUTORISE" || permit.status === "approuve" || permit.status === "en_cours" || permit.status === "cloture"
                  ? "border-emerald-600 bg-emerald-100 text-emerald-900 print:bg-slate-200 print:text-black font-extrabold"
                  : "border-slate-300 text-slate-400"
              }`}>
                {permit.decision === "AUTORISE" || permit.status === "approuve" || permit.status === "en_cours" || permit.status === "cloture" ? "[X] AUTORISÉ" : "[  ] AUTORISÉ"}
              </div>

              <div className={`p-2 rounded border-2 uppercase ${
                permit.decision === "NON_AUTORISE" || permit.status === "refuse"
                  ? "border-red-600 bg-red-100 text-red-900 print:bg-slate-200 print:text-black font-extrabold"
                  : "border-slate-300 text-slate-400"
              }`}>
                {permit.decision === "NON_AUTORISE" || permit.status === "refuse" ? "[X] NON AUTORISÉ" : "[  ] NON AUTORISÉ"}
              </div>
            </div>

            {permit.rejectionReason && (
              <div className="p-2.5 rounded border border-red-300 bg-red-50 text-red-900 text-xs">
                <span className="font-bold uppercase text-[10px] block text-red-700">MOTIF OBLIGATOIRE DU REFUS :</span>
                <p className="mt-0.5">{permit.rejectionReason}</p>
              </div>
            )}
          </div>

          {/* 7. CHAÎNE DE VALIDATION ET SIGNATURES */}
          <div className="border border-slate-300 dark:border-slate-800 rounded-lg p-3.5 space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1">
              7. Chaîne d&apos;Approbation & Visas Réglementaires
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              {signatures.length > 0 ? (
                signatures.map((sig, idx) => (
                  <div key={sig.id} className="border border-slate-300 rounded p-2.5 bg-white dark:bg-slate-900 flex flex-col justify-between h-32">
                    <div>
                      <span className="font-extrabold uppercase text-[9px] text-slate-500 block truncate">
                        {idx + 1}. {sig.signerRoleLabel || sig.roleCode}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white block mt-0.5 text-[11px] truncate">
                        {sig.signerName || "En attente"}
                      </span>
                    </div>
                    <div className="border-t border-dashed border-slate-300 pt-1 text-center font-mono text-[9px]">
                      {sig.status === "signed" ? (
                        <span className="font-bold text-emerald-700 print:text-black uppercase">✓ Signé ({sig.signedAt ? new Date(sig.signedAt).toLocaleDateString("fr-FR") : ""})</span>
                      ) : sig.status === "refused" ? (
                        <span className="font-bold text-red-600 uppercase">✗ Refusé</span>
                      ) : (
                        <span className="text-slate-400">[ Visa Terrain ]</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="border border-slate-300 rounded p-2.5 bg-white flex flex-col justify-between h-32">
                    <span className="font-extrabold uppercase text-[9px] text-slate-500 block">1. Demandeur</span>
                    <span className="font-bold text-slate-900 block text-[11px]">{permit.applicantName}</span>
                    <div className="border-t border-dashed border-slate-300 pt-1 text-center font-mono text-[9px] text-slate-400">[ Transmis ]</div>
                  </div>
                  <div className="border border-slate-300 rounded p-2.5 bg-white flex flex-col justify-between h-32">
                    <span className="font-extrabold uppercase text-[9px] text-slate-500 block">2. Conseiller Prévention</span>
                    <span className="font-bold text-slate-900 block text-[11px]">{permit.approverName || "En attente"}</span>
                    <div className="border-t border-dashed border-slate-300 pt-1 text-center font-mono text-[9px] text-slate-400">[ Visa HSE ]</div>
                  </div>
                  <div className="border border-slate-300 rounded p-2.5 bg-white flex flex-col justify-between h-32">
                    <span className="font-extrabold uppercase text-[9px] text-slate-500 block">3. Resp. Lieu de Travail</span>
                    <span className="font-bold text-slate-900 block text-[11px]">Responsable Zone</span>
                    <div className="border-t border-dashed border-slate-300 pt-1 text-center font-mono text-[9px] text-slate-400">[ Visa Zone ]</div>
                  </div>
                  <div className="border border-slate-300 rounded p-2.5 bg-white flex flex-col justify-between h-32">
                    <span className="font-extrabold uppercase text-[9px] text-slate-500 block">4. Signataire Complémentaire</span>
                    <span className="font-bold text-slate-900 block text-[11px]">Approbateur Final</span>
                    <div className="border-t border-dashed border-slate-300 pt-1 text-center font-mono text-[9px] text-slate-400">[ Visa Final ]</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 8. HISTORIQUE ESSENTIEL, PREUVES & QR CODE LOCAL */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* HISTORIQUE ESSENTIEL */}
            <div className="md:col-span-2 border border-slate-300 dark:border-slate-800 rounded-lg p-3 space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b pb-1 flex items-center gap-1.5">
                <History className="h-4 w-4 text-emerald-600 print:text-black" />
                8. Historique Majeur & Traçabilité ({historyEvents.length} évts)
              </h2>
              <div className="space-y-1 text-[10px]">
                {historyEvents.slice(0, 4).map((h) => (
                  <div key={h.id} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                    <span className="font-mono text-slate-400">
                      {new Date(h.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                    <span className="font-bold uppercase text-[9px]">{h.eventType}</span>
                    <span className="text-slate-600 truncate max-w-[200px]">{h.comment || "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* QR CODE MOBILE LOCAL */}
            <div className="border border-slate-300 rounded-lg p-2.5 bg-white flex flex-col items-center justify-center text-center">
              <QrCode value={qrUrl} size={100} />
              <span className="text-[9px] font-mono text-slate-700 font-bold mt-1">
                {permit.reference}
              </span>
              <span className="text-[8px] text-slate-500">
                Scan de contrôle & authenticité du permis
              </span>
            </div>
          </div>

          {/* FOOTER BAS DE PAGE 2 */}
          <div className="border-t border-slate-400 pt-2 flex items-center justify-between text-[9px] text-slate-500 print:text-black font-mono">
            <span>DOCUMENT SÉCURISÉ QHSE DUO SÉNÉGAL — REF: {permit.reference}</span>
            <span>PAGE 2 SUR 2 — FIN DU DOCUMENT</span>
          </div>

        </div>

      </div>
    </div>
  );
}
