import Image from "next/image";
import {
  Building2,
  Briefcase,
  FileSignature,
  Hammer,
  Gavel,
  Receipt,
  Mail,
  Phone,
  Users,
} from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchPrefeituraOverview } from "@/lib/data/prefeitura";

export const metadata = pageMetadata({
  title: "Prefeitura de Piracanjuba GO",
  description:
    "Dados da Prefeitura de Piracanjuba: prefeito, vice, secretarias, servidores, contratos, obras, licitações e despesas públicas.",
  path: "/prefeitura",
});

export const revalidate = 3600;

function fmtBRL(n: number | null | undefined) {
  if (n == null) return "—";
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PrefeituraPage() {
  const data = await fetchPrefeituraOverview();
  const { executivo, secretarias, servidoresCount, contratosAtivos, obras, licitacoes, despesas } = data;

  const prefeito = executivo.find(
    (e) => e.tipo?.toLowerCase().includes("prefeit") && !e.tipo?.toLowerCase().includes("vice")
  );
  const vice = executivo.find((e) => e.tipo?.toLowerCase().includes("vice"));

  return (
    <>
      <section className="bg-gradient-to-br from-primary/15 to-primary/5 border-b border-border">
        <div className="container py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Building2 className="w-8 h-8 text-primary" />
            Prefeitura de Piracanjuba
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Dados públicos do Poder Executivo de Piracanjuba: prefeita, vice, secretarias,
            servidores, contratos, obras e licitações.
          </p>
        </div>
      </section>

      <div className="container py-8 space-y-10">
        {/* Prefeito + Vice */}
        {(prefeito || vice) && (
          <section aria-labelledby="heading-executivo">
            <h2 id="heading-executivo" className="sr-only">Prefeita e vice</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {prefeito && <ExecutivoCard {...prefeito} role="Prefeita" />}
              {vice && <ExecutivoCard {...vice} role="Vice-Prefeito(a)" />}
            </div>
          </section>
        )}

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard label="Secretarias" value={secretarias.length.toString()} icon={Briefcase} />
          <StatCard label="Servidores" value={servidoresCount.toLocaleString("pt-BR")} icon={Users} />
          <StatCard label="Contratos ativos" value={contratosAtivos.toLocaleString("pt-BR")} icon={FileSignature} />
          <StatCard label="Obras" value={obras.toLocaleString("pt-BR")} icon={Hammer} />
          <StatCard label="Licitações" value={licitacoes.toLocaleString("pt-BR")} icon={Gavel} />
          <StatCard label="Despesas" value={despesas.toLocaleString("pt-BR")} icon={Receipt} />
        </section>

        {/* Secretarias */}
        {secretarias.length > 0 && (
          <section aria-labelledby="heading-secretarias">
            <h2 id="heading-secretarias" className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5 text-primary" />
              Secretarias Municipais ({secretarias.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {secretarias.map((s) => (
                <article key={s.id} className="stat-card">
                  <div className="flex items-start gap-3">
                    {s.foto_url ? (
                      <Image
                        src={s.foto_url}
                        alt={s.nome}
                        width={48}
                        height={48}
                        className="rounded-full object-cover ring-1 ring-border shrink-0"
                        unoptimized
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Briefcase className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm">{s.nome}</h3>
                      {s.secretario_nome && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Secretário(a): <span className="text-foreground">{s.secretario_nome}</span>
                        </p>
                      )}
                      {s.subsidio != null && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Subsídio: <span className="text-foreground font-medium">{fmtBRL(Number(s.subsidio))}</span>
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-1.5 text-[11px]">
                        {s.email && (
                          <a href={`mailto:${s.email}`} className="text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {s.email}
                          </a>
                        )}
                        {s.telefone && (
                          <a href={`tel:${s.telefone}`} className="text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {s.telefone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="text-xs text-muted-foreground pt-6 border-t border-border">
          <p>
            Fonte oficial:{" "}
            <a
              href="https://piracanjuba.go.gov.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              piracanjuba.go.gov.br
            </a>{" "}
            e Portal da Transparência.
          </p>
        </section>
      </div>
    </>
  );
}

function ExecutivoCard({
  nome,
  partido,
  foto_url,
  mandato_inicio,
  mandato_fim,
  telefone,
  email,
  role,
}: {
  nome: string;
  partido: string | null;
  foto_url: string | null;
  mandato_inicio: string | null;
  mandato_fim: string | null;
  telefone: string | null;
  email: string | null;
  role: string;
}) {
  const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");
  return (
    <article className="stat-card flex items-start gap-4">
      {foto_url ? (
        <Image
          src={foto_url}
          alt={nome}
          width={80}
          height={80}
          className="rounded-2xl object-cover ring-1 ring-border shrink-0"
          unoptimized
        />
      ) : (
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{role}</p>
        <h3 className="font-bold text-foreground text-lg">{nome}</h3>
        <p className="text-xs text-muted-foreground">
          {partido || "Sem partido"}
          {mandato_inicio && (
            <span className="ml-2">
              · Mandato {fmtDate(mandato_inicio)} a {fmtDate(mandato_fim)}
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-3 mt-2 text-xs">
          {telefone && (
            <a href={`tel:${telefone}`} className="text-muted-foreground hover:text-primary inline-flex items-center gap-1">
              <Phone className="w-3 h-3" /> {telefone}
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="text-muted-foreground hover:text-primary inline-flex items-center gap-1">
              <Mail className="w-3 h-3" /> {email}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="stat-card text-center">
      <Icon className="w-5 h-5 text-primary mx-auto mb-1" />
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}
