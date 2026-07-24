"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchFunprepiDashboard } from "@/data/funprepiApi";
import { FunprepiCharts } from "./funprepi/FunprepiCharts";
import { FunprepiEvidence } from "./funprepi/FunprepiEvidence";
import { FunprepiOverview } from "./funprepi/FunprepiOverview";

export default function FunprepiTab() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["funprepi-dashboard"],
    queryFn: fetchFunprepiDashboard,
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-5" aria-label="Carregando painel do FUNPREPI">
        <div className="stat-card h-44 animate-pulse" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="stat-card h-36 animate-pulse" />
          ))}
        </div>
        <div className="stat-card h-80 animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="stat-card flex flex-col items-center py-12 text-center">
        <AlertCircle className="mb-3 h-9 w-9 text-destructive" aria-hidden />
        <h2 className="font-semibold text-foreground">
          Não foi possível carregar o painel do FUNPREPI
        </h2>
        <p className="mt-1 max-w-lg text-sm text-muted-foreground">
          A consulta agregada falhou. Os dados oficiais permanecem disponíveis nos
          portais de origem.
        </p>
        <Button className="mt-4" variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="stat-card py-12 text-center">
        <Database className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
        <h2 className="font-semibold text-foreground">Painel sem dados</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A função de leitura respondeu sem registros utilizáveis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FunprepiOverview data={data} isFetching={isFetching} />
      <FunprepiCharts data={data} />
      <FunprepiEvidence data={data} />
    </div>
  );
}
