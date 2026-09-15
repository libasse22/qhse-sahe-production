import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getWorkPermitById,
  listWorkPermitWorkers,
  listWorkPermitHistory,
} from "@/lib/services/permits.service";
import { listSituationProofs } from "@/lib/services/proofs.service";
import {
  PERMIT_TYPE_LABELS,
  PERMIT_STATUS_LABELS,
  WorkPermitStatus,
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
  Clock,
  MapPin,
  Building2,
  HardHat,
  LifeBuoy,
  FileCheck2,
  History,
  Camera,
  HelpCircle,
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

  const [workers, historyEvents, proofs] = await Promise.all([
    listWorkPermitWorkers(id),
    listWorkPermitHistory(id),
    listSituationProofs({ workPermitId: id }),
  ]);

  // Dynamic Base URL for QR Code
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
  const isDurationExcessive = durationHours > 8;

  // Questionnaire questions & answers
  const questions = PERMIT_QUESTIONNAIRES[permit.permitType] || [];
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

  const resolvedEpiList = DEFAULT_EPI_LIST.map((epi) => ({
    ...epi,
    checked: selectedEpiIds.includes(epi.id),
  }));

  const selectedEpiItems = resolvedEpiList.filter((e) => e.checked);

  // Proofs breakdown
  const proofsAvant = proofs.filter((p) => p.stage === "avant");
  const proofsPendant = proofs.filter((p) => p.stage === "pendant");
  const proofsApres = proofs.filter((p) => p.stage === "apres");

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

      {/* OFFICIAL INDUSTRIAL A4 PRINT SHEET */}
      <div className="max-w-5xl mx-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-md print:shadow-none print:border-none print:p-0 print:text-black print:bg-white space-y-6">
        
        {/* 1. EN-TÊTE INDUSTRIEL & BRANDING */}
        <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-8 w-8 text-emerald-600 print:text-black shrink-0" />
                <div>
                  <span className="text-xl font-extrabold tracking-tight uppercase block">QHSE DUO SÉNÉGAL</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                    Système Intégré de Gestion Sécurité & Control of Work (PtW)
                  </span>
                </div>
              </div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-900 dark:text-white print:text-black mt-2">
                PERMIS DE TRAVAIL & AUTORISATION D&apos;INTERVENTION
              </h1>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="text-right">
                <span className="text-[9px] font-bold uppercase text-slate-400 block">RÉFÉRENCE PTW</span>
                <span className="font-mono text-base font-black bg-slate-100 dark:bg-slate-800 print:bg-slate-100 text-slate-900 dark:text-white px-3 py-1 rounded border border-slate-300 block">
                  {permit.reference}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">STATUT :</span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-black uppercase border ${
                  permit.status === "approuve" || permit.status === "en_cours"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300 print:bg-slate-100 print:text-black"
                    : permit.status === "suspendu"
                    ? "bg-amber-100 text-amber-900 border-amber-400 print:bg-slate-100 print:text-black"
                    : permit.status === "refuse"
                    ? "bg-red-100 text-red-800 border-red-300 print:bg-slate-100 print:text-black"
                    : "bg-slate-100 text-slate-800 border-slate-300 print:text-black"
                }`}>
                  {PERMIT_STATUS_LABELS[permit.status] || permit.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ALERTE DURAION DÉPASSÉE SI > 8H */}
        {isDurationExcessive && (
          <div className="rounded-lg border-2 border-red-600 bg-red-50 p-3 flex items-center gap-3 text-red-900 print:bg-slate-100 print:border-black print:text-black">
            <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 print:text-black" />
            <div className="text-xs">
              <span className="font-bold block uppercase text-red-700 print:text-black">
                ⚠️ INCOHÉRENCE DE DURÉE DE VALIDITÉ RÉGLEMENTAIRE
              </span>
              <span>
                La durée planifiée de ce permis ({durationFormatted}) excède la limite maximale réglementaire autorisée de 8 heures consécutives. Une reconduite ou une nouvelle validation post-équipe est requise.
              </span>
            </div>
          </div>
        )}

        {/* 2. IDENTIFICATION DE L'INTERVENTION */}
        <div className="border border-slate-300 dark:border-slate-800 rounded-lg p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/40 print:bg-white">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-emerald-600 print:text-black" />
            1. Identification Générale & Planification des Travaux
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="md:col-span-2">
              <span className="font-bold text-slate-500 uppercase block text-[10px]">Titre / Objet des travaux</span>
              <span className="font-extrabold text-sm text-slate-900 dark:text-white block mt-0.5">{permit.title}</span>
            </div>

            <div>
              <span className="font-bold text-slate-500 uppercase block text-[10px]">Catégorie Principale de Travaux</span>
              <span className="font-black text-xs text-emerald-700 dark:text-emerald-400 print:text-black block mt-0.5 uppercase">
                {PERMIT_TYPE_LABELS[permit.permitType]}
              </span>
            </div>

            <div className="md:col-span-3">
              <span className="font-bold text-slate-500 uppercase block text-[10px]">Description Détaillée de l&apos;Activité</span>
              <p className="text-slate-700 dark:text-slate-300 block mt-0.5 leading-relaxed bg-white dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 print:border-slate-300">
                {permit.description || "Aucune description complémentaire renseignée."}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-500 uppercase block text-[10px]">Lieu / Emplacement Précis</span>
              <span className="font-semibold block mt-0.5 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                {permit.location || "Non renseigné"}
              </span>
            </div>

            <div>
              <span className="font-bold text-slate-500 uppercase block text-[10px]">Site QHSE</span>
              <span className="font-semibold block mt-0.5">{permit.siteName || "Site Principal"}</span>
            </div>

            <div>
              <span className="font-bold text-slate-500 uppercase block text-[10px]">Équipement / Machine Rattachée</span>
              <span className="font-semibold block mt-0.5">
                {permit.equipmentName ? `⚙️ ${permit.equipmentName}` : "Aucun équipement spécifique"}
              </span>
            </div>

            <div>
              <span className="font-bold text-slate-500 uppercase block text-[10px]">Entreprise Intervenante</span>
              <span className="font-semibold block mt-0.5 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                {permit.contractorCompany ? `${permit.contractorCompany} (Sous-traitant)` : "Personnel Interne (Régie)"}
              </span>
            </div>

            <div>
              <span className="font-bold text-slate-500 uppercase block text-[10px]">Demandeur / Responsable Travaux</span>
              <span className="font-bold block mt-0.5 text-slate-900 dark:text-white">{permit.applicantName}</span>
            </div>

            <div>
              <span className="font-bold text-slate-500 uppercase block text-[10px]">Approbateur / Valideur HSE</span>
              <span className="font-bold block mt-0.5 text-slate-900 dark:text-white">
                {permit.approverName || "En attente d'approbation"}
              </span>
            </div>

            <div>
              <span className="font-bold text-slate-500 uppercase block text-[10px]">Début d&apos;Autorisation</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white block mt-0.5">
                {new Date(permit.startTime).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </div>

            <div>
              <span className="font-bold text-slate-500 uppercase block text-[10px]">Fin d&apos;Autorisation</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white block mt-0.5">
                {new Date(permit.endTime).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </div>

            <div>
              <span className="font-bold text-slate-500 uppercase block text-[10px]">Durée Autorisée</span>
              <span className={`font-mono font-bold block mt-0.5 flex items-center gap-1 ${isDurationExcessive ? "text-red-700 print:text-black font-black" : "text-emerald-700 dark:text-emerald-400 print:text-black"}`}>
                <Clock className="h-3.5 w-3.5" />
                {durationFormatted} {isDurationExcessive && "(⚠️ > 8h max)"}
              </span>
            </div>
          </div>
        </div>

        {/* 3. QUESTIONNAIRE SPÉCIFIQUE & ANALYSE DE RISQUES */}
        {questions.length > 0 && (
          <div className="border border-slate-300 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-emerald-600 print:text-black" />
              2. Analyse de Risques Spécifique au Type de Travaux ({PERMIT_TYPE_LABELS[permit.permitType]})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {questions.map((q) => {
                const ans = answers[q.id];
                const isAnswered = ans !== undefined && ans !== null && String(ans).trim() !== "";
                const isBlocking = q.blockingValue && isAnswered && String(ans).toLowerCase() === q.blockingValue.toLowerCase();

                return (
                  <div
                    key={q.id}
                    className={`p-2.5 rounded border text-xs flex flex-col justify-between gap-1 ${
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

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px]">
                      <span className="text-slate-400 uppercase text-[9px]">Réponse :</span>
                      {isAnswered ? (
                        <span className={`font-extrabold uppercase ${isBlocking ? "text-red-700 print:text-black" : "text-emerald-700 dark:text-emerald-400 print:text-black"}`}>
                          {String(ans)} {q.unit || ""}
                        </span>
                      ) : (
                        <span className="italic text-slate-400 text-[10px]">Non renseigné (⚪ À vérifier sur terrain)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. CONSIGNES & MESURES DE PRÉVENTION PAR PHASES (AVANT / PENDANT / APRÈS) */}
        <div className="border border-slate-300 dark:border-slate-800 rounded-lg p-4 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 print:text-black" />
            3. Programme des Mesures de Sécurité & Prévention Opérationnelles
          </h2>

          {/* AVANT TRAVAUX */}
          <div className="space-y-2">
            <span className="font-extrabold text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 print:text-black flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 print:bg-black" />
              Phase 1 : Mesures Préalables Obligatoires (AVANT Travaux)
            </span>
            {permit.beforeMeasures && permit.beforeMeasures.length > 0 ? (
              <div className="border border-slate-200 dark:border-slate-800 rounded divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {permit.beforeMeasures.map((m, idx) => (
                  <div key={m.id || idx} className="p-2 flex items-center justify-between gap-2 bg-white dark:bg-slate-900 print:bg-white">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400 w-5">{idx + 1}.</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{m.label}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                      m.checked
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300 print:bg-slate-100 print:text-black"
                        : "bg-amber-50 text-amber-800 border-amber-300 print:text-black"
                    }`}>
                      {m.checked ? "🟢 CONFORME & VÉRIFIÉ" : "⚪ À VÉRIFIER SUR CHANTIER"}
                    </span>
                  </div>
                ))}
              </div>
            ) : permit.safetyMeasures && permit.safetyMeasures.length > 0 ? (
              <div className="border border-slate-200 dark:border-slate-800 rounded divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {permit.safetyMeasures.map((m, idx) => (
                  <div key={m.id || idx} className="p-2 flex items-center justify-between gap-2 bg-white dark:bg-slate-900 print:bg-white">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400 w-5">{idx + 1}.</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{m.label}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                      m.checked
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300 print:bg-slate-100 print:text-black"
                        : "bg-amber-50 text-amber-800 border-amber-300 print:text-black"
                    }`}>
                      {m.checked ? "🟢 CONFORME & VÉRIFIÉ" : "⚪ À VÉRIFIER SUR CHANTIER"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-slate-400 border p-2 rounded">Aucune mesure préalable enregistrée.</p>
            )}
          </div>

          {/* PENDANT TRAVAUX */}
          <div className="space-y-2">
            <span className="font-extrabold text-[11px] uppercase tracking-wider text-blue-700 dark:text-blue-400 print:text-black flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500 print:bg-black" />
              Phase 2 : Surveillance & Contrôles Continues (PENDANT Travaux)
            </span>
            {permit.duringMeasures && permit.duringMeasures.length > 0 ? (
              <div className="border border-slate-200 dark:border-slate-800 rounded divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {permit.duringMeasures.map((m, idx) => (
                  <div key={m.id || idx} className="p-2 flex items-center justify-between gap-2 bg-white dark:bg-slate-900 print:bg-white">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400 w-5">{idx + 1}.</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{m.label}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                      m.checked
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300 print:bg-slate-100 print:text-black"
                        : "bg-amber-50 text-amber-800 border-amber-300 print:text-black"
                    }`}>
                      {m.checked ? "🟢 MAINTENU & CONFORME" : "⚪ À MAINTENIR PENDANT INTERVENTION"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-slate-400 border p-2 rounded">Aucune mesure continue enregistrée.</p>
            )}
          </div>

          {/* APRÈS TRAVAUX */}
          <div className="space-y-2">
            <span className="font-extrabold text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 print:text-black flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 print:bg-black" />
              Phase 3 : Rangement, Inspection & Déconsignation (APRÈS Travaux)
            </span>
            {permit.afterMeasures && permit.afterMeasures.length > 0 ? (
              <div className="border border-slate-200 dark:border-slate-800 rounded divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {permit.afterMeasures.map((m, idx) => (
                  <div key={m.id || idx} className="p-2 flex items-center justify-between gap-2 bg-white dark:bg-slate-900 print:bg-white">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400 w-5">{idx + 1}.</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{m.label}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                      m.checked
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300 print:bg-slate-100 print:text-black"
                        : "bg-amber-50 text-amber-800 border-amber-300 print:text-black"
                    }`}>
                      {m.checked ? "🟢 EFFECTUÉ & CONFORME" : "⚪ À INSPECTER LORS DE LA CLÔTURE"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-slate-400 border p-2 rounded">Aucune mesure de clôture enregistrée.</p>
            )}
          </div>
        </div>

        {/* 5. EPI OBLIGATOIRES & PLAN D'URGENCE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* EPI OBLIGATOIRES */}
          <div className="border border-slate-300 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center gap-2">
              <HardHat className="h-4 w-4 text-emerald-600 print:text-black" />
              4. Équipements de Protection Individuelle (EPI) Exigés
            </h2>

            {selectedEpiItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                {selectedEpiItems.map((epi) => (
                  <div key={epi.id} className="p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 print:bg-white flex items-center gap-2">
                    <span className="font-black text-emerald-700 print:text-black">[X]</span>
                    <span className="font-semibold text-[11px] text-slate-800 dark:text-slate-200">{epi.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 border rounded bg-slate-50 text-slate-600 text-xs italic">
                Aucun EPI spécifique sélectionné (EPI de chantier standard obligatoires : Casque, Chaussures S3, Gilet Haute Visibilité).
              </div>
            )}
          </div>

          {/* PLAN D'URGENCE & SECOURS */}
          <div className="border border-red-300 dark:border-red-900 rounded-lg p-4 space-y-3 bg-red-50/20 dark:bg-red-950/10 print:bg-white print:border-black">
            <h2 className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-300 print:text-black border-b border-red-200 dark:border-red-900 pb-1 flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-red-600 print:text-black" />
              5. Plan d&apos;Urgence, Alerte & Consignes de Secours
            </h2>

            <div className="text-xs space-y-2">
              {permit.emergencyPlan && Object.keys(permit.emergencyPlan).length > 0 ? (
                <div className="space-y-1.5">
                  {Object.entries(permit.emergencyPlan).map(([k, val]) => (
                    <div key={k} className="p-2 rounded border border-red-200 bg-white dark:bg-slate-900 print:bg-white">
                      <span className="font-bold uppercase text-[10px] text-red-700 block">{k} :</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{String(val)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-2.5 rounded border border-slate-300 bg-white space-y-1">
                  <span className="font-bold uppercase text-[10px] text-red-700 block">Consignes Standard d&apos;Urgence :</span>
                  <p className="text-[11px] leading-relaxed text-slate-700">
                    En cas d&apos;incident, accident ou alerte gaz/feu : Arrêt immédiat des travaux, alerte des Pompiers (18 / 112) ou PC Sécurité Site, et évacuation vers le Point de Rassemblement Principal.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 6. REGISTRE DES INTERVENANTS HABILITÉS */}
        <div className="border border-slate-300 dark:border-slate-800 rounded-lg p-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center justify-between">
            <span>6. Registre des Intervenants Habilités ({workers.length})</span>
            <span className="text-[10px] font-normal text-slate-500">Émargement obligatoire avant démarrage</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-300 dark:border-slate-800">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 text-slate-700 dark:text-slate-300 uppercase text-[10px]">
                  <th className="p-2 border border-slate-300 w-8">N°</th>
                  <th className="p-2 border border-slate-300">Nom & Prénom Intervenant</th>
                  <th className="p-2 border border-slate-300">Fonction / Qualification</th>
                  <th className="p-2 border border-slate-300">Entreprise</th>
                  <th className="p-2 border border-slate-300 w-36 text-center">Émargement Papier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {workers.map((w, idx) => (
                  <tr key={w.id} className="bg-white dark:bg-slate-900 print:bg-white">
                    <td className="p-2 border border-slate-300 font-mono text-center text-[10px]">{idx + 1}</td>
                    <td className="p-2 border border-slate-300 font-bold text-slate-900 dark:text-white">{w.workerName}</td>
                    <td className="p-2 border border-slate-300 text-slate-600 dark:text-slate-400">{w.roleOrQualification || "Intervenant Autorisé"}</td>
                    <td className="p-2 border border-slate-300 font-medium">{permit.contractorCompany || "Personnel Interne"}</td>
                    <td className="p-2 border border-slate-300 text-center font-mono text-[10px] text-slate-400">
                      [ signature ]
                    </td>
                  </tr>
                ))}
                {/* Lignes vierges pour ajouts terrain */}
                <tr className="bg-white">
                  <td className="p-2 border border-slate-300 text-center font-mono text-[10px] text-slate-400">{workers.length + 1}</td>
                  <td className="p-2 border border-slate-300 text-slate-300 italic">Ajout terrain...</td>
                  <td className="p-2 border border-slate-300"></td>
                  <td className="p-2 border border-slate-300"></td>
                  <td className="p-2 border border-slate-300"></td>
                </tr>
                <tr className="bg-white">
                  <td className="p-2 border border-slate-300 text-center font-mono text-[10px] text-slate-400">{workers.length + 2}</td>
                  <td className="p-2 border border-slate-300 text-slate-300 italic">Ajout terrain...</td>
                  <td className="p-2 border border-slate-300"></td>
                  <td className="p-2 border border-slate-300"></td>
                  <td className="p-2 border border-slate-300"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 7. DÉCISION D'AUTORISATION & MOTIF */}
        <div className="border-2 border-slate-900 dark:border-slate-100 rounded-lg p-4 space-y-3 bg-slate-50 dark:bg-slate-900/60 print:bg-white">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-300 pb-1">
            7. Décision Formelle d&apos;Autorisation d&apos;Intervention
          </h2>

          <div className="grid grid-cols-3 gap-4 text-xs font-bold text-center">
            <div className={`p-2.5 rounded border-2 uppercase ${
              permit.status === "approuve" || permit.status === "en_cours" || permit.status === "cloture"
                ? "border-emerald-600 bg-emerald-100 text-emerald-900 print:bg-slate-200 print:text-black"
                : "border-slate-300 text-slate-400"
            }`}>
              {permit.status === "approuve" || permit.status === "en_cours" || permit.status === "cloture" ? "[X] AUTORISÉ" : "[  ] AUTORISÉ"}
            </div>

            <div className={`p-2.5 rounded border-2 uppercase ${
              permit.status === "refuse"
                ? "border-red-600 bg-red-100 text-red-900 print:bg-slate-200 print:text-black"
                : "border-slate-300 text-slate-400"
            }`}>
              {permit.status === "refuse" ? "[X] REFUSÉ" : "[  ] REFUSÉ"}
            </div>

            <div className={`p-2.5 rounded border-2 uppercase ${
              permit.status === "suspendu"
                ? "border-amber-600 bg-amber-100 text-amber-900 print:bg-slate-200 print:text-black"
                : "border-slate-300 text-slate-400"
            }`}>
              {permit.status === "suspendu" ? "[X] SUSPENDU" : "[  ] SUSPENDU"}
            </div>
          </div>

          {permit.rejectionReason && (
            <div className="p-2.5 rounded border border-red-300 bg-red-50 text-red-900 text-xs">
              <span className="font-bold uppercase text-[10px] block text-red-700">MOTIF DU REFUS :</span>
              <p className="mt-0.5">{permit.rejectionReason}</p>
            </div>
          )}

          {permit.suspensionReason && (
            <div className="p-2.5 rounded border border-amber-300 bg-amber-50 text-amber-900 text-xs">
              <span className="font-bold uppercase text-[10px] block text-amber-700">MOTIF DE LA SUSPENSION :</span>
              <p className="mt-0.5">{permit.suspensionReason}</p>
            </div>
          )}
        </div>

        {/* 8. CHAÎNE DES SIGNATURES ET VISAS REQUIS */}
        <div className="border border-slate-300 dark:border-slate-800 rounded-lg p-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1">
            8. Chaîne d&apos;Approbation & Visas de Sécurité (Signatures Réglementaires)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* DEMANDEUR */}
            <div className="border border-slate-300 rounded p-3 bg-white dark:bg-slate-900 flex flex-col justify-between h-36">
              <div>
                <span className="font-extrabold uppercase text-[10px] text-slate-500 block">1. Demandeur / Executant</span>
                <span className="font-bold text-slate-900 dark:text-white block mt-1">{permit.applicantName}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Demande initiale transmise</span>
              </div>
              <div className="border-t border-dashed border-slate-300 pt-1 text-center font-mono text-[9px] text-slate-400">
                [ Visa Électronique ]
              </div>
            </div>

            {/* RESPONSABLE QHSE */}
            <div className="border border-slate-300 rounded p-3 bg-white dark:bg-slate-900 flex flex-col justify-between h-36">
              <div>
                <span className="font-extrabold uppercase text-[10px] text-slate-500 block">2. Responsable QHSE</span>
                <span className="font-bold text-slate-900 dark:text-white block mt-1">
                  {permit.approverName || "En attente de visa"}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Autorisation & Contrôle</span>
              </div>
              <div className="border-t border-dashed border-slate-300 pt-1 text-center font-mono text-[9px] text-slate-400">
                {permit.approverId ? "[ Visa Électronique Validé ]" : "[ En attente de visa ]"}
              </div>
            </div>

            {/* RESPONSABLE DE ZONE */}
            <div className="border border-slate-300 rounded p-3 bg-white dark:bg-slate-900 flex flex-col justify-between h-36">
              <div>
                <span className="font-extrabold uppercase text-[10px] text-slate-500 block">3. Exploitant / Resp. Zone</span>
                <span className="font-bold text-slate-900 dark:text-white block mt-1">Responsable Secteur</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Accord de mise à disposition</span>
              </div>
              <div className="border-t border-dashed border-slate-300 pt-1 text-center font-mono text-[9px] text-slate-400">
                [ Signature Papier Terrain ]
              </div>
            </div>

            {/* CHEF D'ÉQUIPE */}
            <div className="border border-slate-300 rounded p-3 bg-white dark:bg-slate-900 flex flex-col justify-between h-36">
              <div>
                <span className="font-extrabold uppercase text-[10px] text-slate-500 block">4. Chef d&apos;Équipe</span>
                <span className="font-bold text-slate-900 dark:text-white block mt-1">Accusé Réception Consignes</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Briefing sécurité réalisé</span>
              </div>
              <div className="border-t border-dashed border-slate-300 pt-1 text-center font-mono text-[9px] text-slate-400">
                [ Signature Papier Terrain ]
              </div>
            </div>
          </div>
        </div>

        {/* 9. TRAÇABILITÉ & REGISTRE D'AUDIT PTW */}
        {historyEvents.length > 0 && (
          <div className="border border-slate-300 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-600 print:text-black" />
              9. Historique de Traçabilité & Journal d&apos;Audit PtW ({historyEvents.length} événements)
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-slate-300 dark:border-slate-800">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 text-slate-700 uppercase text-[9px]">
                    <th className="p-1.5 border border-slate-300">Date & Heure</th>
                    <th className="p-1.5 border border-slate-300">Événement</th>
                    <th className="p-1.5 border border-slate-300">Opérateur</th>
                    <th className="p-1.5 border border-slate-300">Statut</th>
                    <th className="p-1.5 border border-slate-300">Commentaire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {historyEvents.slice(0, 6).map((h) => (
                    <tr key={h.id} className="bg-white dark:bg-slate-900 text-[11px]">
                      <td className="p-1.5 border border-slate-300 font-mono text-[10px]">
                        {new Date(h.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="p-1.5 border border-slate-300 font-bold uppercase text-[10px]">{h.eventType}</td>
                      <td className="p-1.5 border border-slate-300 font-medium">{h.actorName}</td>
                      <td className="p-1.5 border border-slate-300 uppercase text-[10px]">
                        {h.newStatus ? PERMIT_STATUS_LABELS[h.newStatus as WorkPermitStatus] || h.newStatus : "—"}
                      </td>
                      <td className="p-1.5 border border-slate-300 text-slate-600 dark:text-slate-400">{h.comment || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 10. PREUVES TERRAIN & QR SCAN MOBILE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* DOSSIER PREUVES SUMMARY */}
          <div className="md:col-span-2 border border-slate-300 dark:border-slate-800 rounded-lg p-3 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b pb-1 flex items-center gap-1.5">
              <Camera className="h-4 w-4 text-emerald-600 print:text-black" />
              10. Justificatifs & Preuves Terrain ({proofs.length} photos)
            </h2>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-1.5 border rounded bg-slate-50">
                <span className="text-[10px] text-slate-500 uppercase block">Avant</span>
                <span className="font-extrabold text-slate-900">{proofsAvant.length} preuve(s)</span>
              </div>
              <div className="p-1.5 border rounded bg-slate-50">
                <span className="text-[10px] text-slate-500 uppercase block">Pendant</span>
                <span className="font-extrabold text-slate-900">{proofsPendant.length} preuve(s)</span>
              </div>
              <div className="p-1.5 border rounded bg-slate-50">
                <span className="text-[10px] text-slate-500 uppercase block">Après</span>
                <span className="font-extrabold text-slate-900">{proofsApres.length} preuve(s)</span>
              </div>
            </div>
          </div>

          {/* QR CODE MOBILE VERIFICATION */}
          <div className="border border-slate-300 rounded-lg p-3 bg-white flex flex-col items-center justify-center text-center">
            <QrCode value={qrUrl} size={105} />
            <span className="text-[9px] font-mono text-slate-600 font-bold mt-1">
              {permit.reference}
            </span>
            <span className="text-[9px] text-slate-500 mt-0.5">
              Scannez pour contrôler la validité et les signatures sur le terrain
            </span>
          </div>
        </div>

        {/* FOOTER BAS DE PAGE IMPRESSION */}
        <div className="border-t border-slate-400 pt-2 flex items-center justify-between text-[9px] text-slate-500 print:text-black font-mono">
          <span>DOCUMENT SÉCURISÉ QHSE DUO SÉNÉGAL — REF: {permit.reference}</span>
          <span>PAGE 1 DE 2 — APPLICABLE SELON CODE DU TRAVAIL</span>
        </div>

      </div>
    </div>
  );
}
