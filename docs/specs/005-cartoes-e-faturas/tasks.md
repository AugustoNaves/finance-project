# Tasks — SPEC 005 · Cartões de crédito e faturas

Executar na ordem. Cada task só fecha quando os comandos de "Pronto quando" passam e o resultado está registrado em `downhill.md`. O **como** de cada task fica no `uphill.md`.

| ID | Task | Depende de | Cobre | Status |
|---|---|---|---|---|
| T1 | Estrutura e protótipo aprovados pelo usuário (skill `direcao-design-produto`, pontos A e C) | — | VM1 (R1, R10, R12) | ⬜ |
| T2 | Funções puras do mês da fatura e do resumo de faturas | — | R3, R5, R10, R11 · CA1, CA2, CA3 | ⬜ |
| T3 | Migration, tipos, validações, `/api/credit-cards` e lançamentos com cartão | T2 | R2, R4, R7, R8, R14, R15 · CA4–CA8 | ⬜ |
| T4 | Mês efetivo em `finance.ts` e nas telas mensais | T2, T3 | R5, R6, R7 · CA9, CA10 | ⬜ |
| T5 | Tela Cartões, rota protegida e campo "Cartão" no formulário | T1, T3 | R1, R9, R14, R16 · CA11, CA12, CA13 | ⬜ |
| T6 | Bloco da fatura no Mês e registro do pagamento | T1, T4, T5 | R10, R11, R12 · CA14, CA15 | ⬜ |
| T7 | Importação com cartão | T3, T5 | R13 · CA16, CA17 | ⬜ |
| T8 | E2E, documentação, guia `/ajuda` e verificação completa | T1–T7 | CA18 e todos | ⬜ |
| T9 | Aplicar a migration na produção — **requer aprovação do usuário** | T8 | R15 · CA8 | ⬜ |

## T1 — Estrutura e protótipo aprovados pelo usuário

- **Entrega:** protótipo navegável, fora do código do produto (Artifact ou HTML no scratchpad), seguindo [`../../design/design-spec.md`](../../design/design-spec.md). Ele mostra: (a) onde ficam os cartões (proposta: `/cards` na folha Mais); (b) a tela Cartões com a folha de criar e editar; (c) o Mês com blocos de fatura aberta, fechada e paga, abertos e fechados; (d) a folha "Registrar pagamento"; (e) o campo "Cartão" no formulário. As decisões aprovadas ficam registradas em `downhill.md`.
- **Objetivo:** fechar com o usuário os pontos A (estrutura) e C (protótipo) da skill `direcao-design-produto` antes de qualquer task de UI (T5, T6, T7).
- **Pronto quando:**
  - O usuário aprovou no chat o ponto A, com a lista das três decisões da spec ("Decisões desta spec") confirmadas ou trocadas.
  - O usuário aprovou no chat o ponto C (protótipo).
  - `downhill.md` registra as decisões. Se alguma mudou um requisito, a spec foi atualizada antes de T5.

## T2 — Funções puras do mês da fatura e do resumo de faturas

- **Entrega:** `src/features/credit-cards/invoice.ts` com `getInvoiceMonth` e `getEffectiveMonth` (assinaturas do K4). Traz também auxiliares puros para as datas da fatura de um mês (fechamento e vencimento ajustados ao último dia) e para o resumo das faturas de um mês (cartão, total, pago, situação, itens). Testes em `tests/unit/credit-cards/invoice.test.ts`.
- **Objetivo:** concentrar toda a regra de fatura em código puro e testado, sem banco nem React.
- **Pronto quando:**
  - `npx vitest run tests/unit/credit-cards/invoice.test.ts` passa com os casos:
    - antes do fechamento;
    - no dia do fechamento;
    - depois do fechamento;
    - dez → jan;
    - `closingDay = 31` em fevereiro (ano bissexto e não bissexto) e em abril;
    - `dueDay < closingDay`;
    - `dueDay == closingDay`;
    - todos os ramos de `getEffectiveMonth` (CA2);
    - situação aberta, fechada, paga e parcial, e `refund` abatendo o total (CA3).
  - `npm run lint && npm run typecheck` passam.

## T3 — Migration, tipos, validações, `/api/credit-cards` e lançamentos com cartão

- **Entrega:**
  - **Schema e migration:**
    - `prisma/schema.prisma` e uma migration nova com `transactions.invoiceMonth TEXT NULL` e `import_batches.cardId TEXT NULL`;
    - `import_batches.cardId` tem FK para `credit_cards(id)` `ON DELETE SET NULL` e índice;
    - o RLS já está ligado nas duas tabelas; conferir.
  - **Tipos:** `src/types/transaction.ts` ganha `card_payment` em `TransactionType` e os campos `cardId?` e `invoiceMonth?`; o tipo `CreditCard` fica em `src/types/creditCard.ts`.
  - **Validação:** em `src/lib/validators.ts`, `validateCreditCardInput` e as regras de R7 e R8 em `validateTransactionInput`.
  - **Rotas:**
    - `src/app/api/credit-cards/route.ts` e `src/app/api/credit-cards/[id]/route.ts`;
    - `POST`/`PATCH` de `/api/transactions` calculam o `invoiceMonth` com `getInvoiceMonth` (R4).
  - **Testes:** `tests/api/credit-cards.test.ts`, casos novos em `tests/api/transactions.test.ts` e `tests/unit/lib/validators.test.ts`.
- **Objetivo:** dar ao app a API de cartões e lançamentos que já saem do servidor com o mês da fatura gravado.
- **Pronto quando:**
  - `npx prisma migrate dev` aplica sem erro num banco local que tem um cartão inserido pelo SQL de `20260812192858_add_credit_cards`, e o cartão continua lá (CA8).
  - `npx vitest run tests/api/credit-cards.test.ts` passa com o CRUD (CA4) e todos os erros de CA5: 401, cada 400, 404 de outro usuário e 500.
  - `npx vitest run tests/api/transactions.test.ts tests/unit/lib/validators.test.ts` passa com o cálculo, recálculo e congelamento do `invoiceMonth` (CA6) e com cada erro de CA7.
  - `npm run lint && npm run typecheck && npm test` passam.

## T4 — Mês efetivo em `finance.ts` e nas telas mensais

- **Entrega:**
  - `src/utils/finance.ts`: `getMonthlyTransactions` passa a usar `getEffectiveMonth`, e `calculateSummary` ignora `card_payment`.
  - Troca do filtro por mês da data pelo mês efetivo em:
    - `src/app/page.tsx`;
    - `src/app/planning/page.tsx` (gasto do orçamento);
    - `src/app/reports/page.tsx`;
    - `src/app/categories/page.tsx`;
    - `src/app/investments/page.tsx`.
  - Casos novos em `tests/unit/utils/finance.test.ts` e nos testes de página citados no CA10.
- **Objetivo:** a compra no cartão conta no mês da fatura em todas as telas mensais, e o pagamento da fatura não conta duas vezes.
- **Pronto quando:**
  - `npx vitest run tests/unit/utils/finance.test.ts` passa com os casos de CA9.
  - `npx vitest run tests/ui/pages/dashboard.test.tsx tests/ui/pages/planning.test.tsx tests/ui/pages/reports-investments.test.tsx tests/ui/pages/categories.test.tsx` passa. Cada arquivo tem um caso com lançamento de `invoiceMonth` diferente do mês da data (CA10).
  - `grep -rn "getMonthKey(transaction.date)" src/app` não encontra nenhum uso em tela mensal.
  - `npm run lint && npm run typecheck && npm test` passam.

## T5 — Tela Cartões, rota protegida e campo "Cartão" no formulário

- **Entrega:**
  - **Tela:** `src/app/cards/page.tsx` + `styles.ts`, mais `src/components/CreditCardForm/` (index + styles).
  - **Serviço:** `src/services/creditCards.ts`, que lança `ApiError` (K8).
  - **Navegação:** item "Cartões" em `src/components/AppNavigation`.
  - **Proxy:** `/cards` em `rotasProtegidas` e no `matcher` de `src/proxy.ts`.
  - **Formulário:** campo "Cartão" em `src/components/TransactionForm`; `src/contexts/EntrySheetContext.tsx` repassa `cardId` na edição.
  - **Testes:** `tests/ui/pages/cards.test.tsx`, casos novos em `tests/unit/proxy.test.ts` e `tests/ui/components/TransactionForm.test.tsx`.
- **Objetivo:** a pessoa cadastra e mantém os cartões e escolhe o cartão ao registrar uma compra no crédito.
- **Pronto quando:**
  - `npx vitest run tests/ui/pages/cards.test.tsx` passa (CA11). Inclui a confirmação com "N lançamentos", o erro da API no `FormError` e a falha de carga com mensagem.
  - `npx vitest run tests/unit/proxy.test.ts` passa com `/cards` sem sessão → `/login` (CA12).
  - `npx vitest run tests/ui/components/TransactionForm.test.tsx` passa com os casos de CA13.
  - `npm run lint && npm run typecheck && npm test` passam.

## T6 — Bloco da fatura no Mês e registro do pagamento

- **Entrega:**
  - `src/components/InvoiceBlock/` (index + styles), conforme o protótipo de T1;
  - folha "Registrar pagamento", que reusa `CustomModal` e `FormError`;
  - uso em `src/app/page.tsx`, que carrega os cartões e tira as compras do cartão de "Últimos lançamentos";
  - casos em `tests/ui/pages/dashboard.test.tsx`.
- **Objetivo:** o Mês mostra cada fatura como um bloco que se abre e permite quitá-la como transferência.
- **Pronto quando:**
  - `npx vitest run tests/ui/pages/dashboard.test.tsx` passa com:
    - o texto do bloco e as três situações;
    - abrir e fechar o bloco;
    - as compras fora de "Últimos lançamentos" (CA14);
    - o valor sugerido;
    - o envio de `card_payment` com `cardId` e `invoiceMonth`;
    - "paga" com o Saiu inalterado;
    - a falha da API com a folha aberta e a mensagem (CA15).
  - `npm run lint && npm run typecheck && npm test` passam.

## T7 — Importação com cartão

- **Entrega:**
  - **Validação:** `src/lib/importValidators.ts` aceita `cardId?`.
  - **Rota:** `src/app/api/imports/route.ts` valida que o cartão é do usuário e grava `cardId` no lote e nos lançamentos, com `invoiceMonth = referenceMonth`.
  - **Tela:** campo "Cartão" em `src/app/import/page.tsx`; a opção "mês da compra" fica oculta quando há cartão.
  - **Testes:** casos em `tests/api/imports.test.ts`, `tests/unit/lib/importValidators.test.ts` e `tests/ui/pages/import.test.tsx`.
- **Objetivo:** a fatura importada passa a ser a fatura daquele cartão, sem deslocar o mês duas vezes.
- **Pronto quando:**
  - `npx vitest run tests/api/imports.test.ts tests/unit/lib/importValidators.test.ts` passa com: o lote e os lançamentos com `cardId`; `invoiceMonth = referenceMonth`; sem `cardId` igual a hoje; e `cardId` de outro usuário → 400 sem gravar nada (CA16).
  - `npx vitest run tests/ui/pages/import.test.tsx` passa com os casos de CA17.
  - `npm run lint && npm run typecheck && npm test` passam.

## T8 — E2E, documentação, guia `/ajuda` e verificação completa

- **Entrega:**
  - **E2E:** `tests/e2e/17-credit-cards.spec.ts`; helpers só **acrescentados** em `tests/e2e/support/`.
  - **Documentação:**
    - `docs/API.md`: modelo `CreditCard`, `invoiceMonth`, `import_batches.cardId`, `/api/credit-cards`, `card_payment` e as regras novas de `/api/transactions` e `/api/imports`;
    - `docs/FUNCIONALIDADES.md` §0: tela Cartões, bloco da fatura, campo "Cartão" e importação;
    - `docs/TESTES.md`: arquivos novos.
  - **Guia `/ajuda`:**
    - parte nova "Cartões e faturas";
    - ajustes em "Registrar", "Mês" e "Importar fatura";
    - capturas regravadas.
  - **Validação manual:** VM2 registrada em `docs/specs/validacao-manual.md`.
- **Objetivo:** provar o fluxo inteiro no navegador e deixar a documentação igual ao código.
- **Pronto quando:**
  - `npx playwright test tests/e2e/17-credit-cards.spec.ts` passa (CA18).
  - `npx vite-node tests/ajuda/capturas.ts` regrava as capturas sem erro, e `npx vitest run tests/ui/pages/ajuda.test.tsx` passa.
  - `npm run lint && npm run typecheck && npm test && npm run test:e2e` passam.

## T9 — Aplicar a migration na produção (requer aprovação do usuário)

- **Entrega:** `npx prisma migrate deploy` na produção, rodado só depois de aprovação explícita do usuário no chat. O registro (data, saída do comando) vai em `downhill.md`.
- **Objetivo:** levar `invoiceMonth` e `import_batches.cardId` para a produção sem perder o cartão existente.
- **Pronto quando:**
  - O usuário aprovou no chat a execução.
  - `npx prisma migrate status` na produção diz que está em dia.
  - Consultas **somente leitura** na produção confirmam:
    - `credit_cards` continua com 1 registro e os mesmos `name`, `closingDay` e `dueDay`;
    - as colunas `transactions."invoiceMonth"` e `import_batches."cardId"` existem;
    - `pg_class.relrowsecurity` continua `true` em `transactions`, `import_batches` e `credit_cards`.

---

## Fatos verificados

Conferidos em 18/10/2026 nesta worktree (`docs/specs-melhorias-futuras`).

| Fato | Onde (VERIFICADO) |
|---|---|
| `CreditCard` tem `name`, `limit Float`, `closingDay`, `dueDay`, `color?`, `brand?` e a relação `transactions` | `prisma/schema.prisma:157-172` |
| `Transaction.cardId String?` com `onDelete: SetNull` e `@@index([cardId])`; `type String?` | `prisma/schema.prisma:34,42-46` |
| `ImportBatch` não tem `cardId` | `prisma/schema.prisma:112-129` |
| A migration dos cartões cria `credit_cards` com `"limit" DOUBLE PRECISION` e a FK `transactions_cardId_fkey ... ON DELETE SET NULL` | `prisma/migrations/20260812192858_add_credit_cards/migration.sql` |
| Não há serviço nem rota de cartões: `src/services/` só tem budgets, categories, categoryRules, goals, http, imports, transactions; `src/app/api/` não tem `credit-cards` | `ls src/services src/app/api` |
| O filtro mensal compara o mês da **data** em todas as telas | `src/utils/finance.ts:4-13`; `src/app/page.tsx:62`; `src/app/planning/page.tsx:138`; `src/app/reports/page.tsx:46,88`; `src/app/categories/page.tsx:166`; `src/app/investments/page.tsx:42,64` |
| `calculateSummary` classifica pelo tipo `investment` e, nos demais casos, pelo **sinal**. Um `card_payment` negativo hoje cairia em Saiu | `src/utils/finance.ts:19-37` |
| O Mês mostra os últimos 7 lançamentos do mês e o lembrete de fatura não importada | `src/app/page.tsx:65-67,85-88` |
| Formas de pagamento fixas, incluindo "Cartão de crédito"; padrão "Pix" | `src/components/TransactionForm/index.tsx:51-59,77` |
| O formulário envia `description, amount, category, type, paymentMethod, date, notes`, sem `cardId` | `src/components/TransactionForm/index.tsx:160-168` |
| `toFormValues` da edição não carrega `cardId` | `src/contexts/EntrySheetContext.tsx:22-32` |
| A importação grava `paymentMethod = "Cartão de crédito"` e guarda "compra em dd/mm/aaaa" na observação quando a data foi movida | `src/app/api/imports/route.ts:9,53-65,125-137` |
| `getEffectiveDate` move a data para o mês de referência quando `useInvoiceMonth` está ligado ou a parcela é a 2ª ou maior | `src/features/invoice-import/normalize.ts:31-50` |
| A tela de importação começa com `useInvoiceMonth = true` e oferece a opção de usar o mês da compra | `src/app/import/page.tsx:144,590-606` |
| Rotas protegidas e `matcher` são listas fixas, sem `/cards` | `src/proxy.ts:9-19,33-44` |
| "Mais"/"Organizar" listam Importar fatura, Categorias e regras, Investimentos, Relatórios, Configurações e Como usar | `src/components/AppNavigation/index.tsx:30-37` |
| Configurações reúne perfil, exportação e instalação | `src/app/settings/page.tsx`; `docs/FUNCIONALIDADES.md` §0 |
| Rotas de item usam `PATCH` e `DELETE` e respondem 404 para item de outro usuário | `src/app/api/transactions/[id]/route.ts:7,45,57,79` |
| `validateTransactionInput` aceita só `income`, `outcome` e `investment` | `src/lib/validators.ts:3` |

**NÃO VERIFICADO**

- Os valores reais do cartão da produção (`closingDay`, `dueDay`, `limit`): o fato geral vem de `fatos-verificados.md`, mas os campos não foram consultados. Se `dueDay == closingDay` ou algum dia for > 28, isso muda os casos de teste.
- O estado de `src/utils/finance.ts`, dos validadores e dos formulários **depois** das specs 003 e 004. Esta spec assume K1–K3 como descritos em `contratos.md`.
- Como a linha `kind: "payment"` da fatura é tratada hoje no preview (descartada ou lançada).

## Incógnitas iniciais para o uphill

1. **I1 — Compra no dia do fechamento.** Confirmar com fonte (documentação pública de Nubank, Itaú e Inter) se a compra feita no próprio dia do fechamento entra na fatura seguinte. Plano B: um parâmetro booleano interno, documentado e com teste.
2. **I2 — `dueDay ≤ closingDay`.** Validar a regra "vencimento no mês seguinte ao fechamento" e decidir se `dueDay == closingDay` é aceito (hoje a spec aceita). Conferir os valores do cartão da produção com uma consulta somente leitura.
3. **I3 — Deslocamento duplo na importação.** A spec resolve com `invoiceMonth` gravado (R4, R5, R13). Confirmar que nenhuma tela recalcula o mês a partir da data quando há `invoiceMonth`. Confirmar também que a detecção de duplicados do preview (impressão digital por data) continua igual com cartão. Depende da aprovação da questão Q1.
4. **I4 — Ocultar "mês da compra" com cartão.** Confirmar no protótipo (T1) que a opção pode sumir. A alternativa seria manter `date` = data da compra e `invoiceMonth` = mês de referência, o que mexe na impressão digital dos duplicados.
5. **I5 — Limite disponível.** Decidido fora de escopo; registrar a decisão com o usuário em T1.
6. **I6 — Exclusão de cartão.** Confirmar que `SET NULL` no banco preserva `invoiceMonth` (não há trigger) e que o texto da confirmação usa `transactionCount`.
7. **I7 — Situação "fechada" e fuso.** A situação depende de "hoje" no cliente. Usar `getLocalDateKey` (`src/utils/dates.ts`) e decidir a comparação no próprio dia do fechamento (fechada, por R3).
8. **I8 — Pagamento parcial e excedente.** Decidir o texto quando o valor pago passa do total ("paga", sem "falta") e se o bloco aparece no mês em que só houve pagamento, sem compras.
9. **I9 — Linhas `payment` da fatura importada.** Verificar se o preview já descarta "pagamento recebido". Esta spec **não** transforma essas linhas em `card_payment`.
10. **I10 — Carga dos cartões.** O Mês, o formulário e a importação precisam da lista de cartões. Decidir entre carregar por tela (como orçamentos) ou em contexto, respeitando o K8 (erro de leitura visível). A spec não exige contexto global.
11. **I11 — `limitCents`.** Confirmar o nome final da coluna depois da 004 e que a API devolve `limit` em reais (K1).

## Questões para o orquestrador

> **Decididas no portão do topo (18/10/2026).** As decisões estão em [`../README.md`](../README.md#portão-do-topo--decisões-18102026) e já constam em [`../contratos.md`](../contratos.md); o texto abaixo fica como histórico.
- **Q1 — K4 precisa de `transactions.invoiceMonth String?` (`YYYY-MM`).**
  - **Proposta:**
    - acrescentar ao K4: "lançamento com cartão grava `invoiceMonth`, calculado no servidor por `getInvoiceMonth` e congelado; a importação grava `invoiceMonth = referenceMonth`; `card_payment` usa `invoiceMonth` para dizer qual fatura paga";
    - `getEffectiveMonth`: `card_payment` → mês da data; `invoiceMonth` → ele; `cardId` → calculado pelo mapa; senão, mês da data. A assinatura do K4 não muda.
  - **Motivo:**
    - (a) a importação já move a data para o mês do vencimento, e recalcular por `getInvoiceMonth` sobre essa data deslocaria o mês de novo;
    - (b) parcelas importadas têm data de compra antiga, e só o mês de referência do PDF acerta a fatura;
    - (c) sem o valor gravado, mudar o fechamento do cartão moveria faturas passadas;
    - (d) o `card_payment` precisa dizer qual fatura quita;
    - (e) a 008 ganha de graça: a recorrência no cartão grava `invoiceMonth` pelo mesmo caminho do `POST`.
- **Q2 — `card_payment` fora do saldo.** O K2 diz que o `card_payment` não entra em Entrou, Saiu nem Investiu. Esta spec também o tira do **saldo do mês e do acumulado**, porque as compras já saíram do saldo no mês da fatura. Confirmar e, se for o caso, deixar isso explícito no K2.
- **Q3 — Numeração do E2E.** `tests/e2e/17-credit-cards.spec.ts` colide com `12-carga-erros-sessao` (001) e `12-acessibilidade-folhas-mes` (010). **Proposta:** o orquestrador define o número final por ordem de onda; o nome depois do número fica.
