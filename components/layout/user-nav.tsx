import { signOut } from "@/lib/services/auth.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, type Profile } from "@/lib/types/auth";

export function UserNav({ profile }: { profile: Profile }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm font-medium leading-none">{profile.fullName || profile.email}</p>
        <Badge variant="secondary" className="mt-1">
          {ROLE_LABELS[profile.role]}
        </Badge>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm">
          Déconnexion
        </Button>
      </form>
    </div>
  );
}
