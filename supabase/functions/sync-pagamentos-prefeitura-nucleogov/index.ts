/// <reference lib="deno.ns" />

import { createNucleoGovSyncHandler } from "../_shared/nucleogov-sync.ts";

Deno.serve(createNucleoGovSyncHandler(
  "pagamentos",
  "sync-pagamentos-prefeitura-nucleogov",
));
