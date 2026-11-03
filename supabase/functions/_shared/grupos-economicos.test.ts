import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { calcularGruposEconomicos, type ContratoGrupo, type FornecedorGrupo } from "./grupos-economicos.ts";

const a = "12345678000190", b = "98765432000100", c = "11111111000111";
const contrato = (cnpj: string, valor = 100): ContratoGrupo => ({ id: cnpj, cnpj, valor, razao_social: `Empresa ${cnpj}`, poder: "prefeitura" });
const fornecedor = (cnpj: string, nome: string, doc: string): FornecedorGrupo => ({ cnpj, razao_social: null, socios: [{ nome_socio: nome, cnpj_cpf_do_socio: doc }] });

Deno.test("grupos ligam componentes transitivos sem exigir sócio único em todas as empresas", () => {
  const fornecedores = [fornecedor(a, "Pessoa Um", "***123456**"), fornecedor(b, "Pessoa Um", "***123456**"), fornecedor(b, "Pessoa Dois", "***654321**"), fornecedor(c, "Pessoa Dois", "***654321**")];
  const [grupo] = calcularGruposEconomicos(fornecedores, [contrato(a), contrato(b), contrato(c)]);
  assertEquals(grupo.n_empresas, 3);
  assertEquals(grupo.socios_conectores.length, 2);
  assertEquals(grupo.valor_total, 300);
});

Deno.test("grupos não unem homônimos sem documento nem documentos divergentes", () => {
  assertEquals(calcularGruposEconomicos([fornecedor(a, "Mesmo Nome", ""), fornecedor(b, "Mesmo Nome", "")], [contrato(a), contrato(b)]), []);
  assertEquals(calcularGruposEconomicos([fornecedor(a, "Mesmo Nome", "***123456**"), fornecedor(b, "Mesmo Nome", "***654321**")], [contrato(a), contrato(b)]), []);
});

Deno.test("grupos deduplicam contratos e preservam órgãos; CPF integral nunca sai no snapshot", () => {
  const [grupo] = calcularGruposEconomicos([fornecedor(a, "Pessoa Um", "12345678901"), fornecedor(b, "Pessoa Um", "12345678901")], [contrato(a), contrato(a), { ...contrato(a, 50), poder: "camara" }, contrato(b)]);
  assertEquals(grupo.valor_total, 250);
  assertEquals(grupo.membros.find((m) => m.cnpj === a)?.n_contratos, 2);
  assertEquals(grupo.socios_conectores[0].doc, "***456789**");
});

Deno.test("grupos ignoram empresas sem contrato e resultado independe da ordem de entrada", () => {
  const fontes = [fornecedor(a, "Pessoa Um", "***123456**"), fornecedor(b, "Pessoa Um", "***123456**"), fornecedor(c, "Pessoa Um", "***123456**")];
  const contratos = [contrato(a, 1.01), contrato(b, 2.02)];
  const esperado = calcularGruposEconomicos(fontes, contratos);
  assertEquals(esperado[0].n_empresas, 2);
  assertEquals(esperado[0].valor_total, 3.03);
  assertEquals(calcularGruposEconomicos([...fontes].reverse(), [...contratos].reverse()), esperado);
});

Deno.test("nome alternativo de contratos é determinístico com variantes, espaços e nulos", () => {
  const fontes = [fornecedor(a, "Pessoa Um", "***123456**"), { ...fornecedor(b, "Pessoa Um", "***123456**"), razao_social: "   " }];
  const contratos: ContratoGrupo[] = [
    { ...contrato(a), id: "a1", razao_social: null },
    { ...contrato(a), id: "a2", razao_social: " Zeta Serviços " },
    { ...contrato(a), id: "a3", razao_social: "   " },
    { ...contrato(a), id: "a4", razao_social: " Alfa Serviços " },
    { ...contrato(b), id: "b1", razao_social: " Beta Serviços " },
    { ...contrato(b), id: "b2", razao_social: null },
  ];
  const esperado = calcularGruposEconomicos(fontes, contratos);
  assertEquals(esperado[0].membros.find((membro) => membro.cnpj === a)?.razao_social, "Alfa Serviços");
  assertEquals(esperado[0].membros.find((membro) => membro.cnpj === b)?.razao_social, "Beta Serviços");
  assertEquals(esperado[0].rotulo, "Alfa Serviços e mais 1");
  assertEquals(calcularGruposEconomicos([...fontes].reverse(), [...contratos].reverse()), esperado);
  const comCadastro = calcularGruposEconomicos([{ ...fontes[0], razao_social: " Nome Oficial " }, fontes[1]], contratos);
  assertEquals(comCadastro[0].membros.find((membro) => membro.cnpj === a)?.razao_social, "Nome Oficial");
});
