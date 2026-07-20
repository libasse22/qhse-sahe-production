import { z } from "zod";

export const appSettingsSchema = z.object({
  appName: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(80),
});

export type AppSettingsInput = z.infer<typeof appSettingsSchema>;
