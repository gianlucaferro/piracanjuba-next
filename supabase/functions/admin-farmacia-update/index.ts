import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createFarmaciaAdminHandler } from "../_shared/farmacia-admin.ts";
import { createFarmaciaAdminDependencies } from "../_shared/farmacia-admin-store.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
Deno.serve(createFarmaciaAdminHandler(createFarmaciaAdminDependencies(supabase)));
