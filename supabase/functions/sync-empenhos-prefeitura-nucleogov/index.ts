/// <reference lib="deno.ns" />

import { createNucleoGovSyncHandler } from "../_shared/nucleogov-sync.ts";

Deno.serve(createNucleoGovSyncHandler(
  "empenhos",
  "sync-empenhos-prefeitura-nucleogov",
));
