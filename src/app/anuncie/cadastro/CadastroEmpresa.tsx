"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Check, CheckCircle2, Copy, CreditCard, Loader2, QrCode } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LINK_STRIPE_PAGINA_EMPRESA, PIX_RECEBEDOR, PRECO_PAGINA_EMPRESA, PRECO_PAGINA_EMPRESA_TEXTO } from "@/data/paginaEmpresa";
import {
  CAMPO_ISCA,
  camposVazios,
  codigoValido,
  linkCartaoDoPedido,
  linkComprovante,
  montarCorpoPedido,
  pixDoPedido,
  sugerirEndereco,
  type CampoPedido,
  type CamposPedido,
  type FormaPagamento,
} from "@/lib/pedidoPaginaEmpresa";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import EtapasCadastro, { type Etapa } from "./EtapasCadastro";
import ResumoPedido from "./ResumoPedido";

// Rascunho e pedido ficam só nesta aba (sessionStorage): somem ao fechar a aba.
const CHAVE_RASCUNHO = "pba:cadastro-empresa:rascunho";
const CHAVE_PEDIDO = "pba:cadastro-empresa:pedido";
const ERRO_PADRAO = "Não foi possível registrar o pedido agora. Tente de novo ou fale no WhatsApp.";
const VALOR_EXTENSO = `R$ ${PRECO_PAGINA_EMPRESA.toFixed(2).replace(".", ",")}`;

type Pedido = { codigo: string; forma: FormaPagamento };

function ler<T>(chave: string): T | null {
  try {
    const bruto = window.sessionStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown) {
  try {
    if (valor === null) window.sessionStorage.removeItem(chave);
    else window.sessionStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // Aba privada ou armazenamento bloqueado: o formulário segue funcionando.
  }
}

async function mensagemDeErro(erro: unknown): Promise<string> {
  const contexto = (erro as { context?: unknown } | null)?.context;
  if (contexto instanceof Response) {
    try {
      const corpo = await contexto.json();
      if (typeof corpo?.erro === "string") return corpo.erro;
    } catch {
      // resposta sem JSON
    }
  }
  return ERRO_PADRAO;
}

const ESTILO_INPUT = "min-h-11 text-base";

function Campo({
  id,
  rotulo,
  obrigatorio,
  dica,
  children,
}: {
  id: string;
  rotulo: string;
  obrigatorio?: boolean;
  dica?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {rotulo}
        {obrigatorio && (
          <span className="text-red-700 dark:text-red-400" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {dica && (
        <p id={`${id}-dica`} className="text-xs text-foreground/70">
          {dica}
        </p>
      )}
    </div>
  );
}

export default function CadastroEmpresa() {
  const [campos, setCampos] = useState<CamposPedido>(camposVazios);
  const [forma, setForma] = useState<FormaPagamento>("pix");
  const [consentimento, setConsentimento] = useState(false);
  const [isca, setIsca] = useState("");
  const [etapa, setEtapa] = useState<Etapa>("dados");
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<"nao" | "sim" | "falhou">("nao");
  const [carregado, setCarregado] = useState(false);
  const tituloEtapa = useRef<HTMLHeadingElement>(null);
  const tituloDados = useRef<HTMLHeadingElement>(null);
  const voltouParaDados = useRef(false);
  const cartaoDisponivel = Boolean(LINK_STRIPE_PAGINA_EMPRESA);

  // Restaura rascunho e pedido desta aba depois de montar (evita divergir do HTML do servidor).
  useEffect(() => {
    const rascunho = ler<Partial<CamposPedido>>(CHAVE_RASCUNHO);
    const salvo = ler<Pedido>(CHAVE_PEDIDO);
    queueMicrotask(() => {
      if (rascunho) setCampos((atual) => ({ ...atual, ...rascunho }));
      if (salvo && codigoValido(salvo.codigo) && (salvo.forma === "pix" || salvo.forma === "cartao")) {
        setPedido(salvo);
        setForma(salvo.forma);
        setEtapa("pagamento");
      }
      setCarregado(true);
    });
  }, []);

  useEffect(() => {
    if (carregado && etapa === "dados") gravar(CHAVE_RASCUNHO, campos);
  }, [campos, carregado, etapa]);

  useEffect(() => {
    if (etapa !== "dados") tituloEtapa.current?.focus();
    else if (voltouParaDados.current) {
      voltouParaDados.current = false;
      tituloDados.current?.focus();
    }
  }, [etapa]);

  function alterar(campo: CampoPedido, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  function apagarRascunho() {
    gravar(CHAVE_RASCUNHO, null);
    setCampos(camposVazios());
  }

  function novoPedido() {
    gravar(CHAVE_PEDIDO, null);
    gravar(CHAVE_RASCUNHO, null);
    setCampos(camposVazios());
    setConsentimento(false);
    setIsca("");
    setErro(null);
    setForma("pix");
    setPedido(null);
    setCopiado("nao");
    voltouParaDados.current = true;
    setEtapa("dados");
  }

  async function finalizar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    if (forma === "cartao" && !cartaoDisponivel) {
      setErro("O pagamento com cartão ainda não está disponível. Escolha PIX ou fale no WhatsApp.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.functions.invoke("pedido-pagina-empresa", {
        body: montarCorpoPedido(campos, forma, consentimento, isca),
      });
      if (error) throw error;
      if (!codigoValido(data?.codigo)) throw new Error("resposta sem código");
      const novo: Pedido = { codigo: data.codigo, forma };
      gravar(CHAVE_PEDIDO, novo);
      gravar(CHAVE_RASCUNHO, null);
      setPedido(novo);
      setEtapa("pagamento");
      window.scrollTo({ top: 0 });
      if (forma === "cartao") {
        const link = linkCartaoDoPedido(novo.codigo);
        if (link) window.location.assign(link);
      }
    } catch (falha) {
      setErro(await mensagemDeErro(falha));
    } finally {
      setEnviando(false);
    }
  }

  async function copiarPix(codigoPix: string) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(codigoPix);
      ok = true;
    } catch {
      const campo = document.getElementById("pix-copia-e-cola") as HTMLTextAreaElement | null;
      campo?.focus();
      campo?.select();
      ok = document.execCommand("copy");
    }
    setCopiado(ok ? "sim" : "falhou");
    if (ok) setTimeout(() => setCopiado("nao"), 2500);
  }

  return (
    <div className="space-y-6">
      <EtapasCadastro atual={etapa} />
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] md:items-start">
        <ResumoPedido />

        {etapa === "dados" && (
          <form onSubmit={finalizar} className="stat-card relative space-y-8" aria-labelledby="dados-titulo">
            <div className="space-y-2">
              <h2 id="dados-titulo" ref={tituloDados} tabIndex={-1} className="text-xl font-bold text-foreground outline-none">
                Seus dados
              </h2>
              <p className="text-sm text-foreground/75">
                Preencha as informações para continuar. Os campos com <span aria-hidden="true">*</span>
                <span className="sr-only">asterisco</span> são obrigatórios. O rascunho fica salvo só nesta aba do
                navegador.{" "}
                <button
                  type="button"
                  onClick={apagarRascunho}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Apagar dados preenchidos
                </button>
              </p>
            </div>

            <fieldset className="space-y-4">
              <legend className="mb-2 text-base font-semibold text-foreground">Quem está comprando</legend>
              <Campo id="comprador_nome" rotulo="Seu nome" obrigatorio>
                <Input
                  id="comprador_nome"
                  className={ESTILO_INPUT}
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  value={campos.comprador_nome}
                  onChange={(e) => alterar("comprador_nome", e.target.value)}
                />
              </Campo>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="comprador_email" rotulo="E-mail" obrigatorio dica="Use um e-mail ao qual você tenha acesso.">
                  <Input
                    id="comprador_email"
                    type="email"
                    className={ESTILO_INPUT}
                    required
                    maxLength={160}
                    autoComplete="email"
                    aria-describedby="comprador_email-dica"
                    value={campos.comprador_email}
                    onChange={(e) => alterar("comprador_email", e.target.value)}
                  />
                </Campo>
                <Campo id="comprador_whatsapp" rotulo="Seu WhatsApp" obrigatorio dica="Com DDD. É por ele que a equipe fala com você.">
                  <Input
                    id="comprador_whatsapp"
                    type="tel"
                    inputMode="tel"
                    className={ESTILO_INPUT}
                    required
                    maxLength={20}
                    autoComplete="tel-national"
                    placeholder="(64) 99999-9999"
                    aria-describedby="comprador_whatsapp-dica"
                    value={campos.comprador_whatsapp}
                    onChange={(e) => alterar("comprador_whatsapp", e.target.value)}
                  />
                </Campo>
              </div>
              <Campo id="comprador_documento" rotulo="CPF ou CNPJ" dica="Opcional.">
                <Input
                  id="comprador_documento"
                  inputMode="numeric"
                  className={ESTILO_INPUT}
                  maxLength={18}
                  aria-describedby="comprador_documento-dica"
                  value={campos.comprador_documento}
                  onChange={(e) => alterar("comprador_documento", e.target.value)}
                />
              </Campo>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="mb-2 text-base font-semibold text-foreground">Sua empresa</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="empresa_nome" rotulo="Nome da empresa" obrigatorio>
                  <Input
                    id="empresa_nome"
                    className={ESTILO_INPUT}
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="organization"
                    value={campos.empresa_nome}
                    onChange={(e) => alterar("empresa_nome", e.target.value)}
                  />
                </Campo>
                <Campo id="empresa_categoria" rotulo="Ramo" obrigatorio dica="Exemplo: padaria, oficina, salão de beleza.">
                  <Input
                    id="empresa_categoria"
                    className={ESTILO_INPUT}
                    required
                    minLength={2}
                    maxLength={80}
                    aria-describedby="empresa_categoria-dica"
                    value={campos.empresa_categoria}
                    onChange={(e) => alterar("empresa_categoria", e.target.value)}
                  />
                </Campo>
              </div>
              <Campo id="empresa_oferta" rotulo="O que sua empresa oferece" obrigatorio dica="Produtos, serviços e o que diferencia vocês. A equipe usa isso para escrever a página.">
                <Textarea
                  id="empresa_oferta"
                  className="min-h-28 text-base"
                  required
                  minLength={10}
                  maxLength={1200}
                  aria-describedby="empresa_oferta-dica"
                  value={campos.empresa_oferta}
                  onChange={(e) => alterar("empresa_oferta", e.target.value)}
                />
              </Campo>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="empresa_whatsapp" rotulo="WhatsApp da empresa" obrigatorio dica="O número que vai no botão da página.">
                  <Input
                    id="empresa_whatsapp"
                    type="tel"
                    inputMode="tel"
                    className={ESTILO_INPUT}
                    required
                    maxLength={20}
                    placeholder="(64) 99999-9999"
                    aria-describedby="empresa_whatsapp-dica"
                    value={campos.empresa_whatsapp}
                    onChange={(e) => alterar("empresa_whatsapp", e.target.value)}
                  />
                </Campo>
                <Campo id="empresa_horario" rotulo="Horário de atendimento" dica="Exemplo: segunda a sábado, das 8h às 18h.">
                  <Input
                    id="empresa_horario"
                    className={ESTILO_INPUT}
                    maxLength={160}
                    aria-describedby="empresa_horario-dica"
                    value={campos.empresa_horario}
                    onChange={(e) => alterar("empresa_horario", e.target.value)}
                  />
                </Campo>
                <Campo id="empresa_bairro" rotulo="Bairro">
                  <Input
                    id="empresa_bairro"
                    className={ESTILO_INPUT}
                    maxLength={80}
                    value={campos.empresa_bairro}
                    onChange={(e) => alterar("empresa_bairro", e.target.value)}
                  />
                </Campo>
                <Campo id="empresa_endereco" rotulo="Endereço">
                  <Input
                    id="empresa_endereco"
                    className={ESTILO_INPUT}
                    maxLength={160}
                    autoComplete="street-address"
                    value={campos.empresa_endereco}
                    onChange={(e) => alterar("empresa_endereco", e.target.value)}
                  />
                </Campo>
                <Campo id="empresa_instagram" rotulo="Instagram">
                  <Input
                    id="empresa_instagram"
                    className={ESTILO_INPUT}
                    maxLength={80}
                    placeholder="@suaempresa"
                    value={campos.empresa_instagram}
                    onChange={(e) => alterar("empresa_instagram", e.target.value)}
                  />
                </Campo>
                <Campo id="empresa_site" rotulo="Site">
                  <Input
                    id="empresa_site"
                    className={ESTILO_INPUT}
                    maxLength={200}
                    inputMode="url"
                    value={campos.empresa_site}
                    onChange={(e) => alterar("empresa_site", e.target.value)}
                  />
                </Campo>
              </div>
              <Campo id="empresa_mapa_url" rotulo="Link do Google Maps" dica="Opcional. Abra a empresa no Google Maps, toque em Compartilhar e cole o link aqui.">
                <Input
                  id="empresa_mapa_url"
                  type="url"
                  inputMode="url"
                  className={ESTILO_INPUT}
                  maxLength={500}
                  placeholder="https://maps.app.goo.gl/..."
                  aria-describedby="empresa_mapa_url-dica"
                  value={campos.empresa_mapa_url}
                  onChange={(e) => alterar("empresa_mapa_url", e.target.value)}
                />
              </Campo>
              <Campo id="endereco_desejado" rotulo="Endereço desejado da página" dica="Opcional e sujeito a disponibilidade. Só letras, números e hífen.">
                <div className="flex items-stretch overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
                  <span className="flex items-center bg-muted px-3 text-sm text-foreground/75">piracanjuba.ai/</span>
                  <input
                    id="endereco_desejado"
                    className="min-h-11 w-full min-w-0 bg-transparent px-3 text-base text-foreground outline-none"
                    maxLength={40}
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder={sugerirEndereco(campos.empresa_nome) || "suaempresa"}
                    aria-describedby="endereco_desejado-dica"
                    value={campos.endereco_desejado}
                    onChange={(e) => alterar("endereco_desejado", e.target.value.toLowerCase())}
                    onBlur={(e) => alterar("endereco_desejado", sugerirEndereco(e.target.value))}
                  />
                </div>
              </Campo>
              <Campo id="observacoes" rotulo="Observações">
                <Textarea
                  id="observacoes"
                  className="min-h-20 text-base"
                  maxLength={1200}
                  value={campos.observacoes}
                  onChange={(e) => alterar("observacoes", e.target.value)}
                />
              </Campo>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="mb-2 text-base font-semibold text-foreground">Forma de pagamento</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                    forma === "pix" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="forma_pagamento"
                    value="pix"
                    checked={forma === "pix"}
                    onChange={() => setForma("pix")}
                    className="mt-1 h-4 w-4 accent-primary"
                  />
                  <span className="space-y-1">
                    <span className="flex items-center gap-2 font-semibold text-foreground">
                      <QrCode className="h-5 w-5" aria-hidden="true" />
                      PIX
                    </span>
                    <span className="block text-sm text-foreground/75">QR Code ou copia e cola, para o CNPJ da Ferro Labs.</span>
                  </span>
                </label>
                <label
                  className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
                    !cartaoDisponivel
                      ? "cursor-not-allowed opacity-60"
                      : forma === "cartao"
                        ? "cursor-pointer border-primary bg-primary/5 ring-1 ring-primary"
                        : "cursor-pointer hover:border-primary/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="forma_pagamento"
                    value="cartao"
                    checked={forma === "cartao"}
                    disabled={!cartaoDisponivel}
                    onChange={() => setForma("cartao")}
                    className="mt-1 h-4 w-4 accent-primary"
                  />
                  <span className="space-y-1">
                    <span className="flex items-center gap-2 font-semibold text-foreground">
                      <CreditCard className="h-5 w-5" aria-hidden="true" />
                      Cartão de crédito
                    </span>
                    <span className="block text-sm text-foreground/75">
                      {cartaoDisponivel
                        ? "Em uma vez, no pagamento seguro do Stripe."
                        : "Em breve. Por enquanto, PIX ou WhatsApp."}
                    </span>
                  </span>
                </label>
              </div>
            </fieldset>

            <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
              <label>
                Não preencha este campo
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  name={CAMPO_ISCA}
                  value={isca}
                  onChange={(e) => setIsca(e.target.value)}
                />
              </label>
            </div>

            <label className="flex items-start gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                required
                checked={consentimento}
                onChange={(e) => setConsentimento(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
              />
              <span>
                Autorizo o Piracanjuba.ai a usar estes dados para montar a página e falar comigo sobre o pedido.{" "}
                <Link href="/privacidade" className="font-medium text-primary underline-offset-4 hover:underline">
                  Política de privacidade
                </Link>
                .
              </span>
            </label>

            <div aria-live="polite" className="min-h-0">
              {erro && (
                <p role="alert" className="rounded-lg border border-red-700/40 bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
                  {erro}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={enviando || !carregado}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#15803d] px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#166534] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803d] disabled:opacity-70"
            >
              {enviando && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
              {enviando ? "Registrando o pedido..." : `Finalizar pedido · ${PRECO_PAGINA_EMPRESA_TEXTO}`}
            </button>
          </form>
        )}

        {etapa === "pagamento" && pedido?.forma === "pix" && (
          <section aria-labelledby="pix-titulo" className="stat-card space-y-5 order-first md:order-none">
            <h2 id="pix-titulo" ref={tituloEtapa} tabIndex={-1} className="text-xl font-bold text-foreground outline-none">
              Pague {PRECO_PAGINA_EMPRESA_TEXTO} pelo PIX
            </h2>
            <p className="text-foreground">
              Pedido <strong className="font-mono tracking-wide">{pedido.codigo}</strong> registrado. Guarde este código.
            </p>
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-xl bg-white p-3">
                <QRCodeSVG
                  value={pixDoPedido(pedido.codigo)}
                  size={220}
                  marginSize={2}
                  role="img"
                  aria-label={`QR Code do PIX de ${VALOR_EXTENSO}`}
                />
              </div>
              <p className="text-center text-sm text-foreground/75">
                Abra o app do banco, escolha pagar com PIX e leia o QR Code.
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="pix-copia-e-cola" className="block text-sm font-semibold text-foreground">
                PIX copia e cola
              </label>
              <textarea
                id="pix-copia-e-cola"
                readOnly
                rows={3}
                value={pixDoPedido(pedido.codigo)}
                className="w-full resize-none break-all rounded-md border bg-muted px-3 py-2 font-mono text-xs text-foreground"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                onClick={() => copiarPix(pixDoPedido(pedido.codigo))}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {copiado === "sim" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                {copiado === "sim" ? "Código copiado" : "Copiar código PIX"}
              </button>
              <p aria-live="polite" className={copiado === "falhou" ? "text-sm text-foreground" : "sr-only"}>
                {copiado === "sim" ? "Código PIX copiado" : ""}
                {copiado === "falhou" ? "Não foi possível copiar. O código está selecionado acima: copie pelo menu do celular." : ""}
              </p>
            </div>
            <dl className="grid gap-1 rounded-lg bg-muted/60 px-4 py-3 text-sm text-foreground sm:grid-cols-[auto_1fr] sm:gap-x-4">
              <dt className="font-medium">Recebedor</dt>
              <dd>{PIX_RECEBEDOR.razaoSocial}</dd>
              <dt className="font-medium">Chave PIX (CNPJ)</dt>
              <dd>{PIX_RECEBEDOR.cnpjFormatado}</dd>
              <dt className="font-medium">Valor</dt>
              <dd>{VALOR_EXTENSO}</dd>
            </dl>
            <div className="space-y-2">
              <p className="text-sm text-foreground">Depois de pagar, envie o comprovante pelo WhatsApp com o código do pedido.</p>
              <a
                href={linkComprovante(pedido.codigo)}
                target="_blank"
                rel="noopener"
                onClick={() => setEtapa("confirmacao")}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#15803d] px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-[#166534]"
              >
                <WhatsAppIcon className="h-5 w-5 shrink-0" fill="currentColor" />
                Enviar comprovante no WhatsApp
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
            </div>
            <button type="button" onClick={novoPedido} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Fazer outro pedido
            </button>
          </section>
        )}

        {etapa === "pagamento" && pedido?.forma === "cartao" && (
          <section aria-labelledby="cartao-titulo" className="stat-card space-y-4 order-first md:order-none">
            <h2 id="cartao-titulo" ref={tituloEtapa} tabIndex={-1} className="text-xl font-bold text-foreground outline-none">
              Pagamento com cartão
            </h2>
            <p className="text-foreground">
              Pedido <strong className="font-mono tracking-wide">{pedido.codigo}</strong> registrado. O pagamento é feito na
              página segura do Stripe, em uma vez.
            </p>
            {linkCartaoDoPedido(pedido.codigo) ? (
              <a
                href={linkCartaoDoPedido(pedido.codigo)!}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#15803d] px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-[#166534]"
              >
                <CreditCard className="h-5 w-5" aria-hidden="true" />
                Ir para o pagamento
              </a>
            ) : (
              <p className="text-sm text-foreground/75">O cartão está indisponível agora. Fale no WhatsApp para concluir.</p>
            )}
            <button type="button" onClick={novoPedido} className="block text-sm font-medium text-primary underline-offset-4 hover:underline">
              Fazer outro pedido
            </button>
          </section>
        )}

        {etapa === "confirmacao" && pedido && (
          <section aria-labelledby="confirmacao-titulo" className="stat-card space-y-4 order-first md:order-none">
            <h2 id="confirmacao-titulo" ref={tituloEtapa} tabIndex={-1} className="flex items-center gap-2 text-xl font-bold text-foreground outline-none">
              <CheckCircle2 className="h-6 w-6 text-green-700 dark:text-green-400" aria-hidden="true" />
              Pedido {pedido.codigo} recebido
            </h2>
            <p className="text-foreground">
              Assim que o PIX for conferido, a equipe do Piracanjuba.ai chama você no WhatsApp para pegar o logo e as
              fotos e montar a página.
            </p>
            <p className="text-sm text-foreground/75">
              Se o WhatsApp não abriu,{" "}
              <a href={linkComprovante(pedido.codigo)} target="_blank" rel="noopener" className="font-medium text-primary underline-offset-4 hover:underline">
                toque aqui para enviar o comprovante
              </a>
              .
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <button type="button" onClick={() => setEtapa("pagamento")} className="font-medium text-primary underline-offset-4 hover:underline">
                Ver o PIX de novo
              </button>
              <Link href="/anuncie" className="font-medium text-primary underline-offset-4 hover:underline">
                Voltar para a página de anúncio
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
