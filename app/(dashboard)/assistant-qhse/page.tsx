import { Suspense } from "react";
import { AssistantQhseClient } from "@/components/copilot/assistant-qhse-client";

export const metadata = {
  title: "Assistant & Copilote QHSE | QHSE Duo Sénégal",
  description: "Copilote intelligent d'analyse de conformité et de préparation des réunions QHSE."
};

export default function AssistantQhsePage() {
  return (
    <Suspense fallback={<AssistantSkeleton />}>
      <AssistantQhseClient />
    </Suspense>
  );
}

function AssistantSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="h-12 w-64 bg-slate-800 rounded animate-pulse" />
      <div className="h-96 w-full bg-slate-800 rounded animate-pulse" />
    </div>
  );
}
