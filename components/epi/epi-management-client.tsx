"use client";

import { useState } from "react";
import { HardHat, Plus, UserCheck, Search, Download, QrCode, CheckCircle2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import type { EpiCatalogItem, EpiAssignment } from "@/lib/types/epi";
import { EPI_CATEGORY_LABELS, EPI_CONDITION_LABELS, EPI_CONDITION_BADGE, EPI_STATUS_LABELS } from "@/lib/types/epi";
import { createEpiAssignment, createEpiCatalogItem, updateEpiAssignmentStatus, confirmEpiReceipt } from "@/lib/services/epi.service";
import { exportEpiToCsv } from "@/lib/csv-export";

interface ProfileOption {
  id: string;
  fullName: string;
  email: string;
}

interface EpiManagementClientProps {
  catalogItems: EpiCatalogItem[];
  assignments: EpiAssignment[];
  profiles: ProfileOption[];
}

export function EpiManagementClient({
  catalogItems,
  assignments,
  profiles,
}: EpiManagementClientProps) {
  const [activeTab, setActiveTab] = useState("registre");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("all");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isCatalogDialogOpen, setIsCatalogDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtrage des attributions
  const filteredAssignments = assignments.filter((a) => {
    const matchesRecipient = selectedRecipientId === "all" || a.recipientId === selectedRecipientId;
    const matchesSearch =
      a.recipientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.catalogName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.serialNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRecipient && matchesSearch;
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

  const [qrModalItem, setQrModalItem] = useState<EpiAssignment | null>(null);

  async function handleConfirmReceipt(assignmentId: string) {
    await confirmEpiReceipt(assignmentId);
  }

  async function handleStatusChange(id: string, newStatus: any) {
    await updateEpiAssignmentStatus(id, newStatus);
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion des EPI & Dotations</h1>
          <p className="text-sm text-muted-foreground">
            Catalogue, registre des remises individuelles et suivi du renouvellement des EPI par employé.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => exportEpiToCsv(assignments)} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Exporter Registre (CSV)
          </Button>
          <Button onClick={() => setIsCatalogDialogOpen(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Nouveau Modèle d'EPI
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
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              Employés Équipés
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold">{employeeMap.size}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              Modèles au Catalogue
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold">{catalogItems.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-rose-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              EPI à Renouveler
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold">
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

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 border-b text-xs font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3">Employé Bénéficiaire</th>
                      <th className="p-3">Équipement (EPI)</th>
                      <th className="p-3">Taille / Série</th>
                      <th className="p-3">Preuve d'Émargement</th>
                      <th className="p-3">État</th>
                      <th className="p-3">Statut</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredAssignments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-muted-foreground">
                          Aucune attribution d'EPI enregistrée.
                        </td>
                      </tr>
                    ) : (
                      filteredAssignments.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/20">
                          <td className="p-3 font-medium flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-primary" />
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
                                  onClick={() => handleConfirmReceipt(item.id)}
                                  className="block text-[11px] text-primary hover:underline"
                                >
                                  Valider l'émargement
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
                            <span className="font-medium text-foreground">
                              {EPI_STATUS_LABELS[item.status]}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => setQrModalItem(item)}
                              title="Afficher le QR code d'identification terrain"
                            >
                              <QrCode className="h-3.5 w-3.5" /> QR
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
                      ))
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
                  Modèles d'EPI utilisables pour la dotation des employés avec normes et durée de vie.
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
      </Tabs>

      {/* Modal Attribution EPI */}
      {isAssignDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-bold">Enregistrer une Remise d'EPI</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Sélectionne un employé et un modèle d'EPI du catalogue pour enregistrer la dotation.
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
                <label className="font-semibold block mb-1">Modèle d'EPI (Catalogue) *</label>
                <select name="catalogId" required className="w-full rounded-md border p-2 bg-background">
                  <option value="">-- Sélectionner un modèle d'EPI --</option>
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
              Définit un modèle d'équipement réutilisable pour les remises d'EPI.
            </p>

            {errorMessage && (
              <div className="mb-4 rounded-md bg-destructive/15 p-3 text-xs font-medium text-destructive">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateCatalogItem} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Nom du Modèle d'EPI *</label>
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
            <h2 className="text-base font-bold">QR Code d'Identification EPI</h2>
            <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-lg bg-white p-2 border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  typeof window !== "undefined"
                    ? `${window.location.origin}/scan/epi/${qrModalItem.id}`
                    : `/scan/epi/${qrModalItem.id}`
                )}`}
                alt="QR Code EPI"
                className="h-full w-full object-contain"
              />
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
