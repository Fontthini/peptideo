-- PeptideZ Health — Schema completo

create table if not exists cadastros (
  id text primary key default gen_random_uuid()::text,
  nome text not null,
  sobrenome text default '',
  email text unique not null,
  whatsapp text not null,
  endereco text default '',
  crm text default '',
  onde_conheceu text default '',
  status text default 'pendente',
  token text unique,
  vendedor_id text default '',
  solicitacao text default '',
  motivo_rejeicao text default '',
  obs text default '',
  created_at timestamptz default now()
);

create table if not exists produtos (
  id text primary key default gen_random_uuid()::text,
  nome text not null,
  dose text default '',
  preco numeric(10,2) not null default 0,
  categoria text default '',
  descricao text default '',
  imagem text default '',
  video text default '',
  galeria jsonb default '[]',
  created_at timestamptz default now()
);

create table if not exists config (
  id int primary key default 1,
  mercadopago_token text default '',
  resend_api_key text default '',
  whatsapp_numero text default '5511999999999',
  base_url text default 'http://localhost:3000',
  banner_titulo text default '',
  banner_subtitulo text default '',
  banner_imagem text default '',
  logo text default '',
  cor_primaria text default '#111827',
  cor_acento text default '#16a34a',
  round_robin_idx int default 0
);
insert into config (id) values (1) on conflict do nothing;

create table if not exists banners (
  id text primary key default gen_random_uuid()::text,
  titulo text default '',
  subtitulo text default '',
  imagem text not null,
  link text default '',
  ativo boolean default true,
  ordem int default 0,
  created_at timestamptz default now()
);

create table if not exists banners_blog (
  id text primary key default gen_random_uuid()::text,
  titulo text default '',
  subtitulo text default '',
  imagem text not null,
  link text default '',
  ativo boolean default true,
  ordem int default 0,
  created_at timestamptz default now()
);

create table if not exists artigos (
  id text primary key default gen_random_uuid()::text,
  titulo text not null,
  conteudo text default '',
  imagem text default '',
  video text default '',
  categoria text default '',
  materiais jsonb default '[]',
  publicado boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists equipe (
  id text primary key default gen_random_uuid()::text,
  nome text not null,
  email text unique not null,
  cargo text not null,
  token text unique not null,
  ativo boolean default true,
  created_at timestamptz default now()
);

create table if not exists categorias (
  nome text primary key
);
insert into categorias values
  ('Emagrecimento'),('Libido'),('Regenerativos'),('Imunomodeladores'),
  ('Cognição'),('Pele'),('Saúde do Sono'),('Anti-Aging'),
  ('Estimulantes de GH'),('Mitocondriais')
on conflict do nothing;

create table if not exists categorias_blog (
  nome text primary key
);

create table if not exists pedidos (
  id text primary key default gen_random_uuid()::text,
  cadastro_id text references cadastros(id),
  vendedor_id text default '',
  itens jsonb default '[]',
  preco numeric(10,2) default 0,
  status text default 'em_aberto',
  obs text default '',
  created_at timestamptz default now()
);
