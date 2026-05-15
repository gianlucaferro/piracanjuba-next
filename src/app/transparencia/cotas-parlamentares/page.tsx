import Link from "next/link";
import { ArrowLeft, ShieldCheck, FileText, ExternalLink } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import {
  fetchCamaraDeclaracaoByTipo,
} from "@/lib/data/camara-declaracoes";
import { fetchVereadoresLista } from "@/lib/data/vereadores";
import CotasParlamentaresCard from "@/components/camara/CotasParlamentaresCard";

export const metadata = pageMetadata({
  title: "Cotas Parlamentares — Inexistentes em Piracanjuba GO",
  description:
    "A Câmara Municipal de Piracanjuba declarou formalmente que não existem cotas ou verba indenizatória parlamentar. Vereadores recebem apenas o subsídio mensal. Declaração oficial via portal LAI Centi 2023-2026.",
  path: "/transparencia/cotas-parlamentares",
});

export const revalidate = 86400;

export default async function CotasParlamentaresPage() {
  const [declaracao, vereadores] = await Promise.all([
    fetchCamaraDeclaracaoByTipo("inexistencia_cotas"),
    fetchVereadoresLista(),
  ]);

  return (
    <div className="container py-6 md:py-10 max-w-3xl space-y-6">
      <Link
        href="/transparencia"
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" /> Transparência
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground inline-flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-emerald-600" />
          Cotas Parlamentares
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Análise da existência (ou não) de cota parlamentar / verba
          indenizatória pra vereadores em Piracanjuba-GO.
        </p>
      </header>

      {declaracao ? (
        <CotasParlamentaresCard declaracao={declaracao} variant="full" />
      ) : (
        <div className="stat-card text-center py-10">
          <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">
            Declaração não encontrada
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Aguardando próxima sincronização com o portal Centi.
          </p>
        </div>
      )}

      {/* Comparativo: o que vereadores RECEBEM */}
      <section className="stat-card space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          O que vereadores em Piracanjuba recebem
        </h2>
        <ul className="space-y-2 text-sm text-foreground/90">
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <div>
              <strong>Subsídio mensal</strong> — remuneração fixa estabelecida
              em lei municipal. Valor exato no perfil de cada vereador.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <div>
              <strong>Diárias</strong> — pagamentos pontuais quando viajam a
              trabalho fora da cidade (capacitações, audiências em Goiânia/Brasília).
              Dado público — em coleta pelo Piracanjuba.AI.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-600 font-bold">✗</span>
            <div>
              <strong>Cota parlamentar / verba indenizatória</strong> — não
              existe. Combustível, divulgação, alimentação, telefonia: não há
              reembolso individual.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-600 font-bold">✗</span>
            <div>
              <strong>Gabinete próprio com equipe</strong> — não há cargos
              comissionados de gabinete individual. Servidores da Câmara são
              compartilhados.
            </div>
          </li>
        </ul>
      </section>

      {/* Comparativo com outras câmaras */}
      <section className="stat-card space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          Comparativo com outras câmaras
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="text-left">
                <th className="px-2 py-2 font-medium text-muted-foreground">Câmara</th>
                <th className="px-2 py-2 font-medium text-muted-foreground">Cota mensal</th>
                <th className="px-2 py-2 font-medium text-muted-foreground">Fonte</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="px-2 py-2 font-semibold text-emerald-700">
                  Piracanjuba (esta Câmara)
                </td>
                <td className="px-2 py-2 text-muted-foreground">Não há</td>
                <td className="px-2 py-2 text-xs text-muted-foreground">
                  Declaração oficial 2026
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="px-2 py-2 text-foreground">Câmara de Goiânia</td>
                <td className="px-2 py-2 text-muted-foreground">~R$ 25.000/mês</td>
                <td className="px-2 py-2 text-xs text-muted-foreground">
                  Resolução 32/2021
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="px-2 py-2 text-foreground">Câmara dos Deputados</td>
                <td className="px-2 py-2 text-muted-foreground">~R$ 45.000/mês</td>
                <td className="px-2 py-2 text-xs text-muted-foreground">
                  Cota Atividade Parlamentar (CEAP)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground italic">
          Valores aproximados pra contexto. A ausência em Piracanjuba pode ser
          vista como economia ao contribuinte municipal — em um vereador de
          Goiânia, a cota anual chega a R$ 300.000.
        </p>
      </section>

      {/* Lista vereadores */}
      <section className="stat-card space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          Vereadores do mandato 2025-2028
        </h2>
        <p className="text-xs text-muted-foreground">
          Todos recebem apenas o subsídio mensal. Veja remuneração detalhada
          clicando em cada perfil.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {vereadores.map((v) => (
            <Link
              key={v.id}
              href={`/vereadores/${v.slug}`}
              className="text-xs text-foreground hover:text-primary border border-border rounded-md px-3 py-2 inline-flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {v.nome.split(" ").slice(0, 2).join(" ")}
            </Link>
          ))}
        </div>
      </section>

      <footer className="text-xs text-muted-foreground border-t border-border pt-4">
        <p>
          Dados extraídos automaticamente do portal LAI Centi da Câmara de
          Piracanjuba. Última verificação: {new Date().toLocaleDateString("pt-BR")}.
        </p>
      </footer>
    </div>
  );
}
