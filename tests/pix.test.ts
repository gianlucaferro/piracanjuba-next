import assert from "node:assert/strict";
import test from "node:test";
import { crc16, gerarPixCopiaECola } from "../src/lib/pix.ts";

test("reproduz o código PIX válido da doação em /sobre (mesmos campos, mesmo CRC)", () => {
  // Código em uso em src/app/sobre/PixDonation.tsx, lido por apps de banco.
  const esperado =
    "00020126580014BR.GOV.BCB.PIX013639cb1f5e-f36d-4a75-a1e3-24f1a57b7dd95204000053039865802BR5914Gianluca Ferro6009SAO PAULO62140510vgqQ8FZ1tK63040906";
  assert.equal(
    gerarPixCopiaECola({
      chave: "39cb1f5e-f36d-4a75-a1e3-24f1a57b7dd9",
      nome: "Gianluca Ferro",
      cidade: "SAO PAULO",
      txid: "vgqQ8FZ1tK",
    }),
    esperado,
  );
});

test("inclui valor com duas casas, limpa acentos e limita nome, cidade e txid", () => {
  const codigo = gerarPixCopiaECola({
    chave: "66034538000125",
    nome: "FERRO LABS TECNOLOGIA LTDA ME",
    cidade: "PIRACANJUBA",
    valor: 600,
    txid: "PBA-7K3Q9X",
  });
  assert.match(codigo, /5406600\.00/);
  assert.match(codigo, /5925FERRO LABS TECNOLOGIA LTD6011PIRACANJUBA/);
  assert.match(codigo, /62130509PBA7K3Q9X6304[0-9A-F]{4}$/);
  assert.equal(codigo.slice(-4), crc16(codigo.slice(0, -4)));
  assert.match(gerarPixCopiaECola({ chave: "x", nome: "José Ação", cidade: "Goiânia" }), /5909Jose Acao6007Goiania/);
});
