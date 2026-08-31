import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { PushSubscriptionToggle } from "@/components/notifications/push-subscription-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MonComptePage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Mon compte</h1>
      <Card>
        <CardHeader>
          <CardTitle>Notifications & Alertes</CardTitle>
          <CardDescription>Gérez la réception des notifications push natives sur vos appareils.</CardDescription>
        </CardHeader>
        <CardContent>
          <PushSubscriptionToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Changer le mot de passe</CardTitle>
          <CardDescription>Choisissez un nouveau mot de passe pour votre compte.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
