# Tasks — SPEC 004

Executar na ordem. Cada task só fecha quando os comandos de "Pronto quando" passam e o resultado está registrado em `downhill.md`. O **como** de cada task está em `uphill.md`.

| ID | Task | Depende de | Cobre | Status |
|---|---|---|---|---|
| T1 | `src/lib/money.ts` com `toCents`/`fromCents` | — | R3, CA1 | ⬜ |
| T2 | Schema, migration em passos e teste da migration com dados antigos | — | R1, R2, CA2 | ⬜ |
| T3 | Lançamentos: tipo obrigatório, sinal × tipo e centavos na rota | T1, T2 | R3, R4, R5, R6, CA3, CA4, CA5 | ⬜ |
| T4 | Orçamentos, metas e importação em centavos | T1, T2 | R3, R4, R7, CA6, CA7 | ⬜ |
| T5 | `finance.ts` pelo tipo e em centavos; `Transaction.type` obrigatório | T3 | R8, R9, CA8, CA9 | ⬜ |
| T6 | Somas das telas pelo auxiliar de `finance.ts`; exportação igual | T5 | R10, R11, CA10, CA11 | ⬜ |
| T7 | E2E de valores, documentação e verificação completa | T1–T6 | CA11, CA12 | ⬜ |
| T8 | Aplicar a migration na produção — **requer aprovação do usuário** | T7 | R12, CA13 | ⬜ |

T8 é operacional: vem depois da última task de código (T7) porque a migration remove as colunas que o código antigo lê; aplicar a migration e publicar o código novo têm de acontecer juntos.

## T1 — `src/lib/money.ts`

- **Entrega:** `src/lib/money.ts` (novo); `tests/unit/lib/money.test.ts` (novo).
- **Objetivo:** um único ponto de conversão reais ↔ centavos, com a assinatura do K1.
- **Pronto quando:**
  - `npx vitest run tests/unit/lib/money.test.ts` passa com os casos do CA1 (0.1, −150.5, 1234.56, 0.29, 0.01, −0.01, 0, `fromCents` de positivo, negativo e zero) e os três casos de erro (`NaN`, `Infinity`, `-Infinity`).

## T2 — Schema e migration

- **Entrega:**
  - `prisma/schema.prisma`: colunas do R1; `Transaction.type String`.
  - `prisma/migrations/<timestamp>_money_in_cents/migration.sql` (nova).
  - `tests/e2e/16-migracao-centavos.spec.ts` (novo): aplica as migrations anteriores num banco separado do Postgres embutido, insere as linhas antigas do CA2, aplica a migration da 004 e confere o resultado.
- **Objetivo:** converter os dados existentes sem mudar nenhuma soma nem nenhum sinal.
- **Pronto quando:**
  - `npx prisma validate` passa e `npx prisma migrate diff` entre o schema e as migrations não mostra diferença.
  - `npx playwright test tests/e2e/16-migracao-centavos.spec.ts` passa conferindo: valores em centavos; `type` preenchido pelo sinal (positivo → `income`, negativo e zero → `outcome`); tipos já preenchidos inalterados; colunas `Float` ausentes (`information_schema.columns`); `type` `NOT NULL`; número de linhas igual; soma em centavos por usuário e tabela igual a `ROUND(soma antiga * 100)`; `statedTotal` nulo → `statedTotalCents` nulo.
  - O banco do E2E normal sobe com `prisma migrate deploy` sem cair no `db push` (log "[e2e] Schema aplicado com `prisma migrate deploy`.").

## T3 — Lançamentos: tipo, sinal e centavos

- **Entrega:**
  - `src/lib/validators.ts`: `validateTransactionInput` exige `type` no modo completo, recusa `type: null`, confere sinal × tipo quando os dois estão no corpo e exporta a conferência para o `PATCH` usar com o valor gravado.
  - `src/app/api/transactions/route.ts` e `src/app/api/transactions/[id]/route.ts`: gravam `amountCents` via `toCents`; respondem com `amount` via `fromCents`, sem `amountCents`; o `PATCH` lê o lançamento do usuário quando o corpo traz só `amount` ou só `type`.
  - `tests/unit/lib/validators.test.ts`, `tests/api/transactions.test.ts` (os mocks do Prisma passam a devolver `amountCents`; o caso "aceita entrada positiva sem data, tipo ou campos opcionais" passa a exigir `type`).
- **Objetivo:** a API só aceita lançamentos com tipo e sinal coerentes e guarda centavos.
- **Pronto quando:**
  - `npx vitest run tests/unit/lib/validators.test.ts tests/api/transactions.test.ts` passa com:
    - CA3: `create` recebe `amountCents: -15050` e não recebe `amount`; respostas de `POST`, `GET` e `PATCH` com `amount` em reais, `createdAt` presente e sem `amountCents`;
    - CA4: os cinco casos de `400` no `POST`, com `create` não chamado;
    - CA5: os três casos de `400` no `PATCH` sem `updateMany`; `PATCH` só de `description` responde `200`; outro usuário → `404`.

## T4 — Orçamentos, metas e importação

- **Entrega:**
  - `src/app/api/budgets/route.ts`, `src/app/api/budgets/[id]/route.ts`, `src/app/api/goals/route.ts`, `src/app/api/goals/[id]/route.ts`.
  - `src/app/api/imports/route.ts` (criação e `GET`), `src/app/api/imports/preview/route.ts` (histórico e `lumpCandidate`), `src/lib/importValidators.ts` (se a conversão de `statedTotal` mudar de lugar), `src/features/invoice-import/categorize.ts` (sem inferência pelo sinal).
  - `tests/api/budgets.test.ts`, `tests/api/goals.test.ts`, `tests/api/imports.test.ts`, `tests/unit/lib/importValidators.test.ts`, `tests/unit/invoice-import/categorize.test.ts`.
- **Objetivo:** todas as outras gravações e leituras de valor passam por `toCents`/`fromCents`, sem mudar o contrato da API.
- **Pronto quando:**
  - `npx vitest run tests/api/budgets.test.ts tests/api/goals.test.ts tests/api/imports.test.ts tests/unit/lib/importValidators.test.ts tests/unit/invoice-import` passa com os casos do CA6 e do CA7, incluindo os casos de erro que já existem (valor zero, negativo, não numérico, mês inválido, `409`, `404`, linha inválida da importação).
  - `grep -rn "amountCents\|targetCents\|currentCents\|TotalCents" src/app/api` só mostra gravação e leitura do Prisma, nunca um campo de resposta.

## T5 — `finance.ts` pelo tipo e em centavos

- **Entrega:**
  - `src/types/transaction.ts`: `TransactionType` com os três valores e `type: TransactionType` obrigatório.
  - `src/utils/finance.ts`: `getTransactionType` sem inferência; `calculateSummary` e `calculateInvestments` em centavos e pelo tipo; `sumAmounts` (novo).
  - `tests/unit/utils/finance.test.ts`: saem "infere income/outcome quando o tipo é nulo…", "usa o sinal do valor quando o tipo é nulo", "comportamento atual: o sinal prevalece sobre o tipo" e "ignora transações sem tipo"; entram os casos do CA8 e do CA9.
  - Lugares que deixam de compilar com `type` obrigatório: `tests/ui/helpers/fixtures.ts` (`t9` e `t10` ganham tipo — ver Questões), `tests/unit/invoice-import/categorize.test.ts`, `tests/ui/pages/transactions.test.tsx` (o caso "filtra por tipo, inferindo o tipo pelo sinal em registros sem type"), `tests/ui/pages/settings.test.tsx` (linha do CSV de `t9`).
- **Objetivo:** o cliente classifica sempre pelo tipo e soma sem erro de ponto flutuante.
- **Pronto quando:**
  - `npx vitest run tests/unit/utils/finance.test.ts` passa com: 0,1 + 0,2 = 0.3 exato; mil × 0,01 = 10 exato (em Saiu, −10); soma mista exata; `investment` em Investiu e `outcome` em Saiu pelo tipo; `sumAmounts([])` = 0.
  - `npm run typecheck` passa.
  - `npm test` passa (os testes de UI continuam mostrando os mesmos totais com os fixtures).

## T6 — Somas das telas e exportação

- **Entrega:**
  - `src/app/page.tsx`, `src/app/planning/page.tsx`, `src/app/categories/page.tsx`, `src/app/reports/page.tsx`, `src/app/investments/page.tsx`, `src/app/settings/page.tsx`, `src/app/import/page.tsx`, `src/components/TransactionList/index.tsx`: somas pelo `sumAmounts` (ou pelo agrupamento em centavos de `finance.ts`). Arquivos que outras specs da onda 2 também tocam: ver Questões.
  - `tests/ui/pages/dashboard.test.tsx` e `tests/ui/pages/reports-investments.test.tsx`: um caso cada com 0,10 + 0,20 mostrando 0,30.
  - `tests/ui/pages/settings.test.tsx`: CSV e JSON iguais aos de hoje para os mesmos lançamentos.
- **Objetivo:** nenhuma soma de valor em reais fora de `finance.ts`.
- **Pronto quando:**
  - `npx vitest run tests/ui/pages` passa, com os casos novos do CA10 e os de exportação do CA11.
  - `grep -rnE "(\+|-) *(Math\.abs\()?[A-Za-z]+\.(amount|targetAmount|currentAmount|spent)\b" src/app src/components` não devolve soma de valores (só ordenações e comparações, listadas em `downhill.md`).

## T7 — E2E de valores, documentação e verificação completa

- **Entrega:**
  - `tests/e2e/15-valores-centavos.spec.ts` (novo): CA12 e a parte E2E do CA11.
  - `docs/API.md` (§3 modelos em centavos, §5.2 `type` obrigatório e `400` de sinal × tipo, §6 nova migration), `docs/FUNCIONALIDADES.md` (§1.5 regra de sinal e tipo; §5 itens resolvidos), `docs/TESTES.md` (arquivos novos), `docs/MELHORIAS.md` (P6 e P8 como aplicados).
  - Guia `/ajuda`: nada muda na tela; capturas não são regravadas.
- **Objetivo:** provar no app real e deixar a documentação igual ao código.
- **Pronto quando:**
  - `npx playwright test tests/e2e/15-valores-centavos.spec.ts tests/e2e/16-migracao-centavos.spec.ts` passa.
  - `npm run lint && npm run typecheck && npm test && npm run test:e2e` passa.

## T8 — Aplicar a migration na produção (requer aprovação do usuário)

- **Entrega:** registro em `downhill.md` das consultas e das saídas; nenhum arquivo do produto muda.
- **Objetivo:** levar a migration à produção sem mudar nenhum número.
- **Pronto quando:**
  - **Antes (somente leitura, com acesso autorizado):** contagem de lançamentos com `type` nulo, com `amount = 0`, com mais de 2 casas (`abs(amount*100 - round(amount*100)) > 1e-6`, nas seis colunas) e com sinal incompatível com o tipo; soma e contagem por usuário de cada tabela. Se houver sinal incompatível ou valor com mais de 2 casas, a task para e o usuário decide.
  - O usuário aprovou por escrito no chat; `npx prisma migrate deploy` aplicado na produção junto com o merge que publica o código.
  - **Depois (somente leitura):** para cada usuário e tabela, a soma de `*Cents` é igual a `ROUND(soma antiga * 100)` medida antes; zero `type` nulo; contagens iguais (CA13). Saídas coladas em `downhill.md`.

## Fatos verificados

| Fato | Onde (VERIFICADO) |
|---|---|
| `Transaction.amount Float`, `type String?`, `createdAt DateTime @default(now())` | `prisma/schema.prisma:31,34,37` |
| `Budget.amount Float`; `Goal.targetAmount Float`, `currentAmount Float @default(0)` | `prisma/schema.prisma:69,84-85` |
| `ImportBatch.statedTotal Float?`, `importedTotal Float` | `prisma/schema.prisma:119-120` |
| `CreditCard.limit Float`; nenhuma rota usa `credit_cards` | `prisma/schema.prisma:160`; lista de rotas em `src/app/api` |
| 12 migrations, a última é `20261017000000_enable_rls`; a de cartões cria `limit DOUBLE PRECISION` | `ls prisma/migrations`; `20260812192858_add_credit_cards/migration.sql` |
| O E2E aplica o schema com `prisma migrate deploy` e, se falhar, cai em `db push` | `tests/e2e/support/postgres.ts:70-85` |
| As rotas devolvem o objeto do Prisma inteiro (`findMany`/`create`/`findUnique` sem `select`), então a resposta hoje inclui `createdAt`, `updatedAt` e `userId` | `src/app/api/transactions/route.ts:15-22,52-59`; `[id]/route.ts:48-50`; budgets e goals idem |
| `validateTransactionInput`: `amount` finito ≠ 0; `type` aceita `null`; sem conferência de sinal | `src/lib/validators.ts:63-85` |
| `validateBudgetInput` aceita `amount` número ou texto numérico > 0 | `src/lib/validators.ts:223-241` |
| `PATCH` de lançamento usa `updateMany` direto, sem ler o registro antes | `src/app/api/transactions/[id]/route.ts:39-48` |
| Importação: `importedTotal` somado em `Float` e arredondado com `Math.round(x*100)/100`; sinal pelo tipo | `src/app/api/imports/route.ts:92-96,129` |
| Preview: `LUMP_TOLERANCE = 0.01` e `FLOAT_EPSILON`; `resolveType` infere pelo sinal | `src/app/api/imports/preview/route.ts:18-27,149-153` |
| `categorize.ts` infere tipo pelo sinal no histórico | `src/features/invoice-import/categorize.ts:109` |
| `getTransactionType` infere pelo sinal; `calculateSummary` separa receita/despesa pelo sinal | `src/utils/finance.ts:15-37` |
| `Transaction.type?: TransactionType \| null` e o tipo tem 3 valores | `src/types/transaction.ts:1-12` |
| O formulário sempre envia `type` e o sinal pelo tipo | `src/components/TransactionForm/index.tsx:160-163` |
| `parseAmountInput` aceita mais de 2 casas (`"32,905"` → 32.905) | `src/utils/formatters.ts:46-53` |
| Somas diretas de `amount` nas telas | `src/app/page.tsx:72`, `settings/page.tsx:76`, `planning/page.tsx:146,251`, `categories/page.tsx:171`, `reports/page.tsx:57`, `investments/page.tsx:38,43,46,65`, `import/page.tsx:460`, `components/TransactionList/index.tsx:25` |
| Exportação JSON é a lista vinda da API sem filtro de campos; CSV tem colunas `id,description,amount,category,type,paymentMethod,notes,date` | `src/app/settings/page.tsx:39-65,102-105`; `tests/ui/pages/settings.test.tsx:103-136` |
| Os testes de API mockam o Prisma devolvendo objetos com `amount` | `tests/api/transactions.test.ts:1-41` |
| Teste de API aceita lançamento sem tipo; E2E 02 já confere `400` de tipo inválido | `tests/api/transactions.test.ts:170`; `tests/e2e/02-transactions.spec.ts:414-430` |
| Fixtures de UI têm dois lançamentos com `type: null` (`t9`, `t10`) | `tests/ui/helpers/fixtures.ts:50-52` |
| Testes unitários que documentam a inferência pelo sinal | `tests/unit/utils/finance.test.ts:146-157,178,196,241` |
| O seed do E2E e das capturas cria lançamentos pela API com `type` e sinal coerentes | `tests/e2e/support/fixtures.ts:144-146`; `tests/ajuda/capturas.ts:81-84` |

**NÃO VERIFICADO:**

- Quantos lançamentos na produção têm `type` nulo, `amount = 0`, mais de 2 casas ou sinal incompatível com o tipo (exige consulta à produção — T8).
- Se `prisma migrate deploy` roda a migration inteira numa transação no PostgreSQL (se não, a migration precisa de `BEGIN`/`COMMIT` explícitos ou de ser idempotente).
- Tempo de bloqueio da tabela `transactions` durante o `ALTER` no volume da produção (centenas de linhas, segundo `fatos-verificados.md`).

## Incógnitas iniciais para o uphill

1. **Arredondamento na cópia.** `ROUND(amount * 100)` em `double precision` no PostgreSQL arredonda empates como? Comparar com `ROUND((amount * 100)::numeric)` e com `Math.round` do JS. Provar, com experimento, que para todo valor de 2 casas a cópia é exata e que nenhuma soma por usuário muda; definir a consulta da T8 que mede valores com mais de 2 casas.
2. **Uma migration ou duas.** O K1 pede cópia e remoção na mesma migration. Confirmar se o Prisma roda o arquivo numa transação (rollback total se falhar) e se o `ALTER ... DROP COLUMN` com `NOT NULL` no volume atual bloqueia por tempo relevante. Plano B se não houver transação: `BEGIN`/`COMMIT` no próprio SQL.
3. **`type` nulo com `amount` 0.** A regra é `outcome` (igual ao `getTransactionType` de hoje). Esses registros violam "outcome < 0": confirmar que nada os quebra (o `PATCH` sem `amount`/`type` não confere sinal; `calculateSummary` soma 0). Medir quantos existem na produção.
4. **Testes de API com `prismaMock`.** Todos os mocks devolvem `amount`. Decidir se o downhill troca os objetos de cada teste ou cria um auxiliar em `tests/api/helpers.ts` (só acrescentar, regra dos helpers compartilhados). Listar os testes afetados em `transactions`, `budgets`, `goals` e `imports`.
5. **Serialização da resposta.** Onde fica o mapeamento `amountCents → amount` (função por modelo em `src/lib/money.ts` ou no próprio arquivo da rota) para garantir que `createdAt`, `updatedAt` e `userId` continuam iguais e nenhum `*Cents` vaza (o JSON exportado depende disso).
6. **Teste da migration.** Como aplicar "as migrations até a anterior" num banco separado do Postgres embutido (diretório temporário com cópia das migrations? `prisma migrate deploy` com `--schema` e `DATABASE_URL` próprio?), sem interferir no banco do E2E normal.
7. **Janela entre a migration e o deploy.** A migration remove as colunas que o código antigo lê: entre o `migrate deploy` e o fim do build da Vercel, a API de produção responde `500`. Medir a janela e combinar com o usuário a ordem (merge → aguardar build → migrate, ou o contrário) e se uma janela curta de erro é aceitável.
8. **`TransactionList` e `BudgetRow`/`GoalRow`.** `remaining = a - b` também é conta em `Float`. Decidir se entra no R10 (subtração de dois valores) ou se só somas acumuladas contam.
9. **PATCH com leitura prévia.** Ler o lançamento antes do `updateMany` abre uma janela de corrida (outro `PATCH` muda o tipo entre a leitura e a escrita). Avaliar se `updateMany` com `where` incluindo o tipo/sinal lido resolve, ou se a corrida é aceitável num app de um usuário.

## Questões para o orquestrador

> **Decididas no portão do topo (18/10/2026).** As decisões estão em [`../README.md`](../README.md#portão-do-topo--decisões-18102026) e já constam em [`../contratos.md`](../contratos.md); o texto abaixo fica como histórico.
1. **Arquivos compartilhados na onda 2.** O K1 pede que nenhuma soma de valor fique fora de `finance.ts`, o que obriga a 004 a tocar `src/app/page.tsx` (dono na onda: 007), `src/app/planning/page.tsx` (010 mexe no mês de Planejar) e `src/app/investments/page.tsx` e `tests/ui/pages/transactions.test.tsx` (009). **Proposta:** a T6 da 004 desce por último na onda, depois da 007, da 009 e da 010, mudando só as linhas de soma; ou essas linhas ficam para o início da onda 3. **Motivo:** evitar conflito de merge sem afrouxar o K1.
2. **`src/types/transaction.ts`** é tocado pela 004 (`type` obrigatório) e pela 009 (`createdAt`). **Proposta:** a 004 deixa o arquivo pronto com `createdAt?: string` também, ou a 009 rebaseia depois; são linhas diferentes e o conflito é trivial.
3. **`tests/ui/helpers/fixtures.ts`.** A regra dos helpers é "só acrescentar", mas com `type` obrigatório `t9` e `t10` (`type: null`) deixam de compilar. **Proposta:** a 004 pode alterar só esses dois registros, dando `outcome` a `t9` (−100) e `income` a `t10` (300); os totais esperados dos testes não mudam porque o sinal já combina.
4. **Numeração dos E2E.** `12-` já foi usado pela 001 e pela 005. Esta spec usa `15-valores-centavos` e `16-migracao-centavos`; o orquestrador pode renumerar.
5. **K1 e `goals.currentCents`.** O contrato não diz o default; esta spec assume `@default(0)`, igual ao `currentAmount` de hoje.
