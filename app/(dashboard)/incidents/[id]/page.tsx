import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Pencil, Calendar } from "lucide-react";
import { getCurrentProfile } from "@/lib/services/auth.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { getIncidentById } from "@/lib/services/incidents.service";
import { listActionsForIncident } from "@/lib/services/actions.service";
import { listIncidentPhotos } from "@/lib/services/photos.service";
import { listIncidentVoiceNotes } from "@/lib/services/voice.service";
import { listActiveUsers } from "@/lib/services/users.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/incidents/severity-badge";
import { IncidentStatusBadge } from "@/components/incidents/status-badge";
import { StatusControl } from "@/components/incidents/status-control";
import { PhotoGallery } from "@/components/incidents/photo-gallery";
import { VoiceNotes } from "@/components/incidents/voice-notes";
import { ActionForm } from "@/components/actions/action-form";
import { ActionStatusSelect } from "@/components/actions/action-status-select";
import { ActionStatusBadge } from "@/components/actions/action-status-badge";
import { CATEGORY_LABELS } from "@/lib/types/incidents";

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const permissions = await getCurrentPermissions();
  const incident = await getIncidentById(id);

  if (!incident) notFound();

  const isQhseOrAdmin = permissions.has("incidents.manage_all");
  const isReporter = incident.reportedBy === profile?.id;
  const canEdit = isQhseOrAdmin || (isReporter && incident.status === "declare");

  const [actions, photos, voiceNotes, assignableUsers] = await Promise.all([
    listActionsForIncident(id),
    listIncidentPhotos(id),
    listIncidentVoiceNotes(id),
    isQhseOrAdmin ? listActiveUsers() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{incident.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {incident.location}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(incident.occurredAt).toLocaleString("fr-FR")}
            </span>
            <span>{CATEGORY_LABELS[incident.category]}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SeverityBadge severity={incident.severity} />
          <IncidentStatusBadge status={incident.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Description</CardTitle>
              {canEdit && (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/incidents/${id}/modifier`}>
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{incident.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
              <CardDescription>Pièces jointes visuelles de l&apos;incident.</CardDescription>
            </CardHeader>
            <CardContent>
              <PhotoGallery
                incidentId={id}
                initialPhotos={photos}
                canUpload={isReporter || isQhseOrAdmin}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Messages vocaux</CardTitle>
              <CardDescription>Description orale de l&apos;incident par le déclarant.</CardDescription>
            </CardHeader>
            <CardContent>
              <VoiceNotes incidentId={id} initialNotes={voiceNotes} canRecord={isReporter || isQhseOrAdmin} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions correctives ({actions.length})</CardTitle>
              <CardDescription>Mesures engagées pour traiter cet incident.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {actions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune action corrective créée.</p>
              ) : (
                <ul className="space-y-3">
                  {actions.map((action) => (
                    <li key={action.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{action.description}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Responsable : {action.responsableName} · Échéance :{" "}
                            {new Date(action.echeance).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        <ActionStatusBadge action={action} />
                      </div>
                      {(isQhseOrAdmin || action.responsableId === profile?.id) && (
                        <div className="mt-3 w-48">
                          <ActionStatusSelect actionId={action.id} incidentId={id} status={action.status} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {isQhseOrAdmin && <ActionForm incidentId={id} assignableUsers={assignableUsers} />}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Suivi</CardTitle>
              <CardDescription>
                Déclaré par {incident.reportedByName}
                {incident.assignedToName ? ` · Assigné à ${incident.assignedToName}` : ""}
              </CardDescription>
            </CardHeader>
            {isQhseOrAdmin && (
              <CardContent>
                <StatusControl
                  incidentId={id}
                  currentStatus={incident.status}
                  currentAssignedTo={incident.assignedTo}
                  assignableUsers={assignableUsers}
                />
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
