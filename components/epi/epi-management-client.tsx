"use client";

import { useState } from "react";
import { HardHat, Plus, UserCheck, Search, Download, QrCode as QrIcon, CheckCircle2, KeyRound, History, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import type { EpiCatalogItem, EpiAssignment, EpiHistoryEvent } from "@/lib/types/epi";
import { EPI_CATEGORY_LABELS, EPI_CONDITION_LABELS, EPI_CONDITION_BADGE } from "@/lib/types/epi";
import { createEpiAssignment, createEpiCatalogItem, updateEpiAssignmentStatus, confirmEpiReceipt } from "@/lib/services/epi.service";
import { exportEpiToCsv } from "@/lib/csv-export";
import { QrCode } from "@/components/equipment/qr-code";

interface ProfileOption {
  id: string;
  fullName: string;
  email: string;
}

interface EpiManagementClientProps {
  catalogItems: EpiCatalogItem[];
  assignments: EpiAssignment[];
  historyEvents?: EpiHistoryEvent[];
  profiles: ProfileOption[];
}

export function EpiManagementClient({
  catalogItems,
  assignments,
  historyEvents = [],
  profiles,
}: EpiManagementClientProps) {
  const [activeTab, setActiveTab] = useState("registre");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isCatalogDialogOpen, setIsCatalogDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal d'émargement PIN
  const [pinModalAssignment, setPinModalAssignment] = useState<EpiAssignment | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  // Modal QR Code
  const [qrModalItem, setQrModalItem] = useState<EpiAssignment | null>(null);

  // Filtrage des attributions
  const filteredAssignments = assignments.filter((a) => {
    const matchesRecipient = selectedRecipientId === "all" || a.recipientId === selectedRecipientId;
    const matchesSearch =
      a.recipientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.catalogName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.serialNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesStatus = true;
    if (selectedStatusFilter === "en_service") {
      matchesStatus = a.status === "en_service" && a.confirmedByUser === true;
    } else if (selectedStatusFilter === "a_renouveler") {
      matchesStatus = a.status === "a_renouveler" || a.conditionState === "defectueux";
    } else if (selectedStatusFilter === "non_confirme") {
      matchesStatus = !a.confirmedByUser;
    } else if (selectedStatusFilter === "restitue") {
      matchesStatus = a.status === "restitue" || a.status === "perdu_endommage";
    }

    return matchesRecipient && matchesSearch && matchesStatus;
  });

  // Regroupement par employé pour la vue Fiche Employé
  const employeeMap = new Map<string, { name: string; items: EpiAssignment[] }>();
  assignments.forEach((a) => {
    if (!employeeMap.has(a.recipientId)) {
      employeeMap.set(a.recipientId, { name: a.recipientName || "Inconnu", items: [] });
    }
    employeeMap.get(a.recipientId)!.items.push(a);
  });

  async function handleCreateAssignment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    const formData = new FormData(e.currentTarget);
    const res = await createEpiAssignment(formData);
    setIsSubmitting(false);
    if (res.error) {
      setErrorMessage(res.error);
    } else {
      setIsAssignDialogOpen(false);
    }
  }

  async function handleCreateCatalogItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    const formData = new FormData(e.currentTarget);
    const res = await createEpiCatalogItem(formData);
    setIsSubmitting(false);
    if (res.error) {
      setErrorMessage(res.error);
    } else {
      setIsCatalogDialogOpen(false);
    }
  }

  async function handleConfirmReceiptWithPin(e: React.FormEvent) {
    e.preventDefault();
    if (!pinModalAssignment) return;
    setPinError(null);
    setIsSubmitting(true);

    const res = await confirmEpiReceipt(pinModalAssignment.id, pinInput);
    setIsSubmitting(false);

    if (res.error) {
      setPinError(res.error);
    } else {
      setPinModalAssignment(null);
      setPinInput("");
    }
  }

  async function handleStatusChange(id: string, newStatus: any) {
    await updateEpiAssignmentStatus(id, newStatus);
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://qhse-duo.sn";

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion & Traçabilité des EPI</h1>
          <p className="text-sm text-muted-foreground">
            Catalogue, registres de dotation, émargements authentifiés par PIN et contrôles d&apos;échéances.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => exportEpiToCsv(assignments)} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Exporter Registre (CSV)
          </Button>
          <Button onClick={() => setIsCatalogDialogOpen(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Nouveau Modèle d&apos;EPI
          </Button>
          <Button onClick={() => setIsAssignDialogOpen(true)} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold">
            <HardHat className="h-4 w-4" /> Attribuer un EPI
          </Button>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              Total EPI Attribués
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold">{assignments.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              EPI en Service (Confirmés)
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold text-emerald-600">
              {assignments.filter((a) => a.confirmedByUser && a.status === "en_service").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              Attributions en Attente (PIN)
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold text-amber-600">
              {assignments.filter((a) => !a.confirmedByUser).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-rose-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              EPI à Renouveler / Expirés
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold text-rose-600">
              {assignments.filter((a) => a.conditionState === "defectueux" || a.status === "a_renouveler").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs Principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="registre">Registre Général des Attributions</TabsTrigger>
          <TabsTrigger value="fiche_employe">Fiches Employés (EPI détenus)</TabsTrigger>
          <TabsTrigger value="catalogue">Catalogue des EPI</TabsTrigger>
          <TabsTrigger value="journal" className="flex items-center gap-1.5">
            <History className="h-4 w-4" /> Journal d&apos;Audit Append-Only
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Registre Général */}
        <TabsContent value="registre" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher employé, EPI, série..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
              >
                <option value="all">Tous les statuts</option>
                <option value="en_service">En service (Reçus)</option>
                <option value="non_confirme">En attente d&apos;émargement PIN</option>
                <option value="a_renouveler">À renouveler / Expirés / Défectueux</option>
                <option value="restitue">Restitués / Perdus</option>
              </select>

              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedRecipientId}
                onChange={(e) => setSelectedRecipientId(e.target.value)}
              >
                <option value="all">Tous les employés</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 border-b text-xs font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3">Employé Bénéficiaire</th>
                      <th className="p-3">Équipement (EPI)</th>
                      <th className="p-3">Taille / Série</th>
                      <th className="p-3">Preuve d&apos;Émargement (PIN)</th>
                      <th className="p-3">État</th>
                      <th className="p-3">Échéance Renouvellement</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredAssignments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-muted-foreground">
                          Aucune attribution d&apos;EPI enregistrée.
                        </td>
                      </tr>
                    ) : (
                      filteredAssignments.map((item) => {
                        const isExpired = item.renewalDueAt && new Date(item.renewalDueAt).getTime() < Date.now();
                        const isNearExpiry = item.renewalDueAt && !isExpired && new Date(item.renewalDueAt).getTime() < Date.now() + 30 * 24 * 3600 * 1000;

                        return (
                          <tr key={item.id} className="hover:bg-muted/20">
                            <td className="p-3 font-medium flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-primary shrink-0" />
                              {item.recipientName}
                            </td>
                            <td className="p-3">
                              <div className="font-semibold">{item.catalogName}</div>
                              <div className="text-xs text-muted-foreground">
                                {EPI_CATEGORY_LABELS[item.category || "autre"]} {item.isoNorm ? `• ${item.isoNorm}` : ""}
                              </div>
                            </td>
                            <td className="p-3 font-mono text-xs">
                              {item.size ? `Taille : ${item.size}` : "N/A"}
                              {item.serialNumber ? ` | S/N: ${item.serialNumber}` : ""}
                            </td>
                            <td className="p-3 text-xs">
                              {item.confirmedAt ? (
                                <Badge variant="success" className="gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Reçu le {new Date(item.confirmedAt).toLocaleDateString("fr-FR")}
                                </Badge>
                              ) : (
                                <div className="space-y-1">
                                  <Badge variant="warning" className="gap-1">
                                    <KeyRound className="h-3 w-3" /> PIN: {item.confirmationCode || "En attente"}
                                  </Badge>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPinModalAssignment(item);
                                      setPinInput("");
                                      setPinError(null);
                                    }}
                                    className="block text-[11px] text-primary hover:underline font-semibold"
                                  >
                                    Valider émargement PIN →
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <Badge variant={EPI_CONDITION_BADGE[item.conditionState]}>
                                {EPI_CONDITION_LABELS[item.conditionState]}
                              </Badge>
                            </td>
                            <td className="p-3 text-xs">
                              {item.renewalDueAt ? (
                                <div className="space-y-0.5">
                                  <span className={`font-mono font-medium block ${isExpired ? "text-rose-600 font-bold" : isNearExpiry ? "text-amber-600 font-bold" : "text-muted-foreground"}`}>
                                    {new Date(item.renewalDueAt).toLocaleDateString("fr-FR")}
                                  </span>
                                  {isExpired && (
                                    <span className="text-[10px] text-rose-600 font-extrabold uppercase block">
                                      ⚠️ EXPIRÉ
                                    </span>
                                  )}
                                  {isNearExpiry && (
                                    <span className="text-[10px] text-amber-600 font-bold uppercase block">
                                      ⏳ Renouvellement proche
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground italic">Selon usure</span>
                              )}
                            </td>
                            <td className="p-3 text-right space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() => setQrModalItem(item)}
                                title="Afficher le QR code d'identification terrain"
                              >
                                <QrIcon className="h-3.5 w-3.5" /> QR
                              </Button>
                              {item.status !== "restitue" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => handleStatusChange(item.id, "restitue")}
                                >
                                  Restituer
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Fiches Employés */}
        <TabsContent value="fiche_employe" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from(employeeMap.entries()).map(([empId, empData]) => (
              <Card key={empId} className="border border-border">
                <CardHeader className="bg-muted/30 pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-amber-600" />
                      {empData.name}
                    </CardTitle>
                    <Badge variant="outline">{empData.items.length} EPI en dotation</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <table className="w-full text-xs text-left">
                    <thead className="text-muted-foreground border-b uppercase font-semibold">
                      <tr>
                        <th className="pb-2">EPI</th>
                        <th className="pb-2">Remis le</th>
                        <th className="pb-2">État</th>
                        <th className="pb-2 text-right">Renouvellement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {empData.items.map((epi) => (
                        <tr key={epi.id}>
                          <td className="py-2.5 font-medium">
                            {epi.catalogName}
                            {epi.serialNumber ? <span className="block font-mono text-[10px] text-muted-foreground">S/N: {epi.serialNumber}</span> : null}
                          </td>
                          <td className="py-2.5">{new Date(epi.assignedAt).toLocaleDateString("fr-FR")}</td>
                          <td className="py-2.5">
                            <Badge variant={EPI_CONDITION_BADGE[epi.conditionState]} className="text-[10px] px-1.5 py-0">
                              {EPI_CONDITION_LABELS[epi.conditionState]}
                            </Badge>
                          </td>
                          <td className="py-2.5 text-right font-medium">
                            {epi.renewalDueAt
                              ? new Date(epi.renewalDueAt).toLocaleDateString("fr-FR")
                              : "Selon usure"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 3: Catalogue EPI */}
        <TabsContent value="catalogue" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Référentiel des EPI Configurés</CardTitle>
                <CardDescription className="text-xs">
                  Modèles d&apos;EPI utilisables pour la dotation des employés avec normes et durée de vie.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 border-b text-xs font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3">Nom du Modèle</th>
                      <th className="p-3">Catégorie</th>
                      <th className="p-3">Norme ISO / CE</th>
                      <th className="p-3">Durée de vie théorique</th>
                      <th className="p-3">Périodicité contrôle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {catalogItems.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20">
                        <td className="p-3 font-semibold">{item.name}</td>
                        <td className="p-3">
                          <Badge variant="outline">{EPI_CATEGORY_LABELS[item.category]}</Badge>
                        </td>
                        <td className="p-3 font-mono text-xs">{item.isoNorm || "—"}</td>
                        <td className="p-3 text-xs">{item.lifespanMonths} mois</td>
                        <td className="p-3 text-xs">{item.periodicInspectionDays} jours</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: Journal d'Audit Append-Only */}
        <TabsContent value="journal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Journal d&apos;Audit Append-Only des Événements EPI ({historyEvents.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Registre inaltérable traçant toutes les attributions, réceptions PIN, contrôles périodiques et renouvellements.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3">Horodatage Serveur</th>
                      <th className="p-3">Événement</th>
                      <th className="p-3">Acteur / Opérateur</th>
                      <th className="p-3">Bénéficiaire</th>
                      <th className="p-3">Détails / Commentaire</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historyEvents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-muted-foreground italic">
                          Aucun événement d&apos;audit journalisé pour le moment.
                        </td>
                      </tr>
                    ) : (
                      historyEvents.map((h) => (
                        <tr key={h.id} className="hover:bg-muted/20">
                          <td className="p-3 font-mono text-slate-500">
                            {new Date(h.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="p-3 font-bold uppercase">
                            <span className={`px-2 py-0.5 rounded text-[10px] border ${
                              h.action === "epi_attributed"
                                ? "bg-blue-500/10 text-blue-600 border-blue-200"
                                : h.action === "epi_acknowledged"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 font-extrabold"
                                : h.action === "epi_checked"
                                ? "bg-purple-500/10 text-purple-600 border-purple-200"
                                : h.action === "epi_expired"
                                ? "bg-rose-500/10 text-rose-600 border-rose-200 font-extrabold"
                                : "bg-muted text-foreground border-border"
                            }`}>
                              {h.action}
                            </span>
                          </td>
                          <td className="p-3 font-medium">{h.actorName}</td>
                          <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{h.recipientName || "—"}</td>
                          <td className="p-3 text-muted-foreground">{h.comment || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Validation Émargement PIN */}
      {pinModalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 border-b pb-3">
              <KeyRound className="h-5 w-5 text-amber-600" />
              <h2 className="text-base font-bold">Confirmation d&apos;Émargement PIN</h2>
            </div>

            <div className="text-xs space-y-1">
              <div>Équipement : <strong className="text-primary">{pinModalAssignment.catalogName}</strong></div>
              <div>Bénéficiaire : <strong>{pinModalAssignment.recipientName}</strong></div>
              <div>Date d&apos;attribution : {new Date(pinModalAssignment.assignedAt).toLocaleDateString("fr-FR")}</div>
            </div>

            {pinError && (
              <div className="rounded-md bg-destructive/15 p-2.5 text-xs font-medium text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmReceiptWithPin} className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Code PIN d&apos;Émargement (6 chiffres) *</label>
                <Input
                  type="text"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="ex : 481920"
                  className="font-mono text-center text-lg tracking-widest"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setPinModalAssignment(null)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting || pinInput.length !== 6} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  {isSubmitting ? "Vérification..." : "Valider la réception"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Attribution EPI */}
      {isAssignDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-bold">Enregistrer une Remise d&apos;EPI</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Sélectionne un employé et un modèle d&apos;EPI du catalogue pour enregistrer la dotation.
            </p>

            {errorMessage && (
              <div className="mb-4 rounded-md bg-destructive/15 p-3 text-xs font-medium text-destructive">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateAssignment} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Employé Destinataire *</label>
                <select name="recipientId" required className="w-full rounded-md border p-2 bg-background">
                  <option value="">-- Sélectionner un employé --</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Modèle d&apos;EPI (Catalogue) *</label>
                <select name="catalogId" required className="w-full rounded-md border p-2 bg-background">
                  <option value="">-- Sélectionner un modèle d&apos;EPI --</option>
                  {catalogItems.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({EPI_CATEGORY_LABELS[c.category]})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Taille / Pointure</label>
                  <Input name="size" placeholder="ex: XL, 43, L" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">N° Série / N° Lot</label>
                  <Input name="serialNumber" placeholder="ex: CASQUE-2026-09" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">État Initial</label>
                  <select name="conditionState" className="w-full rounded-md border p-2 bg-background">
                    <option value="neuf">Neuf</option>
                    <option value="bon">Bon état</option>
                    <option value="use">Usé</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Date de remise *</label>
                  <Input name="assignedAt" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Date de renouvellement prévue</label>
                <Input name="renewalDueAt" type="date" />
              </div>

              <div>
                <label className="font-semibold block mb-1">Notes / Remarques</label>
                <Input name="notes" placeholder="Observations éventuelles sur la dotation..." />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                  {isSubmitting ? "Enregistrement..." : "Valider la remise"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Création Modèle Catalogue */}
      {isCatalogDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-bold">Ajouter un Modèle au Catalogue EPI</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Définit un modèle d&apos;équipement réutilisable pour les remises d&apos;EPI.
            </p>

            {errorMessage && (
              <div className="mb-4 rounded-md bg-destructive/15 p-3 text-xs font-medium text-destructive">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateCatalogItem} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Nom du Modèle d&apos;EPI *</label>
                <Input name="name" required placeholder="ex: Casque de chantier ventilé MSA" />
              </div>

              <div>
                <label className="font-semibold block mb-1">Catégorie *</label>
                <select name="category" required className="w-full rounded-md border p-2 bg-background">
                  {Object.entries(EPI_CATEGORY_LABELS).map(([cat, label]) => (
                    <option key={cat} value={cat}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Norme ISO / CE</label>
                <Input name="isoNorm" placeholder="ex: EN 397, EN ISO 20345" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Durée de vie (Mois)</label>
                  <Input name="lifespanMonths" type="number" defaultValue="24" min="1" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Contrôle périodique (Jours)</label>
                  <Input name="periodicInspectionDays" type="number" defaultValue="365" min="1" />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Description / Consignes</label>
                <Input name="description" placeholder="Spécifications techniques..." />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsCatalogDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Enregistrement..." : "Créer le modèle"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal QR Code Identification Terrain EPI */}
      {qrModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-2xl space-y-4">
            <h2 className="text-base font-bold">QR Code d&apos;Identification EPI</h2>
            <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-lg bg-white p-2 border">
              <QrCode value={`${baseUrl}/scan/epi/${qrModalItem.id}`} size={180} />
            </div>
            <div className="space-y-1 text-xs text-left bg-muted/40 p-3 rounded-lg border">
              <div className="font-semibold text-primary">{qrModalItem.catalogName}</div>
              <div>Bénéficiaire : <strong>{qrModalItem.recipientName}</strong></div>
              <div>Code PIN Émargement : <strong className="font-mono text-amber-600">{qrModalItem.confirmationCode || "—"}</strong></div>
              <div>N° Série : {qrModalItem.serialNumber || "Non spécifié"}</div>
              <div>Remis le : {new Date(qrModalItem.assignedAt).toLocaleDateString("fr-FR")}</div>
              <div>Statut Réception : <strong>{qrModalItem.confirmedAt ? `✓ Reçu le ${new Date(qrModalItem.confirmedAt).toLocaleDateString("fr-FR")}` : "⏳ En attente d'émargement"}</strong></div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setQrModalItem(null)}>
              Fermer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
