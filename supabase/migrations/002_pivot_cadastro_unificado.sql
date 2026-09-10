-- PeptideZ Health — Pivot: cadastro manual unificado (Médicos/Pacientes)
--
-- Este arquivo faz duas coisas, tudo de forma aditiva e segura de rodar
-- mais de uma vez (IF NOT EXISTS em tudo):
--
-- 1) Recupera no arquivo de migração colunas/tabelas que já existem em
--    produção mas nunca tinham sido registradas aqui (o 001_schema.sql
--    ficou desatualizado com o tempo — colunas foram adicionadas direto
--    pelo painel do Supabase). Isso não muda nada no banco, só deixa o
--    arquivo fiel à realidade.
-- 2) Adiciona as colunas novas da Fase 1 do pivot (cadastro unificado
--    Médicos/Pacientes com pedido/pagamento/documentos/cashback embutidos).

-- ============================================================
-- PARTE 1 — Recuperar o que já existe em produção (documentação)
-- ============================================================

alter table cadastros add column if not exists last_seen_loja timestamptz;
alter table cadastros add column if not exists last_seen_blog timestamptz;
alter table cadastros add column if not exists tags jsonb not null default '[]';
alter table cadastros add column if not exists cidade text;
alter table cadastros add column if not exists estado text;
alter table cadastros add column if not exists especialidade text;
alter table cadastros add column if not exists cpf text;
alter table cadastros add column if not exists produtos_interesse jsonb not null default '[]';
alter table cadastros add column if not exists funil_status text not null default 'novo';
alter table cadastros add column if not exists motivo_perda text;

alter table pedidos add column if not exists indicacao_id text;
alter table pedidos add column if not exists despesa_id text;

create table if not exists indicacoes (
  id text primary key default gen_random_uuid()::text,
  medico_id text not null references cadastros(id),
  medico_nome text not null,
  nome text not null,
  sobrenome text not null default '',
  whatsapp text not null,
  email text not null default '',
  endereco text not null default '',
  status text not null default 'em_atendimento',
  obs text not null default '',
  created_at timestamptz not null default now(),
  tipo text default 'paciente',
  crm text,
  comissao_valor numeric(10,2),
  comissao_paga boolean not null default false,
  comissao_despesa_id text
);

create table if not exists despesas (
  id text primary key default gen_random_uuid()::text,
  tipo text not null,
  categoria text not null,
  descricao text not null,
  valor numeric(10,2) not null default 0,
  data date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  comprovante_url text
);

-- ============================================================
-- PARTE 2 — Colunas novas do pivot (Fase 1)
-- ============================================================

-- Cadastro (médicos): quem indicou (opcional), documentos, e os mesmos
-- campos de comissão que já existem em Indicacao — pra poder reusar o
-- mesmo componente de comissão (cashback) também para médico indicado
-- por médico.
alter table cadastros add column if not exists indicado_por_medico_id text references cadastros(id);
alter table cadastros add column if not exists indicado_por_medico_nome text;
alter table cadastros add column if not exists rg text;
alter table cadastros add column if not exists documentos jsonb not null default '[]';
alter table cadastros add column if not exists comissao_valor numeric(10,2);
alter table cadastros add column if not exists comissao_paga boolean not null default false;
alter table cadastros add column if not exists comissao_despesa_id text;
alter table cadastros add column if not exists categoria text not null default 'normal';

-- Indicacao (pacientes): dados pessoais que faltavam, anexos e desconto.
alter table indicacoes add column if not exists cpf text;
alter table indicacoes add column if not exists rg text;
alter table indicacoes add column if not exists cidade text;
alter table indicacoes add column if not exists estado text;
alter table indicacoes add column if not exists receita text;
alter table indicacoes add column if not exists documentos jsonb not null default '[]';
alter table indicacoes add column if not exists comprovante_pagamento text;
alter table indicacoes add column if not exists desconto numeric(10,2) not null default 0;
alter table indicacoes add column if not exists categoria text not null default 'normal';

-- Marca de controle pra migração idempotente das Indicações tipo='medico'
-- (Fase 2/3 do pivot) — aponta pra qual Cadastro aquela indicação antiga
-- foi migrada, pra rodar o script de migração de novo sem duplicar nada.
alter table indicacoes add column if not exists migrado_para_cadastro_id text references cadastros(id);
