import { Phone, ExternalLink, Smartphone } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import {
  HORARIO_PREFEITURA,
  TELEFONES,
  formatarTelefone,
  linkTelefone,
  type TelefonePublico,
} from "@/data/telefones";

export const metadata = pageMetadata({
  title: "Contatos Úteis de Piracanjuba GO",
  description:
    "Telefones e WhatsApp de serviços públicos essenciais de Piracanjuba: Polícia, Bombeiros, SAMU, Prefeitura e mais.",
  path: "/contatos",
});

type ContatoItem =
  | { nome: string; telefone: TelefonePublico; detalhe?: string; mensagem?: string }
  | { nome: string; url: string; display: string };

const contatos: { categoria: string; itens: ContatoItem[] }[] = [
  {
    categoria: "Segurança",
    itens: [
      { nome: "Polícia Militar 1", telefone: TELEFONES.policiaMilitar1 },
      { nome: "Polícia Militar 2", telefone: TELEFONES.policiaMilitar2 },
      { nome: "CPE 10 (GPT)", telefone: TELEFONES.cpe10 },
      { nome: "Bombeiros Piracanjuba", telefone: TELEFONES.bombeiros },
      { nome: "Delegacia de Polícia Civil", telefone: TELEFONES.delegacia },
      { nome: "Delegacia de Polícia Civil (celular)", telefone: TELEFONES.delegaciaCelular },
      {
        nome: "Delegacia Virtual (Registre Ocorrência Online)",
        display: "raivirtual.ssp.go.gov.br",
        url: "https://raivirtual.ssp.go.gov.br/#/",
      },
      { nome: "Conselho Tutelar", telefone: TELEFONES.conselhoTutelar },
    ],
  },
  {
    categoria: "Saúde",
    itens: [
      { nome: "Base do SAMU", telefone: TELEFONES.samu },
      { nome: "CAPS", telefone: TELEFONES.caps },
    ],
  },
  {
    categoria: "Serviços Públicos",
    itens: [
      {
        nome: "Prefeitura Municipal (telefone fixo)",
        telefone: TELEFONES.prefeituraFixo,
        detalhe: HORARIO_PREFEITURA,
      },
      { nome: "Prefeitura Municipal (WhatsApp)", telefone: TELEFONES.prefeituraCelular },
      { nome: "Secretaria de Obras", telefone: TELEFONES.secObras },
      { nome: "Secretaria Assistência Social", telefone: TELEFONES.secAssistenciaSocial },
      { nome: "Secretaria de Esportes", telefone: TELEFONES.secEsportes },
      { nome: "CREAS", telefone: TELEFONES.creas },
      { nome: "Cad Único / Bolsa Família", telefone: TELEFONES.cadUnico },
      { nome: "SINE", telefone: TELEFONES.sine },
      { nome: "SAMARH", telefone: TELEFONES.samarh },
      { nome: "Gabinete Sec. Educação", telefone: TELEFONES.gabineteEducacao },
      { nome: "Secretaria de Saúde", telefone: TELEFONES.secSaude },
      { nome: "Secretaria de Educação", telefone: TELEFONES.secEducacao },
      { nome: "Clínica de Castração", telefone: TELEFONES.clinicaCastracao },
      { nome: "Dept. Fiscalização e Postura", telefone: TELEFONES.fiscalizacaoPostura },
      {
        nome: "Troca de Lâmpada de Poste",
        telefone: TELEFONES.trocaLampada,
        mensagem:
          "Olá, gostaria de solicitar a troca de lâmpada de poste.\n\nNúmero do poste: \n\nEndereço: \n\nAnexe foto do local.",
      },
    ],
  },
];

// Fontes oficiais dos números conferidos que aparecem nesta página.
const fontesConferidas = Array.from(
  new Map(
    contatos
      .flatMap((grupo) => grupo.itens)
      .flatMap((item) => ("telefone" in item && item.telefone.fonte ? [item.telefone.fonte] : []))
      .map((fonte) => [fonte.url, fonte] as const),
  ).values(),
);

export default function ContatosUteisPage() {
  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Phone className="w-6 h-6 text-primary" />
          Contatos Úteis
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Telefones e WhatsApp de serviços públicos essenciais de Piracanjuba.
        </p>
      </div>

      {contatos.map((grupo) => (
        <section key={grupo.categoria}>
          <h2 className="text-lg font-semibold text-foreground mb-3">{grupo.categoria}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {grupo.itens.map((item) => {
              const isLink = "url" in item;
              const isTelefone = !isLink && item.telefone.canal === "telefone";
              const href = isLink ? item.url : linkTelefone(item.telefone, item.mensagem);
              const display = isLink ? item.display : formatarTelefone(item.telefone.numero);
              const opensNew = !isTelefone;
              return (
                <a
                  key={item.nome}
                  href={href}
                  target={opensNew ? "_blank" : undefined}
                  rel={opensNew ? "noopener noreferrer" : undefined}
                  className="stat-card card-hover flex items-center gap-3 group"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor:
                        isLink || isTelefone ? "hsl(var(--primary) / 0.12)" : "#25D36620",
                    }}
                  >
                    {isLink ? (
                      <ExternalLink className="w-5 h-5 text-primary" />
                    ) : isTelefone ? (
                      <Smartphone className="w-5 h-5 text-primary" />
                    ) : (
                      <WhatsAppIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.nome}</p>
                    <p className="text-sm text-muted-foreground">{display}</p>
                    {!isLink && item.detalhe && (
                      <p className="text-xs text-muted-foreground">{item.detalhe}</p>
                    )}
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </a>
              );
            })}
          </div>
        </section>
      ))}

      {fontesConferidas.length > 0 && (
        <p className="text-xs text-muted-foreground border-t border-border pt-4">
          Telefones da Prefeitura, das secretarias de Saúde, Assistência Social, Esportes,
          Obras e Agricultura e da Delegacia conferidos em{" "}
          {fontesConferidas[0].conferidoEm} nas fontes oficiais:{" "}
          {fontesConferidas.map((fonte, i) => (
            <span key={fonte.url}>
              {i > 0 && "; "}
              <a
                href={fonte.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {fonte.nome}
              </a>
            </span>
          ))}
          .
        </p>
      )}
    </div>
  );
}
