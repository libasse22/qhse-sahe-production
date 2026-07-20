import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/services/auth.service";

export default async function HomePage() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/en-attente");
  redirect(profile.role === "employe" ? "/ouvrier/declarer" : "/dashboard");
}
