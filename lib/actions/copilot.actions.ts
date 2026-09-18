"use server";

import { askQhseCopilot } from "@/lib/services/copilot.service";
import { CopilotResponse } from "@/lib/types/copilot";

export async function askCopilotAction(query: string): Promise<{ success: boolean; data?: CopilotResponse; error?: string }> {
  try {
    if (!query || !query.trim()) {
      return { success: false, error: "La question ne peut pas être vide." };
    }
    const response = await askQhseCopilot(query);
    return { success: true, data: response };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de la consultation du copilote QHSE." };
  }
}
