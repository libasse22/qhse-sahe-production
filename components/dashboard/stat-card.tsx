import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: "default" | "warning" | "destructive" | "success";
}) {
  const accentClasses: Record<string, string> = {
    default: "text-primary bg-primary/10",
    warning: "text-amber-700 bg-amber-100",
    destructive: "text-red-700 bg-red-100",
    success: "text-emerald-700 bg-emerald-100",
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg", accentClasses[accent ?? "default"])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
