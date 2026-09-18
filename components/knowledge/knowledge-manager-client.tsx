"use client";

import { useState, useTransition } from "react";
import {
  BookOpen,
  Database,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Plus,
  Layers,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  getKnowledgeSourceDetails,
  createKnowledgeSource,
  processKnowledgeSourceIngestion,
  reingestKnowledgeSource,
  ingestGedDocumentAsKnowledgeSource,
  toggleKnowledgeSourceStatus,
  deleteKnowledgeSource,
} from "@/lib/services/knowledge.service";
import type {
  KnowledgeSource,
  KnowledgeChunk,
  KnowledgeAuditLog,
  KnowledgeSourceType,
  KnowledgeDomain,
  KnowledgePriority,
  KnowledgeStatus,
} from "@/lib/types/knowledge";

interface KnowledgeManagerClientProps {
  initialSources: KnowledgeSource[];
  initialStats: {
    totalSources: number;
    totalChunks: number;
    sourcesByDomain: Record<string, number>;
    sourcesByType: Record<string, number>;
    activeCount: number;
    pendingCount: number;
    errorCount: number;
  };
  gedDocuments: Array<{ id: string; title: string; code?: string; domain?: string }>;
}

const DOMAIN_LABELS: Record<KnowledgeDomain, string> = {
  quality: "Qualité (ISO 9001)",
  health_safety: "Santé & Sécurité (ISO 45001)",
  environment: "Environnement (ISO 14001)",
  risk: "Gestion des Risques",
  audit: "Audits & Inspection",
  management: "Management & Stratégie",
  compliance: "Conformité & Réglementation",
  incident: "Incidents & Arbre des causes",
  emergency: "Situations d'urgence",
  training: "Formations & Causeries",
  other: "Général / Autre",
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  cours: "Cours QHSE",
  support_formation: "Support de Formation",
  outil_excel: "Outil Excel / Matrice",
  methode_qhse: "Méthode QHSE",
  norme_referentiel: "Norme / Référentiel",
  reglementation: "Réglementation",
  ged_doc: "Document GED interne",
  autre: "Autre document",
  course: "Cours & Support de Formation",
  methodology: "Méthode & Outil QHSE",
  tool_excel: "Matrice / Outil Excel",
  standard_reference: "Norme / Référentiel ISO",
  regulation: "Réglementation & Code",
  internal_document: "Document Interne GED",
  template: "Modèle / Trame",
  other: "Autre Ressource",
};

export function KnowledgeManagerClient({
  initialSources,
  initialStats,
  gedDocuments,
}: KnowledgeManagerClientProps) {
  const [sources, setSources] = useState<KnowledgeSource[]>(initialSources);
  const [stats, setStats] = useState(initialStats);
  const [isPending, startTransition] = useTransition();

  // Filtres
  const [search, setSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Modals & Details
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<"file" | "ged">("file");
  const [selectedSourceForDetails, setSelectedSourceForDetails] = useState<KnowledgeSource | null>(null);
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [auditLogs, setAuditLogs] = useState<KnowledgeAuditLog[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState<KnowledgeSourceType>("cours");
  const [domain, setDomain] = useState<KnowledgeDomain>("health_safety");
  const [priority, setPriority] = useState<KnowledgePriority>("high");
  const [version, setVersion] = useState("1.0");
  const [isGlobal, setIsGlobal] = useState(false);
  const [selectedGedId, setSelectedGedId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filtrage local
  const filteredSources = sources.filter((src) => {
    const matchesSearch =
      !search ||
      src.title.toLowerCase().includes(search.toLowerCase()) ||
      (src.description && src.description.toLowerCase().includes(search.toLowerCase()));

    const matchesDomain = selectedDomain === "all" || src.domain === selectedDomain;
    const matchesType = selectedType === "all" || src.source_type === selectedType;
    const matchesStatus = selectedStatus === "all" || src.status === selectedStatus;

    return matchesSearch && matchesDomain && matchesType && matchesStatus;
  });

  const handleOpenDetails = async (source: KnowledgeSource) => {
    setSelectedSourceForDetails(source);
    setLoadingDetails(true);
    try {
      const details = await getKnowledgeSourceDetails(source.id);
      setChunks(details.chunks);
      setAuditLogs(details.auditLogs);
    } catch (err) {
      console.error("Erreur chargement détails:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreateAndIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      try {
        if (addMode === "ged") {
          if (!selectedGedId) {
            setActionError("Veuillez sélectionner un document GED.");
            return;
          }
          const res = await ingestGedDocumentAsKnowledgeSource(selectedGedId);
          if (!res.success) {
            setActionError(res.error || "Erreur lors de l'ingestion du document GED.");
            return;
          }
          setActionSuccess("Document GED intégré et ingéré avec succès !");
        } else {
          if (!title.trim()) {
            setActionError("Le titre est requis.");
            return;
          }

          let fileBuffer: Buffer | undefined;
          let fileName: string | undefined;
          let fileSize: number | undefined;
          let mimeType: string | undefined;

          if (selectedFile) {
            fileName = selectedFile.name;
            fileSize = selectedFile.size;
            mimeType = selectedFile.type;
            const arrayBuffer = await selectedFile.arrayBuffer();
            fileBuffer = Buffer.from(arrayBuffer);
          }

          const createRes = await createKnowledgeSource({
            title,
            description,
            source_type: sourceType,
            domain,
            priority,
            version,
            is_global: isGlobal,
            file_name: fileName,
            file_size: fileSize,
            mime_type: mimeType,
          });

          if (!createRes.success || !createRes.sourceId) {
            setActionError(createRes.error || "Erreur lors de la création de la source.");
            return;
          }

          // Ingestion
          const ingestRes = await processKnowledgeSourceIngestion(createRes.sourceId, fileBuffer);
          if (!ingestRes.success) {
            setActionError(`Source créée mais erreur d'ingestion : ${ingestRes.error}`);
          } else {
            setActionSuccess(`Source créée et ${ingestRes.chunkCount} chunks extraits avec succès !`);
          }
        }

        // Reset form & reload
        setShowAddModal(false);
        setTitle("");
        setDescription("");
        setSelectedFile(null);
        setSelectedGedId("");
        window.location.reload();
      } catch (err: any) {
        setActionError(err?.message || "Une erreur est survenue.");
      }
    });
  };

  const handleReingest = async (sourceId: string) => {
    setActionError(null);
    startTransition(async () => {
      const res = await reingestKnowledgeSource(sourceId);
      if (!res.success) {
        setActionError(`Erreur ré-ingestion : ${res.error}`);
      } else {
        setActionSuccess(`Ré-ingestion réussie (${res.chunkCount} chunks ré-indexés).`);
        window.location.reload();
      }
    });
  };

  const handleToggleStatus = async (source: KnowledgeSource) => {
    const nextStatus: KnowledgeStatus = source.status === "active" ? "archived" : "active";
    startTransition(async () => {
      await toggleKnowledgeSourceStatus(source.id, nextStatus);
      window.location.reload();
    });
  };

  const handleDelete = async (sourceId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette source de connaissances et tous ses chunks ?")) {
      return;
    }
    startTransition(async () => {
      await deleteKnowledgeSource(sourceId);
      if (selectedSourceForDetails?.id === sourceId) {
        setSelectedSourceForDetails(null);
      }
      window.location.reload();
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Base de Connaissances QHSE</h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              Socle R1 — Ingestion & Structuration
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion, ingestion structurée et provenance des normes, cours, matrices Excel et documents métiers QHSE.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une Source
          </Button>
        </div>
      </div>

      {/* Message Notifications */}
      {actionError && (
        <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setActionError(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {actionSuccess && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setActionSuccess(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sources Incorporees</CardTitle>
            <Database className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSources}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeCount} actives · {stats.pendingCount} en attente · {stats.errorCount} erreurs
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chunks Extraits & Structurés</CardTitle>
            <Layers className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalChunks}</div>
            <p className="text-xs text-muted-foreground mt-1">Indexés avec repérage page/sheet/cell</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Domaines Métiers</CardTitle>
            <BookOpen className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.sourcesByDomain).length}</div>
            <p className="text-xs text-muted-foreground mt-1">HSE, Qualité, Risques, Audits, Standard</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Méthodes QHSE Classifiées</CardTitle>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">AMDEC, 5S, Ishikawa, RACI, PESTEL, HAZOP...</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Section: Filters & Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">Sources de Connaissances</CardTitle>
              <CardDescription>
                Consultez, ré-ingérez et filtrez les contenus de la base de connaissances.
              </CardDescription>
            </div>

            {/* Barre de recherche */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Fitres déroulants */}
          <div className="grid gap-3 pt-2 md:grid-cols-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Domaine QHSE</Label>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Tous les domaines</option>
                {Object.entries(DOMAIN_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Type de Source</Label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Tous les types</option>
                {Object.entries(SOURCE_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Statut</Label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="pending">En attente / Traitement</option>
                <option value="error">Erreur</option>
                <option value="archived">Archivé</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredSources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Database className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-lg font-medium">Aucune source de connaissances trouvée</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                {sources.length === 0
                  ? "Votre base de connaissances est actuellement vide. Cliquez sur 'Ajouter une Source' pour importer des cours, matrices Excel ou documents GED."
                  : "Aucune source ne correspond aux critères de recherche et filtres appliqués."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Source & Titre</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Domaine</th>
                    <th className="px-4 py-3">Version / Priorité</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSources.map((src) => (
                    <tr key={src.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground flex items-center gap-2">
                          {src.source_type === "outil_excel" ? (
                            <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                          )}
                          <span>{src.title}</span>
                          {src.company_id === null && (
                            <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600">
                              Global Standard
                            </Badge>
                          )}
                        </div>
                        {src.file_name && (
                          <div className="text-xs text-muted-foreground mt-0.5">{src.file_name}</div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="font-normal text-xs">
                          {SOURCE_TYPE_LABELS[src.source_type] || src.source_type}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {DOMAIN_LABELS[src.domain] || src.domain}
                      </td>

                      <td className="px-4 py-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">{src.version}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              src.priority === "critical"
                                ? "bg-red-500/10 text-red-600"
                                : src.priority === "high"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-blue-500/10 text-blue-600"
                            }`}
                          >
                            {src.priority}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {src.status === "active" && (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Actif
                          </Badge>
                        )}
                        {src.status === "pending" && (
                          <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">
                            <Clock className="mr-1 h-3 w-3 animate-spin" /> Ingestion...
                          </Badge>
                        )}
                        {src.status === "error" && (
                          <Badge className="bg-red-500/15 text-red-600 border-red-500/30 hover:bg-red-500/20">
                            <AlertTriangle className="mr-1 h-3 w-3" /> Erreur
                          </Badge>
                        )}
                        {src.status === "archived" && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Archivé
                          </Badge>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetails(src)}
                            title="Voir Chunks & Ingestion"
                          >
                            <Layers className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleReingest(src.id)}
                            title="Ré-ingérer et recalculer les chunks"
                          >
                            <RefreshCw className={`h-4 w-4 text-muted-foreground ${isPending ? "animate-spin" : ""}`} />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(src.id)}
                            title="Supprimer la source"
                          >
                            <Trash2 className="h-4 w-4 text-red-500/70 hover:text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Ajout de Source */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-lg">Ajouter une Source de Connaissances</CardTitle>
                <CardDescription>
                  Ingérer un cours PDF/DOCX, un fichier Excel ou un document GED dans la base.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="pt-4">
              <form onSubmit={handleCreateAndIngest} className="space-y-4">
                {/* Mode Select */}
                <div className="flex rounded-lg bg-muted p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setAddMode("file")}
                    className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                      addMode === "file" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Upload Fichier (PDF / DOCX / Excel)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMode("ged")}
                    className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                      addMode === "ged" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Sélectionner depuis la GED
                  </button>
                </div>

                {addMode === "ged" ? (
                  <div className="space-y-3">
                    <Label>Document GED à ingérer</Label>
                    <select
                      value={selectedGedId}
                      onChange={(e) => setSelectedGedId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    >
                      <option value="">-- Choisir un document GED --</option>
                      {gedDocuments.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.code ? `[${doc.code}] ` : ""}{doc.title} ({doc.domain || "Sans domaine"})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Le document GED sélectionné et sa révision active seront extraits et découpés en chunks métadonnés sans dupliquer le fichier source.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="title">Titre de la Source *</Label>
                      <Input
                        id="title"
                        placeholder="Ex: Cours AMDEC et Sûreté de Fonctionnement ISO 45001"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="description">Description / Notes</Label>
                      <Textarea
                        id="description"
                        placeholder="Résumé succinct de la ressource..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Type de Source</Label>
                        <select
                          value={sourceType}
                          onChange={(e) => setSourceType(e.target.value as KnowledgeSourceType)}
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                        >
                          {Object.entries(SOURCE_TYPE_LABELS).map(([k, label]) => (
                            <option key={k} value={k}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label>Domaine Métier</Label>
                        <select
                          value={domain}
                          onChange={(e) => setDomain(e.target.value as KnowledgeDomain)}
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                        >
                          {Object.entries(DOMAIN_LABELS).map(([k, label]) => (
                            <option key={k} value={k}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Priorité</Label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as KnowledgePriority)}
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                        >
                          <option value="low">Faible</option>
                          <option value="medium">Moyenne</option>
                          <option value="high">Haute</option>
                          <option value="critical">Critique (Référentiel)</option>
                        </select>
                      </div>

                      <div>
                        <Label>Version</Label>
                        <Input
                          value={version}
                          onChange={(e) => setVersion(e.target.value)}
                          placeholder="1.0"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>Fichier (PDF, DOCX, XLSX, XLS, CSV)</Label>
                      <Input
                        type="file"
                        accept=".pdf,.docx,.xlsx,.xls,.csv,.txt"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {isPending ? "Ingestion en cours..." : "Ingérer & Structurer"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Drawer / Modal Détails & Chunks */}
      {selectedSourceForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-4xl shadow-xl max-h-[90vh] overflow-y-auto flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{selectedSourceForDetails.title}</CardTitle>
                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                    {chunks.length} Chunks Extraits
                  </Badge>
                </div>
                <CardDescription className="mt-1">
                  Provenance: {selectedSourceForDetails.file_name || "Fichier externe"} · Version {selectedSourceForDetails.version}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSourceForDetails(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <Tabs defaultValue="chunks">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="chunks">Chunks Extraits & Structurés ({chunks.length})</TabsTrigger>
                  <TabsTrigger value="audit">Historique d&apos;Audit ({auditLogs.length})</TabsTrigger>
                </TabsList>

                {/* Onglet Chunks */}
                <TabsContent value="chunks" className="space-y-3 pt-3">
                  {loadingDetails ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      <Clock className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Chargement des chunks...
                    </div>
                  ) : chunks.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Aucun chunk extrait de cette source.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {chunks.map((chunk) => (
                        <div
                          key={chunk.id}
                          className="rounded-lg border bg-card p-3 shadow-sm hover:border-emerald-500/50 transition-colors"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 mb-2 text-xs">
                            <div className="flex items-center gap-2 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                              <span>#Chunk {chunk.chunk_index}</span>
                              {chunk.page && <Badge variant="outline">Page {chunk.page}</Badge>}
                              {chunk.sheet_name && (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
                                  Feuille: {chunk.sheet_name}
                                </Badge>
                              )}
                              {chunk.cell_range && (
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
                                  Plage: {chunk.cell_range}
                                </Badge>
                              )}
                            </div>

                            {chunk.detected_methods && chunk.detected_methods.length > 0 && (
                              <div className="flex items-center gap-1">
                                {chunk.detected_methods.map((m) => (
                                  <Badge key={m} className="bg-purple-500/15 text-purple-600 border-purple-500/30 text-[10px]">
                                    {m}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          {chunk.section && (
                            <h4 className="text-xs font-semibold text-foreground mb-1">Section: {chunk.section}</h4>
                          )}

                          <pre className="text-xs font-mono bg-muted/50 p-2.5 rounded text-foreground overflow-x-auto whitespace-pre-wrap">
                            {chunk.content}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Onglet Audit */}
                <TabsContent value="audit" className="space-y-3 pt-3">
                  <div className="space-y-2">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start justify-between border-b pb-2 text-xs">
                        <div>
                          <span className="font-semibold uppercase text-emerald-600 mr-2">{log.event_type}</span>
                          <span className="text-muted-foreground">
                            {JSON.stringify(log.details)}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(log.created_at).toLocaleString("fr-FR")}
                        </span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
