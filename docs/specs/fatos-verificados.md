# Fatos verificados (fase 0)

Fatos usados pelas specs 001–010, com **como** foram verificados em 18/10/2026. Os fatos específicos de cada spec, levantados ao escrevê-la, estão na seção "Fatos verificados" do respectivo `tasks.md`. **Não verificado** significa palpite: vira incógnita do uphill, nunca requisito.

## Ambiente e projeto

| Fato | Como foi verificado |
|---|---|
| Next.js 16.2.1, React 19.2, Prisma 7.x, styled-components 6, recharts 3, Node 24 na máquina de desenvolvimento | `package.json`; `node -v` → v24.20.0 |
| A CI roda `npm ci`, lint, typecheck e `npm test` em todo PR e push na master; **não** roda o E2E | `.github/workflows/ci.yml` |
| O E2E sobe Postgres embutido (`embedded-postgres`) na porta do `.env` e o app em `next dev` na 3100 | `tests/e2e/support/postgres.ts`, `playwright.config.ts` |
| Migrations são aplicadas na produção à mão; o build da Vercel roda só `next build` | `package.json` (`build`), `docs/MELHORIAS.md` I7, histórico das sessões de 17/10 |
| RLS ligado em todas as tabelas e `anon`/`authenticated` sem permissão; toda tabela nova precisa de `ENABLE ROW LEVEL SECURITY` | migration `20261017000000_enable_rls`; consulta à produção em 17/10 (`pg_class.relrowsecurity`, `information_schema.role_table_grants`) |
| O Prisma conecta na produção como `postgres`, dono das tabelas e com `BYPASSRLS` | consulta `pg_roles` na produção em 17/10 |

## Dados

| Fato | Como foi verificado |
|---|---|
| `Transaction.amount`, `Budget.amount`, `Goal.targetAmount/currentAmount`, `CreditCard.limit` e os totais de `ImportBatch` são `Float` | `prisma/schema.prisma` |
| `Transaction.type` é `String?`; registros antigos podem não ter tipo, e `getTransactionType` infere pelo sinal | `prisma/schema.prisma`; `src/utils/finance.ts:15` |
| `Transaction.category`, `Budget.category` e `CategoryRule.category` guardam o **nome** da categoria; `Category` é única por `(userId, name, type)` | `prisma/schema.prisma`; `AGENTS.md` §3 |
| `CreditCard` (`credit_cards`) existe com `name`, `limit`, `closingDay`, `dueDay`, `color?`, `brand?`; `Transaction.cardId?` com `ON DELETE SET NULL`. Nenhuma rota nem tela usa | `prisma/schema.prisma`; `grep -rn creditCard src` sem uso fora do schema |
| Na produção há 1 cartão e nenhum lançamento com `cardId` | consulta somente leitura em 17/10 |
| `PasswordResetToken.token` é gravado em texto, com `@unique` | `prisma/schema.prisma:100` |

## Autenticação

| Fato | Como foi verificado |
|---|---|
| Sessão: cookie `session_token` com payload `{ userId, email, exp }` assinado com HMAC-SHA256; `sameSite: "lax"`, 30 dias | `src/lib/session.ts` |
| O limite de tentativas de login é um `Map` em memória do processo | `src/app/api/login/route.ts:11` |
| O corte pelo `score` do reCAPTCHA está comentado | `src/app/api/login/route.ts:90` |
| Cadastro e "esqueci a senha" não usam reCAPTCHA nem limite de tentativas | leitura de `src/app/api/register/route.ts` e `src/app/api/auth/forgot-password/route.ts` |

## Cliente

| Fato | Como foi verificado |
|---|---|
| `fetchTransactions` chama `response.json()` antes de conferir `ok` e devolve `[]` em qualquer falha; o mesmo padrão vale para os outros `fetch*` de leitura | `src/services/transactions.ts:5-10`; `docs/MELHORIAS.md` P17 |
| `TransactionsContext` não expõe estado de carregamento nem de erro | `src/contexts/TransactionsContenxt.tsx` |
| Todas as transações do usuário ficam em memória; Mês, Relatórios, Categorias e Planejar calculam no cliente | `docs/FUNCIONALIDADES.md` §1.4 |
| O guia `/ajuda` tem capturas geradas por `tests/ajuda/capturas.ts`; mudança visível em tela pede regravar | `docs/FUNCIONALIDADES.md` §0 |
| Relatórios e Planejar usam `<input type="month">` invisível sob o rótulo do mês | `src/components/PeriodFilter`, `src/app/planning/page.tsx` |

## Não verificado (vai para o uphill de quem depende)

| Palpite | Spec |
|---|---|
| `crypto.subtle` (Web Crypto) está disponível no runtime do `proxy.ts` para conferir a versão da sessão; ou o proxy continua só com a assinatura e a versão é conferida nas APIs | 002 |
| `prisma migrate` aceita, numa única migration, a cópia `Float → Int` e o `DROP` da coluna antiga sem bloquear a tabela por tempo relevante no volume atual (centenas de linhas) | 004 |
| `inert` no `<body>`/raiz é suportado pelos navegadores-alvo (Safari iOS 15.5+) e pelo jsdom dos testes | 010 |
