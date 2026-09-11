import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkPermitById, listWorkPermitWorkers } from "@/lib/services/permits.service";
import { PERMIT_TYPE_LABELS, PERMIT_STATUS_LABELS } from "@/lib/types/permits";
import { QrCode } from "@/components/equipment/qr-code";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
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

  const workers = await listWorkPermitWorkers(id);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 sm:p-8 print:p-0 print:bg-white print:text-black">
      {/* NO-PRINT TOOLBAR */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link href={`/permis-de-travail/${permit.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour au permis
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <PrintButton />
        </div>
      </div>

      {/* OFFICIAL A4 PRINT SHEET */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-8 shadow-sm print:shadow-none print:border-none print:p-2 print:text-black print:bg-white text-slate-900 dark:text-slate-100 space-y-6">
        
        {/* HEADER */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 dark:border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-emerald-600 print:text-black" />
              <span className="text-xl font-bold tracking-tight">QHSE DUO SÉNÉGAL</span>
            </div>
            <h1 className="text-2xl font-black uppercase tracking-wide">
              PERMIS DE TRAVAIL & AUTORISATION D&apos;INTERVENTION
            </h1>
            <p className="text-xs font-mono text-slate-600 dark:text-slate-400 print:text-slate-700">
              Système de Sécurité & Control of Work (PtW)
            </p>
          </div>
          <div className="text-right space-y-1">
            <div className="font-mono text-lg font-black bg-slate-100 dark:bg-slate-800 print:bg-slate-100 text-slate-900 dark:text-white px-3 py-1 rounded border border-slate-300">
              {permit.reference}
            </div>
            <div className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400 print:text-black">
              STATUT : {PERMIT_STATUS_LABELS[permit.status] || permit.status}
            </div>
          </div>
        </div>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-2 gap-4 text-xs border border-slate-200 dark:border-slate-800 p-4 rounded-lg bg-slate-50/50 dark:bg-slate-900/50 print:bg-white print:border-slate-400">
          <div>
            <span className="font-bold text-slate-500 uppercase block text-[10px]">Titre de l&apos;intervention</span>
            <span className="font-semibold text-sm text-slate-900 dark:text-white block mt-0.5">{permit.title}</span>
          </div>

          <div>
            <span className="font-bold text-slate-500 uppercase block text-[10px]">Catégorie de Risque</span>
            <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400 print:text-black block mt-0.5">
              {PERMIT_TYPE_LABELS[permit.permitType]}
            </span>
          </div>

          <div>
            <span className="font-bold text-slate-500 uppercase block text-[10px]">Lieu & Emplacement</span>
            <span className="font-semibold block mt-0.5">{permit.location || "Non précisé"}</span>
          </div>

          <div>
            <span className="font-bold text-slate-500 uppercase block text-[10px]">Entreprise Intervenante / Sous-traitant</span>
            <span className="font-semibold block mt-0.5">{permit.contractorCompany || "Personnel Interne"}</span>
          </div>

          {permit.equipmentName && (
            <div className="col-span-2">
              <span className="font-bold text-slate-500 uppercase block text-[10px]">Équipement / Machine Rattachée</span>
              <span className="font-semibold block mt-0.5">⚙️ {permit.equipmentName}</span>
            </div>
          )}
        </div>

        {/* PLANIFICATION ET CONSIGNES */}
        <div className="grid grid-cols-3 gap-4 text-xs border border-slate-200 dark:border-slate-800 p-4 rounded-lg">
          <div>
            <span className="font-bold text-slate-500 uppercase block text-[10px]">Début d&apos;Autorisation</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white block mt-0.5">
              {new Date(permit.startTime).toLocaleString("fr-FR")}
            </span>
          </div>
          <div>
            <span className="font-bold text-slate-500 uppercase block text-[10px]">Échéance de Fin</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white block mt-0.5">
              {new Date(permit.endTime).toLocaleString("fr-FR")}
            </span>
          </div>
          <div>
            <span className="font-bold text-slate-500 uppercase block text-[10px]">Demandé Par</span>
            <span className="font-bold text-slate-900 dark:text-white block mt-0.5">{permit.applicantName}</span>
          </div>
        </div>

        {/* MESURES DE PRÉVENTION PAR PHASES & EPI */}
        <div className="border border-slate-200 dark:border-slate-800 p-4 rounded-lg space-y-3">
          <h2 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b pb-1">
            Consignes de Sécurité & Mesures Préventives (AVANT / PENDANT / APRÈS)
          </h2>
          
          {((permit.beforeMeasures?.length ?? 0) > 0 || (permit.duringMeasures?.length ?? 0) > 0 || (permit.afterMeasures?.length ?? 0) > 0) ? (
            <div className="space-y-3 text-xs">
              {(permit.beforeMeasures?.length ?? 0) > 0 && (
                <div>
                  <span className="font-bold text-[10px] uppercase text-amber-700 block mb-1">Avant Travaux</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {permit.beforeMeasures?.map((m) => (
                      <div key={m.id} className="flex items-center gap-1.5">
                        <CheckCircle2 className={`h-3.5 w-3.5 ${m.checked ? "text-emerald-600 print:text-black" : "text-slate-300"}`} />
                        <span className={m.checked ? "font-medium" : "line-through text-slate-400"}>{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(permit.duringMeasures?.length ?? 0) > 0 && (
                <div>
                  <span className="font-bold text-[10px] uppercase text-blue-700 block mb-1">Pendant Travaux</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {permit.duringMeasures?.map((m) => (
                      <div key={m.id} className="flex items-center gap-1.5">
                        <CheckCircle2 className={`h-3.5 w-3.5 ${m.checked ? "text-emerald-600 print:text-black" : "text-slate-300"}`} />
                        <span className={m.checked ? "font-medium" : "line-through text-slate-400"}>{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(permit.afterMeasures?.length ?? 0) > 0 && (
                <div>
                  <span className="font-bold text-[10px] uppercase text-emerald-700 block mb-1">Après Travaux</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {permit.afterMeasures?.map((m) => (
                      <div key={m.id} className="flex items-center gap-1.5">
                        <CheckCircle2 className={`h-3.5 w-3.5 ${m.checked ? "text-emerald-600 print:text-black" : "text-slate-300"}`} />
                        <span className={m.checked ? "font-medium" : "line-through text-slate-400"}>{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              {permit.safetyMeasures.map((measure) => (
                <div key={measure.id} className="flex items-center gap-2">
                  {measure.checked ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 print:text-black shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500 print:text-slate-400 shrink-0" />
                  )}
                  <span className={measure.checked ? "font-semibold" : "text-slate-400 line-through"}>
                    {measure.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {permit.epiRequirements && (
            <div className="border-t pt-2 mt-2">
              <span className="font-bold text-[10px] uppercase text-slate-500 block mb-1">EPI Exigés Obligatoires :</span>
              <div className="flex flex-wrap gap-1 text-[11px]">
                {Array.isArray(permit.epiRequirements)
                  ? permit.epiRequirements.map((epiKey) => (
                      <span key={epiKey} className="px-2 py-0.5 border rounded bg-slate-100 font-semibold">
                        [X] {epiKey}
                      </span>
                    ))
                  : Object.entries(permit.epiRequirements)
                      .filter(([, req]) => req)
                      .map(([epiKey]) => (
                        <span key={epiKey} className="px-2 py-0.5 border rounded bg-slate-100 font-semibold">
                          [X] {epiKey}
                        </span>
                      ))}
              </div>
            </div>
          )}

          {permit.emergencyPlan?.text && (
            <div className="border-t pt-2 text-xs">
              <span className="font-bold text-[10px] uppercase text-red-600 block">Plan de Secours & Évacuation :</span>
              <p className="italic text-slate-700 mt-0.5">{permit.emergencyPlan.text}</p>
            </div>
          )}
        </div>

        {/* ÉQUIPE INTERVENANTE */}
        {workers.length > 0 && (
          <div className="border border-slate-200 dark:border-slate-800 p-4 rounded-lg space-y-2">
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b pb-1">
              Registre des Intervenants Habilités ({workers.length})
            </h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {workers.map((w) => (
                <div key={w.id} className="p-2 border border-slate-200 rounded bg-slate-50/50 print:bg-white">
                  <span className="font-bold block">{w.workerName}</span>
                  <span className="text-[10px] text-slate-500 block">{w.roleOrQualification || "Intervenant autorisÉ"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER QR CODE & SIGNATURES */}
        <div className="grid grid-cols-3 gap-6 pt-4 border-t-2 border-slate-900 dark:border-slate-100 text-xs">
          <div className="flex flex-col justify-between border p-3 rounded-lg bg-slate-50 dark:bg-slate-900 print:bg-white">
            <span className="font-bold uppercase text-[10px] text-slate-500 block">Signatures Demandeur</span>
            <div className="mt-8 border-t border-dashed border-slate-400 pt-1 text-center text-[10px]">
              {permit.applicantName}
            </div>
          </div>

          <div className="flex flex-col justify-between border p-3 rounded-lg bg-slate-50 dark:bg-slate-900 print:bg-white">
            <span className="font-bold uppercase text-[10px] text-slate-500 block">Validation / Visa QHSE</span>
            <div className="mt-8 border-t border-dashed border-slate-400 pt-1 text-center text-[10px]">
              {permit.approverName || "Visa Responsable QHSE"}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-2 border rounded-lg bg-white">
            <QrCode value={`/scan/permis/${permit.id}`} size={110} />
            <span className="text-[9px] text-slate-500 font-mono text-center mt-1">
              Scannez pour contrôle terrain mobile
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
