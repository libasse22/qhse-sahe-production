"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEquipment } from "@/lib/services/equipment.service";
import { createSite, type Site } from "@/lib/services/sites.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function EquipmentForm({ sites }: { sites: Site[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creatingSite, setCreatingSite] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createEquipment(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  function handleCreateSite(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createSite(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setCreatingSite(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Ajouter un équipement</Button>;
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-5">
      <form action={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de l&apos;équipement</Label>
            <Input id="name" name="name" required maxLength={150} placeholder="Ex : Compresseur d'air C-12" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Input id="category" name="category" placeholder="Ex : Machine, véhicule, EPI collectif…" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="serialNumber">Numéro de série</Label>
            <Input id="serialNumber" name="serialNumber" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteId">Site</Label>
            <Select id="siteId" name="siteId" defaultValue="">
              <option value="">Non rattaché</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {!creatingSite ? (
          <button
            type="button"
            onClick={() => setCreatingSite(true)}
            className="text-xs font-medium text-primary underline"
          >
            + Créer un nouveau site
          </button>
        ) : (
          <div className="flex items-end gap-2 rounded-md border border-dashed border-border p-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="newSiteName" className="text-xs">
                Nom du site
              </Label>
              <Input id="newSiteName" name="newSiteName" className="h-9" />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={(e) => {
                const form = new FormData();
                const input = document.getElementById("newSiteName") as HTMLInputElement | null;
                form.set("name", input?.value ?? "");
                handleCreateSite(form);
              }}
            >
              Créer
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Enregistrement…" : "Ajouter l'équipement"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}
