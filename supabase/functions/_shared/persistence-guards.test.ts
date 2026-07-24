/// <reference lib="deno.ns" />

import {
  assertPersistenceSucceeded,
  mapIdsByOrigin,
} from "./persistence-guards.ts";

function assertThrowsMessage(run: () => void, expected: string) {
  let message = "";
  try {
    run();
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  if (!message.includes(expected)) {
    throw new Error(`esperava "${expected}", recebeu "${message}"`);
  }
}

Deno.test("falha se o estado final ou o log nao persistirem", () => {
  assertThrowsMessage(
    () =>
      assertPersistenceSucceeded("prefeitura_sync_state", {
        message: "timeout",
      }),
    "prefeitura_sync_state: timeout",
  );
  assertThrowsMessage(
    () => assertPersistenceSucceeded("sync_log finish", { message: "RLS" }),
    "sync_log finish: RLS",
  );
});

Deno.test("preserva homonimos quando as origens sao distintas", () => {
  const ids = mapIdsByOrigin(
    [
      { id: "servidor-a", origem_chave: "prefeitura:centi-22:001" },
      { id: "servidor-b", origem_chave: "prefeitura:centi-22:002" },
    ],
    ["prefeitura:centi-22:001", "prefeitura:centi-22:002"],
  );

  if (
    ids.get("prefeitura:centi-22:001") !== "servidor-a" ||
    ids.get("prefeitura:centi-22:002") !== "servidor-b"
  ) {
    throw new Error("IDs de origens distintas foram fundidos");
  }
});

Deno.test("falha quando um servidor nao foi persistido", () => {
  assertThrowsMessage(
    () =>
      mapIdsByOrigin(
        [{ id: "servidor-a", origem_chave: "prefeitura:centi-22:001" }],
        ["prefeitura:centi-22:001", "prefeitura:centi-22:002"],
      ),
    "Servidores persistidos incompletos",
  );
});
