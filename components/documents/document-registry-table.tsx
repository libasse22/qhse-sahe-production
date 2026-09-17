"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Eye,
  Settings,
} from "lucide-react";
import type {
  QhseDocument,
  DocumentRetentionPolicy,
  DocumentType,
  DocumentOrigin,
  ExternalVerificationStatus,
  CalculatedDocumentState,
} from "@/lib/types/document";
import { upsertRetentionPolicy } from "@/lib/services/documents.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface DocumentRegistryTableProps {
  documents: QhseDocument[];
  retentionPolicies: DocumentRetentionPolicy[];
  canManage: boolean;
  initialVerificationFilter?: string;
  initialStateFilter?: string;
}

export function DocumentRegistryTable({
  documents,
  retentionPolicies,
  canManage,
  initialVerificationFilter = "all",
  initialStateFilter = "all",
}: DocumentRegistryTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [originFilter, setOriginFilter] = useState<DocumentOrigin | "all">("all");
  const [verificationFilter, setVerificationFilter] = useState<ExternalVerificationStatus | "all">(
    (initialVerificationFilter as ExternalVerificationStatus | "all") || "all"
  );
  const [stateFilter, setStateFilter] = useState<CalculatedDocumentState | "all">(
    (initialStateFilter as CalculatedDocumentState | "all") || "all"
  );
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyDocType, setPolicyDocType] = useState<DocumentType | "default">("default");
  const [policyYears, setPolicyYears] = useState<number>(5);
  const [policyUnit, setPolicyUnit] = useState<"ans" | "mois" | "indefini">("ans");
  const [policyDescription, setPolicyDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const [policyError, setPolicyError] = useState<string | null>(null);

  // Filtrage côté client rapide
  const filtered = documents.filter((doc) => {
    if (originFilter !== "all" && doc.originType !== originFilter) return false;
    if (verificationFilter !== "all" && doc.activeRevisionVerification !== verificationFilter) return false;
    if (stateFilter !== "all" && doc.calculatedState !== stateFilter) return false;
    if (typeFilter !== "all" && doc.documentType !== typeFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchCode = (doc.codeReference || "").toLowerCase().includes(q);
      const matchExtRef = (doc.externalReference || "").toLowerCase().includes(q);
      const matchExtSource = (doc.externalSource || "").toLowerCase().includes(q);
      return matchTitle || matchCode || matchExtRef || matchExtSource;
    }

    return true;
  });

  // Calculs KPI Registre
  const totalCount = documents.length;
  const externalCount = documents.filter((d) => d.originType === "externe").length;
  const internalCount = totalCount - externalCount;
  const toVerifyCount = documents.filter((d) => d.activeRevisionVerification === "a_verifier").length;
  const expiredOrOverdueCount = documents.filter(
    (d) => d.calculatedState === "expire" || d.calculatedState === "revue_depassee"
  ).length;

  function handleSavePolicy(e: React.FormEvent) {
    e.preventDefault();
    setPolicyError(null);
    startTransition(async () => {
      const res = await upsertRetentionPolicy({
        documentType: policyDocType,
        retentionYears: Number(policyYears),
        retentionUnit: policyUnit,
        description: policyDescription.trim(),
      });

      if (res.error) {
        setPolicyError(res.error);
      } else {
        setShowPolicyModal(false);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* HEADER PAGE REGISTRE */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-6 h-6 text-sky-400" />
            <span className="text-xs font-semibold tracking-wider text-sky-300 uppercase">
              Spécification ISO 9001 / ISO 45001 / ISO 14001 (§7.5)
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Registre Documentaire & Preuves Qualité</h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Maîtrise complète des documents d'origine interne et externe : vérification de conformité, traçabilité des révisions et politiques de conservation.
          </p>
        </div>

        {canManage && (
          <Button
            onClick={() => setShowPolicyModal(true)}
            variant="outline"
            className="bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700 gap-2"
          >
            <Settings className="w-4 h-4 text-sky-400" />
            Politiques de conservation
          </Button>
        )}
      </div>

      {/* COMPTEURS ET INDICATEURS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Documents Enregistrés</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalCount}</div>
          <div className="text-xs text-slate-500 mt-1">
            {internalCount} internes · {externalCount} externes
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase">
              Externes à Vérifier
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{toVerifyCount}</div>
          <div className="text-xs text-slate-500 mt-1">Nécessitent une validation Qualité</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase">
              Expirés / Revue Dépassée
            </span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{expiredOrOverdueCount}</div>
          <div className="text-xs text-slate-500 mt-1">Actions d'actualisation requises</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Politiques Configurées</span>
            <Settings className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {retentionPolicies.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Règles de conservation définies</div>
        </div>
      </div>

      {/* BARRE DE RECHERCHE ET FILTRES */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, code, référence externe ou organisme émetteur..."
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value as DocumentOrigin | "all")}
              className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5"
            >
              <option value="all">Toutes origines</option>
              <option value="interne">Interne</option>
              <option value="externe">Externe</option>
            </select>

            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value as ExternalVerificationStatus | "all")}
              className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5"
            >
              <option value="all">Tous statuts vérification</option>
              <option value="a_verifier">À vérifier</option>
              <option value="verifie">Vérifié conforme</option>
              <option value="rejete">Rejeté</option>
            </select>

            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value as CalculatedDocumentState | "all")}
              className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5"
            >
              <option value="all">Toutes échéances</option>
              <option value="normal">Normal</option>
              <option value="revue_proche">Revue à prévoir (&lt;30j)</option>
              <option value="revue_depassee">Revue dépassée</option>
              <option value="echeance_proche">Expiration proche (&lt;30j)</option>
              <option value="expire">Expiré</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5"
            >
              <option value="all">Tous types</option>
              <option value="procedure">Procédure</option>
              <option value="politique">Politique</option>
              <option value="instruction">Instruction</option>
              <option value="formulaire">Formulaire</option>
              <option value="permis">Permis de travail</option>
              <option value="rapport">Rapport</option>
              <option value="audit">Audit</option>
              <option value="inspection">Inspection</option>
              <option value="manuel">Manuel</option>
              <option value="autre">Autre</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLEAU REGISTRE DOCUMENTAIRE */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3.5">Code & Document</th>
                <th className="p-3.5">Type & Domaine</th>
                <th className="p-3.5">Origine & Source Externe</th>
                <th className="p-3.5">Vérification Révision</th>
                <th className="p-3.5">Revue / Échéance</th>
                <th className="p-3.5">Conservation</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                    Aucun document trouvé dans le registre avec les critères sélectionnés.
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => {
                  const isExt = doc.originType === "externe";
                  const verifStatus = doc.activeRevisionVerification || (isExt ? "a_verifier" : "verifie");

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-900">
                              {doc.codeReference || "DOC-00"}
                            </span>
                            <span className="text-[10px] text-slate-400">({doc.revisionCode || "REV00"})</span>
                          </div>
                          <Link
                            href={`/documents/${doc.id}`}
                            className="font-semibold text-slate-900 dark:text-slate-100 hover:text-sky-600 block line-clamp-1"
                          >
                            {doc.title}
                          </Link>
                        </div>
                      </td>

                      <td className="p-3.5 capitalize text-slate-600 dark:text-slate-400">
                        <div>{doc.documentType}</div>
                        <div className="text-[10px] text-slate-400 uppercase">{doc.domaineQhse || "securite"}</div>
                      </td>

                      <td className="p-3.5">
                        {isExt ? (
                          <div className="space-y-0.5">
                            <Badge variant="secondary" className="text-[10px]">
                              Externe
                            </Badge>
                            <div className="text-slate-800 dark:text-slate-200 text-[11px] font-semibold">
                              {doc.externalSource || "Source non précisée"}
                            </div>
                            {doc.externalReference && (
                              <div className="text-[10px] text-slate-500">Ref: {doc.externalReference}</div>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-slate-500">
                            Interne
                          </Badge>
                        )}
                      </td>

                      <td className="p-3.5">
                        {isExt ? (
                          verifStatus === "verifie" ? (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Vérifié
                            </Badge>
                          ) : verifStatus === "a_verifier" ? (
                            <Badge variant="warning" className="gap-1 animate-pulse">
                              <Clock className="w-3 h-3" />
                              À vérifier
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="w-3 h-3" />
                              Rejeté
                            </Badge>
                          )
                        ) : (
                          <span className="text-slate-400 text-[11px]">Conforme (Interne)</span>
                        )}
                      </td>

                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        <div className="space-y-1">
                          {doc.reviewDate && (
                            <div className="text-[11px]">
                              Revue: <span className="font-semibold">{new Date(doc.reviewDate).toLocaleDateString("fr-FR")}</span>
                            </div>
                          )}
                          {doc.expiryDate && (
                            <div className="text-[11px]">
                              Exp: <span className="font-semibold">{new Date(doc.expiryDate).toLocaleDateString("fr-FR")}</span>
                            </div>
                          )}

                          {doc.calculatedState === "expire" && (
                            <Badge variant="destructive" className="text-[9px]">Expiré</Badge>
                          )}
                          {doc.calculatedState === "revue_depassee" && (
                            <Badge variant="destructive" className="text-[9px]">Revue dépassée</Badge>
                          )}
                          {doc.calculatedState === "echeance_proche" && (
                            <Badge variant="warning" className="text-[9px]">Exp proche</Badge>
                          )}
                          {doc.calculatedState === "revue_proche" && (
                            <Badge variant="warning" className="text-[9px]">Revue proche</Badge>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-400 text-[11px]">
                        {doc.retentionDurationYears
                          ? `${doc.retentionDurationYears} ${doc.retentionUnit || "ans"}`
                          : "Standard (5 ans)"}
                      </td>

                      <td className="p-3.5 text-right">
                        <Link href={`/documents/${doc.id}`}>
                          <Button size="sm" variant="ghost" className="h-8 gap-1 text-sky-600 hover:text-sky-700">
                            <Eye className="w-3.5 h-3.5" />
                            Voir
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL GESTION POLITIQUE DE CONSERVATION */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-sky-600" />
                Définir une Politique de Conservation
              </h4>
              <button onClick={() => setShowPolicyModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {policyError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs">{policyError}</div>
            )}

            <form onSubmit={handleSavePolicy} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Type de document *
                </label>
                <select
                  value={policyDocType}
                  onChange={(e) => setPolicyDocType(e.target.value as DocumentType | "default")}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5"
                >
                  <option value="default">Par défaut (Tous types)</option>
                  <option value="procedure">Procédure</option>
                  <option value="politique">Politique</option>
                  <option value="instruction">Instruction</option>
                  <option value="formulaire">Formulaire</option>
                  <option value="permis">Permis de Travail</option>
                  <option value="audit">Audit QHSE</option>
                  <option value="inspection">Inspection</option>
                  <option value="rapport">Rapport d'incident</option>
                  <option value="manuel">Manuel QHSE</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Durée de conservation *
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={policyYears}
                    onChange={(e) => setPolicyYears(parseInt(e.target.value) || 1)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unité
                  </label>
                  <select
                    value={policyUnit}
                    onChange={(e) => setPolicyUnit(e.target.value as "ans" | "mois" | "indefini")}
                    className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5"
                  >
                    <option value="ans">Années</option>
                    <option value="mois">Mois</option>
                    <option value="indefini">Indéfini / Illimité</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Explication réglementaire / Justification
                </label>
                <Input
                  value={policyDescription}
                  onChange={(e) => setPolicyDescription(e.target.value)}
                  placeholder="Ex: Obligation légale de conservation des rapports d'accident pendant 10 ans..."
                />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 rounded-lg text-xs border border-amber-200 dark:border-amber-900/50">
                <strong>Règle de sécurité ISO 7.5 :</strong> La politique de conservation spécifie l'archivage légal. Aucune suppression physique automatique des fichiers n'est exécutée sans validation explicite.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowPolicyModal(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Enregistrement..." : "Enregistrer la Politique"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
