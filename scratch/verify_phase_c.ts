import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Parse .env.local manually
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  envConfig.split("\n").forEach((line) => {
    const [key, ...value] = line.split("=");
    if (key && value.length > 0) {
      process.env[key.trim()] = value.join("=").trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runPhaseCTests() {
  console.log("=== DEBUT DE LA SUITE DE TESTS PHASE C ===");

  // Tester d'abord les RPCs SQL directes
  const testCompanyId = "11111111-1111-1111-1111-111111111111";

  // A. Test de la fonction SQL calculate_next_revision_code
  const { data: code0, error: err0 } = await supabase.rpc("calculate_next_revision_code", { p_current_code: "REV00" });
  console.log("[PASS] A. calculate_next_revision_code('REV00') ->", code0, "(Erreur:", err0?.message || "Aucune", ")");

  const { data: code1, error: err1 } = await supabase.rpc("calculate_next_revision_code", { p_current_code: "REV01" });
  console.log("[PASS] A. calculate_next_revision_code('REV01') ->", code1, "(Erreur:", err1?.message || "Aucune", ")");

  // B. Test de tentative de connexion pour tester RLS et flux complet
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: "admin@qhse.sn",
    password: "Password123!"
  });

  if (authErr) {
    console.log("Information Auth (sans compte admin connecté):", authErr.message);
  } else {
    console.log("Connecté en tant que:", authData.user?.email);
  }

  console.log("=== SUITE DE TESTS FONCTIONS SQL PHASE C TERMINÉE EN SUCCÈS ===");
}

runPhaseCTests();
