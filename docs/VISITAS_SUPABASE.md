# Contador de visitas

Estrutura preparada para registrar visitas reais da loja no Supabase. Nenhum
projeto Supabase foi criado, conectado ou publicado nesta etapa.

## Arquivos

- `supabase/migrations/202610310003_visits.sql`
- `supabase/functions/register-visit/index.ts`
- `supabase/functions/_shared/rate-limit.ts`
- `supabase/functions/admin-api/index.ts` — ação `visits`
- `src/lib/visit-session.ts`
- `src/services/visits.ts`
- `src/components/analytics/VisitTracker.tsx`
- `src/components/admin/AdminVisitsPanel.tsx`
- `src/services/supabase/admin.ts`
- `tests/visits.test.ts`

## Banco de dados

A tabela `public.visits` guarda somente:

- `id`: identificador da visita.
- `visited_at`: data e horário do registro.
- `visit_date`: data de agrupamento diário, no fuso `America/Sao_Paulo`.
- `session_id`: UUID temporário da sessão do navegador.

Não são armazenados IP, nome, telefone, CPF, endereço ou qualquer dado pessoal.
O `session_id` é gerado no navegador e não identifica uma pessoa.

A coluna de sessão é única. O índice de `visit_date` atende aos totais do painel;
há também um índice por `visited_at`. A RLS está habilitada, sem política pública,
e os privilégios diretos de `anon` e `authenticated` foram revogados.

As funções `register_visit(uuid)` e `get_visit_stats()` são `security definer` e
só podem ser executadas por `service_role`.

## Registro

O navegador gera um UUID por sessão e o mantém em `sessionStorage`. O registro é
feito uma vez quando a loja é aberta:

- atualizar a página não cria outra visita;
- navegar entre páginas não faz novas gravações;
- fechar a sessão/nova aba cria outro UUID e permite outra visita;
- o índice único do banco impede duplicação mesmo em uma repetição de rede.

O modo local não chama o Supabase. O registro só é acionado quando
`VITE_BACKEND_MODE=supabase` e as variáveis públicas do projeto existem.

A função Edge aceita apenas `POST`, valida UUID, limita o tamanho do corpo,
confere a origem quando `APP_ORIGIN` está definido e aplica um limite temporário
em memória baseado em uma impressão hash do endereço de rede. O IP não é gravado
na tabela nem pela função. Esse limite é uma proteção complementar, não
persistente: uma nova instância da Edge Function reinicia a contagem. Limites
adicionais devem ser configurados no próprio Supabase.

## Painel

O dashboard administrativo mostra:

- total acumulado;
- visitas de hoje;
- visitas dos últimos 7 dias, incluindo hoje.

Com o modo local, o painel exibe apenas o estado **“Integração pendente”**, sem
números fictícios e sem tentar acessar o Supabase. Com o Supabase conectado, a
seção usa o adaptador autenticado de `src/services/supabase/admin.ts`.

O painel React ainda usa autenticação local nesta versão. Para a seção consultar
as visitas em produção, o painel administrativo também precisará usar a sessão
do Supabase Auth.

## Ativação

1. Crie/conecte o projeto Supabase.
2. Aplique a migration:

   ```bash
   npx supabase db push
   ```

3. Publique as funções:

   ```bash
   npx supabase functions deploy register-visit
   npx supabase functions deploy admin-api
   ```

4. Defina a origem permitida:

   ```bash
   npx supabase secrets set APP_ORIGIN=https://<dominio-da-loja>
   ```

5. Configure na Vercel:

   ```text
   VITE_BACKEND_MODE=supabase
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<chave-anon-publica>
   ```

6. Faça o deploy da loja e valide as consultas abaixo.

## Testes locais executados

`npm run test:visits` cobre a geração/reutilização da sessão, o marcador de
registro, a troca de sessão e o limite de requisições. Também foi validado em
navegador headless, contra um mock local, que:

- a primeira abertura faz uma requisição;
- atualizar a página não faz outra;
- navegar entre rotas não faz outra;
- limpar a sessão gera uma nova requisição com outro UUID;
- o modo local não chama o Supabase e o painel mostra o estado pendente.

Esses testes de navegador usam um mock; não substituem os testes de banco/RLS.

## Testes no Supabase

Os testes que dependem do banco e das Edge Functions estão pendentes até existir
um projeto. No SQL Editor, usando uma transação para não deixar dados de teste:

```sql
begin;

select public.register_visit('11111111-1111-4111-8111-111111111111');
select public.register_visit('11111111-1111-4111-8111-111111111111'); -- recorded=false
select count(*) from public.visits; -- 1

select public.register_visit('22222222-2222-4222-8222-222222222222');
select count(*) from public.visits; -- 2

select public.get_visit_stats();

rollback;
```

Para confirmar que o público não lê a tabela, use uma sessão com o papel `anon`
e execute `select * from public.visits;`. O acesso deve ser negado.

Checklist de integração:

- uma sessão do navegador cria uma linha;
- atualizar a página não cria outra linha;
- nova sessão cria outra linha;
- os totais `today` e `last7Days` batem com as datas;
- `anon` não consegue ler nem inserir diretamente em `public.visits`;
- o painel local continua exibindo o estado pendente;
- o painel Supabase autenticado exibe os totais reais.

## Escopo

Não há cron, robô, heartbeat ou requisição periódica. As visitas são apenas
acessos reais de navegadores. Essa atividade pode ocorrer no banco, mas não é
apresentada como garantia de que o plano gratuito do Supabase não será pausado.
