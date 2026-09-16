import { notFound } from "next/navigation";
import {
  getAuditById,
  getAuditItems,
  getAuditProofLinks,
  getAuditSummaryMetrics,
  getProof360Details,
} from "@/lib/services/audits.service";
import { createClient } from "@/lib/supabase/server";
import { AUDIT_ITEM_STATUS_LABELS, AUDIT_PROOF_TYPE_LABELS } from "@/lib/types/audit";

export default async function ImpressionAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const audit = await getAuditById(id);
  if (!audit) notFound();

  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  let companyName = "QHSE Duo Sénégal";
  if (userRes?.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("company:companies(name)")
      .eq("id", userRes.user.id)
      .maybeSingle();
    if ((profile as any)?.company?.name) companyName = (profile as any).company.name;
  }

  const [items, proofLinks, metrics] = await Promise.all([
    getAuditItems(id),
    getAuditProofLinks(id),
    getAuditSummaryMetrics(id),
  ]);

  // Récupération enrichie des détails des preuves 360° pour le rapport A4
  const proofDetailsList = await Promise.all(
    proofLinks.map(async (pl) => {
      const details = await getProof360Details(pl);
      return { link: pl, details };
    })
  );

  const nonEvaluatedItems = items.filter((i) => i.status === "non_evalue");
  const openCapas = items.filter((i) => i.status === "non_conforme" || i.capaActionId);

  const generationDate = new Date().toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-8 text-black shadow-lg print:max-w-none print:p-0 print:shadow-none font-sans text-xs">
      {/* Styles d'impression CSS A4 */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .page-break { page-break-after: always; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Bouton d'impression écran */}
      <div className="no-print mb-6 flex justify-end">
        <button
          onClick={() => window.print()}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          🖨️ Imprimer / Exporter en PDF (A4)
        </button>
      </div>

      {/* ====================================================================
       * PAGE 1 : EN-TÊTE & SYNTHÈSE FACTUELLE
       * ==================================================================== */}
      <div className="page-break pb-8">
        {/* Banner Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">{companyName}</h1>
            <p className="text-xs text-slate-600 font-semibold">RAPPORT D'AUDIT QHSE TRANSVERSAL</p>
          </div>
          <div className="text-right text-[10px] text-slate-500">
            <p>Réf Audit : <strong>AUD-{audit.id.slice(0, 8)}</strong></p>
            <p>Généré le : {generationDate}</p>
          </div>
        </div>

        {/* Tableau d'identification de l'audit */}
        <div className="my-6 rounded border border-slate-300 p-4 bg-slate-50 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-200 pb-1">
            Cadre & Périmètre de l'Audit
          </h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p><span className="text-slate-500">Intitulé Audit :</span> <strong>{audit.title}</strong></p>
              <p><span className="text-slate-500">Auditeur :</span> <strong>{audit.auditorName}</strong></p>
              <p><span className="text-slate-500">Site concerné :</span> <strong>{audit.siteName || "Site Principal / Transversal"}</strong></p>
            </div>
            <div>
              <p><span className="text-slate-500">Date planifiée :</span> <strong>{new Date(audit.plannedDate).toLocaleDateString("fr-FR")}</strong></p>
              <p><span className="text-slate-500">Période réalisation :</span> <strong>{audit.startDate ? new Date(audit.startDate).toLocaleDateString("fr-FR") : "—"} au {audit.endDate ? new Date(audit.endDate).toLocaleDateString("fr-FR") : "—"}</strong></p>
              <p><span className="text-slate-500">Statut :</span> <strong className="uppercase">{audit.status}</strong></p>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-2 text-xs">
            <p><span className="text-slate-500">Référentiel / Norme :</span> <strong>{audit.referenceFramework}</strong></p>
            <p className="mt-1"><span className="text-slate-500">Périmètre d'audit :</span> {audit.scope}</p>
            <p className="mt-1"><span className="text-slate-500">Critères retenus :</span> {audit.criteria}</p>
          </div>
        </div>

        {/* Synthèse factuelle */}
        <div className="my-6 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-900 pb-1">
            Synthèse Factuelle des Constats
          </h2>
          <p className="text-xs text-slate-600 italic">
            Remarque : Ce rapport présente l'état factuel des constats et preuves enregistrés à la date de génération. Aucun score de conformité ISO automatisé n'est attribué par le système.
          </p>

          <table className="w-full border-collapse border border-slate-300 text-center text-xs">
            <thead className="bg-slate-100 font-semibold text-slate-800">
              <tr>
                <th className="border border-slate-300 py-2">Points Évalués</th>
                <th className="border border-slate-300 py-2 text-emerald-700">Conformes</th>
                <th className="border border-slate-300 py-2 text-rose-700">Non Conformes</th>
                <th className="border border-slate-300 py-2 text-amber-700">Observations</th>
                <th className="border border-slate-300 py-2">N/A</th>
                <th className="border border-slate-300 py-2 text-slate-500">Non Évalués</th>
                <th className="border border-slate-300 py-2">Taux Factuel</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 py-2 font-bold">{metrics.evaluatedCount} / {metrics.totalItems}</td>
                <td className="border border-slate-300 py-2 font-bold text-emerald-700">{metrics.me}</td>
                <td className="border border-slate-300 py-2 font-bold text-rose-700">{metrics.nc}</td>
                <td className="border border-slate-300 py-2 font-bold text-amber-700">{metrics.obs}</td>
                <td className="border border-slate-300 py-2">{metrics.na}</td>
                <td className="border border-slate-300 py-2 text-slate-500">{metrics.ne}</td>
                <td className="border border-slate-300 py-2 font-bold">{metrics.complianceRateLabel}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ====================================================================
       * PAGE 2+ : POINTS D'AUDIT, CONSTATS & PREUVES RATTACHÉES
       * ==================================================================== */}
      <div className="page-break pb-8 pt-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase border-b-2 border-slate-900 pb-1 mb-4">
          Détail des Points d'Audit & Preuves Associées (Mode "Montrez-moi la Preuve")
        </h2>

        {items.length === 0 ? (
          <p className="text-slate-500 italic py-4">Aucun point d'audit enregistré.</p>
        ) : (
          <div className="space-y-4">
            {items.map((item, idx) => {
              const itemProofDetails = proofDetailsList.filter((pd) => pd.link.auditItemId === item.id);

              return (
                <div key={item.id} className="rounded border border-slate-300 p-3 bg-white space-y-2">
                  <div className="flex items-start justify-between border-b border-slate-200 pb-1">
                    <div>
                      <span className="font-bold text-slate-700">Point #{idx + 1} : </span>
                      <strong className="text-slate-900">{item.title}</strong>
                      {item.requirement && <p className="text-[11px] text-slate-500">Exigence : {item.requirement}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      item.status === "conforme" ? "bg-emerald-100 text-emerald-800" :
                      item.status === "non_conforme" ? "bg-rose-100 text-rose-800" :
                      item.status === "observation" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                    }`}>
                      {AUDIT_ITEM_STATUS_LABELS[item.status]}
                    </span>
                  </div>

                  {item.comment && (
                    <p className="text-[11px] bg-slate-50 p-2 rounded border border-slate-200 text-slate-700">
                      <strong>Constat / Commentaire :</strong> {item.comment}
                    </p>
                  )}

                  {/* Tableau des preuves rattachées */}
                  <div className="pt-1">
                    <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Preuves Matérielles (Système Source) :</p>
                    {itemProofDetails.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">Aucune preuve rattachée dans le système GED/Opérationnel.</p>
                    ) : (
                      <ul className="space-y-1.5 text-[11px]">
                        {itemProofDetails.map((pd) => (
                          <li key={pd.link.id} className="rounded border border-slate-200 p-2 bg-slate-50 flex items-start justify-between">
                            <div>
                              <span className="font-semibold text-slate-800">[{AUDIT_PROOF_TYPE_LABELS[pd.link.proofType]}] {pd.link.title}</span>
                              {(pd.details as any)?.type === "ged_document" && (
                                <p className="text-[10px] text-slate-500">
                                  GED Code : {(pd.details as any).codeReference || "—"} | Version active : {(pd.details as any).activeRevision ? `v${(pd.details as any).activeRevision.version_label}` : "N/A"} | Statut GED : {(pd.details as any).status}
                                </p>
                              )}
                              {(pd.details as any)?.type === "incident" && (
                                <p className="text-[10px] text-slate-500">
                                  Incident Réf : {(pd.details as any).codeReference} | Gravité : {(pd.details as any).severity} | Date : {(pd.details as any).date ? new Date((pd.details as any).date).toLocaleDateString("fr-FR") : "—"}
                                </p>
                              )}
                              {(pd.details as any)?.type === "work_permit" && (
                                <p className="text-[10px] text-slate-500">
                                  PtW N° : {(pd.details as any).permitNumber} | Statut : {(pd.details as any).status}
                                </p>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-400">Rattaché le {new Date(pd.link.createdAt).toLocaleDateString("fr-FR")}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ====================================================================
       * DERNIÈRE PAGE : SYNTHÈSE DES CAPA, POINTS NON ÉVALUÉS ET SIGNATURES
       * ==================================================================== */}
      <div className="pt-4 space-y-6">
        <h2 className="text-sm font-bold text-slate-900 uppercase border-b-2 border-slate-900 pb-1">
          Synthèse Clôture, CAPA Ouvertes & Échéances
        </h2>

        {/* Section CAPA Générées */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase">Actions CAPA Issue de l'Audit :</h3>
          {openCapas.length === 0 ? (
            <p className="text-slate-500 italic text-xs">Aucune action corrective requise ou générée à ce jour.</p>
          ) : (
            <table className="w-full border-collapse border border-slate-300 text-left text-[11px]">
              <thead className="bg-slate-100 font-semibold">
                <tr>
                  <th className="border border-slate-300 p-2">Point d'Audit</th>
                  <th className="border border-slate-300 p-2">Statut CAPA</th>
                </tr>
              </thead>
              <tbody>
                {openCapas.map((c) => (
                  <tr key={c.id}>
                    <td className="border border-slate-300 p-2">{c.title}</td>
                    <td className="border border-slate-300 p-2 font-semibold text-rose-700">Action Corrective Associée</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section Points non évalués */}
        {nonEvaluatedItems.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-amber-800 uppercase">Points d'Audit Non Évalués / En Attente :</h3>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
              {nonEvaluatedItems.map((ne) => (
                <li key={ne.id}>{ne.title} {ne.requirement ? `(${ne.requirement})` : ""}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Zone de signature */}
        <div className="mt-12 border-t-2 border-slate-900 pt-6 grid grid-cols-2 gap-8 text-xs">
          <div>
            <p className="font-bold text-slate-900 uppercase">L'Auditeur QHSE</p>
            <p className="text-slate-600 mt-1">{audit.auditorName}</p>
            <div className="mt-12 border-b border-dashed border-slate-400 w-48" />
            <p className="text-[10px] text-slate-400 mt-1">Signature & Date</p>
          </div>

          <div>
            <p className="font-bold text-slate-900 uppercase">Le Responsable / Site Audité</p>
            <p className="text-slate-600 mt-1">{companyName}</p>
            <div className="mt-12 border-b border-dashed border-slate-400 w-48" />
            <p className="text-[10px] text-slate-400 mt-1">Visa & Date</p>
          </div>
        </div>
      </div>
    </div>
  );
}
