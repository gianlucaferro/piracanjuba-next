/// <reference lib="deno.ns" />

import { createNucleoGovSyncHandler } from "../_shared/nucleogov-sync.ts";

Deno.serve(createNucleoGovSyncHandler(
  "aditivos",
  "sync-aditivos-prefeitura-nucleogov",
));
