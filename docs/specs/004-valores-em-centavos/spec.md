# SPEC 004 — Valores em centavos e tipo obrigatório

| | |
|---|---|
| Depende de | — (onda 3, sozinha) |
| Entrega | `prisma/schema.prisma` e uma migration nova; `src/lib/money.ts` (novo); `src/lib/validators.ts`, `src/lib/importValidators.ts`; rotas `src/app/api/{transactions,budgets,goals,imports}/**`; `src/features/invoice-import/categorize.ts`; `src/types/transaction.ts`; `src/utils/finance.ts`; somas das telas (ver R10); testes em `tests/unit`, `tests/api`, `tests/ui` e dois arquivos E2E novos |
| Docs de base | [`../visao-geral.md`](../visao-geral.md), [`../contratos.md`](../contratos.md) (**K1 e K2 — esta spec é a dona**; cria só `income`, `outcome` e `investment`), [`../../MELHORIAS.md`](../../MELHORIAS.md) (P6, P8), [`../../API.md`](../../API.md) §3 e §5, [`../../TESTES.md`](../../TESTES.md) |

## Objetivo

Hoje os valores são `Float` no banco e as somas acumulam erro de ponto flutuante; receita e despesa são separadas pelo sinal em `calculateSummary` e pelo tipo no resto do app, e a API aceita lançamento sem tipo ou com sinal trocado. Quando esta spec terminar, todo valor é guardado como **inteiro em centavos**, toda soma passa por centavos, e todo lançamento tem um **tipo obrigatório** que combina com o sinal. Para a pessoa nada muda na tela nem na exportação: os números ficam exatos e consistentes entre as telas.

## Requisitos

| ID | Requisito |
|---|---|
| R1 | **Schema (K1).** `transactions.amountCents Int`, `budgets.amountCents Int`, `goals.targetCents Int`, `goals.currentCents Int @default(0)`, `import_batches.statedTotalCents Int?`, `import_batches.importedTotalCents Int` e `credit_cards.limitCents Int`. As colunas `Float` antigas (`amount`, `targetAmount`, `currentAmount`, `statedTotal`, `importedTotal`, `limit`) deixam de existir. `transactions.type` passa a `String NOT NULL` (K2). |
| R2 | **Migration.** Uma única migration, em passos: adiciona as colunas novas, copia `ROUND(valor * 100)` de cada coluna antiga, preenche `type` nulo pelo sinal (`amount > 0` → `income`; caso contrário → `outcome`), aplica `NOT NULL` e só então remove as colunas antigas. Não altera o sinal de nenhum valor e não cria nem remove linhas. |
| R3 | **`src/lib/money.ts` (K1).** Exporta `toCents(amount: number): number` (`Math.round(amount * 100)`; `NaN`, `Infinity` e `-Infinity` lançam erro) e `fromCents(cents: number): number` (`cents / 100`). É o único lugar do servidor que converte entre reais e centavos. |
| R4 | **Fronteira da API em reais (K1).** Todas as rotas continuam recebendo e devolvendo os mesmos campos de hoje, em reais: `amount` (lançamento e orçamento), `targetAmount`/`currentAmount` (meta), `statedTotal`/`importedTotal` (lote de importação), `amount` do `lumpCandidate` e dos itens do preview. Nenhuma resposta expõe campo `*Cents`. Os demais campos da resposta (incluindo `createdAt`, `updatedAt` e `userId`) não mudam. |
| R5 | **Tipo obrigatório (K2).** `POST /api/transactions` sem `type`, com `type: null` ou com valor fora de `income`/`outcome`/`investment` responde `400`. `PATCH` com `type: null` responde `400`; `PATCH` sem o campo `type` mantém o tipo gravado. |
| R6 | **Sinal × tipo (K2).** A API responde `400` quando o sinal de `amount` não combina com o tipo: `income` exige `amount > 0`; `outcome` e `investment` exigem `amount < 0`. No `PATCH`, quando o corpo traz só `amount` ou só `type`, a conferência usa o outro valor já gravado no lançamento do usuário; quando não traz nenhum dos dois, não há conferência. Nada é gravado quando a resposta é `400`. |
| R7 | **Importação.** `POST /api/imports` grava `amountCents` (saída negativa, entrada positiva, como hoje) e calcula `importedTotalCents` somando em centavos. `POST /api/imports/preview` compara o total da fatura com os lançamentos candidatos em centavos, com a mesma tolerância de hoje (1 centavo), e classifica o histórico só pelo tipo. |
| R8 | **Tipo no cliente (K2).** `TransactionType` em `src/types/transaction.ts` é `"income" \| "outcome" \| "investment"` e `Transaction.type` passa a ser obrigatório (`TransactionType`, sem `null`). `getTransactionType` devolve `transaction.type`, sem inferir pelo sinal. |
| R9 | **Somas em centavos (K1).** `src/utils/finance.ts` soma em centavos (`Math.round(x * 100)` por item) e devolve reais. `calculateSummary` classifica **pelo tipo** (`income` → Entrou, `outcome` → Saiu, `investment` → Investiu). `finance.ts` exporta um auxiliar de soma (`sumAmounts`) para as telas. |
| R10 | **Somas nas telas.** Nenhuma tela ou componente soma `amount`, `targetAmount` ou `currentAmount` com `+` direto: Mês (`src/app/page.tsx`), Planejar, Categorias, Relatórios, Investimentos, Configurações, Importar e `TransactionList` usam o auxiliar de `finance.ts`. |
| R11 | **Exportação igual.** O CSV e o JSON de Configurações continuam com as mesmas colunas e os mesmos valores em reais de hoje; o JSON não ganha campo `*Cents`. |
| R12 | **Produção.** A migration é aplicada na produção só com aprovação explícita do usuário. Antes, uma conferência somente leitura mede o que a migration vai encontrar; depois, outra conferência somente leitura prova que as somas por usuário e por tabela são as mesmas e que não restou tipo nulo. |

## Fora de escopo

- **P7 (regra do saldo com investimento).** Nenhum critério desta spec depende dela: `total` de `calculateSummary` continua sendo a soma de tudo, como hoje. Fica no backlog.
- `Decimal(12,2)` no Prisma: o contrato K1 escolheu inteiros em centavos.
- Tipos `card_payment` (spec 005) e `refund` (spec 006): esta spec cria só os três tipos atuais.
- `CHECK` no banco para sinal × tipo ou para os valores de `type`: a regra fica na API (K2). Uma constraint teria de ser refeita pela 005 e pela 006.
- Recusar valores com mais de 2 casas decimais: `toCents` arredonda ao centavo, como define o K1.
- Corrigir o sinal de lançamentos antigos com sinal incompatível com o tipo: a migration não altera sinais (R2). A conferência prévia (R12) mede se existem; se existirem, a aplicação na produção para e o usuário decide.
- Rota ou tela de cartões: a 004 só converte a coluna `limit` (K4, spec 005).
- Categoria por identificador (spec 003), paginação (P13), mudar a unidade do formulário (o front continua em reais).
- Renomear campos da API ou mudar a ordem das respostas.

## Critérios de aceite

| ID | Critério | Requisitos cobertos | Verificado por |
|---|---|---|---|
| CA1 | `toCents(0.1)` = 10, `toCents(-150.5)` = −15050, `toCents(1234.56)` = 123456, `toCents(0.29)` = 29 e `fromCents(123456)` = 1234.56; `toCents(NaN)`, `toCents(Infinity)` e `toCents(-Infinity)` lançam erro. | R3 | T1 (`tests/unit/lib/money.test.ts`) |
| CA2 | Dado um banco com as migrations anteriores e linhas antigas (valores 0.1, −150.5, 1234.56; `type` nulo com valor positivo, negativo e zero; orçamento, meta com `currentAmount` 0, lote com `statedTotal` nulo e cartão), quando a migration da 004 é aplicada, então cada coluna em centavos tem `ROUND(valor * 100)`, os tipos nulos viram `income`/`outcome` pelo sinal (zero vira `outcome`), as colunas `Float` não existem mais, `type` é `NOT NULL`, o número de linhas é o mesmo e a soma em centavos por usuário é igual a `ROUND(soma antiga * 100)`. | R1, R2 | T2 (`tests/e2e/16-migracao-centavos.spec.ts`) |
| CA3 | `POST /api/transactions` com `amount: -150.5` e `type: "outcome"` grava `amountCents: -15050` (sem `amount`) e responde `201` com `amount: -150.5` e sem `amountCents`; `GET` responde `amount` em reais, mantém `createdAt` e não expõe `amountCents`. | R3, R4 | T3 (`tests/api/transactions.test.ts`) |
| CA4 | **Erro:** `POST /api/transactions` sem `type`, com `type: null`, com `income` e valor negativo, com `outcome` e valor positivo ou com `investment` e valor positivo responde `400` com mensagem, e `prisma.transaction.create` não é chamado. | R5, R6 | T3 (`tests/api/transactions.test.ts`, `tests/unit/lib/validators.test.ts`) |
| CA5 | **Erro:** `PATCH` só com `amount: 50` num lançamento gravado como `outcome` responde `400`; só com `type: "income"` num lançamento gravado com valor negativo responde `400`; com `type: null` responde `400`; em nenhum dos casos `updateMany` é chamado. `PATCH` só com `description` não confere sinal e responde `200`. Lançamento de outro usuário continua `404`. | R5, R6 | T3 (`tests/api/transactions.test.ts`) |
| CA6 | Orçamentos e metas gravam `amountCents`, `targetCents` e `currentCents` e respondem `amount`, `targetAmount` e `currentAmount` em reais; os erros de hoje (valor zero, negativo, não numérico, mês inválido, `409` de orçamento repetido, `404`) continuam iguais. | R3, R4 | T4 (`tests/api/budgets.test.ts`, `tests/api/goals.test.ts`) |
| CA7 | A confirmação da importação grava `amountCents` com o sinal pelo tipo e `importedTotalCents` exato (itens 0,10 + 0,20 → 30); `GET /api/imports` devolve `statedTotal` e `importedTotal` em reais (`null` continua `null`); o preview acha o `lumpCandidate` com diferença de 1 centavo e não acha com 2 centavos. | R4, R7 | T4 (`tests/api/imports.test.ts`) |
| CA8 | `calculateSummary` de duas receitas 0,1 e 0,2 dá `income` exatamente 0.3 (`toBe(0.3)`); mil saídas de 0,01 dão `outcome` exatamente −10; a soma mista de receitas, saídas e investimentos com centavos dá o `total` exato; `sumAmounts` tem as mesmas garantias. | R9 | T5 (`tests/unit/utils/finance.test.ts`) |
| CA9 | `getTransactionType` devolve o `type` gravado; `calculateSummary` classifica pelo tipo (um `investment` conta em Investiu, um `outcome` em Saiu); os testes "infere pelo sinal" e "o sinal prevalece sobre o tipo" saem; `npm run typecheck` passa com `Transaction.type` obrigatório. | R8, R9 | T5 (`tests/unit/utils/finance.test.ts`, `tests/unit/invoice-import/categorize.test.ts`, `npm run typecheck`) |
| CA10 | As telas Mês, Planejar, Categorias, Relatórios, Investimentos, Configurações e Importar mostram os mesmos números de hoje com os fixtures atuais, e mostram 0,30 (não 0,30000000000000004 nem 0,29) para lançamentos de 0,10 + 0,20; nenhuma soma direta de `amount` sobra em `src/app` e `src/components`. | R10 | T6 (`tests/ui/pages/*.test.tsx`, comando `grep` da T6) |
| CA11 | A exportação de Configurações gera o mesmo CSV (cabeçalho e linhas) e o mesmo JSON de hoje para os mesmos lançamentos, sem campo `*Cents`. | R4, R11 | T6 (`tests/ui/pages/settings.test.tsx`) e T7 (`tests/e2e/15-valores-centavos.spec.ts`) |
| CA12 | No app real: registrar dois gastos de 0,10 e 0,20 mostra "Saiu" 0,30 no Mês; a API recusa com `400` um lançamento `income` negativo e um sem tipo; o CSV exportado traz `-0.1` e `-0.2`. | R4, R6, R10, R11 | T7 (`tests/e2e/15-valores-centavos.spec.ts`) |
| CA13 | Na produção, depois de aplicada a migration: para cada usuário e tabela, a soma em centavos é igual a `ROUND(soma antiga * 100)` medida antes; não há `type` nulo; o número de linhas é o mesmo. Todas as consultas são somente leitura. | R12 | T8 (consultas somente leitura, com aprovação do usuário) |

## Validação manual

- **VM1 (T8):** o usuário aprova a aplicação da migration na produção depois de ver o resultado da conferência prévia (linhas com tipo nulo, com valor zero, com mais de 2 casas e com sinal incompatível com o tipo). A conferência posterior é feita por comando, mas exige o acesso à produção autorizado pelo usuário.
- **VM2:** depois do deploy, abrir o Mês e Relatórios no celular e conferir que os totais são os mesmos de antes da migration.
