# Vendas na Rua

Sistema de gestão de vendas de rua: app mobile para vendedores (Expo / React Native),
backoffice web para administradores (React / Vite) e backend Supabase.

## Estrutura do repositório

```
vendas-na-rua/
├── supabase/
│   ├── migrations/20260818000000_init.sql   # esquema + RLS + Realtime
│   └── seed.sql                             # dados de teste
├── mobile/                                  # app Expo (vendedor)
└── app/                                     # backoffice web (admin) — pasta /app do projeto
```

Esquema de cores: navy `#0F2540`, âmbar `#E8871E`, fundo `#F6F4EF`.

---

## 1. Supabase — criar o projeto e aplicar a migração

### Opção A — CLI

```bash
npm install -g supabase
supabase login
supabase init                      # dentro da pasta do projeto
supabase link --project-ref <ref>  # o ref está no URL do dashboard
supabase db push                   # aplica supabase/migrations/…
supabase db seed                   # opcional: corre o seed.sql
```

### Opção B — Dashboard

1. Cria o projeto em https://supabase.com/dashboard
2. Abre **SQL Editor** e cola/corre o conteúdo de `supabase/migrations/20260818000000_init.sql`

### Criar utilizadores e aplicar o seed

1. Em **Authentication → Users → Add user**, cria 3 utilizadores (ex.: `ana@empresa.pt`,
   `bruno@empresa.pt`, `carla@empresa.pt`) com passwords.
2. Copia os UUIDs e substitui `<uuid-admin>`, `<uuid-vendedor1>`, `<uuid-vendedor2>`
   no `supabase/seed.sql`. Corre o ficheiro no SQL Editor.
3. Confirma que o Realtime está ativo para `vendas`
   (**Database → Replication → supabase_realtime**) — a migração já adiciona a tabela
   à publication.

### Segurança (RLS) — resumo

- Um vendedor só lê/insere/atualiza/apaga as **suas** vendas e só vê as **suas** rotas
  (pode marcá-las como `visitado`).
- Contas com `role = 'admin'` (na tabela `vendedores`) leem tudo e gerem vendedores,
  produtos, clientes, rotas e metas.
- Produtos e clientes são de leitura para qualquer utilizador autenticado; escrita só admin.

---

## 2. Backoffice web (React + Vite) → deploy na Vercel

A pasta `app/` contém o backoffice (dashboard + administração).

### Correr localmente

```bash
cd app
npm install
cp .env.example .env   # ou cria o ficheiro com:
# VITE_SUPABASE_URL=https://TEU-PROJETO.supabase.co
# VITE_SUPABASE_ANON_KEY=TUA-ANON-KEY
npm run dev
```

As credenciais estão em **Supabase → Project Settings → API** (`Project URL` e `anon public`).

### Deploy na Vercel

1. Faz push do repositório para o GitHub/GitLab.
2. Em https://vercel.com → **Add New → Project** → importa o repositório.
3. Em **Root Directory**, escolhe `app` (a pasta do backoffice).
4. Framework: **Vite** (detetado automaticamente). Build command `npm run build`, output `dist`.
5. Em **Environment Variables**, adiciona:
   - `VITE_SUPABASE_URL` = `https://TEU-PROJETO.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = a tua anon key
6. **Deploy**. A cada push na branch principal a Vercel reconstrói automaticamente.

> A anon key é segura de expor no frontend — o acesso aos dados é controlado pelo RLS.
> Nunca uses a `service_role` key no frontend.

### Funcionalidades do backoffice

- Login restrito a contas com `role = 'admin'`.
- Dashboard: receita total, nº de vendas, vendedores ativos, ticket médio; gráficos de
  receita por vendedor e por produto (recharts); feed de atividade recente;
  **atualização em tempo real** via Supabase Realtime; filtro hoje / 7 dias / tudo;
  **exportar CSV** do período selecionado.
- Administração: CRUD de vendedores, produtos e clientes (com localização no mapa);
  montagem da **rota do dia** (vendedor + data + lista ordenada) com pré-visualização
  no mapa antes de confirmar.

> Nota: criar um vendedor no backoffice cria o registo na tabela; para ele conseguir
> autenticar-se, cria também o utilizador em **Authentication → Add user** e associa o
> `user_id` (ver aviso dentro da app).

---

## 3. App mobile (Expo) → APK de teste via EAS Build

A pasta `mobile/` contém a app do vendedor: login, rota do dia com mapa e pins
numerados, navegação Google Maps, registo de venda (marca a paragem como visitada)
e histórico do dia.

### Correr em desenvolvimento

```bash
cd mobile
npm install
cp .env.example .env   # preenche EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY
npx expo start         # abre no Expo Go ou num emulador
```

A app pede permissão de localização ao arrancar para centrar o mapa na posição do vendedor.

### Gerar o APK de teste

```bash
npm install -g eas-cli
eas login                       # conta Expo (gratuita)
cd mobile
eas build:configure             # ou usa o eas.json já incluído
# Preenche as env vars no eas.json (perfil "apk-teste") ou define secrets:
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value https://TEU-PROJETO.supabase.co
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value TUA-ANON-KEY
eas build --platform android --profile apk-teste
```

Quando o build terminar, o EAS dá-te um link para descarregar o **.apk** — instala-o
diretamente num telemóvel Android (permite "instalar apps de origens desconhecidas").

> Substitui também `COLOCA-AQUI-O-TEU-PROJECT-ID` em `mobile/app.json` pelo projectId
> que o `eas build:configure` gera (ou corre `eas init`).

---

## 4. Fluxo completo de teste

1. Aplica a migração e o seed (com os UUIDs reais).
2. Backoffice: entra com `ana@empresa.pt` → separador **Rota do dia** → confirma/edita a rota do Bruno.
3. Mobile: entra com `bruno@empresa.pt` → vê a rota no mapa → navega até um cliente →
   **Registar venda** → a paragem fica "visitado".
4. O dashboard web atualiza sozinho (Realtime) com a nova venda — sem F5.
