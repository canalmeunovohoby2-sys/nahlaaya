# Nahla Aya — Vercel + Supabase

Esta etapa prepara a loja para rodar com Vercel no frontend e Supabase como
backend, sem substituir a loja local Express + SQLite. Nada foi publicado e
nenhuma conexão com um projeto Supabase real foi feita.

## Estado atual

- `VITE_BACKEND_MODE=local` mantém o frontend usando `/api` e o SQLite.
- `VITE_BACKEND_MODE=supabase` ativa o `create-order` no checkout.
- O painel administrativo local continua usando `/api/admin`; os adaptadores
  Supabase em `src/services/supabase/admin.ts` estão preparados, mas ainda não
  foram ligados ao painel.
- Catálogo, vitrines e carrinho continuam usando `src/data/products.ts` e
  `localStorage`; a migração dessas leituras pode ser feita depois.
- O SQLite em `server/data/nahla-aya.sqlite` permanece a fonte local.

## Variáveis

### Frontend (Vercel e `.env.local`)

| Variável | Exemplo | Uso |
| --- | --- | --- |
| `VITE_BACKEND_MODE` | `local` | `local` usa Express; `supabase` usa as Edge Functions. |
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` | URL pública do projeto. |
| `VITE_SUPABASE_ANON_KEY` | chave anon public | Chave pública; pode ir para o navegador. |

Use `local` enquanto o Supabase não estiver validado. Se `VITE_BACKEND_MODE`
for `supabase` sem URL/chave, o código mantém o modo local por segurança.

### Backend local

| Variável | Uso |
| --- | --- |
| `PORT` | Porta do Express (padrão `3001`). |
| `DATABASE_PATH` | Caminho do SQLite. |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Criação do administrador local. |

### Segredos das Edge Functions

Configure somente no painel/CLI do Supabase, nunca na Vercel e nunca com prefixo
`VITE_`:

- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_ORIGIN` — origem exata da loja publicada, por exemplo
  `https://nahla-aya.vercel.app`; sem isso o CORS usa `*`.

`SUPABASE_URL` e a chave anon fornecidas pelo runtime do Supabase também são
usadas pelas funções.

## Ativação do Supabase

1. Crie o projeto no painel do Supabase e anote a URL, a chave anon e a chave
   service role.
2. Instale/link o CLI:

   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   ```

3. Aplique schema e funções:

   ```bash
   npx supabase db push
   ```

4. Carregue os produtos pelo SQL Editor do Supabase (ou por
   `psql "$DATABASE_URL" -f supabase/seed/0001_products.sql`). O seed usa
   `ON CONFLICT (id) DO UPDATE`; ele não apaga pedidos nem clientes.

5. Crie o usuário administrador no painel **Authentication > Users** (o cadastro
   público está desabilitado) e registre o perfil:

   ```sql
   insert into public.admin_profiles (user_id, role)
   values ('<uuid-do-usuario>', 'admin')
   on conflict (user_id) do update set role = 'admin';
   ```

6. Publique as funções:

   ```bash
   npx supabase functions deploy create-order
   npx supabase functions deploy admin-api
   npx supabase functions deploy confirm-payment
   npx supabase functions deploy register-visit
   ```

7. Defina `APP_ORIGIN` e, se necessário, os segredos:

   ```bash
   npx supabase secrets set APP_ORIGIN=https://<dominio>
   ```

8. Configure na Vercel as variáveis `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY` e `VITE_BACKEND_MODE=supabase`. Faça um novo deploy.

## Migração segura dos dados

Não apague o SQLite. O fluxo recomendado é uma janela de manutenção:

1. Faça backup do arquivo `server/data/nahla-aya.sqlite`.
2. Pare o servidor local para evitar novas gravações.
3. Exporte e valide:

   ```bash
   npm run migration:export
   npm run migration:validate
   ```

   A exportação fica em `migration/export/` e não inclui hashes de senha.

4. Importe os produtos pelo seed. Para clientes/pedidos existentes, importe o
   JSON/CSV preservando os IDs e depois ajuste as sequences:

   ```sql
   select setval(pg_get_serial_sequence('customers', 'id'), coalesce(max(id), 1), max(id) is not null) from public.customers;
   select setval(pg_get_serial_sequence('addresses', 'id'), coalesce(max(id), 1), max(id) is not null) from public.addresses;
   select setval(pg_get_serial_sequence('orders', 'id'), coalesce(max(id), 1), max(id) is not null) from public.orders;
   select setval(pg_get_serial_sequence('order_items', 'id'), coalesce(max(id), 1), max(id) is not null) from public.order_items;
   ```

5. Confira contagens, CPF/e-mail únicos, números de pedido e a regra Pix:
   `pix_price_cents = round(installment_total_cents * 0.9)`.
6. Teste um pedido de homologação no Supabase, confirme o pagamento em modo
   manual e verifique a reserva/confirmação do estoque.
7. Só então troque `VITE_BACKEND_MODE` para `supabase` na Vercel.
8. Mantenha o SQLite como backup durante o período de observação.

O banco local atual tem 35 produtos e nenhum cliente, pedido ou administrador.

## Checkout Supabase

`create-order` recebe o payload do formulário, valida os dados, recalcula todos
os preços no servidor e cria o pedido com pagamento pendente. O estoque é
reservado atomicamente nesse momento; `confirm_order_payment` converte a reserva
em pedido pago, sem baixar o estoque uma segunda vez. Reservas expiradas são
liberadas por função própria, sem cron.

Respostas de erro usam `{ "message": "..." }`. A criação retorna HTTP 201 com
`status: "pending-payment"`; ainda não há pagamento real nem frete calculado.

## Painel

Endpoints preparados em `admin-api` (JWT de administrador obrigatório):

- `GET ?action=dashboard`
- `GET ?action=products`
- `PATCH ?action=product&id=<id>`
- `GET ?action=visits`
- `GET ?action=expired-reservations`
- `PATCH ?action=release-expired`
- `GET ?action=orders`
- `GET ?action=order&id=<id>`
- `GET ?action=customers`
- `PATCH ?action=payment&id=<id>`
- `PATCH ?action=delivery&id=<id>`

O painel React ainda não foi migrado para Supabase Auth. Para ativá-lo, use
`signInSupabaseAdmin` e troque as chamadas de `src/admin/api.ts` pelos
adaptadores de `src/services/supabase/admin.ts`. Não existe administrador padrão
nem senha em código.

## Segurança e limites

- RLS habilitado em todas as tabelas; somente produtos ativos têm leitura
  pública. Pedidos, clientes, endereços e perfis administrativos são acessados
  por `service_role` nas funções.
- A chave service role nunca deve ser exposta ao navegador.
- Preços e estoque são recalculados no servidor; o payload do cliente não define
  valores.
- Pagamento Mercado Pago, frete Melhor Envio, e-mail transacional e webhooks
  reais continuam pendentes.
- O checkout Supabase ainda precisa de testes de integração após a criação do
  projeto; nenhuma cobrança real deve ser habilitada antes disso.

## Validação local

```bash
npm run typecheck
npm run lint
npm run build:web
```

O build da Vercel usa `npm run build:web` e publica `dist` com rewrite SPA.
