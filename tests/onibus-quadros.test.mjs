import assert from "node:assert/strict";
import test from "node:test";
import { compararQuadros, extrairQuadros } from "../scripts/onibus/conferir-quadros-agr.mjs";

const pagina = `
<ul>
  <li><a href="https://goias.gov.br/agr/wp-content/uploads/sites/43/2026/09/QH-Linha-06.283-00-Goiania-a-Caldas-Novas-via-BR-153-e-Piracanjuba.pdf">Linha convencional nº 06.283-00 – Goiânia a Caldas Novas (via BR-153 e Piracanjuba)</a></li>
  <li><a href="https://goias.gov.br/agr/wp-content/uploads/sites/43/2026/03/Linha-no-06.282-00-DR-Goiania-a-Caldas-Novas-via-GO-020-e-Piracanjuba.pdf">Linha convencional nº 06.282-00-DR – Goiânia a Caldas Novas (via GO-020 e Piracanjuba)</a></li>
  <li><a href="https://goias.gov.br/agr/wp-content/uploads/sites/43/2026/01/QH-Linha-06.1101-00-Formosa-Posse.pdf">Linha Convencional nº 06.1101-00 – Formosa Posse</a></li>
  <li><a class="x" href="https://goias.gov.br/agr/wp-content/uploads/sites/43/2026/12/QH-Linha-Nova.pdf"><span>Linha nova – Goiânia a Morrinhos (via <b>Piracanjuba</b>)</span></a></li>
</ul>`;

test("extrai só os quadros com Piracanjuba e ignora as viagens diretas", () => {
  assert.deepEqual([...extrairQuadros(pagina)].sort(), [
    "https://goias.gov.br/agr/wp-content/uploads/sites/43/2026/09/QH-Linha-06.283-00-Goiania-a-Caldas-Novas-via-BR-153-e-Piracanjuba.pdf",
    "https://goias.gov.br/agr/wp-content/uploads/sites/43/2026/12/QH-Linha-Nova.pdf",
  ]);
});

test("aponta quadro novo e quadro em uso que saiu da página", () => {
  const publicados = new Set(["https://a.test/novo.pdf", "https://a.test/mantido.pdf"]);
  assert.deepEqual(compararQuadros(["https://a.test/mantido.pdf", "https://a.test/antigo.pdf"], publicados), {
    novos: ["https://a.test/novo.pdf"],
    ausentes: ["https://a.test/antigo.pdf"],
  });
  assert.deepEqual(compararQuadros(["https://a.test/mantido.pdf"], new Set(["https://a.test/mantido.pdf"])), { novos: [], ausentes: [] });
});
