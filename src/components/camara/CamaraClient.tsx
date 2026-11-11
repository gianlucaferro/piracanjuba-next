"use client";

import { useState, useCallback } from "react";
import { Users, Megaphone, Landmark, UserCheck, Search, Download, ChevronLeft, ChevronRight, FileText, Gavel, FileSignature, Receipt, TrendingUp, Plane, ScrollText, Video, BookOpen, ClipboardList, FileStack, HandMetal, ClipboardCheck } from "lucide-react";
import Layout from "@/components/Layout";
import { FONTES_CAMARA } from "@/lib/fontes-oficiais";
import { downloadCSV } from "@/lib/csvExport";
import { ExportChangedError } from "@/lib/stable-export";
import SEO from "@/components/SEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VereadoresContent } from "@/components/camara/VereadoresContent";
import { AtuacaoContent } from "@/components/camara/AtuacaoContent";
import { ProjetosContent } from "@/components/camara/ProjetosContent";
import { useQuery } from "@tanstack/react-query";
import { fetchServidores, fetchAllServidores } from "@/data/prefeituraApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import LicitacoesTab from "@/components/camara/LicitacoesTab";
import ContratosTab from "@/components/camara/ContratosTab";
import DespesasTab from "@/components/camara/DespesasTab";
import ReceitasTab from "@/components/camara/ReceitasTab";
import DiariasTab from "@/components/camara/DiariasTab";
import ResolucoesTab from "@/components/camara/ResolucoesTab";
import AtosTab from "@/components/camara/AtosTab";
import TransmissaoCard from "@/components/camara/TransmissaoCard";
import ResumoFolhaCamara from "@/components/camara/ResumoFolhaCamara";
import ServidorResumoDialog from "@/components/servidores/ServidorResumoDialog";
import PrestacaoContasTab from "@/components/transparencia/PrestacaoContasTab";

const tabs = [
  { value: "vereadores", label: "Vereadores", icon: Users },
  { value: "servidores", label: "Servidores", icon: UserCheck },
  { value: "contratos", label: "Contratos", icon: FileSignature },
  { value: "projetos", label: "Projetos", icon: FileText },
  { value: "atuacao", label: "Atuação", icon: Megaphone },
  { value: "indicacoes", label: "Indicações", icon: HandMetal },
  { value: "resolucoes", label: "Resoluções", icon: ScrollText },
  { value: "decretos-leg", label: "Decretos Leg.", icon: FileStack },
  { value: "pautas", label: "Pautas", icon: ClipboardList },
  { value: "atas", label: "Atas", icon: BookOpen },
  { value: "transmissao", label: "Transmissão", icon: Video },
  { value: "licitacoes", label: "Licitações", icon: Gavel },
  { value: "despesas", label: "Despesas", icon: Receipt },
  { value: "receitas", label: "Orçamento", icon: TrendingUp },
  { value: "prestacao-contas", label: "Prestação de Contas", icon: ClipboardCheck },
  { value: "diarias", label: "Diárias", icon: Plane },
];

function ServidoresCamaraTab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const PAGE_SIZE = 30;

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const { data: result, isLoading } = useQuery({
    queryKey: ["servidores-camara", search, page],
    queryFn: () => fetchServidores(search || undefined, undefined, page, PAGE_SIZE, "camara"),
  });

  const servidores = result?.data ?? [];
  const totalCount = result?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const [selectedServidor, setSelectedServidor] = useState<{ id: string; nome: string; cargo: string | null } | null>(null);

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const all = await fetchAllServidores("camara", search || undefined);
      if (!all.length) {
        setExportError("Nenhum servidor encontrado para exportar. Confira a busca e tente novamente.");
        return;
      }
      downloadCSV(`servidores-camara${search ? `_${search}` : ""}.csv`, ["Nome", "Cargo"], all.map(s => [s.nome, s.cargo]), ",");
    } catch (error) {
      setExportError(error instanceof ExportChangedError ? error.message : "Não foi possível exportar os servidores. Tente novamente.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container py-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        Assessores e demais servidores da Câmara Municipal de Piracanjuba. Dados obtidos do portal de transparência legislativo.
      </p>
      <ResumoFolhaCamara />
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar servidor por nome..." value={search}
          onChange={(e) => handleSearch(e.target.value)} className="pl-9" aria-label="Buscar servidor da Câmara" />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount > 0 ? `${totalCount} servidores encontrados · Página ${page + 1} de ${totalPages}` : "Clique no nome do servidor para consultar seu resumo."}
        </p>
        {totalCount > 0 && (
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={exporting}>
            <Download className="w-4 h-4 mr-1" /> {exporting ? "Exportando..." : "Exportar CSV"}
          </Button>
        )}
      </div>

      {exportError && <p role="alert" className="text-sm text-destructive">{exportError}</p>}
      {isLoading && <div className="stat-card animate-pulse h-40" />}
      {!isLoading && !servidores.length && (
        <div className="stat-card text-center py-8">
          <UserCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">Sem dados de servidores da Câmara</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Os dados serão sincronizados automaticamente do portal de transparência legislativo.
          </p>
          <a href={FONTES_CAMARA.folhas} target="_blank" rel="noopener noreferrer"
            className="text-sm text-primary hover:underline mt-2 inline-block">
            Ver fonte original →
          </a>
        </div>
      )}
      {servidores.length > 0 && (
        <div className="space-y-2">
          {servidores.map((s) => (
            <button key={s.id} onClick={() => setSelectedServidor(s)}
              className="stat-card card-hover block w-full text-left flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground text-sm">{s.nome}</p>
                {s.cargo && <p className="text-sm text-muted-foreground">{s.cargo}</p>}
              </div>
              <span className="text-sm text-primary flex items-center gap-1">
                <FileText className="w-3 h-3" /> Ver resumo
              </span>
            </button>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Próxima <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      <ServidorResumoDialog servidor={selectedServidor} orgaoTipo="camara" onClose={() => setSelectedServidor(null)} />
    </div>
  );
}

function TransmissaoTab() {
  return (
    <div className="container py-4 space-y-4">
      <TransmissaoCard />
      <div className="stat-card">
        <h3 className="font-semibold text-foreground mb-2">Sobre as Sessões</h3>
        <p className="text-sm text-muted-foreground">
          As sessões ordinárias da Câmara Municipal de Piracanjuba acontecem toda segunda-feira, a partir das 19h, e na última quinta-feira de cada mês. As transmissões são realizadas ao vivo pelo canal oficial no YouTube.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          A transmissão ao vivo visa oferecer maior transparência e comodidade aos cidadãos que não podem comparecer presencialmente ao plenário.
        </p>
        <a href="https://piracanjuba.go.leg.br/sessoes/" target="_blank" rel="noopener noreferrer"
          className="text-sm text-primary hover:underline mt-3 inline-block">
          Ver página oficial →
        </a>
      </div>
    </div>
  );
}

export default function CamaraMunicipal({ aba }: { aba?: string }) {
  const [activeTab, setActiveTab] = useState(aba || "vereadores");
  // Troca de aba reflete na URL (/camara/<aba>) sem navegação de servidor, pra SEO e
  // link compartilhável. A aba "vereadores" (padrão) fica em /camara.
  const onTabChange = useCallback((v: string) => {
    setActiveTab(v);
    if (typeof window !== "undefined") {
      window.history.replaceState(window.history.state, "", v === "vereadores" ? "/camara" : `/camara/${v}`);
    }
  }, []);

  return (
    <Layout>
      <SEO
        title="Câmara Municipal de Piracanjuba GO"
        description="Piracanjuba GO — Câmara Municipal: vereadores, projetos de lei, votações, remunerações, despesas, contratos e atuação parlamentar. Dados oficiais."
        path="/camara"
      />
      <div className="container py-6">
        <div className="flex items-center gap-3 mb-4">
          <Landmark className="w-7 h-7 text-accent" />
          <h1 className="text-2xl font-bold text-foreground">Câmara Municipal</h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <div className="container">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-6 scrollbar-hide">
            <TabsList className="inline-flex w-max md:w-full md:flex-wrap h-auto gap-1 bg-transparent p-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="text-sm sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2.5 border border-border data-[state=active]:border-primary whitespace-nowrap flex-shrink-0"
                  >
                    <Icon className="w-3.5 h-3.5 mr-1.5" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </div>

        <TabsContent value="vereadores">
          <VereadoresContent />
        </TabsContent>
        <TabsContent value="servidores">
          <ServidoresCamaraTab />
        </TabsContent>
        <TabsContent value="contratos">
          <ContratosTab />
        </TabsContent>
        <TabsContent value="projetos">
          <ProjetosContent />
        </TabsContent>
        <TabsContent value="atuacao">
          <AtuacaoContent />
        </TabsContent>
        <TabsContent value="indicacoes">
          <AtosTab tipoCodigo={24} tipoNome="Indicações" descricao="Indicações dos vereadores da Câmara Municipal de Piracanjuba." />
        </TabsContent>
        <TabsContent value="resolucoes">
          <ResolucoesTab />
        </TabsContent>
        <TabsContent value="decretos-leg">
          <AtosTab tipoCodigo={12} tipoNome="Decretos Legislativos" descricao="Decretos legislativos aprovados pela Câmara Municipal de Piracanjuba." />
        </TabsContent>
        <TabsContent value="pautas">
          <AtosTab tipoCodigo={14} tipoNome="Pautas das Sessões" descricao="Pautas das sessões ordinárias da Câmara Municipal de Piracanjuba." />
        </TabsContent>
        <TabsContent value="atas">
          <AtosTab tipoCodigo={8} tipoNome="Atas das Sessões" descricao="Atas das sessões ordinárias da Câmara Municipal de Piracanjuba." />
        </TabsContent>
        <TabsContent value="transmissao">
          <TransmissaoTab />
        </TabsContent>
        <TabsContent value="licitacoes">
          <LicitacoesTab />
        </TabsContent>
        <TabsContent value="despesas">
          <DespesasTab />
        </TabsContent>
        <TabsContent value="receitas">
          <ReceitasTab />
        </TabsContent>
        <TabsContent value="prestacao-contas">
          <PrestacaoContasTab poder="camara" />
        </TabsContent>
        <TabsContent value="diarias">
          <DiariasTab />
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
