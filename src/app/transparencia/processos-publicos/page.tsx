import Link from "next/link";
import Image from "next/image";
import { Scale, AlertTriangle, Users, ExternalLink, ShieldCheck } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchPessoasPublicasResumo } from "@/lib/data/processos-publicos";
import { contestacaoMailto } from "@/lib/contestacao";

export const metadata = pageMetadata({
  title: "Processos Judiciais de Agentes Públicos de Piracanjuba",
  description:
    "Consulta pública dos processos judiciais de vereadores, prefeito, vice-prefeito e secretários de Piracanjuba-GO. Atualização trimestral via Escavador (integrado ao Datajud/CNJ). Filtros: sem segredo de justiça, sem vítimas, sem ações de família, sem atuação apenas como advogado.",
  path: "/transparencia/processos-publicos",
});

export const revalidate = 3600;

const CARGO_LABEL: Record<string, string> = {
  vereador: "Vereador(a)",
  presidente_camara: "Presidente da Câmara",
  prefeito: "Prefeito(a)",
  vice_prefeito: "Vice-Prefeito(a)",
  secretario: "Secretário(a)",
  servidor_comissionado: "Servidor Comissionado",
};

const CARGO_ORDEM: Record<string, number> = {
  prefeito: 1,
  vice_prefeito: 2,
  secretario: 3,
  presidente_camara: 4,
  vereador: 5,
  servidor_comissionado: 6,
};

function fmtDateTime(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

export default async function ProcessosPublicosIndex() {
  const pessoas = await fetchPessoasPublicasResumo();
  const totalProcessos = pessoas.reduce((acc, p) => acc + p.total_processos, 0);

  // Agrupar por cargo_categoria
  const grupos = new Map<string, typeof pessoas>();
  for (const p of pessoas) {
    const key = p.cargo_categoria;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(p);
  }
  const gruposOrdenados = Array.from(grupos.entries()).sort(
    ([a], [b]) => (CARGO_ORDEM[a] ?? 99) - (CARGO_ORDEM[b] ?? 99),
  );

  return (
    <div className="container py-6 md:py-10 space-y-8 max-w-5xl">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground inline-flex items-center gap-2">
          <Scale className="w-7 h-7 text-amber-600" />
          Processos Judiciais de Agentes Públicos
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Consulta pública dos processos judiciais que envolvem vereadores,
          prefeito, vice-prefeito e secretários municipais de Piracanjuba-GO.
          Atualização automática trimestral via API do Escavador (integrada ao
          Datajud/CNJ e demais bases públicas de tribunais brasileiros).
        </p>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2">
          <span className="inline-flex items-center gap-1">
            <Users className="w-4 h-4" />
            <strong className="text-foreground">{pessoas.length}</strong>{" "}
            pessoas monitoradas
          </span>
          <span>
            <strong className="text-foreground">{totalProcessos}</strong>{" "}
            processos públicos
          </span>
        </div>
      </header>

      {/* Base legal */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-muted-foreground leading-relaxed">
        <p className="font-semibold text-foreground inline-flex items-center gap-1 mb-2">
          <AlertTriangle className="w-3.5 h-3.5 text-blue-600" />
          Base legal e filtros aplicados
        </p>
        <p>
          Esta consulta exerce o direito constitucional à publicidade dos atos
          de agentes públicos (
          <strong>CF art. 37</strong>, <strong>Lei 12.527/2011</strong>{" "}
          — Acesso à Informação) e respeita a LGPD (art. 7º IX — interesse
          legítimo na fiscalização da gestão pública).
        </p>
        <p className="mt-2">
          Filtros automáticos aplicados — <strong>NÃO são exibidos</strong>:
          processos em <strong>segredo de justiça</strong>,{" "}
          <strong>ações de família</strong>, casos em que a pessoa figura como{" "}
          <strong>vítima/testemunha</strong>,{" "}
          <strong>interessado/terceiro</strong> em jurisdição voluntária, ou em
          que atua <strong>apenas como advogado de terceiros</strong> (não como
          parte). Somente processos onde o agente público figura como{" "}
          <strong>autor ou réu</strong> aparecem aqui.
        </p>
        <p className="mt-2">
          Cada processo traz um <strong>resumo gerado por IA</strong> (Gemini
          2.5) com base nas movimentações públicas, explicando a natureza, as
          partes e a situação atual em linguagem acessível.
        </p>
      </div>

      {/* Termo de Uso */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-muted-foreground leading-relaxed">
        <p className="font-semibold text-foreground inline-flex items-center gap-1 mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
          Termo de Uso e Aviso Legal
        </p>
        <ul className="list-disc pl-4 space-y-1.5">
          <li>
            Os dados aqui exibidos são{" "}
            <strong>meramente informativos</strong> e foram extraídos
            automaticamente de <strong>bases públicas oficiais</strong>{" "}
            (Datajud/CNJ e tribunais brasileiros) via API do Escavador. Podem{" "}
            <strong>conter imprecisões, atrasos ou erros de classificação</strong>{" "}
            inerentes a sistemas automatizados.
          </li>
          <li>
            A <strong>presunção de inocência é inviolável</strong>{" "}
            (Constituição Federal,{" "}
            <strong>art. 5º, inciso LVII</strong>: &ldquo;ninguém será
            considerado culpado até o trânsito em julgado de sentença penal
            condenatória&rdquo;). A existência de processo judicial — em
            especial criminal — <strong>não significa culpa</strong>, condenação
            nem prática de qualquer ilícito.
          </li>
          <li>
            Os <strong>resumos gerados por inteligência artificial</strong> são
            descritivos das movimentações públicas e podem conter imprecisões.
            Não constituem aconselhamento jurídico, opinião editorial nem
            juízo de valor sobre as partes.
          </li>
          <li>
            Encontrou imprecisão, dado incorreto ou processo que não deveria
            estar listado?{" "}
            <a
              href={contestacaoMailto()}
              className="underline hover:text-foreground inline-flex items-center gap-0.5"
            >
              Solicite revisão <ExternalLink className="w-3 h-3" />
            </a>
            . Respondemos em até <strong>72 horas úteis</strong>.
          </li>
        </ul>
      </div>

      {/* Grupos por cargo */}
      {pessoas.length === 0 ? (
        <div className="stat-card text-center py-10">
          <Scale className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">
            Nenhuma pessoa pública cadastrada ainda
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Em breve: vereadores, prefeito, vice e secretários.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {gruposOrdenados.map(([cargo, lista]) => (
            <section key={cargo}>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                {CARGO_LABEL[cargo] || cargo}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({lista.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {lista.map((p) => (
                  <PessoaCard key={p.id} pessoa={p} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <footer className="text-xs text-muted-foreground border-t border-border pt-4">
        <p>
          Fonte:{" "}
          <a
            href="https://www.escavador.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground inline-flex items-center gap-0.5"
          >
            Escavador <ExternalLink className="w-3 h-3" />
          </a>{" "}
          (API oficial integrada ao Datajud/CNJ e bases públicas de tribunais
          brasileiros). Atualizações automáticas no dia 1 dos meses de janeiro,
          abril, julho e outubro.
        </p>
      </footer>
    </div>
  );
}

function PessoaCard({
  pessoa,
}: {
  pessoa: {
    id: string;
    nome: string;
    nome_publico: string | null;
    cargo_detalhe: string | null;
    vereador_slug: string | null;
    foto_url: string | null;
    total_processos: number;
    ultima_atualizacao: string | null;
  };
}) {
  const href = pessoa.vereador_slug
    ? `/vereadores/${pessoa.vereador_slug}`
    : null;
  const inner = (
    <div className="stat-card hover:border-primary/40 transition-colors space-y-2 h-full">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted flex-shrink-0 ring-1 ring-border">
          {pessoa.foto_url ? (
            <Image
              src={pessoa.foto_url}
              alt={pessoa.nome}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-bold">
              {pessoa.nome
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {pessoa.nome_publico || pessoa.nome}
          </p>
          {pessoa.cargo_detalhe && (
            <p className="text-[11px] text-muted-foreground truncate">
              {pessoa.cargo_detalhe}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs pt-1">
        <span
          className={`font-semibold ${
            pessoa.total_processos > 0
              ? "text-amber-700"
              : "text-emerald-700"
          }`}
        >
          {pessoa.total_processos === 0
            ? "Nenhum processo"
            : `${pessoa.total_processos} processo${pessoa.total_processos > 1 ? "s" : ""}`}
        </span>
        {pessoa.ultima_atualizacao && (
          <span className="text-muted-foreground">
            Atualizado: {fmtDateTime(pessoa.ultima_atualizacao)}
          </span>
        )}
      </div>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
