"use client";

// Consulta de CPF via CPFHub (https://cpfhub.io) — somente admin.
//
// Funcionalidades:
//  - Input de CPF com mascara DDD.DDD.DDD-DD
//  - Justificativa obrigatoria (>= 5 chars) — exigencia LGPD
//  - Resultado: nome, sexo, data de nascimento
//  - Botao "copiar nome"
//  - Historico das ultimas 50 consultas com CPF mascarado
//
// Auditoria: tudo passa por admin-cpf-consulta edge function que valida
// admin_token e loga em admin_cpf_consulta_log.

import { useState, useEffect, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  UserSearch,
  Loader2,
  Copy,
  ShieldAlert,
  Clock,
  Calendar,
  Check,
  X,
  History,
} from "lucide-react";

const supabase = createBrowserSupabaseClient();
const SESSION_KEY = "pba_admin_token";

type ConsultaResult = {
  cpf: string;
  name: string;
  gender: string | null;
  birthDate: string | null;
  day: number | null;
  month: number | null;
  year: number | null;
  duracao_ms: number;
};

type LogEntry = {
  id: number;
  consultado_em: string;
  cpf_mascarado: string;
  nome_retornado: string | null;
  status: "sucesso" | "nao_encontrado" | "erro" | "limite_atingido";
  justificativa: string;
  duracao_ms: number | null;
};

function formatCpfMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatDateTimePT(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: LogEntry["status"]) {
  const map = {
    sucesso: { color: "bg-emerald-600", label: "OK" },
    nao_encontrado: { color: "bg-zinc-500", label: "404" },
    erro: { color: "bg-red-600", label: "Erro" },
    limite_atingido: { color: "bg-amber-600", label: "Limite" },
  } as const;
  const cfg = map[status];
  return <Badge className={`${cfg.color} text-white text-[10px]`}>{cfg.label}</Badge>;
}

export default function ConsultaCpfAdmin() {
  const [cpfInput, setCpfInput] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConsultaResult | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  const carregarHistorico = useCallback(async () => {
    setLogLoading(true);
    try {
      const token = localStorage.getItem(SESSION_KEY) ?? "";
      const { data, error } = await supabase.functions.invoke("admin-cpf-consulta", {
        body: { admin_token: token, action: "list_log" },
      });
      if (error) throw new Error(error.message || "Erro ao carregar historico");
      if (data?.error) throw new Error(data.error);
      setLog((data?.log as LogEntry[]) ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar historico");
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregarHistorico();
  }, [carregarHistorico]);

  async function consultar() {
    const cpfDigitos = cpfInput.replace(/\D/g, "");
    if (cpfDigitos.length !== 11) {
      toast.error("CPF precisa ter 11 dígitos.");
      return;
    }
    if (justificativa.trim().length < 5) {
      toast.error("Justificativa obrigatória (mín. 5 caracteres).");
      return;
    }
    setLoading(true);
    setResult(null);
    setNaoEncontrado(null);
    try {
      const token = localStorage.getItem(SESSION_KEY) ?? "";
      const { data, error } = await supabase.functions.invoke("admin-cpf-consulta", {
        body: {
          admin_token: token,
          action: "consulta_cpf",
          cpf: cpfDigitos,
          justificativa: justificativa.trim(),
        },
      });
      if (error) throw new Error(error.message || "Erro de conexão");
      if (data?.error) {
        throw new Error(data.error);
      }
      if (!data?.success) {
        setNaoEncontrado(data?.message ?? "CPF não encontrado na base CPFHub.");
        toast.warning(data?.message ?? "CPF não encontrado.");
      } else {
        setResult(data.data as ConsultaResult);
        toast.success("Consulta realizada.");
      }
      await carregarHistorico();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao consultar");
    } finally {
      setLoading(false);
    }
  }

  function copiarNome() {
    if (!result?.name) return;
    void navigator.clipboard.writeText(result.name);
    toast.success("Nome copiado.");
  }

  return (
    <div className="space-y-4">
      {/* Aviso LGPD */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
        <div className="flex gap-2 items-start">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-700">Uso restrito (LGPD art. 7º IX)</p>
            <p className="text-muted-foreground mt-1">
              Toda consulta fica registrada com data, justificativa, IP e User-Agent. CPF completo é
              retido por 30 dias para fins de auditoria. Use apenas para validação interna.
            </p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <UserSearch className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold">Consulta de CPF</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="cpf-input" className="text-xs">CPF</Label>
            <Input
              id="cpf-input"
              placeholder="000.000.000-00"
              value={cpfInput}
              onChange={(e) => setCpfInput(formatCpfMask(e.target.value))}
              disabled={loading}
              maxLength={14}
              inputMode="numeric"
              className="font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="justificativa-input" className="text-xs">
              Justificativa <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="justificativa-input"
              placeholder="Ex: validação cadastral fornecedor X"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              disabled={loading}
              rows={2}
              className="text-xs"
            />
          </div>
        </div>

        <Button
          onClick={consultar}
          disabled={loading || cpfInput.replace(/\D/g, "").length !== 11 || justificativa.trim().length < 5}
          className="w-full sm:w-auto"
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserSearch className="w-4 h-4 mr-2" />}
          {loading ? "Consultando..." : "Consultar CPFHub"}
        </Button>
      </div>

      {/* Resultado: nao encontrado */}
      {naoEncontrado && !result && (
        <div className="rounded-xl border border-zinc-300/40 bg-zinc-100/40 dark:bg-zinc-900/40 p-4 text-sm flex items-center gap-2">
          <X className="w-4 h-4 text-zinc-500" />
          <span>{naoEncontrado}</span>
        </div>
      )}

      {/* Resultado: sucesso */}
      {result && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-semibold">Resultado</h4>
            <Badge variant="outline" className="text-[10px] ml-auto">
              <Clock className="w-3 h-3 mr-1" /> {result.duracao_ms}ms
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Nome
              </p>
              <p className="text-base font-bold text-foreground mt-0.5">{result.name}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Sexo
              </p>
              <p className="text-base font-bold text-foreground mt-0.5">
                {result.gender === "M" ? "Masculino" : result.gender === "F" ? "Feminino" : (result.gender ?? "—")}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Nascimento
              </p>
              <p className="text-base font-bold text-foreground mt-0.5">
                {result.birthDate ?? "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
            <p className="text-xs text-muted-foreground flex-1">
              CPF: <span className="font-mono">{formatCpfMask(result.cpf)}</span>
            </p>
            <Button size="sm" variant="outline" onClick={copiarNome} className="h-7 text-xs">
              <Copy className="w-3 h-3 mr-1" /> Copiar nome
            </Button>
          </div>
        </div>
      )}

      {/* Historico */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-zinc-600" />
          <h3 className="text-sm font-semibold">Histórico (últimas 50)</h3>
          {logLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-auto" />}
        </div>

        {log.length === 0 && !logLoading && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhuma consulta registrada ainda.
          </p>
        )}

        {log.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="py-1.5 pr-2 font-medium">Data</th>
                  <th className="py-1.5 pr-2 font-medium">CPF</th>
                  <th className="py-1.5 pr-2 font-medium">Nome</th>
                  <th className="py-1.5 pr-2 font-medium">Justificativa</th>
                  <th className="py-1.5 pr-2 font-medium">Status</th>
                  <th className="py-1.5 pr-2 font-medium text-right">ms</th>
                </tr>
              </thead>
              <tbody>
                {log.map((row) => (
                  <tr key={row.id} className="border-b border-border/30 last:border-0">
                    <td className="py-1.5 pr-2 font-mono text-[11px] text-muted-foreground">
                      {formatDateTimePT(row.consultado_em)}
                    </td>
                    <td className="py-1.5 pr-2 font-mono text-[11px]">{row.cpf_mascarado}</td>
                    <td className="py-1.5 pr-2 max-w-[200px] truncate">{row.nome_retornado ?? "—"}</td>
                    <td className="py-1.5 pr-2 max-w-[200px] truncate text-muted-foreground">
                      {row.justificativa}
                    </td>
                    <td className="py-1.5 pr-2">{statusBadge(row.status)}</td>
                    <td className="py-1.5 pr-2 text-right text-muted-foreground">
                      {row.duracao_ms ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
