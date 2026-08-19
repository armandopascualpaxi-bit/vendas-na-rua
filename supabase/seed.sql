-- ============================================
-- Seed de dados de teste — Vendas na Rua
-- Pré-requisito: criar 3 utilizadores no Auth
-- (Authentication > Users > Add user) e substituir
-- os UUIDs abaixo pelos ids reais.
-- ============================================

insert into public.vendedores (user_id, nome, email, role, zona) values
  ('<uuid-admin>',     'Ana Admin',    'ana@empresa.pt',    'admin',    null),
  ('<uuid-vendedor1>', 'Bruno Costa',  'bruno@empresa.pt',  'vendedor', 'Norte'),
  ('<uuid-vendedor2>', 'Carla Mendes', 'carla@empresa.pt',  'vendedor', 'Sul');

insert into public.produtos (nome, descricao, preco) values
  ('Água 1.5L',        'Garrafa de água 1.5 litros',      1.20),
  ('Sumo Natural',     'Sumo de laranja natural 33cl',    2.50),
  ('Snack Proteico',   'Barrita proteica 60g',            1.80),
  ('Café Expresso',    'Café em cápsula (unidade)',       0.60),
  ('Pack Energia',     'Pack promocional de bebidas',     9.90);

insert into public.clientes (nome, endereco, lat, lng, vendedor_habitual_id) values
  ('Café Central',      'Praça da República 12, Braga',      41.5518, -8.4229, (select id from public.vendedores where email = 'bruno@empresa.pt')),
  ('Minimercado Lusitano', 'Rua do Souto 45, Braga',         41.5503, -8.4260, (select id from public.vendedores where email = 'bruno@empresa.pt')),
  ('Padaria Pão Quente','Avenida da Liberdade 210, Braga',   41.5456, -8.4215, (select id from public.vendedores where email = 'bruno@empresa.pt')),
  ('Quiosque Jardim',   'Avenida Central 33, Braga',         41.5520, -8.4180, (select id from public.vendedores where email = 'bruno@empresa.pt')),
  ('Restaurante Maré',  'Rua do Castelo 8, Braga',           41.5540, -8.4250, (select id from public.vendedores where email = 'carla@empresa.pt'));

-- Rota do dia para o Bruno (data de hoje)
insert into public.rotas (vendedor_id, cliente_id, data, ordem)
select
  (select id from public.vendedores where email = 'bruno@empresa.pt'),
  c.id, current_date, c.ordem
from (values
  ('Café Central', 1),
  ('Minimercado Lusitano', 2),
  ('Padaria Pão Quente', 3),
  ('Quiosque Jardim', 4)
) as c(nome, ordem)
join public.clientes cl on cl.nome = c.nome;

-- Vendas de teste
insert into public.vendas (vendedor_id, produto_id, cliente_id, quantidade, preco_unitario, valor_total, zona, data_venda)
select
  v.id, p.id, cl.id, q.qtd, p.preco, p.preco * q.qtd, v.zona,
  now() - (q.horas || ' hours')::interval
from (values
  ('bruno@empresa.pt', 'Água 1.5L',      'Café Central',         24, 2),
  ('bruno@empresa.pt', 'Pack Energia',   'Minimercado Lusitano',  3, 5),
  ('bruno@empresa.pt', 'Café Expresso',  'Padaria Pão Quente',   50, 26),
  ('carla@empresa.pt', 'Sumo Natural',   'Restaurante Maré',     12, 3),
  ('carla@empresa.pt', 'Snack Proteico', 'Restaurante Maré',     20, 30)
) as q(email, produto, cliente, qtd, horas)
join public.vendedores v  on v.email = q.email
join public.produtos   p  on p.nome  = q.produto
join public.clientes   cl on cl.nome = q.cliente;

-- Metas do mês corrente
insert into public.metas (vendedor_id, mes, ano, valor_meta)
select id,
       extract(month from current_date)::int,
       extract(year from current_date)::int,
       case email when 'bruno@empresa.pt' then 5000 else 8000 end
from public.vendedores where role = 'vendedor';
