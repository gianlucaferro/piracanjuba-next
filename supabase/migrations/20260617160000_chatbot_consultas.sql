-- Log + rate limit do chatbot público (assistente de IA do Piracanjuba.ai).
-- ip_hash: SHA-256 truncado do IP (privacidade, nunca o IP cru). Usado para
-- limitar a frequência de perguntas por origem e para auditoria de uso.
-- Sem RLS policy: apenas o service_role (a edge function) escreve/lê; anon não acessa.

create table if not exists public.chatbot_consultas (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  pergunta text,
  created_at timestamptz not null default now()
);

create index if not exists idx_chatbot_consultas_ip_time
  on public.chatbot_consultas (ip_hash, created_at desc);

alter table public.chatbot_consultas enable row level security;

comment on table public.chatbot_consultas is
  'Log e rate limit do chatbot público. ip_hash = SHA-256 truncado do IP. Sem policy: apenas service_role acessa.';
