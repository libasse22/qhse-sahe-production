import { getEquipmentById } from "@/lib/services/equipment.service";
import { DeclareForm } from "@/components/ouvrier/declare-form";

export default async function DeclarerPage({
  searchParams,
}: {
  searchParams: Promise<{ equipmentId?: string }>;
}) {
  const { equipmentId } = await searchParams;
  const equipment = equipmentId ? await getEquipmentById(equipmentId) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-center text-2xl font-bold">Signaler un problème</h1>
      {equipment && (
        <p className="rounded-xl bg-secondary px-4 py-3 text-center text-sm font-medium">
          Concerne : {equipment.name}
        </p>
      )}
      <DeclareForm equipmentId={equipment?.id} />
    </div>
  );
}
