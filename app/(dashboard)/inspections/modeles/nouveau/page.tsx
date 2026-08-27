import { TemplateBuilderForm } from "@/components/inspections/template-builder-form";

export default function NouveauModeleChecklistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Créer un Modèle de Checklist Personnalisé</h1>
        <p className="text-sm text-muted-foreground">
          Adaptez la checklist à l&apos;activité de votre entreprise (Chantier, Usine, Mines, Équipements...).
        </p>
      </div>

      <TemplateBuilderForm />
    </div>
  );
}
