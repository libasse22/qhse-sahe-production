import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkPermitById, listWorkPermitWorkers } from "@/lib/services/permits.service";
import { PermitStatusBadge } from "@/components/permits/permit-status-badge";
import { PERMIT_TYPE_LABELS } from "@/lib/types/permits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, ShieldCheck, CheckCircle2, AlertTriangle, ArrowLeft, Building2 } from "lucide-react";

export default async function PublicWorkPermitScanPage({
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
  const isValid = permit.status === "en_cours" || permit.status === "approuve";
  const isSuspended = permit.status === "suspendu";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 flex flex-col justify-between">
      <div className="mx-auto max-w-lg w-full space-y-6">
        {/* HEADER BRAND */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <span className="font-bold text-lg tracking-tight">QHSE Duo Sénégal</span>
          </div>
          <span className="text-xs font-mono bg-slate-800 px-2.5 py-1 rounded text-slate-400">
            Contrôle Terrain PTW
          </span>
        </div>

        {/* STATUT TERRAIN EN DIRECT */}
        <div
          className={`rounded-xl p-5 border text-center space-y-2 ${
            isValid
              ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-200"
              : isSuspended
              ? "bg-amber-950/60 border-amber-500/50 text-amber-200"
              : "bg-rose-950/60 border-rose-500/50 text-rose-200"
          }`}
        >
          <div className="inline-flex p-3 rounded-full bg-slate-900/50 mb-1">
            {isValid ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            ) : isSuspended ? (
              <AlertTriangle className="h-8 w-8 text-amber-400 animate-pulse" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-rose-400" />
            )}
          </div>
          <h1 className="text-xl font-bold">
            {isValid
              ? "PERMIS DE TRAVAIL VALIDE & ACTIF"
              : isSuspended
              ? "INTERVENTION SUSPENDUE D'URGENCE"
              : `STATUT PERMIS : ${permit.status.toUpperCase()}`}
          </h1>
          <p className="text-xs opacity-80">
            Référence officielle : <strong className="font-mono">{permit.reference}</strong>
          </p>
        </div>

        {/* DÉTAILS DE LA FICHE D'INTERVENTION */}
        <Card className="bg-slate-800/80 border-slate-700 text-slate-200">
          <CardHeader className="pb-3 border-b border-slate-700">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs text-emerald-400 font-mono font-semibold">
                  {permit.reference}
                </span>
                <CardTitle className="text-base font-bold text-white mt-0.5">
                  {permit.title}
                </CardTitle>
              </div>
              <PermitStatusBadge status={permit.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-xs">
            <div>
              <span className="text-slate-400 block">Catégorie de Risque</span>
              <span className="font-semibold text-white">{PERMIT_TYPE_LABELS[permit.permitType]}</span>
            </div>

            <div>
              <span className="text-slate-400 block">Lieu & Emplacement</span>
              <span className="font-medium text-white flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> {permit.location}
              </span>
            </div>

            {permit.contractorCompany && (
              <div>
                <span className="text-slate-400 block">Entreprise Intervenante / Sous-traitante</span>
                <span className="font-medium text-white flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" /> {permit.contractorCompany}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-lg border border-slate-700">
              <div>
                <span className="text-slate-400 block text-[11px]">Début Autorisé</span>
                <span className="font-mono font-semibold text-white">
                  {new Date(permit.startTime).toLocaleString("fr-FR")}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Échéance de Fin</span>
                <span className="font-mono font-semibold text-white">
                  {new Date(permit.endTime).toLocaleString("fr-FR")}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">
                Mesures de Sécurité Validées ({permit.safetyMeasures.filter((m) => m.checked).length} / {permit.safetyMeasures.length})
              </span>
              <div className="space-y-1">
                {permit.safetyMeasures.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-[11px]">
                    {m.checked ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    )}
                    <span className={m.checked ? "text-slate-200" : "text-slate-400 line-through"}>
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {workers.length > 0 && (
              <div>
                <span className="text-slate-400 block mb-1">Équipe d&apos;Intervenants Autorisés ({workers.length})</span>
                <div className="space-y-1">
                  {workers.map((w) => (
                    <div key={w.id} className="flex items-center justify-between bg-slate-900/40 p-2 rounded border border-slate-700/60">
                      <span className="font-medium text-white">{w.workerName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{w.roleOrQualification}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center pt-2">
          <Link href={`/permis-de-travail/${permit.id}`}>
            <Button variant="outline" className="w-full bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700">
              <ArrowLeft className="h-4 w-4 mr-2" /> Revenir à l&apos;application
            </Button>
          </Link>
        </div>
      </div>

      <footer className="text-center text-[10px] text-slate-500 pt-8">
        QHSE Duo Sénégal — Fiche de Contrôle Permis de Travail Terrain
      </footer>
    </div>
  );
}
