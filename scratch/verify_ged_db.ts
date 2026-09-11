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

async function checkGedSchema() {
  console.log("Checking GED schema tables...");
  
  const tables = [
    "document_folders",
    "documents",
    "document_revisions",
    "document_links",
    "document_code_configs",
    "document_signatures",
    "document_external_shares",
    "document_history"
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.error(`Table '${table}' check error:`, error.message);
    } else {
      console.log(`Table '${table}' exists. Sample row count:`, data ? data.length : 0);
    }
  }

  // Test RPC generate_document_code_reference
  const { data: codeData, error: codeError } = await supabase.rpc("generate_document_code_reference", {
    p_company_id: "00000000-0000-0000-0000-000000000000",
    p_document_type: "politique",
    p_domain: "QHSE"
  });

  if (codeError) {
    console.log("RPC generate_document_code_reference result/error:", codeError.message);
  } else {
    console.log("RPC generate_document_code_reference sample output:", codeData);
  }
}

checkGedSchema();
