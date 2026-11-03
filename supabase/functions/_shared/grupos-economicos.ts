export interface FornecedorGrupo {
  cnpj: string;
  razao_social: string | null;
  socios: unknown;
}

export interface ContratoGrupo {
  id: string;
  cnpj: string | null;
  razao_social: string | null;
  poder: "prefeitura" | "camara";
  valor: number | null;
}

interface MembroGrupo {
  cnpj: string;
  razao_social: string | null;
  poderes: string[];
  n_contratos: number;
  valor: number;
}

export interface SnapshotGrupo {
  chave: string;
  rotulo: string;
  tipo: string;
  n_empresas: number;
  valor_total: number;
  socios_conectores: Array<{ nome: string; doc: string; n_empresas: number; cnpjs: string[] }>;
  membros: MembroGrupo[];
}

function socioIdentificado(value: unknown): { chave: string; nome: string; doc: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const socio = value as Record<string, unknown>;
  const nome = String(socio.nome_socio ?? socio.nome ?? "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
  const documento = String(socio.cnpj_cpf_do_socio ?? socio.cnpj_cpf_socio ?? "").replace(/[.\-/\s]/g, "");
  // Não unir por nome isolado. Máscaras diferentes não são tratadas como equivalentes.
  if (!nome || !/^(?:\d{11}|\d{14}|\*{3}\d{6}\*{2})$/.test(documento)) return null;
  return { chave: `${nome}|${documento}`, nome, doc: /^\d{11}$/.test(documento) ? `***${documento.slice(3, 9)}**` : documento };
}

export function calcularGruposEconomicos(fornecedores: FornecedorGrupo[], contratos: ContratoGrupo[]): SnapshotGrupo[] {
  const membros = new Map<string, MembroGrupo>();
  const vistos = new Set<string>();
  for (const contrato of contratos) {
    const cnpj = (contrato.cnpj ?? "").replace(/\D/g, "");
    const identidade = `${contrato.poder}:${contrato.id}`;
    if (cnpj.length !== 14 || vistos.has(identidade)) continue;
    vistos.add(identidade);
    const membro = membros.get(cnpj) ?? { cnpj, razao_social: null, poderes: [], n_contratos: 0, valor: 0 };
    const nomeContrato = contrato.razao_social?.trim();
    if (nomeContrato && (!membro.razao_social || nomeContrato < membro.razao_social)) membro.razao_social = nomeContrato;
    if (!membro.poderes.includes(contrato.poder)) membro.poderes.push(contrato.poder);
    membro.n_contratos++;
    membro.valor += Number.isFinite(contrato.valor) ? contrato.valor ?? 0 : 0;
    membros.set(cnpj, membro);
  }
  const socios = new Map<string, { nome: string; doc: string; cnpjs: Set<string> }>();
  const nomesFornecedores = new Map<string, string>();
  for (const fornecedor of fornecedores) {
    const cnpj = fornecedor.cnpj.replace(/\D/g, "");
    const membro = membros.get(cnpj);
    if (!membro || !Array.isArray(fornecedor.socios)) continue;
    const nomeFornecedor = fornecedor.razao_social?.trim();
    const nomeAnterior = nomesFornecedores.get(cnpj);
    if (nomeFornecedor && (!nomeAnterior || nomeFornecedor < nomeAnterior)) {
      nomesFornecedores.set(cnpj, nomeFornecedor);
      membro.razao_social = nomeFornecedor;
    }
    for (const raw of fornecedor.socios) {
      const socio = socioIdentificado(raw);
      if (!socio) continue;
      const ligacao = socios.get(socio.chave) ?? { nome: socio.nome, doc: socio.doc, cnpjs: new Set<string>() };
      ligacao.cnpjs.add(cnpj);
      socios.set(socio.chave, ligacao);
    }
  }
  const parent = new Map<string, string>();
  function raiz(cnpj: string): string {
    const atual = parent.get(cnpj) ?? cnpj;
    if (atual === cnpj) return cnpj;
    const resultado = raiz(atual);
    parent.set(cnpj, resultado);
    return resultado;
  }
  const conectores = [...socios.values()].filter((s) => s.cnpjs.size > 1);
  for (const socio of conectores) {
    const cnpjs = [...socio.cnpjs].sort();
    for (const cnpj of cnpjs) {
      const a = raiz(cnpjs[0]);
      const b = raiz(cnpj);
      parent.set(a < b ? b : a, a < b ? a : b);
    }
  }
  const componentes = new Map<string, string[]>();
  for (const cnpj of membros.keys()) {
    const chave = raiz(cnpj);
    const lista = componentes.get(chave) ?? [];
    lista.push(cnpj);
    componentes.set(chave, lista);
  }
  const grupos: SnapshotGrupo[] = [];
  for (const componente of componentes.values()) {
    if (componente.length < 2) continue;
    const cnpjs = componente.sort();
    const integrantes = cnpjs.map((cnpj) => {
      const membro = membros.get(cnpj)!;
      return { ...membro, poderes: membro.poderes.sort(), valor: Math.round(membro.valor * 100) / 100 };
    });
    const maior = [...integrantes].sort((a, b) => b.valor - a.valor || a.cnpj.localeCompare(b.cnpj))[0];
    grupos.push({
      chave: cnpjs.join(","),
      rotulo: `${maior.razao_social ?? maior.cnpj} e mais ${cnpjs.length - 1}`,
      tipo: "socio_comum",
      n_empresas: cnpjs.length,
      valor_total: Math.round(integrantes.reduce((s, m) => s + m.valor, 0) * 100) / 100,
      membros: integrantes,
      socios_conectores: conectores.filter((s) => cnpjs.includes([...s.cnpjs][0])).map((s) => ({
        nome: s.nome, doc: s.doc, n_empresas: s.cnpjs.size, cnpjs: [...s.cnpjs].sort(),
      })).sort((a, b) => a.nome.localeCompare(b.nome) || a.doc.localeCompare(b.doc)),
    });
  }
  return grupos.sort((a, b) => a.chave.localeCompare(b.chave));
}
