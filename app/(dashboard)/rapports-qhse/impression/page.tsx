import Link from "next/link";
import { getMonthlyQhseReport } from "@/lib/services/qhse-reporting.service";
import { PrintButton } from "../../permis-de-travail/[id]/impression/print-button";
import { ShieldCheck, Siren, ClipboardCheck, ClipboardList, FileCheck, HardHat } from "lucide-react";

export default async function QhseReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { start, end } = await searchParams;

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const startDate = start || defaultStart;
  const endDate = end || defaultEnd;

  const report = await getMonthlyQhseReport(startDate, endDate);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 sm:p-8 print:p-0 print:bg-white print:text-black font-sans text-slate-900">
      {/* TOOLBAR (NO-PRINT) */}
      <div className="max-w-5xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link href="/rapports-qhse">
          <button className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold bg-white hover:bg-slate-50 flex items-center gap-1.5">
            ← Retour au tableau de bord des rapports
          </button>
        </Link>
        <PrintButton />
      </div>

      {/* DOCUMENT A4 IMPRIMABLE (5 PAGES STRICTORUM) */}
      <div className="max-w-5xl mx-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-6 sm:p-10 shadow-md print:shadow-none print:border-none print:p-0 print:bg-white space-y-8 print:space-y-0">
        
        {/* ========================================================================= */}
        {/* PAGE 1 : COUVERTURE, EN-TÊTE & SYNTHÈSE EXÉCUTIVE */}
        {/* ========================================================================= */}
        <div className="min-h-[960px] flex flex-col justify-between print:page-break-after-always print:pb-0">
          <div className="space-y-6">
            {/* EN-TÊTE INDUSTRIEL */}
            <div className="border-b-4 border-slate-900 pb-4 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-9 w-9 text-emerald-600 print:text-black shrink-0" />
                  <div>
                    <span className="text-2xl font-black uppercase tracking-tight block">{report.companyName}</span>
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      Système de Management Intégré QHSE — Bilan de Performance
                    </span>
                  </div>
                </div>
                <h1 className="text-2xl font-black uppercase tracking-wide text-slate-900 mt-4">
                  RAPPORT MENSUEL DE PERFORMANCE QHSE
                </h1>
              </div>

              <div className="text-right">
                <span className="text-[9px] font-bold uppercase text-slate-400 block">PÉRIODE D&apos;ÉVALUATION</span>
                <span className="font-mono text-sm font-black bg-slate-100 border border-slate-300 px-3 py-1 rounded block mt-0.5">
                  {report.periodLabel}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Du {report.startDate} au {report.endDate}
                </span>
              </div>
            </div>

            {/* SYNTHÈSE EXÉCUTIVE */}
            <div className="border-2 border-slate-900 rounded-lg p-5 space-y-4 bg-slate-50 print:bg-white">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h2 className="text-sm font-extrabold uppercase text-slate-900">Synthèse Exécutive de la Direction</h2>
                  <span className="text-[10px] text-slate-500">Évaluation consolidée de la maturité et des risques de l&apos;entreprise</span>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-black uppercase border ${
                  report.globalStatus === "CONFORME"
                    ? "bg-emerald-100 text-emerald-900 border-emerald-400"
                    : report.globalStatus === "ATTENTION"
                    ? "bg-amber-100 text-amber-900 border-amber-400"
                    : report.globalStatus === "CRITIQUE"
                    ? "bg-red-100 text-red-900 border-red-400"
                    : "bg-slate-100 text-slate-800 border-slate-300"
                }`}>
                  {report.globalStatus}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 border rounded bg-white">
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">SCORE DE CONFORMITÉ</span>
                  <span className="text-3xl font-black text-slate-900 block mt-1">
                    {report.globalComplianceScore !== null ? `${report.globalComplianceScore}%` : "N/A"}
                  </span>
                </div>
                <div className="p-3 border rounded bg-white">
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">ANOMALIES CRITIQUES</span>
                  <span className="text-3xl font-black text-red-700 block mt-1">
                    {report.attentionPoints.filter((p) => p.severity === "CRITICAL").length}
                  </span>
                </div>
                <div className="p-3 border rounded bg-white">
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">ACTIONS EN RETARD</span>
                  <span className="text-3xl font-black text-amber-700 block mt-1">
                    {report.capa.enRetard}
                  </span>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-slate-700 border-t pt-3">
                {report.globalComplianceScore !== null
                  ? `Pour la période de ${report.periodLabel}, l'entreprise ${report.companyName} enregistre un score global de sécurité et conformité de ${report.globalComplianceScore}%. Ce bilan consolide la gestion des événements indésirables, les contrôles terrain, l'avancement du plan d'action correctif (CAPA), la conformité des permis de travail et les remises d'EPI.`
                  : "N/A — Aucune donnée exploitable ou suffisant d'indicateurs évalués sur cette période. Les indicateurs sont à initialiser dans le système."}
              </p>
            </div>

            {/* CARTES KPI PRINCIPALES */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="border border-slate-300 rounded-lg p-4 space-y-2">
                <span className="font-bold uppercase text-[10px] text-slate-500 block">1. Bilan des Incidents</span>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span>Incidents enregistrés :</span>
                  <span>{report.incidents.total.value}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Taux de traitement :</span>
                  <span className="font-bold">{report.incidents.tauxTraitement.value}</span>
                </div>
              </div>

              <div className="border border-slate-300 rounded-lg p-4 space-y-2">
                <span className="font-bold uppercase text-slate-500 block">2. Inspections Terrain</span>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span>Checklists exécutées :</span>
                  <span>{report.inspections.total.value}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Taux de conformité :</span>
                  <span className="font-bold">{report.inspections.tauxConformite.value}</span>
                </div>
              </div>

              <div className="border border-slate-300 rounded-lg p-4 space-y-2">
                <span className="font-bold uppercase text-slate-500 block">3. Actions Correctives (CAPA)</span>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span>Actions suivies :</span>
                  <span>{report.capa.total.value}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Taux de clôture :</span>
                  <span className="font-bold">{report.capa.tauxCloture.value}</span>
                </div>
              </div>

              <div className="border border-slate-300 rounded-lg p-4 space-y-2">
                <span className="font-bold uppercase text-slate-500 block">4. Permis de Travail & EPI</span>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span>Permis délivrés / EPI :</span>
                  <span>{report.permits.total.value} / {report.epi.totalAttribues.value}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Conformité EPI :</span>
                  <span className="font-bold">{report.epi.tauxConformite.value}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-2 flex justify-between text-[10px] text-slate-400">
            <span>Rapport Mensuel QHSE — Page 1/5</span>
            <span>Généré par {report.generatedByName} le {report.generatedAt}</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PAGE 2 : INCIDENTS & INSPECTIONS / AUDITS */}
        {/* ========================================================================= */}
        <div className="min-h-[960px] flex flex-col justify-between print:page-break-after-always print:pt-6 print:pb-0">
          <div className="space-y-6">
            <h2 className="text-base font-black uppercase text-slate-900 border-b-2 border-slate-900 pb-2">
              SECTION A — BILAN DES INCIDENTS & INSPECTIONS TERRAIN
            </h2>

            {/* INCIDENTS TABLE */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                <Siren className="h-4 w-4 text-slate-900" />
                1. Registre des Incidents de la Période ({report.incidents.items.length})
              </h3>
              {report.incidents.items.length > 0 ? (
                <table className="w-full text-xs text-left border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 uppercase text-[9px] font-bold">
                      <th className="p-2 border border-slate-300">Date</th>
                      <th className="p-2 border border-slate-300">Titre Incident</th>
                      <th className="p-2 border border-slate-300">Catégorie</th>
                      <th className="p-2 border border-slate-300">Gravité</th>
                      <th className="p-2 border border-slate-300">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.incidents.items.map((item) => (
                      <tr key={item.id} className="bg-white">
                        <td className="p-2 border border-slate-300 font-mono text-[10px]">{item.date}</td>
                        <td className="p-2 border border-slate-300 font-bold">{item.title}</td>
                        <td className="p-2 border border-slate-300 uppercase text-[10px]">{item.category}</td>
                        <td className="p-2 border border-slate-300 uppercase text-[10px] font-bold">{item.severity}</td>
                        <td className="p-2 border border-slate-300 uppercase text-[10px]">{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs italic text-slate-400 border p-3 rounded">
                  Aucun incident déclaré sur la période évaluée.
                </p>
              )}
            </div>

            {/* INSPECTIONS TABLE */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                <ClipboardCheck className="h-4 w-4 text-slate-900" />
                2. Bilan des Inspections & Contrôles Terrain ({report.inspections.items.length})
              </h3>
              {report.inspections.items.length > 0 ? (
                <table className="w-full text-xs text-left border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 uppercase text-[9px] font-bold">
                      <th className="p-2 border border-slate-300">Titre Inspection</th>
                      <th className="p-2 border border-slate-300">Inspecteur</th>
                      <th className="p-2 border border-slate-300">Date Réalisation</th>
                      <th className="p-2 border border-slate-300">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.inspections.items.map((ins) => (
                      <tr key={ins.id} className="bg-white">
                        <td className="p-2 border border-slate-300 font-bold">{ins.title}</td>
                        <td className="p-2 border border-slate-300">{ins.inspector}</td>
                        <td className="p-2 border border-slate-300 font-mono text-[10px]">{ins.completedAt}</td>
                        <td className="p-2 border border-slate-300 uppercase text-[10px]">{ins.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs italic text-slate-400 border p-3 rounded">
                  Aucune inspection exécutée sur la période évaluée.
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-2 flex justify-between text-[10px] text-slate-400">
            <span>Rapport Mensuel QHSE — Page 2/5</span>
            <span>Généré par {report.generatedByName} le {report.generatedAt}</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PAGE 3 : ACTIONS CORRECTIVES (CAPA) */}
        {/* ========================================================================= */}
        <div className="min-h-[960px] flex flex-col justify-between print:page-break-after-always print:pt-6 print:pb-0">
          <div className="space-y-6">
            <h2 className="text-base font-black uppercase text-slate-900 border-b-2 border-slate-900 pb-2">
              SECTION B — PLAN D&apos;ACTION CORRECTIF (CAPA) & ANOMALIES
            </h2>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4 text-slate-900" />
                1. État Avancement des Actions CAPA ({report.capa.items.length})
              </h3>

              {report.capa.items.length > 0 ? (
                <table className="w-full text-xs text-left border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 uppercase text-[9px] font-bold">
                      <th className="p-2 border border-slate-300">Code</th>
                      <th className="p-2 border border-slate-300">Description Action</th>
                      <th className="p-2 border border-slate-300">Responsable</th>
                      <th className="p-2 border border-slate-300">Échéance</th>
                      <th className="p-2 border border-slate-300 text-center">État</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.capa.items.map((item) => (
                      <tr key={item.id} className="bg-white">
                        <td className="p-2 border border-slate-300 font-mono text-[10px] font-bold">{item.code}</td>
                        <td className="p-2 border border-slate-300">{item.title}</td>
                        <td className="p-2 border border-slate-300">{item.responsable}</td>
                        <td className="p-2 border border-slate-300 font-mono text-[10px]">{item.echeance}</td>
                        <td className="p-2 border border-slate-300 text-center font-bold uppercase text-[10px]">
                          {item.isBlocked ? (
                            <span className="text-red-700">🔴 Bloquée</span>
                          ) : item.isOverdue ? (
                            <span className="text-amber-700">🟠 En Retard</span>
                          ) : (
                            item.status
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs italic text-slate-400 border p-3 rounded">
                  Aucune action corrective (CAPA) enregistrée sur la période.
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-2 flex justify-between text-[10px] text-slate-400">
            <span>Rapport Mensuel QHSE — Page 3/5</span>
            <span>Généré par {report.generatedByName} le {report.generatedAt}</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PAGE 4 : PERMIS DE TRAVAIL (PTW) & EPI */}
        {/* ========================================================================= */}
        <div className="min-h-[960px] flex flex-col justify-between print:page-break-after-always print:pt-6 print:pb-0">
          <div className="space-y-6">
            <h2 className="text-base font-black uppercase text-slate-900 border-b-2 border-slate-900 pb-2">
              SECTION C — PERMIS DE TRAVAIL (PTW) & CONFORMITÉ EPI
            </h2>

            {/* PERMIS DE TRAVAIL */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                <FileCheck className="h-4 w-4 text-slate-900" />
                1. Registre des Permis de Travail Émis ({report.permits.items.length})
              </h3>
              {report.permits.items.length > 0 ? (
                <table className="w-full text-xs text-left border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 uppercase text-[9px] font-bold">
                      <th className="p-2 border border-slate-300">Réf. PTW</th>
                      <th className="p-2 border border-slate-300">Titre Intervention</th>
                      <th className="p-2 border border-slate-300">Catégorie</th>
                      <th className="p-2 border border-slate-300">Demandeur</th>
                      <th className="p-2 border border-slate-300 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.permits.items.map((p) => (
                      <tr key={p.id} className="bg-white">
                        <td className="p-2 border border-slate-300 font-mono font-bold text-[10px]">{p.reference}</td>
                        <td className="p-2 border border-slate-300">{p.title}</td>
                        <td className="p-2 border border-slate-300 uppercase text-[10px]">{p.type}</td>
                        <td className="p-2 border border-slate-300">{p.applicant}</td>
                        <td className="p-2 border border-slate-300 text-center font-bold uppercase text-[10px]">{p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs italic text-slate-400 border p-3 rounded">
                  Aucun permis de travail émis sur la période.
                </p>
              )}
            </div>

            {/* EPI TABLE */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                <HardHat className="h-4 w-4 text-slate-900" />
                2. Dotations & Suivi des Équipements EPI ({report.epi.items.length})
              </h3>
              {report.epi.items.length > 0 ? (
                <table className="w-full text-xs text-left border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 uppercase text-[9px] font-bold">
                      <th className="p-2 border border-slate-300">Employé</th>
                      <th className="p-2 border border-slate-300">Équipement EPI</th>
                      <th className="p-2 border border-slate-300">État</th>
                      <th className="p-2 border border-slate-300">Statut</th>
                      <th className="p-2 border border-slate-300">Échéance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.epi.items.map((e) => (
                      <tr key={e.id} className="bg-white">
                        <td className="p-2 border border-slate-300 font-bold">{e.recipient}</td>
                        <td className="p-2 border border-slate-300">{e.catalogName}</td>
                        <td className="p-2 border border-slate-300 font-medium">{e.condition}</td>
                        <td className="p-2 border border-slate-300 uppercase text-[10px]">{e.status}</td>
                        <td className="p-2 border border-slate-300 font-mono text-[10px]">{e.renewalDueAt || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs italic text-slate-400 border p-3 rounded">
                  Aucune dotation EPI enregistrée sur la période.
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-2 flex justify-between text-[10px] text-slate-400">
            <span>Rapport Mensuel QHSE — Page 4/5</span>
            <span>Généré par {report.generatedByName} le {report.generatedAt}</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PAGE 5 : POINTS D'ATTENTION, CONCLUSION & VISAS */}
        {/* ========================================================================= */}
        <div className="min-h-[960px] flex flex-col justify-between print:pt-6 print:pb-0">
          <div className="space-y-6">
            <h2 className="text-base font-black uppercase text-slate-900 border-b-2 border-slate-900 pb-2">
              SECTION D — ORIENTATIONS DE LA DIRECTION & CONCLUSION
            </h2>

            <div className="space-y-4">
              <div className="border border-slate-300 rounded-lg p-4 space-y-2 bg-slate-50">
                <h3 className="text-xs font-bold uppercase text-slate-900">1. Synthèse des Risques & Recommandations</h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {report.attentionPoints.length > 0
                    ? `Sur la période de ${report.periodLabel}, ${report.attentionPoints.length} point(s) d'attention prioritaire(s) ont été identifiés. Une mobilisation des responsables opérationnels est requise pour solder les actions en retard et débloquer les situations d'arrêt.`
                    : "Aucune anomalie critique ou blocage majeur relevé sur la période. Les opérations sont menées conformément aux référentiels QHSE en vigueur."}
                </p>
              </div>

              <div className="border border-slate-300 rounded-lg p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-900">2. Décision Formelle de la Direction Général / HSE</h3>
                <div className="p-3 border border-dashed rounded bg-white font-mono text-xs space-y-1">
                  <span className="font-bold text-slate-900 block">[ VISA ET APPROBATION DE DIRECTION ]</span>
                  <p className="text-slate-600 text-[11px]">
                    Bilan mensuel validé électroniquement par la Direction QHSE.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-900 pt-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Organisme : {report.companyName}</span>
              <span>Période : {report.periodLabel}</span>
              <span>Date : {report.generatedAt}</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-200">
              <span>Rapport Mensuel QHSE — Page 5/5 (Fin du document)</span>
              <span>Généré par {report.generatedByName}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
