-- ============================================
-- Vendas na Rua — migração inicial
-- ============================================
create extension if not exists "pgcrypto";

-- ============ VENDEDORES ============
create table public.vendedores (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  nome        text not null,
  email       text not null unique,
  role        text not null default 'vendedor' check (role in ('vendedor', 'admin')),
  zona        text,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============ PRODUTOS ============
create table public.produtos (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  descricao   text,
  preco       numeric(10,2) not null check (preco >= 0),
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============ CLIENTES / PONTOS DE VENDA ============
create table public.clientes (
  id                   uuid primary key default gen_random_uuid(),
  nome                 text not null,
  endereco             text not null,
  lat                  double precision,
  lng                  double precision,
  vendedor_habitual_id uuid references public.vendedores(id) on delete set null,
  ativo                boolean not null default true,
  created_at           timestamptz not null default now()
);

-- ============ ROTAS (rota do dia) ============
create table public.rotas (
  id           uuid primary key default gen_random_uuid(),
  vendedor_id  uuid not null references public.vendedores(id) on delete cascade,
  cliente_id   uuid not null references public.clientes(id) on delete cascade,
  data         date not null,
  ordem        integer not null default 1,
  estado       text not null default 'pendente' check (estado in ('pendente', 'visitado')),
  created_at   timestamptz not null default now(),
  unique (vendedor_id, data, cliente_id)
);

-- ============ VENDAS ============
create table public.vendas (
  id             uuid primary key default gen_random_uuid(),
  vendedor_id    uuid not null references public.vendedores(id) on delete cascade,
  produto_id     uuid not null references public.produtos(id),
  cliente_id     uuid references public.clientes(id) on delete set null,
  quantidade     integer not null check (quantidade > 0),
  preco_unitario numeric(10,2) not null check (preco_unitario >= 0),
  valor_total    numeric(12,2) not null check (valor_total >= 0),
  zona           text,
  data_venda     timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

-- ============ METAS ============
create table public.metas (
  id           uuid primary key default gen_random_uuid(),
  vendedor_id  uuid not null references public.vendedores(id) on delete cascade,
  mes          integer not null check (mes between 1 and 12),
  ano          integer not null,
  valor_meta   numeric(12,2) not null check (valor_meta > 0),
  unique (vendedor_id, mes, ano)
);

-- Índices úteis
create index on public.vendas (vendedor_id, data_venda);
create index on public.rotas (vendedor_id, data);
create index on public.clientes (vendedor_habitual_id);

-- ============ HELPER: é admin? ============
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vendedores
    where user_id = auth.uid() and role = 'admin' and ativo
  );
$$;

-- ============ ROW LEVEL SECURITY ============
alter table public.vendedores enable row level security;
alter table public.produtos  enable row level security;
alter table public.clientes  enable row level security;
alter table public.rotas     enable row level security;
alter table public.vendas    enable row level security;
alter table public.metas     enable row level security;

-- VENDEDORES: cada um lê o próprio perfil; admin lê/gere tudo
create policy "vendedor_le_proprio_perfil" on public.vendedores
  for select using (user_id = auth.uid() or public.is_admin());
create policy "admin_gerencia_vendedores" on public.vendedores
  for all using (public.is_admin()) with check (public.is_admin());

-- PRODUTOS: leitura para autenticados; escrita só admin
create policy "autenticados_leem_produtos" on public.produtos
  for select using (auth.role() = 'authenticated');
create policy "admin_gerencia_produtos" on public.produtos
  for all using (public.is_admin()) with check (public.is_admin());

-- CLIENTES: leitura para autenticados; escrita só admin
create policy "autenticados_leem_clientes" on public.clientes
  for select using (auth.role() = 'authenticated');
create policy "admin_gerencia_clientes" on public.clientes
  for all using (public.is_admin()) with check (public.is_admin());

-- ROTAS: vendedor lê as suas rotas e só pode marcar estado (visitado);
-- admin gere tudo
create policy "vendedor_le_proprias_rotas" on public.rotas
  for select using (
    public.is_admin()
    or vendedor_id = (select id from public.vendedores where user_id = auth.uid())
  );
create policy "vendedor_marca_visita" on public.rotas
  for update using (
    vendedor_id = (select id from public.vendedores where user_id = auth.uid())
  ) with check (
    vendedor_id = (select id from public.vendedores where user_id = auth.uid())
  );
create policy "admin_gerencia_rotas" on public.rotas
  for all using (public.is_admin()) with check (public.is_admin());

-- VENDAS: vendedor lê/escreve apenas as suas; admin lê tudo
create policy "vendedor_le_proprias_vendas" on public.vendas
  for select using (
    public.is_admin()
    or vendedor_id = (select id from public.vendedores where user_id = auth.uid())
  );
create policy "vendedor_insere_proprias_vendas" on public.vendas
  for insert with check (
    vendedor_id = (select id from public.vendedores where user_id = auth.uid())
  );
create policy "vendedor_atualiza_proprias_vendas" on public.vendas
  for update using (
    vendedor_id = (select id from public.vendedores where user_id = auth.uid())
  ) with check (
    vendedor_id = (select id from public.vendedores where user_id = auth.uid())
  );
create policy "vendedor_apaga_proprias_vendas" on public.vendas
  for delete using (
    vendedor_id = (select id from public.vendedores where user_id = auth.uid())
  );

-- METAS: vendedor lê as suas; admin gere tudo
create policy "vendedor_le_proprias_metas" on public.metas
  for select using (
    public.is_admin()
    or vendedor_id = (select id from public.vendedores where user_id = auth.uid())
  );
create policy "admin_gerencia_metas" on public.metas
  for all using (public.is_admin()) with check (public.is_admin());

-- ============ REALTIME na tabela vendas ============
alter publication supabase_realtime add table public.vendas;
