"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Paperclip,
  Wrench,
  Eye,
} from "lucide-react";
import {
  AUDIT_ITEM_STATUS_BADGE,
  AUDIT_ITEM_STATUS_LABELS,
  type AuditItem,
  type AuditItemStatus,
  type AuditProofLink,
} from "@/lib/types/audit";
import {
  addAuditItem,
  updateAuditItemStatus,
  deleteAuditItem,
  linkProofToItem,
  unlinkProof,
  createCapaFromAuditItem,
  listAvailableProofCandidates,
  type ProofCandidate,
} from "@/lib/services/audits.service";
import type { Profile } from "@/lib/types/auth";

interface AuditItemsManagerProps {
  auditId: string;
  items: AuditItem[];
  canManage: boolean;
  users: Profile[];
  onOpenProofModal: (proof: AuditProofLink) => void;
}

export function AuditItemsManager({
  auditId,
  items,
  canManage,
  users,
  onOpenProofModal,
}: AuditItemsManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [itemComment, setItemComment] = useState("");

  // Modal / Form state pour rattacher une preuve
  const [linkingItemId, setLinkingItemId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ProofCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<string>("");
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Modal / Form state pour générer une CAPA
  const [capaItemId, setCapaItemId] = useState<string | null>(null);
  const [capaDescription, setCapaDescription] = useState("");
  const [capaResponsableId, setCapaResponsableId] = useState("");
  const [capaEcheance, setCapaEcheance] = useState("");
  const [capaPriority, setCapaPriority] = useState("moyenne");

  // Formulaire d'ajout de point
  const handleAddItem = async (formData: FormData) => {
    const res = await addAuditItem(auditId, formData);
    if (!res.error) {
      setShowAddForm(false);
    } else {
      alert(res.error);
    }
  };

  // Mise à jour du statut d'un point
  const handleStatusChange = async (itemId: string, newStatus: AuditItemStatus) => {
    const res = await updateAuditItemStatus(itemId, auditId, newStatus, itemComment);
    if (res.error) alert(res.error);
    setEditingItem(null);
  };

  // Suppression
  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce point d'audit ?")) return;
    const res = await deleteAuditItem(itemId, auditId);
    if (res.error) alert(res.error);
  };

  // Ouverture modal de rattachement de preuve
  const handleOpenLinkModal = async (itemId: string) => {
    setLinkingItemId(itemId);
    setLoadingCandidates(true);
    const list = await listAvailableProofCandidates();
    setCandidates(list);
    setLoadingCandidates(false);
  };

  const handleConfirmLinkProof = async () => {
    if (!linkingItemId || !selectedCandidate) return;
    const candidate = candidates.find((c) => c.id === selectedCandidate);
    if (!candidate) return;

    const res = await linkProofToItem(
      auditId,
      linkingItemId,
      candidate.type,
      candidate.id,
      candidate.title,
      { candidateSubtitle: candidate.subtitle }
    );

    if (res.error) alert(res.error);
    setLinkingItemId(null);
    setSelectedCandidate("");
  };

  // Création CAPA en 1-clic
  const handleConfirmCapa = async () => {
    if (!capaItemId || !capaDescription || !capaResponsableId || !capaEcheance) {
      alert("Tous les champs sont requis pour créer la CAPA.");
      return;
    }

    const formData = new FormData();
    formData.set("description", capaDescription);
    formData.set("responsableId", capaResponsableId);
    formData.set("echeance", capaEcheance);
    formData.set("priorite", capaPriority);
    formData.set("typeAction", "corrective");
    formData.set("domaineQhse", "securite");

    const res = await createCapaFromAuditItem(capaItemId, auditId, formData);
    if (res.error) {
      alert(res.error);
    } else {
      setCapaItemId(null);
      setCapaDescription("");
      setCapaResponsableId("");
      setCapaEcheance("");
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg font-semibold">Checklist & Points d'audit ({items.length})</CardTitle>
          <CardDescription>
            Points d'évaluation, constats, statut de conformité et rattachement des preuves.
          </CardDescription>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter un point
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Formulaire d'ajout rapide */}
        {showAddForm && (
          <form action={handleAddItem} className="space-y-3 rounded-lg border border-primary/40 bg-accent/20 p-4">
            <h4 className="text-sm font-semibold">Nouveau point d'audit</h4>
            <div className="space-y-2">
              <Label htmlFor="item-title">Titre / Intitulé du point</Label>
              <Input id="item-title" name="title" required placeholder="Ex: Port des EPI obligatoires en zone de chargement" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-req">Exigence / Référence d'exigence</Label>
              <Input id="item-req" name="requirement" placeholder="Ex: ISO 45001 §8.1.2 / Consigne Sécurité CS-04" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                Annuler
              </Button>
              <Button type="submit" size="sm">
                Enregistrer le point
              </Button>
            </div>
          </form>
        )}

        {/* Modal / Inline form Rattachement Preuve */}
        {linkingItemId && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-md">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Paperclip className="h-4 w-4 text-primary" />
              Rattacher une preuve (Mode "Montrez-moi la Preuve")
            </h4>
            <p className="text-xs text-muted-foreground">
              Sélectionnez un élément existant dans la GED, les Incidents, Inspections, Permis ou EPI.
            </p>

            {loadingCandidates ? (
              <p className="text-xs text-muted-foreground">Chargement des preuves disponibles...</p>
            ) : (
              <div className="space-y-2">
                <Select value={selectedCandidate} onChange={(e) => setSelectedCandidate(e.target.value)}>
                  <option value="">Sélectionnez un élément source...</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} {c.subtitle ? `(${c.subtitle})` : ""}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setLinkingItemId(null)}>
                Annuler
              </Button>
              <Button size="sm" disabled={!selectedCandidate} onClick={handleConfirmLinkProof}>
                Confirmer le rattachement
              </Button>
            </div>
          </div>
        )}

        {/* Modal / Inline form Génération CAPA */}
        {capaItemId && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-destructive flex items-center gap-1.5">
              <Wrench className="h-4 w-4" />
              Créer une action CAPA automatique
            </h4>
            <div className="space-y-2">
              <Label>Description de l'action corrective</Label>
              <Textarea
                rows={2}
                value={capaDescription}
                onChange={(e) => setCapaDescription(e.target.value)}
                placeholder="Description précise de l'action à mener suite à la non-conformité..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <Label>Responsable</Label>
                <Select value={capaResponsableId} onChange={(e) => setCapaResponsableId(e.target.value)}>
                  <option value="">Sélectionner un responsable...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.email}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Échéance</Label>
                <Input type="date" value={capaEcheance} onChange={(e) => setCapaEcheance(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCapaItemId(null)}>
                Annuler
              </Button>
              <Button variant="destructive" size="sm" onClick={handleConfirmCapa}>
                Générer l'action CAPA
              </Button>
            </div>
          </div>
        )}

        {/* Liste des points */}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-4 text-center">
            Aucun point d'audit défini. Cliquez sur "Ajouter un point" pour construire la checklist.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-border p-4 bg-card hover:border-border/80 transition-colors space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={AUDIT_ITEM_STATUS_BADGE[item.status]}>
                        {AUDIT_ITEM_STATUS_LABELS[item.status]}
                      </Badge>
                      <h4 className="font-semibold text-sm">{item.title}</h4>
                    </div>
                    {item.requirement && (
                      <p className="text-xs text-muted-foreground">Exigence : {item.requirement}</p>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <Select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value as AuditItemStatus)}
                        className="text-xs h-8"
                      >
                        <option value="conforme">Conforme</option>
                        <option value="non_conforme">Non conforme</option>
                        <option value="observation">Observation</option>
                        <option value="non_applicable">N/A</option>
                        <option value="non_evalue">Non évalué</option>
                      </Select>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {item.comment && (
                  <p className="text-xs bg-accent/30 p-2 rounded text-muted-foreground border border-border/50">
                    <strong>Commentaire :</strong> {item.comment}
                  </p>
                )}

                {/* Preuves liées à ce point */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-muted-foreground">Preuves :</span>
                    {item.proofLinks && item.proofLinks.length > 0 ? (
                      item.proofLinks.map((pl) => (
                        <div key={pl.id} className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs bg-accent/40"
                            onClick={() => onOpenProofModal(pl)}
                          >
                            <Eye className="h-3 w-3 mr-1 text-primary" />
                            {pl.title}
                          </Button>
                          {canManage && (
                            <button
                              className="text-muted-foreground hover:text-destructive px-1"
                              onClick={async () => {
                                const r = await unlinkProof(pl.id, auditId);
                                if (r.error) alert(r.error);
                              }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic">Aucune preuve rattachée</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {canManage && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleOpenLinkModal(item.id)}
                      >
                        <Paperclip className="h-3 w-3 mr-1" />
                        Rattacher preuve
                      </Button>
                    )}

                    {item.status === "non_conforme" && !item.capaActionId && canManage && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setCapaItemId(item.id);
                          setCapaDescription(`[Audit NC] ${item.title} — ${item.requirement}`);
                          setCapaEcheance(new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]);
                        }}
                      >
                        <Wrench className="h-3 w-3 mr-1" />
                        Créer CAPA
                      </Button>
                    )}

                    {item.capaActionId && (
                      <Badge variant="warning" className="text-xs">
                        CAPA Rattachée
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
