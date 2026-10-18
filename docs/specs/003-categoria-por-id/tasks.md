# Tasks — SPEC 003

Executar na ordem. Cada task só fecha quando os comandos de "Pronto quando" passam e o resultado está registrado em `downhill.md`. O **como** de cada task está em `uphill.md`.

Observação de sequência: T2 muda os tipos de `src/types/*` e a forma das respostas; o front só volta a compilar no fim da T6. Por isso T2–T5 fecham com testes direcionados, e `npm run typecheck` completo é exigido a partir da T6.

| ID | Task | Depende de | Cobre | Status |
|---|---|---|---|---|
| T1 | Schema e migration com vínculo, órfãos e integridade, provados por teste de migration | — | R1, R2, R3, CA1, CA2, CA3 | ⬜ |
| T2 | Validação e rotas de lançamentos e orçamentos por `categoryId` | T1 | R4, R5, CA4, CA5, CA6 | ⬜ |
| T3 | Rotas de categorias (`409` com `usage` ao excluir e ao mudar tipo em uso) e de regras | T1 | R7, R8, CA7 (API), CA8, CA9 | ⬜ |
| T4 | Importação por `categoryId`: `categorize.ts`, preview, confirmação e conferência | T2, T3 | R6, R10, CA12 | ⬜ |
| T5 | Tipos do cliente, folha Registrar/Editar e `BudgetForm` enviando `categoryId` | T2 | R10, CA11 | ⬜ |
| T6 | Telas agregando por id, exclusão explicada, recarga após renomear, filtro, exportação e E2E de categorias | T3, T4, T5 | R9, R11, R12, CA7, CA10, CA13, CA14 | ⬜ |
| T7 | Documentação, guia e verificação completa | T6 | CA15 | ⬜ |
| T8 | Aplicar a migration na produção — **requer aprovação do usuário** | T7 | R1, R2, R3 (produção) | ⬜ |

## T1 — Schema e migration

- **Entrega:** `prisma/schema.prisma` (`Transaction`, `Budget` e `CategoryRule` com `categoryId String` e relação com `Category`, `onDelete: Restrict`; `Category` com as relações inversas; `@@unique([userId, categoryId, month])` em `Budget`; índices em `categoryId`); `prisma/migrations/<timestamp>_category_by_id/migration.sql`; `tests/migrations/003-categoria-por-id.ts` (script que sobe um Postgres embutido próprio, aplica as migrations anteriores, insere o cenário legado, aplica esta migration e confere).
- **Objetivo:** trocar o vínculo por nome pelo vínculo por id sem perder nenhum lançamento, orçamento ou regra útil.
- **Pronto quando:**
  - `npx vite-node tests/migrations/003-categoria-por-id.ts` termina com código 0 e imprime os cenários verificados: vínculo por (usuário, nome, tipo) com as três "Outros" (CA1); órfãos criando uma categoria por usuário e regra órfã apagada, com contagens de lançamentos e orçamentos iguais antes e depois (CA2); colunas `category` ausentes, `NOT NULL`, `23503` ao apagar categoria referenciada e `23505` no orçamento repetido (CA3).
  - `npx prisma validate` passa e `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url <banco temporário>` não mostra diferença (schema e migrations alinhados).

## T2 — Lançamentos e orçamentos por `categoryId`

- **Entrega:** `src/lib/validators.ts` (`validateTransactionInput` e `validateBudgetInput` com `categoryId`; recusa o campo de texto `category`); função única de checagem de posse e compatibilidade de tipo (K3) usada pelas rotas; `src/app/api/transactions/route.ts`, `src/app/api/transactions/[id]/route.ts`, `src/app/api/budgets/route.ts`, `src/app/api/budgets/[id]/route.ts` (validam a categoria e devolvem `categoryId` + `category` pelo nome da relação); `src/types/transaction.ts` e `src/types/budget.ts`; `tests/unit/lib/validators.test.ts`, `tests/api/transactions.test.ts`, `tests/api/budgets.test.ts` (mocks do Prisma atualizados).
- **Objetivo:** a API só aceita categorias do próprio usuário e de tipo compatível, e sempre devolve o nome atual.
- **Pronto quando:**
  - `npx vitest run tests/unit/lib/validators.test.ts tests/api/transactions.test.ts tests/api/budgets.test.ts` passa, com casos para: sucesso com `categoryId` e nome na resposta (CA4, CA6); sem `categoryId`; `categoryId` de outro usuário; inexistente; tipo incompatível no `POST`; `PATCH` que muda só o tipo; campo antigo `category`; orçamento com categoria `income`; orçamento repetido `409` (CA5, CA6). Nos casos de erro, o teste confere que `create`/`update*` não foi chamado.

## T3 — Categorias e regras

- **Entrega:** `src/app/api/categories/[id]/route.ts` (`DELETE` conta uso em lançamentos, orçamentos e regras do usuário e responde `409 { error, usage }`; `PATCH` recusa mudar o tipo de categoria em uso com o mesmo `409`); `src/app/api/category-rules/route.ts` (`GET` devolve `categoryId` e `category` pelo nome); `src/types/categoryRule.ts`; `tests/api/categories.test.ts`, `tests/api/category-rules.test.ts`.
- **Objetivo:** excluir ou mudar o tipo de categoria em uso nunca quebra dados, e a resposta diz o que a usa.
- **Pronto quando:**
  - `npx vitest run tests/api/categories.test.ts tests/api/category-rules.test.ts` passa, com casos para: `DELETE` em uso com `usage: { transactions: 2, budgets: 1, rules: 1 }` e sem `delete*` (CA9); `DELETE` sem uso `200`; `DELETE` de outro usuário `404`; contagens filtradas pelo `userId` da sessão; `PATCH` de tipo em uso `409` sem `update`; `PATCH` de tipo sem uso `200`; `PATCH` só de nome em uso `200` (CA8); `GET` de regras e de lançamentos montando `category` a partir da relação (CA7, parte de API).

## T4 — Importação por `categoryId`

- **Entrega:** `src/features/invoice-import/categorize.ts` (regras, histórico e palavras-chave resolvem para `categoryId`; a palavra-chave continua mapeando para o **nome** padrão e é convertida no id da categoria `outcome` de mesmo nome, se existir); `src/features/invoice-import/types.ts` (`categoryId` nos itens de preview e confirmação e nas regras); `src/lib/importValidators.ts`; `src/app/api/imports/preview/route.ts`; `src/app/api/imports/route.ts` (valida todos os `categoryId` de itens e regras antes da transação; grava `categoryId`); `src/app/import/page.tsx` (opções e linhas por id; "Aplicar às outras" e "Lembrar" por id); testes `tests/unit/invoice-import/categorize.test.ts`, `tests/unit/lib/importValidators.test.ts`, `tests/api/imports.test.ts`, `tests/ui/pages/import.test.tsx`.
- **Objetivo:** a importação sugere, grava e lembra categorias pelo id.
- **Pronto quando:**
  - `npx vitest run tests/unit/invoice-import/categorize.test.ts tests/unit/lib/importValidators.test.ts tests/api/imports.test.ts tests/ui/pages/import.test.tsx` passa, com casos para: sugestão por regra, histórico e palavra-chave devolvendo o id certo; palavra-chave sem categoria de mesmo nome → sem sugestão; confirmação gravando `categoryId` em lançamentos e regras; item com `categoryId` de outro usuário → `400` com `invalidItems` e sem `importBatch.create`; regra com categoria de tipo incompatível → `400`; conferência enviando o `categoryId` escolhido (CA12).

## T5 — Folha Registrar/Editar e `BudgetForm`

- **Entrega:** `src/components/TransactionForm/index.tsx` (chips por `id`, envia `categoryId`; "mais usadas" contadas por `categoryId`; remove `preservedCategory`); `src/contexts/EntrySheetContext.tsx` (valores iniciais com `categoryId`); `src/components/BudgetForm/index.tsx` (opções com `value={id}`, envia `categoryId`); `src/services/*` afetados; `tests/ui/components/TransactionForm.test.tsx`, `tests/ui/components/forms.test.tsx`, `tests/ui/helpers/fixtures.ts` (só acrescenta `categoryId` aos dados de exemplo).
- **Objetivo:** todo formulário envia o id da categoria escolhida.
- **Pronto quando:**
  - `npx vitest run tests/ui/components/TransactionForm.test.tsx tests/ui/components/forms.test.tsx` passa, com casos para: chip escolhido envia seu `categoryId`; "Outros" de gasto e de receita enviam ids diferentes; edição abre com o chip da categoria marcado; `BudgetForm` envia `categoryId` de categoria de gasto (CA11).

## T6 — Telas, exclusão explicada, exportação e E2E de categorias

- **Entrega:** `src/app/page.tsx`, `src/app/planning/page.tsx`, `src/app/categories/page.tsx` (métricas por id; texto da confirmação; após renomear chama `refreshTransactions`), `src/app/reports/page.tsx`, `src/app/investments/page.tsx`, `src/app/transactions/page.tsx` e `src/components/TransactionFilters` (filtro por id, rótulo pelo nome), `src/app/settings/page.tsx` (CSV com o nome atual); `tests/e2e/support/fixtures.ts` (acrescenta helper que resolve nome e tipo em `categoryId` para `createTransaction`/`createBudget`); `tests/e2e/04-categories.spec.ts` (tira os dois `knownBug` e reescreve "excluir categoria em uso" para esperar o aviso); demais testes de UI das páginas.
- **Objetivo:** as telas somam por id, mostram o nome atual e explicam a exclusão recusada.
- **Pronto quando:**
  - `npx vitest run tests/ui/pages` passa, com casos para: orçamento somando por `categoryId` no Mês e em Planejar; métricas de Categorias por id sem misturar homônimas; "Gastos por categoria" e distribuição de Investimentos por id; filtro de categoria por id (CA13); diálogo de exclusão mostrando a mensagem do `409` e a categoria mantida na lista (CA10); recarga dos lançamentos depois de renomear; CSV com cabeçalho igual e nome atual (CA14).
  - `npx playwright test tests/e2e/04-categories.spec.ts tests/e2e/05-budgets.spec.ts tests/e2e/11-invoice-import.spec.ts` passa, incluindo "renomear categoria mantém os lançamentos vinculados a ela" e "excluir categoria em uso avisa…" sem `knownBug` (CA7, CA10).
  - `npm run lint && npm run typecheck && npm test` passa.

## T7 — Documentação e verificação completa

- **Entrega:** `docs/API.md` (§3 modelo com `categoryId`; §5.2–5.6 corpos, respostas e o `409` com `usage`; §6 migration); `docs/FUNCIONALIDADES.md` (§0: excluir categoria em uso, renomear reflete em tudo); `docs/TESTES.md` (teste de migration e remoção dos `knownBug` de categorias); `docs/MELHORIAS.md` (P1 resolvido); `AGENTS.md` §3 (a frase "`Transaction.category` e `Budget.category` guardam o nome" passa a descrever `categoryId`); `src/app/ajuda/page.tsx` (parte "categorias": excluir só categoria sem uso; renomear mantém tudo); `tests/ajuda/capturas.ts` (semeia por `categoryId`) e capturas regravadas.
- **Objetivo:** documentação e guia descrevem o comportamento novo; a suíte inteira passa.
- **Pronto quando:**
  - `npx vite-node tests/ajuda/capturas.ts` termina sem erro e regrava `public/ajuda/*.jpg`.
  - `npm run lint && npm run typecheck && npm test && npm run test:e2e` passa, sem nenhum `knownBug` em `tests/e2e/04-categories.spec.ts` (CA15).
  - `grep -rn "guardam o \*\*nome\*\*" AGENTS.md docs/API.md` não encontra a descrição antiga.

## T8 — Migration na produção (requer aprovação do usuário)

- **Entrega:** registro em `downhill.md` das consultas e do resultado.
- **Objetivo:** aplicar a migration no Supabase com a janela mínima entre o deploy do código novo e a mudança do banco.
- **Pronto quando:**
  - Antes, consulta **somente leitura** na produção registrada: total de lançamentos, orçamentos e regras; quantos lançamentos e orçamentos ficariam órfãos (sem categoria de mesmo nome e tipo) e quais nomes; quantas regras seriam apagadas.
  - Com aprovação explícita do usuário, `npx prisma migrate deploy` aplicado na sequência combinada com o deploy (ver incógnita 7).
  - Depois, consulta **somente leitura**: as contagens de lançamentos e orçamentos são iguais às de antes; `select count(*) from transactions where "categoryId" is null` = 0 (idem `budgets`, `category_rules`); `information_schema.columns` não tem mais `category` nessas tabelas.
  - Validação manual da spec registrada em `docs/specs/validacao-manual.md`.

## Fatos verificados

| Fato | Onde (VERIFICADO em 18/10/2026) |
|---|---|
| `Transaction.category`, `Budget.category` e `CategoryRule.category` são `String` (nome) | `prisma/schema.prisma:32`, `:68`, `:146` |
| `Category` é única por `(userId, name, type)` | `prisma/schema.prisma:61` |
| O único de orçamento é `@@unique([userId, category, month])`, criado como **constraint** `budgets_userId_category_month_key` | `prisma/schema.prisma:76`; `prisma/migrations/20260701090000_add_users_and_ownership/migration.sql:43` |
| O cadastro cria três "Outros" (income, outcome, investment) | `src/app/api/register/route.ts:60`, `:69`, `:74` |
| `DELETE /api/categories/[id]` apaga sem checar uso; `PATCH` aceita mudar nome **e tipo** sem checar uso | `src/app/api/categories/[id]/route.ts:26-35`, `:71-73` |
| `validateTransactionInput` e `validateBudgetInput` aceitam `category` texto, sem conferir existência | `src/lib/validators.ts:71-77`, `:223-241` |
| Rotas de lançamentos e orçamentos gravam o corpo validado direto, sem checar a categoria | `src/app/api/transactions/route.ts:52-57`; `src/app/api/budgets/route.ts:50-55` |
| A confirmação da importação grava `category` (nome) em lançamentos e faz `upsert` de regras com nome | `src/app/api/imports/route.ts:126-160` |
| `suggestCategory` só sugere categoria existente do tipo; regra de categoria inexistente é ignorada | `src/features/invoice-import/categorize.ts:143`, `:188-191` |
| O preview lê categorias, regras e lançamentos com `category` (nome) | `src/app/api/imports/preview/route.ts:52-71` |
| `GET /api/category-rules` seleciona `category` | `src/app/api/category-rules/route.ts:16` |
| O formulário guarda o nome; tem caminho de "categoria preservada" para nome órfão; "mais usadas" por nome | `src/components/TransactionForm/index.tsx:76`, `:108-123`, `:163` |
| `BudgetForm` usa o nome como `value` e preserva nome órfão | `src/components/BudgetForm/index.tsx:45`, `:96-101` |
| `EntrySheetContext` passa `category: transaction.category` à edição | `src/contexts/EntrySheetContext.tsx:26` |
| Somas por nome: Mês (`page.tsx:72`, `:79`), Planejar (`planning/page.tsx:141`, `:153`), Categorias (`categories/page.tsx:164`), Relatórios (`reports/page.tsx:57`), Investimentos (`investments/page.tsx:46`), filtro de Lançamentos (`transactions/page.tsx:30`, `:44`) | arquivos citados |
| A confirmação de exclusão diz "Os lançamentos já registrados continuam com esse nome." e mostra o erro da API no próprio diálogo (`ConfirmDialog` + `FormError`) | `src/app/categories/page.tsx:464`; `src/components/ConfirmDialog/index.tsx:35-52` |
| `ApiError` guarda só `message` e `status` (não o corpo); a mensagem do `409` precisa vir pronta em `error` | `src/services/http.ts:1-25` |
| O contexto tem `refreshTransactions` | `src/contexts/TransactionsContenxt.tsx:29` |
| CSV de Configurações: colunas `id, description, amount, category, type, paymentMethod, notes, date` | `src/app/settings/page.tsx:39-63` |
| Os testes de API mockam o Prisma (sem banco) | `tests/api/helpers.ts`; `tests/api/categories.test.ts` |
| E2E com dois `knownBug` para renomear e excluir categoria em uso | `tests/e2e/04-categories.spec.ts:313-347` |
| Fixtures E2E e o script de capturas criam lançamentos e orçamentos com `category` (nome) | `tests/e2e/support/fixtures.ts:141-159`; `tests/ajuda/capturas.ts:81-89` |
| O E2E aplica o schema com `prisma migrate deploy` (cai para `db push` se falhar) e há `embedded-postgres` nas devDependencies | `tests/e2e/support/postgres.ts:73-90`; `package.json:47` |

**NÃO VERIFICADO:**

- Quantos lançamentos, orçamentos e regras órfãos existem hoje na produção (exige consulta; ver T8).
- Forma exata do schema depois da 004 (nomes `amountCents`, `type NOT NULL`): esta spec assume K1/K2 como escritos em `contratos.md`.
- Se a 004 criou um harness de teste de migration reutilizável (a pasta `docs/specs/004-valores-em-centavos/` não existia quando esta spec foi escrita).

## Incógnitas iniciais para o uphill

1. **Colisão de nomes entre tipos no backfill.** Confirmar com SQL de teste que o `UPDATE ... FROM categories` casando `(userId, name, type)` liga o lançamento `outcome` em "Outros" ao "Outros" de gasto, e que não existe lançamento com `type` nulo (a 004 preenche). Se a 004 deixar algum tipo fora de `income|outcome|investment`, definir o tratamento.
2. **Órfãos.** Escrever o `INSERT ... SELECT DISTINCT userId, category, type ... ON CONFLICT DO NOTHING` (lançamentos e orçamentos) antes do `UPDATE`; definir como gerar `id` (`gen_random_uuid()` existe no Postgres do Supabase e no embutido?) e `createdAt/updatedAt`. Decidir a cor da categoria criada (nula, como diz o R2) e confirmar que `CategoryRow` e chips aceitam cor nula.
3. **Regras órfãs.** Confirmar que apagar regra órfã (R2) não perde informação útil: a regra já não é usada (`categorize.ts:143`). Medir quantas existem na produção (T8).
4. **Prisma client e nomes.** A relação não pode se chamar `category` enquanto a resposta da API usa `category` como **nome** texto: decidir o nome da relação (ex.: `categoryRef`) ou mapear o `include` para achatar `{ categoryId, category: categoryRef.name }` num único helper reutilizado pelas rotas. Conferir o `orderBy` por nome da relação em `GET /api/budgets`.
5. **Mocks dos testes de API.** Os mocks de `prismaMock` precisam de `category.findFirst`/`count` e de `transaction.count`/`budget.count`/`categoryRule.count`; definir se a checagem de posse usa `findFirst({ where: { id, userId } })` (uma consulta) e como fica nos testes.
6. **Teste de migration.** Definir como aplicar só as migrations anteriores (executar os `migration.sql` em ordem com `pg`, ou `prisma migrate deploy` numa cópia da pasta sem a nova) num Postgres embutido em porta e diretório próprios; se o script entra no `npm test`/CI ou só como comando da T1 (o CI não roda E2E). Reaproveitar `startLocalPostgres` (hoje lê a porta do `.env`) ou parametrizá-lo sem alterar o comportamento atual.
7. **Ordem do deploy.** A migration remove `category`; o código antigo quebra depois dela e o novo quebra antes dela. Definir a sequência com menor janela (ex.: aplicar a migration imediatamente após a promoção do deploy na Vercel) e o plano B (reverter: SQL de volta preparado e testado no embutido).
8. **Uso de regras no `409`.** K3 conta regras no `usage` e a FK é `RESTRICT` também em `category_rules`. Confirmar que a mensagem orienta a excluir a regra na aba Regras, e se vale exibir os números por tipo de uso no diálogo (o `ApiError` não carrega `usage`; a mensagem de `error` precisa trazer as contagens prontas em português).
9. **Exportação.** Confirmar que nenhuma ferramenta do usuário depende do JSON sem `categoryId` (o CSV não muda de formato).
10. **Ordem das telas.** `TransactionFilters` e `transactions/page.tsx` foram alterados pela 009 (onda 2): reler antes de mexer no filtro de categoria.
11. **Testes E2E afetados pelos fixtures.** Levantar todos os specs que chamam `api.createTransaction`/`createBudget` com nome de categoria e garantir que o helper novo resolve nome + tipo em id sem mudar a chamada nos testes existentes.

## Questões para o orquestrador

> **Decididas no portão do topo (18/10/2026).** As decisões estão em [`../README.md`](../README.md#portão-do-topo--decisões-18102026) e já constam em [`../contratos.md`](../contratos.md); o texto abaixo fica como histórico.
1. **K3 × `card_payment`.** K3 pede `transactions.categoryId NOT NULL` e, ao mesmo tempo, `categoryId` nulo para `card_payment` (005). Esta spec cria `NOT NULL` (o tipo `card_payment` ainda não existe na onda 3). **Proposta:** a migration da 005 troca para `NULL` com `CHECK ("categoryId" IS NOT NULL OR type = 'card_payment')`, e o `Transaction.categoryId` vira `String?` no Prisma a partir da 005. Alternativa: a 003 já criar a coluna anulável com esse `CHECK`; descartada aqui porque deixaria `categoryId` opcional nos tipos TypeScript por causa de um tipo que ainda não existe.
2. **Harness de teste de migration.** A 004 (onda 2) e a 003 precisam provar migrations com dados legados. **Proposta:** quem chegar primeiro cria `tests/migrations/` com um utilitário que sobe o Postgres embutido em porta própria e aplica as migrations até uma dada; as seguintes (003, 005, 008) só acrescentam scripts. Registrar em `contratos.md` como recurso compartilhado.
