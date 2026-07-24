begin isolation level repeatable read;

do $$
declare
  primeiro jsonb;
  segundo jsonb;
  entidades_primeiro bigint;
  entidades_segundo bigint;
  relacoes_primeiro bigint;
  relacoes_segundo bigint;
  indicios_primeiro bigint;
  indicios_segundo bigint;
  metricas_cnpj jsonb;
  metricas_pagamentos jsonb;
  folha_esperada bigint;
  folha_encontrada bigint;
  janelas_em_execucao bigint;
  entidade_origem_teste uuid;
  entidade_destino_teste uuid;
  backup_total bigint;
  backup_restaurado bigint;
  lease_primeiro uuid;
  lease_segundo uuid;
  lease_terceiro uuid;
  cobertura_backfill jsonb;
  limite_backfill date :=
    (
      date_trunc('month', current_date)
      - interval '1 month'
      - interval '1 day'
    )::date;
begin
  select public.maintain_empenhos_backfill_coverage()
  into cobertura_backfill;

  if (cobertura_backfill->>'cobertura_ate')::date < limite_backfill then
    raise exception 'fila historica termina antes da janela movel: %',
      cobertura_backfill;
  end if;

  select public.refresh_investigacao_piracanjuba() into primeiro;
  select count(*) into entidades_primeiro
  from public.entidade_canonica where ativo;
  select count(*) into relacoes_primeiro
  from public.relacao_entidade where ativo;
  select count(*) into indicios_primeiro
  from public.indicio_contratacao where ativo;

  select public.refresh_investigacao_piracanjuba() into segundo;
  select count(*) into entidades_segundo
  from public.entidade_canonica where ativo;
  select count(*) into relacoes_segundo
  from public.relacao_entidade where ativo;
  select count(*) into indicios_segundo
  from public.indicio_contratacao where ativo;

  if (entidades_primeiro, relacoes_primeiro, indicios_primeiro) is distinct from
      (entidades_segundo, relacoes_segundo, indicios_segundo) then
    raise exception
      'refresh nao idempotente: primeiro=(%,%,%), segundo=(%,%,%)',
      entidades_primeiro,
      relacoes_primeiro,
      indicios_primeiro,
      entidades_segundo,
      relacoes_segundo,
      indicios_segundo;
  end if;

  insert into public.entidade_canonica (
    chave_interna,
    no_grafo,
    tipo,
    nome,
    nome_normalizado,
    fonte_principal,
    confianca
  )
  values (
    'teste:entidade:origem',
    'teste:origem:' || gen_random_uuid()::text,
    'orgao',
    'ORGAO TESTE',
    'ORGAO TESTE',
    'fixture de integracao',
    'registro_origem'
  )
  returning id into entidade_origem_teste;

  insert into public.entidade_canonica (
    chave_interna,
    no_grafo,
    tipo,
    nome,
    nome_normalizado,
    fonte_principal,
    confianca
  )
  values (
    'teste:entidade:destino',
    'teste:destino:' || gen_random_uuid()::text,
    'contrato',
    'CONTRATO TESTE',
    'CONTRATO TESTE',
    'fixture de integracao',
    'registro_origem'
  )
  returning id into entidade_destino_teste;

  insert into public.relacao_entidade (
    chave,
    origem_id,
    relacao,
    destino_id,
    confianca,
    fonte
  )
  values (
    'teste:relacao:removida',
    entidade_origem_teste,
    'TESTE_REMOCAO',
    entidade_destino_teste,
    'alta',
    'fixture de integracao'
  );

  insert into public.indicio_contratacao (
    chave,
    regra,
    categoria,
    severidade,
    score,
    titulo,
    descricao,
    evidencias,
    regra_versao
  )
  values (
    'teste:indicio:removido',
    'TESTE_REMOCAO',
    'teste',
    'informativa',
    0,
    'Fixture temporaria',
    'Deve ser desativada quando nao reaparecer na fonte.',
    '{}'::jsonb,
    'teste-v1'
  );

  perform public.refresh_investigacao_piracanjuba();

  if exists (
    select 1
    from public.entidade_canonica
    where chave_interna in (
      'teste:entidade:origem',
      'teste:entidade:destino'
    )
      and ativo
  ) or exists (
    select 1
    from public.relacao_entidade
    where chave = 'teste:relacao:removida'
      and ativo
  ) or exists (
    select 1
    from public.indicio_contratacao
    where chave = 'teste:indicio:removido'
      and ativo
  ) then
    raise exception 'refresh preservou fixture removida da fonte';
  end if;

  select metricas into metricas_cnpj
  from public.cobertura_regra_investigativa
  where regra = 'CNPJ_QSA';

  if (metricas_cnpj->>'cnpjs_enriquecidos')::bigint >
      (metricas_cnpj->>'cnpjs_contratados')::bigint then
    raise exception 'cobertura CNPJ invalida: %', metricas_cnpj;
  end if;

  select metricas into metricas_pagamentos
  from public.cobertura_regra_investigativa
  where regra = 'VINCULO_PAGAMENTO_EMPENHO';

  if (metricas_pagamentos->>'pagamentos_vinculados')::bigint >
      (metricas_pagamentos->>'pagamentos')::bigint then
    raise exception 'cobertura pagamento-empenho invalida: %',
      metricas_pagamentos;
  end if;

  select count(*) into folha_esperada
  from public.prefeitura_folha_nucleogov;

  select count(*) into folha_encontrada
  from public.remuneracao_servidores remuneracao
  join public.servidores servidor
    on servidor.id = remuneracao.servidor_id
  join public.prefeitura_folha_nucleogov folha
    on servidor.origem_chave =
      'prefeitura:nucleogov:' || folha.portal_id::text
    and remuneracao.competencia =
      folha.ano::text || '-' || lpad(folha.mes::text, 2, '0')
    and remuneracao.tipo_folha =
      coalesce(nullif(btrim(folha.tipo_folha), ''), 'NORMAL');

  if folha_encontrada <> folha_esperada then
    raise exception 'remuneracao canonica divergente: esperado %, encontrado %',
      folha_esperada,
      folha_encontrada;
  end if;

  if not exists (
    select 1 from public.remuneracao_servidores_backup_20260724
  ) then
    raise exception 'backup historico de remuneracao esta vazio';
  end if;

  select count(*) into backup_total
  from public.remuneracao_servidores_backup_20260724;

  perform public.restore_remuneracao_servidores_backup_20260724();

  select count(*) into backup_restaurado
  from public.remuneracao_servidores_backup_20260724 backup
  join public.remuneracao_servidores remuneracao
    on remuneracao.id = backup.id
    and remuneracao.servidor_id = backup.servidor_id
    and remuneracao.competencia = backup.competencia
    and remuneracao.bruto is not distinct from backup.bruto
    and remuneracao.liquido is not distinct from backup.liquido
    and remuneracao.fonte_url is not distinct from backup.fonte_url
    and remuneracao.updated_at is not distinct from backup.updated_at
    and remuneracao.tipo_folha is not distinct from backup.tipo_folha;

  if backup_restaurado <> backup_total then
    raise exception 'restauracao divergente: backup %, restaurado %',
      backup_total,
      backup_restaurado;
  end if;

  select count(*) into janelas_em_execucao
  from public.prefeitura_empenhos_backfill_fila
  where status = 'running';

  if janelas_em_execucao > 1 then
    raise exception 'mais de uma janela de backfill em execucao: %',
      janelas_em_execucao;
  end if;

  delete from public.sync_fornecedores_cnpj_lease;
  select public.claim_sync_fornecedores_cnpj() into lease_primeiro;
  select public.claim_sync_fornecedores_cnpj() into lease_segundo;

  if lease_primeiro is null or lease_segundo is not null then
    raise exception 'lease CNPJ nao garantiu exclusao mutua';
  end if;

  if not public.release_sync_fornecedores_cnpj(lease_primeiro) then
    raise exception 'lease CNPJ nao foi liberado pelo proprietario';
  end if;

  select public.claim_sync_fornecedores_cnpj() into lease_terceiro;
  if lease_terceiro is null then
    raise exception 'lease CNPJ nao permitiu nova aquisicao';
  end if;
  perform public.release_sync_fornecedores_cnpj(lease_terceiro);
end
$$;

rollback;
