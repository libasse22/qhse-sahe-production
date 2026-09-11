"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => window.print()}>
      <Printer className="h-4 w-4 mr-2" /> Imprimer / Export PDF
    </Button>
  );
}
