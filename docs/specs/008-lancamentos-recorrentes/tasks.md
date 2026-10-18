# Tasks — SPEC 008 · Lançamentos recorrentes

Executar na ordem. Cada task só fecha quando os comandos de "Pronto quando" passam e o resultado está registrado em `downhill.md`. O **como** de cada task fica no `uphill.md`.

| ID | Task | Depende de | Cobre | Status |
|---|---|---|---|---|
| T1 | Migration `recurring_rules`, vínculo no lançamento e tipos | — | R1 · CA1 | ⬜ |
| T2 | Funções puras: data da ocorrência e meses a gerar | — | R5, R6 · CA2, CA3 | ⬜ |
| T3 | CRUD `/api/recurring` e 409 de categoria em uso | T1 | R3, R4, R11, R12, R14, R16, R17 · CA4, CA5, CA6, CA13 | ⬜ |
| T4 | `POST /api/recurring/generate` idempotente e seguro contra concorrência | T1, T2, T3 | R5–R9, R11–R13 · CA7, CA8 | ⬜ |
| T5 | "Repetir todo mês" no formulário e geração ao abrir o app | T3, T4 | R2, R10 · CA9, CA10, VM1 | ⬜ |
| T6 | Seção "Todo mês" em Planejar | T3 | R13, R15 · CA11, VM1 | ⬜ |
| T7 | E2E, documentação, guia `/ajuda` e verificação completa | T1–T6 | CA12 e todos | ⬜ |
| T8 | Aplicar a migration na produção — **requer aprovação do usuário** | T7 | R1 · CA1 | ⬜ |

## T1 — Migration `recurring_rules`, vínculo no lançamento e tipos

- **Entrega:**
  - **Schema:** model `RecurringRule` em `prisma/schema.prisma`, com os campos do K6 e mais `lastGeneratedMonth String?`, `createdAt` e `updatedAt`.
  - **Vínculo:** `Transaction.recurringRuleId String?` com `onDelete: SetNull` e `@@unique([recurringRuleId, date])`.
  - **Migration nova:** contém `ALTER TABLE "recurring_rules" ENABLE ROW LEVEL SECURITY`.
  - **Tipos:** `src/types/recurringRule.ts`; o campo `recurringRuleId?` entra em `src/types/transaction.ts`.
- **Objetivo:** criar o lugar das regras e a garantia de banco contra duplicação.
- **Pronto quando:**
  - `npx prisma migrate dev` aplica sem erro num banco local com lançamentos, cartões e categorias existentes.
  - `grep -n "ENABLE ROW LEVEL SECURITY" prisma/migrations/*recurring*/migration.sql` encontra a linha.
  - `grep -n "ON DELETE SET NULL" prisma/migrations/*recurring*/migration.sql` encontra a FK de `recurringRuleId` e a de `cardId`.
  - `grep -n "UNIQUE INDEX" prisma/migrations/*recurring*/migration.sql` encontra `(recurringRuleId, date)`.
  - `npm run lint && npm run typecheck && npm test` passam (CA1).

## T2 — Funções puras: data da ocorrência e meses a gerar

- **Entrega:** `src/features/recurring/schedule.ts` com:
  - `getOccurrenceDate(month, dayOfMonth)` → `YYYY-MM-DD`, ajustando ao último dia do mês;
  - `getMonthsToGenerate(rule, month)` → `YYYY-MM[]`, com a janela de R5 e o limite de 12 meses.

  Usa `src/utils/dates.ts`. Testes em `tests/unit/recurring/schedule.test.ts`.
- **Objetivo:** concentrar a regra de calendário em código puro e testado.
- **Pronto quando:**
  - `npx vitest run tests/unit/recurring/schedule.test.ts` passa com todos os casos de CA2 e CA3.
  - `npm run lint && npm run typecheck` passam.

## T3 — CRUD `/api/recurring` e 409 de categoria em uso

- **Entrega:**
  - **Validação:** `validateRecurringRuleInput` em `src/lib/validators.ts`.
  - **Rotas:** `src/app/api/recurring/route.ts` (`GET`, `POST`, que cria a regra e o primeiro lançamento numa `prisma.$transaction`) e `src/app/api/recurring/[id]/route.ts` (`PATCH`, `DELETE`). O `PATCH` com `active: true` exige `month`.
  - **Categorias:** `DELETE /api/categories/[id]` conta `recurring` em `usage`.
  - **Serviço:** `src/services/recurring.ts`, que lança `ApiError` (K8).
  - **Testes:** `tests/api/recurring.test.ts`, casos em `tests/api/categories.test.ts` e `tests/unit/lib/validators.test.ts`.
- **Objetivo:** dar à pessoa uma API para criar e manter regras, com as mesmas garantias de posse e de tipo dos lançamentos.
- **Pronto quando:**
  - `npx vitest run tests/api/recurring.test.ts tests/unit/lib/validators.test.ts` passa com o CRUD (CA4) e cada erro de CA5.
  - `npx vitest run tests/api/categories.test.ts` passa com o 409 e `usage.recurring` (CA6).
  - `npx vitest run tests/api/recurring.test.ts` passa com o caso "excluir cartão usado por regra": regra fica com `cardId` nulo, lançamento já gerado intacto, próxima geração sem cartão (CA13).
  - `npm run lint && npm run typecheck && npm test` passam.

## T4 — `POST /api/recurring/generate` idempotente e seguro contra concorrência

- **Entrega:**
  - `src/app/api/recurring/generate/route.ts`, que usa `getMonthsToGenerate` e `getOccurrenceDate`;
  - o mesmo cálculo de `invoiceMonth` da 005 para regras com cartão;
  - o avanço condicional de `lastGeneratedMonth` e o tratamento de `P2002`;
  - testes em `tests/api/recurring-generate.test.ts`.
- **Objetivo:** gerar os lançamentos do mês uma única vez, por mais que o app seja aberto.
- **Pronto quando:**
  - `npx vitest run tests/api/recurring-generate.test.ts` passa com todos os casos de CA7 e com os erros e a concorrência de CA8: 401; 400 para `month` ausente, mal formado ou futuro demais; `P2002` → sem 500; banco falhando → 500.
  - `npm run lint && npm run typecheck && npm test` passam.

## T5 — "Repetir todo mês" no formulário e geração ao abrir o app

- **Entrega:**
  - **Formulário:** opção "Repetir todo mês" em `src/components/TransactionForm`, só em lançamento novo.
  - **Envio:** `src/components/NewTransactionModal` (ou quem envia o formulário novo) chama `createRecurringRule` quando a opção está marcada.
  - **Contexto:** `src/contexts/TransactionsContenxt.tsx` (nome com erro de digitação, **não renomear**) chama `generate` com `getLocalMonthKey()` antes do `fetchTransactions` inicial e acrescenta o lançamento criado pela regra.
  - **Testes:** casos em `tests/ui/components/TransactionForm.test.tsx` e `tests/ui/context/TransactionsContext.test.tsx`.
  - **Aprovação:** VM1 aprovada pelo usuário antes de mexer na UI.
- **Objetivo:** criar a recorrência no mesmo gesto de registrar e trazer o mês novo pronto ao abrir o app.
- **Pronto quando:**
  - O usuário aprovou VM1 no chat, e a aprovação está registrada em `downhill.md`.
  - `npx vitest run tests/ui/components/TransactionForm.test.tsx` passa com os casos de CA9.
  - `npx vitest run tests/ui/context/TransactionsContext.test.tsx` passa com a ordem `generate` → `GET` e com a falha de `generate` sem bloquear a carga (CA10).
  - `npm run lint && npm run typecheck && npm test` passam.

## T6 — Seção "Todo mês" em Planejar

- **Entrega:**
  - seção em `src/app/planning/page.tsx`;
  - `src/components/RecurringRow/` e `src/components/RecurringRuleForm/` (index + styles);
  - edição em `CustomModal`;
  - confirmação de exclusão com `ConfirmDialog`;
  - casos em `tests/ui/pages/planning.test.tsx`.
- **Objetivo:** a pessoa vê e controla as regras sem procurar lançamento por lançamento.
- **Pronto quando:**
  - `npx vitest run tests/ui/pages/planning.test.tsx` passa com os casos de CA11, incluindo a falha de leitura com "Tentar de novo".
  - `npm run lint && npm run typecheck && npm test` passam.

## T7 — E2E, documentação, guia `/ajuda` e verificação completa

- **Entrega:**
  - **E2E:** `tests/e2e/18-recurring.spec.ts`; helpers só **acrescentados** em `tests/e2e/support/`.
  - **Documentação:**
    - `docs/API.md`: model `RecurringRule`, `recurringRuleId` e `/api/recurring*`;
    - `docs/FUNCIONALIDADES.md` §0: opção no formulário e seção "Todo mês";
    - `docs/TESTES.md`: arquivos novos.
  - **Guia `/ajuda`:** trechos em "Registrar" e "Planejar"; capturas regravadas.
  - **Validação manual:** VM2 registrada em `docs/specs/validacao-manual.md`.
- **Objetivo:** provar o fluxo no navegador, inclusive a concorrência real contra o Postgres, e deixar a documentação igual ao código.
- **Pronto quando:**
  - `npx playwright test tests/e2e/18-recurring.spec.ts` passa (CA12).
  - `npx vite-node tests/ajuda/capturas.ts` regrava sem erro, e `npx vitest run tests/ui/pages/ajuda.test.tsx` passa.
  - `npm run lint && npm run typecheck && npm test && npm run test:e2e` passam.

## T8 — Aplicar a migration na produção (requer aprovação do usuário)

- **Entrega:** `npx prisma migrate deploy` na produção, rodado só depois de aprovação explícita do usuário no chat. O registro vai em `downhill.md`.
- **Objetivo:** levar `recurring_rules` e `transactions.recurringRuleId` para a produção com RLS.
- **Pronto quando:**
  - O usuário aprovou no chat a execução.
  - `npx prisma migrate status` na produção diz que está em dia.
  - Consultas **somente leitura** confirmam:
    - `recurring_rules` existe com `pg_class.relrowsecurity = true`;
    - `anon` e `authenticated` não têm permissão em `information_schema.role_table_grants`;
    - o índice único `(recurringRuleId, date)` existe em `pg_indexes`;
    - o total de linhas de `transactions` é igual ao de antes.

---

## Fatos verificados

Conferidos em 18/10/2026 nesta worktree (`docs/specs-melhorias-futuras`).

| Fato | Onde (VERIFICADO) |
|---|---|
| Não existe model, rota nem serviço de recorrência | `prisma/schema.prisma` (models User…CreditCard); `ls src/app/api src/services` |
| `Transaction` não tem `recurringRuleId`; `date DateTime` | `prisma/schema.prisma:28-48` (model Transaction) |
| A coluna `cardId` já existe em `transactions` com `SET NULL` | `prisma/schema.prisma:42-43` |
| O `TransactionsProvider` busca os lançamentos uma vez ao montar e expõe `refreshTransactions` e `addTransaction`; não há geração | `src/contexts/TransactionsContenxt.tsx:26-51,53-60` |
| O provider fica no layout raiz junto com o `EntrySheetProvider` | `src/app/layout.tsx:6-7` |
| O formulário é o mesmo para novo e edição; `initialValues` ausente indica lançamento novo | `src/components/TransactionForm/index.tsx:37-43,71-84` |
| O formulário envia por `onSubmit` e reseta os campos depois do sucesso | `src/components/TransactionForm/index.tsx:141-183` |
| "Mês corrente" local vem de `getLocalMonthKey`, e a data local de `getLocalDateKey` | `src/utils/dates.ts:5,9` |
| Planejar tem as seções "Orçamentos" e "Metas" com `LedgerSection` | `src/app/planning/page.tsx:292-293,335-336` |
| As rotas tratam violação única com `isUniqueConstraintError` (de `@/lib/http`) | `src/app/api/budgets/route.ts:59`; `src/app/api/categories/[id]/route.ts:45` |
| O cadastro já usa `createMany` dentro de `$transaction` | `src/app/api/register/route.ts:55` |
| Os testes de API usam `NextRequest` e cookie de sessão reais, com o banco simulado | `tests/api/helpers.ts:1-40` |
| O E2E existente vai até `11-invoice-import.spec.ts` | `ls tests/e2e` |

**NÃO VERIFICADO**

- O formato de `usage` no 409 de categoria **depois** da 003 (o K3 diz `{ transactions, budgets, rules }`).
- Se `createMany({ skipDuplicates: true })` do Prisma 7 com `@prisma/adapter-pg` devolve a contagem certa dos inseridos, e se funciona dentro de `$transaction` interativa.
- O estado do `TransactionsProvider` depois da 001 (K8: `status`, `retry`). Esta spec assume o K8.
- Quem envia o formulário novo depois das ondas anteriores (`NewTransactionModal` hoje).

## Incógnitas iniciais para o uphill

1. **I1 — Meses passados não abertos.** A spec decide recuperar até 12 meses (R5) usando `lastGeneratedMonth`. Confirmar com o usuário o limite de 12. Decidir também o que fazer com a regra criada com data antiga: ela recupera os meses entre a data e hoje na próxima abertura. O comportamento é o esperado, mas precisa de teste e de texto no guia.
2. **I2 — Fuso.** O cliente manda `month` pelo calendário local, e o servidor só confere o limite de +1 mês sobre o mês UTC. Provar que, perto da meia-noite do dia 1º no Brasil (UTC−3), o mês local é aceito.
3. **I3 — Concorrência entre duas abas.** Escolher e provar com o Postgres do E2E a combinação:
   - (a) avanço condicional do marcador (`updateMany where lastGeneratedMonth < month`), em que só quem avança cria;
   - (b) `createMany({ skipDuplicates: true })`;
   - (c) `try/catch` de `P2002` por lançamento.

   O índice único sozinho evita duplicar, mas não evita recriar um lançamento excluído se as duas abas lerem o marcador antigo.
4. **I4 — Ordem `generate` → `GET`.** Medir o atraso que a geração acrescenta à primeira carga. Se for relevante, decidir entre esperar a geração ou carregar em paralelo e chamar `refreshTransactions` quando `created > 0`. O K8 não pode ficar em `loading` por causa da geração.
5. **I5 — Retomar regra pausada.** Confirmar que o `PATCH { active: true, month }` é suficiente e que o cliente sempre manda o mês local.
6. **I6 — Mudar `dayOfMonth` no meio do mês.** Com o marcador no mês corrente, não há duplicação. Confirmar com teste que o próximo mês usa o dia novo.
7. **I7 — Recorrência no cartão.** Reusar o cálculo do `invoiceMonth` da 005 (helper compartilhado) e não duplicar a regra. Confirmar onde a 005 deixou esse helper.
8. **I8 — Categoria excluída.** Com `RESTRICT`, a categoria em uso por uma regra não pode ser excluída (R16). Confirmar como fica a tela de Categorias depois da 003 para mostrar a contagem de recorrências.
9. **I9 — Lançamento gerado em data futura dentro do mês corrente** (o aluguel do dia 25 gerado no dia 3). Confirmar que as telas mostram esse lançamento normalmente e que isso é desejado. Alternativa: só gerar quando o dia chegar, o que exigiria chamar a geração todo dia.

## Questões para o orquestrador

> **Decididas no portão do topo (18/10/2026).** As decisões estão em [`../README.md`](../README.md#portão-do-topo--decisões-18102026) e já constam em [`../contratos.md`](../contratos.md); o texto abaixo fica como histórico.
- **Q1 — K6 precisa de `recurring_rules.lastGeneratedMonth String?`.**
  - **Proposta:** acrescentar o campo ao K6, junto com a regra "a geração cria os meses depois de `lastGeneratedMonth`, até `month`, no máximo 12 para trás, e avança o marcador".
  - **Motivo:** só com o índice único `(recurringRuleId, date)`, o lançamento gerado e depois excluído (a pessoa "pula" o mês) volta na próxima abertura. Sem marcador, também não há como recuperar com segurança os meses em que o app não foi aberto.
- **Q2 — O K3 precisa de `usage.recurring` no 409 de `DELETE /api/categories/:id`.** `recurring_rules.categoryId` com `RESTRICT` faria a exclusão falhar com erro de FK (500) se a rota não contar as regras. **Proposta:** `usage: { transactions, budgets, rules, recurring }`.
- **Q3 — Aprovação de design na 008.** A 005 tem uma task de aprovação (pontos A e C). Aqui a aprovação está como VM1, exigida em "Pronto quando" de T5. Se o orquestrador preferir, VM1 vira uma task própria T0, no mesmo formato da 005.
- **Q4 — Numeração dos E2E colide.** Esta spec usa `18-recurring.spec.ts` e a 005 usa `17-credit-cards.spec.ts`, mas em 18/10 as tasks das outras specs também usam 12 (`12-carga-erros-sessao`, `12-acessibilidade-folhas-mes`) e 13 (`13-primeiros-passos`). **Proposta:** o orquestrador define a numeração final por ordem de onda; o nome depois do número fica.
