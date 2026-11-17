import { Lock, MapPin, Search } from "lucide-react";

// Ilustração do topo para empresa de sites e presença digital, feita só em
// HTML e CSS: um site de negócio genérico, um cartão de resultado de busca e
// o pino da marca. Sem imagem gerada, sem captura de cliente e sem logotipo
// de terceiros. As medidas internas usam cqw (largura do contêiner), para a
// peça escalar igual no celular e no computador.

const LINHA = "block rounded-full bg-[var(--marca-borda)]";

function Pino({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 2C7.6 2 4 5.5 4 9.9c0 5.6 6.9 11.1 7.45 11.5.33.24.77.24 1.1 0C13.1 21 20 15.5 20 9.9 20 5.5 16.4 2 12 2z"
        fill="var(--marca-acento-escuro)"
      />
      <path
        d="M12 5.7c.42 2.4 1.08 3.24 3.48 3.72-2.4.48-3.06 1.32-3.48 3.72-.42-2.4-1.08-3.24-3.48-3.72 2.4-.48 3.06-1.32 3.48-3.72z"
        fill="var(--marca-fundo)"
      />
    </svg>
  );
}

export default function IlustracaoPresenca() {
  const cartao =
    "absolute overflow-hidden rounded-[var(--marca-raio)] border border-[var(--marca-borda)] bg-[var(--marca-superficie)] shadow-[0_20px_40px_-26px_rgb(22_20_14/0.5)]";
  return (
    <figure className="mx-auto w-[min(100%,60svh)] md:w-full md:max-w-[30rem]">
      <div
        role="img"
        aria-label="Ilustração: página de um negócio aberta no navegador, um resultado de busca e um pino de localização"
        className="@container relative aspect-[4/3] md:aspect-square"
      >
        <div aria-hidden="true" className="absolute inset-0">
          {/* Brilho laranja atrás das peças */}
          <div className="absolute top-[4%] right-[2%] h-[70%] w-[75%] rounded-full bg-[radial-gradient(closest-side,rgb(232_93_28/0.16),rgb(232_93_28/0))]" />

          {/* Navegador com o site de um negócio */}
          <div className={`${cartao} top-[3%] right-0 w-[84%] md:top-[6%]`}>
            <div className="flex items-center gap-[1.6cqw] border-b border-[var(--marca-borda)] bg-[var(--marca-fundo)] px-[3cqw] py-[2.2cqw]">
              <span className="size-[2.2cqw] rounded-full bg-[#e9b9a1]" />
              <span className="size-[2.2cqw] rounded-full bg-[#ecd9b8]" />
              <span className="size-[2.2cqw] rounded-full bg-[#d8ccb8]" />
              <span className="ml-[2cqw] flex h-[5cqw] flex-1 items-center gap-[1.4cqw] rounded-full bg-[var(--marca-superficie)] px-[2.4cqw]">
                <Lock className="size-[2.6cqw] text-[var(--marca-texto-suave)]" strokeWidth={2.25} />
                <span className={`${LINHA} h-[1.4cqw] w-[38%]`} />
              </span>
            </div>
            <div className="space-y-[3cqw] p-[4.5cqw]">
              <div className="flex items-center gap-[2cqw]">
                <span className="size-[5cqw] rounded-[1.2cqw] bg-[var(--marca-texto)]" />
                <span className={`${LINHA} h-[1.6cqw] w-[24%]`} />
                <span className={`${LINHA} ml-auto h-[1.6cqw] w-[12%]`} />
                <span className={`${LINHA} h-[1.6cqw] w-[12%]`} />
              </div>
              <p
                className="pt-[1.5cqw] text-[6.4cqw] leading-[1.05] font-bold tracking-[-0.03em] text-[var(--marca-texto)]"
                style={{ fontFamily: "var(--fonte-marca-titulo), system-ui, sans-serif" }}
              >
                Seu negócio
              </p>
              <div className="space-y-[1.6cqw]">
                <span className={`${LINHA} h-[1.6cqw] w-[78%]`} />
                <span className={`${LINHA} h-[1.6cqw] w-[56%]`} />
              </div>
              <span className="inline-flex h-[6.4cqw] items-center gap-[1.4cqw] rounded-[1.6cqw] bg-[var(--marca-primaria)] px-[3cqw]">
                <span className="size-[2.6cqw] rounded-full bg-white/90" />
                <span className="block h-[1.4cqw] w-[13cqw] rounded-full bg-white/80" />
              </span>
              <div className="grid grid-cols-3 gap-[2cqw] pt-[1cqw]">
                <span className="h-[8cqw] rounded-[1.6cqw] bg-[var(--marca-fundo)]" />
                <span className="h-[8cqw] rounded-[1.6cqw] bg-[var(--marca-fundo)]" />
                <span className="h-[8cqw] rounded-[1.6cqw] bg-[var(--marca-fundo)]" />
              </div>
            </div>
          </div>

          {/* Cartão de resultado de busca */}
          <div className={`${cartao} bottom-[2%] left-0 w-[66%] p-[3.6cqw] md:bottom-[5%]`}>
            <div className="flex h-[6.4cqw] items-center gap-[1.8cqw] rounded-full border border-[var(--marca-borda)] px-[2.6cqw]">
              <Search className="size-[3cqw] text-[var(--marca-texto-suave)]" strokeWidth={2.25} />
              <span className={`${LINHA} h-[1.4cqw] w-[52%]`} />
            </div>
            <div className="mt-[3.2cqw] flex items-start gap-[2.4cqw]">
              <span className="mt-[0.4cqw] flex size-[5.4cqw] shrink-0 items-center justify-center rounded-full bg-[var(--marca-fundo)]">
                <span className="size-[2.4cqw] rounded-[0.6cqw] bg-[var(--marca-texto)]" />
              </span>
              <div className="min-w-0 flex-1 space-y-[1.4cqw]">
                <p className="text-[3.6cqw] leading-tight font-semibold text-[var(--marca-texto)]">
                  Seu negócio
                </p>
                <p className="flex items-center gap-[1cqw] text-[2.8cqw] leading-tight text-[var(--marca-texto-suave)]">
                  <MapPin className="size-[2.8cqw] shrink-0" strokeWidth={2.25} />
                  Piracanjuba, GO
                </p>
                <span className={`${LINHA} h-[1.3cqw] w-[92%]`} />
                <span className={`${LINHA} h-[1.3cqw] w-[70%]`} />
              </div>
            </div>
          </div>

          {/* Pino da marca, com sombra de contato */}
          <div className="absolute top-[2%] left-[4%] w-[17%] md:top-[4%]">
            <Pino className="w-full drop-shadow-[0_10px_14px_rgb(203_63_10/0.28)]" />
            <span className="mx-auto mt-[1.4cqw] block h-[2cqw] w-[60%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(27_26_20/0.22),rgb(27_26_20/0))]" />
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-right text-xs font-semibold tracking-[0.16em] text-[var(--marca-texto-suave)] uppercase">
        Ilustração
      </figcaption>
    </figure>
  );
}
