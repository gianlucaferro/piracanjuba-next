/// <reference lib="deno.ns" />

import { createNucleoGovSyncHandler } from "../_shared/nucleogov-sync.ts";

Deno.serve(createNucleoGovSyncHandler(
  "fiscais",
  "sync-fiscais-prefeitura-nucleogov",
));
