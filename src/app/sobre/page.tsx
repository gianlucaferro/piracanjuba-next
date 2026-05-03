import { ExternalLink, Heart, CreditCard } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import PixDonation from "./PixDonation";
import SubscriptionForm from "./SubscriptionForm";

export const metadata = pageMetadata({
  title: "Sobre o Piracanjuba.ai — Transparência com IA",
  description:
    "Sobre o projeto Piracanjuba.ai: metodologia, fontes oficiais, política de dados e como apoiar a transparência municipal de Piracanjuba GO.",
  path: "/sobre",
});

const fontes = [
  {
    label: "Portal da Transparência — Piracanjuba",
    url: "https://acessoainformacao.camaradepiracanjuba.go.gov.br/",
  },
  { label: "Site da Prefeitura de Piracanjuba", url: "https://www.piracanjuba.go.gov.br/" },
  { label: "Lista de vereadores", url: "https://camaradepiracanjuba.go.gov.br/vereadores/" },
  {
    label: "Projetos de leis",
    url: "https://acessoainformacao.camaradepiracanjuba.go.gov.br/projetos-de-leis/",
  },
  {
    label: "Resultados de votações",
    url: "https://acessoainformacao.camaradepiracanjuba.go.gov.br/acesso-aos-resultados-das-votacoes/",
  },
  {
    label: "Tabela remuneratória",
    url: "https://acessoainformacao.camaradepiracanjuba.go.gov.br/tabela-de-cargos-e-funcoes/",
  },
  {
    label: "Folha de pagamento",
    url: "https://camarapiracanjuba.centi.com.br/servidor/remuneracao",
  },
];

export default function SobrePage() {
  return (
    <div className="container py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">Sobre o Piracanjuba.ai</h1>

      <div className="stat-card mb-6">
        <p className="text-sm text-foreground leading-relaxed mb-3">
          O <strong>Piracanjuba.ai</strong> é uma ferramenta independente de transparência
          do município de Piracanjuba, GO, criada e mantida por Gianluca Ferro.
        </p>
        <p className="text-sm text-foreground leading-relaxed mb-3">
          O projeto não possui vínculo com a Prefeitura, a Câmara Municipal ou qualquer
          órgão público e usa inteligência artificial para facilitar o acesso às
          informações públicas, sempre com base em dados oficiais.
        </p>
        <p className="text-sm text-foreground leading-relaxed">
          Aqui, qualquer cidadão pode acompanhar projetos, contratos, votações e dados
          de remuneração de forma simples, rápida e verificável, com links diretos para
          os portais de origem.
        </p>
      </div>

      <div
        id="apoie"
        className="stat-card mb-6 border-accent/30 bg-accent/5 scroll-mt-20"
      >
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">
            Piracanjuba.ai precisa da sua ajuda
          </h2>
        </div>

        <p className="text-sm text-foreground leading-relaxed mb-3">
          O projeto está sendo muito elogiado, mas{" "}
          <strong className="text-foreground">
            quase ninguém contribui financeiramente
          </strong>
          . Hoje, os custos estão sendo bancados sozinho por mim.
        </p>

        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          Se cada pessoa que acredita no projeto ajudar com um pequeno valor, fica muito
          mais viável manter a plataforma ativa e evoluindo.
        </p>

        <p className="text-sm text-foreground font-medium leading-relaxed mb-5">
          Contribua com PIX e ajude a manter essa iniciativa independente para nossa cidade.
        </p>

        <PixDonation />

        <div className="mt-5 pt-5 border-t-2 border-accent/30">
          <div className="flex items-center gap-2.5 mb-4 bg-accent/10 rounded-lg px-4 py-3">
            <CreditCard className="w-5 h-5 text-accent shrink-0" />
            <p className="text-base font-semibold text-foreground">
              Em breve: doação por cartão de crédito
            </p>
          </div>
        </div>
      </div>

      <blockquote className="my-6 border-l-4 border-accent pl-4 py-3">
        <p className="text-lg md:text-xl font-semibold italic text-foreground">
          &quot;Todo poder emana do povo.&quot;
        </p>
        <cite className="text-sm text-muted-foreground not-italic mt-1 block">
          — Constituição Federal do Brasil
        </cite>
      </blockquote>

      <div id="alertas" className="stat-card mb-8 border-primary/20">
        <SubscriptionForm />
      </div>

      <h2 className="text-lg font-semibold text-foreground mb-4">Fontes oficiais</h2>
      <div className="space-y-2 mb-8">
        {fontes.map((f) => (
          <a
            key={f.url}
            href={f.url}
            target="_blank"
            rel="noopener noreferrer"
            className="stat-card card-hover flex items-center justify-between"
          >
            <span className="text-sm font-medium text-foreground">{f.label}</span>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>
        ))}
      </div>

      <h2 className="text-lg font-semibold text-foreground mb-4">Política de dados</h2>
      <div className="stat-card">
        <ul className="text-sm text-foreground space-y-2 list-disc list-inside">
          <li>Utilizamos apenas dados públicos disponíveis nos portais oficiais</li>
          <li>Não é necessário cadastro para navegar pelo app</li>
          <li>
            E-mails de assinatura são usados apenas para enviar atualizações semanais
          </li>
          <li>
            Este app não tem vínculo com a Prefeitura, a Câmara Municipal ou qualquer
            órgão público
          </li>
        </ul>
      </div>
    </div>
  );
}
