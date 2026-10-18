# Tasks — SPEC 006

Executar na ordem. Cada task só fecha quando os comandos de "Pronto quando" passam e o resultado está registrado em `downhill.md`. O **como** de cada task está em `uphill.md`.

Esta spec não tem migration: `transactions.type` é texto obrigatório desde a 004 (ver incógnita 1).

| ID | Task | Depende de | Cobre | Status |
|---|---|---|---|---|
| T1 | Tipo `refund` no TypeScript, na validação e nas rotas de lançamentos | — | R1, CA1 | ⬜ |
| T2 | `finance.ts`: resumo líquido e gasto líquido por categoria no mês efetivo | T1 | R3, R4, CA3, CA4, CA5 | ⬜ |
| T3 | Folha Registrar com Estorno, linhas e filtro de Lançamentos, exportação | T1 | R2, R10, R11, CA2, CA12, CA13 | ⬜ |
| T4 | Mês, Planejar, Categorias e Relatórios com valores líquidos | T2 | R5, R6, R7, R8, CA6, CA7, CA8, CA9 | ⬜ |
| T5 | Importação: crédito vira Estorno, sugestão de gasto, confirmação e regras | T1 | R9, CA10, CA11 | ⬜ |
| T6 | E2E de estornos, documentação, guia e verificação completa | T3, T4, T5 | CA14, CA15 | ⬜ |

## T1 — Tipo `refund` e validação

- **Entrega:** `src/types/transaction.ts` (`TransactionType` com `"refund"`, K2); `src/lib/validators.ts` (sinal de `refund` > 0); a função de compatibilidade de categoria criada pela 003 (K3: `refund` usa categoria `outcome`); `src/app/api/transactions/route.ts` e `[id]/route.ts` só se precisarem de ajuste; `tests/unit/lib/validators.test.ts`, `tests/api/transactions.test.ts`.
- **Objetivo:** a API aceita estorno válido e recusa sinal ou categoria errados.
- **Pronto quando:**
  - `npx vitest run tests/unit/lib/validators.test.ts tests/api/transactions.test.ts` passa, com casos para: `refund` positivo com categoria de gasto → `201`; `refund` negativo → `400`; `refund` com categoria de receita → `400`; `PATCH` gasto → `refund` sem inverter o sinal → `400`; nos erros, `create`/`update*` não é chamado (CA1).

## T2 — Resumo e gasto líquido em `finance.ts`

- **Entrega:** `src/utils/finance.ts` (`calculateSummary` com estorno abatendo `outcome`; função nova de gasto líquido por `categoryId` no mês, usando o mês efetivo de K4 e somando em centavos, K1); `tests/unit/utils/finance.test.ts`.
- **Objetivo:** um único lugar calcula "Saiu" e o gasto de cada categoria já descontando estornos.
- **Pronto quando:**
  - `npx vitest run tests/unit/utils/finance.test.ts` passa, com casos para: 100 de gasto + 30 de estorno + 500 de receita → `income 500`, `outcome −70`, `total 430`; estorno maior que o gasto → `outcome +20`; 0,10 + 0,20 de estorno sem erro de ponto flutuante (CA3); gasto líquido por categoria com valor negativo, ignorando receitas, investimentos, outros meses e homônimas de outro tipo (CA4); estorno com `cardId` depois do fechamento contando no mês da fatura e sem `cardId` no mês da data (CA5).

## T3 — Formulário, listas, filtro e exportação

- **Entrega:** `src/components/TransactionForm/index.tsx` (opção Estorno; categorias de gasto; "mais usadas" somando gastos e estornos; troca Gasto ↔ Estorno mantém a categoria; valor positivo); `src/components/EntryRow` (rótulo "Estorno" no detalhe e no nome acessível; tom não vermelho); `src/components/TransactionFilters` e `src/app/transactions/page.tsx` (filtro "Estornos"); `src/app/settings/page.tsx` (só se for preciso para o `type` sair no CSV); `tests/ui/components/TransactionForm.test.tsx`, `tests/ui/components/transactions-list.test.tsx`, `tests/ui/pages/transactions.test.tsx`, `tests/ui/pages/settings.test.tsx`.
- **Objetivo:** dá para registrar, ver, filtrar e exportar um estorno.
- **Pronto quando:**
  - `npx vitest run tests/ui/components/TransactionForm.test.tsx tests/ui/components/transactions-list.test.tsx tests/ui/pages/transactions.test.tsx tests/ui/pages/settings.test.tsx` passa, com casos para: Estorno mostra só categorias de gasto e envia `type: "refund"` com valor positivo e `categoryId`; Gasto → Estorno mantém a categoria e Estorno → Receita a limpa; edição de estorno abre com Estorno marcado (CA2); linha com `+30,00`, "Estorno" no detalhe e sem o tom de saída; filtro "Estornos" (CA12); CSV com `refund` na coluna `type` (CA13).

## T4 — Telas com valores líquidos

- **Entrega:** `src/app/page.tsx` e `src/components/MonthSummary` ("Saiu" líquido, com sinal quando negativo; orçamentos do mês pelo gasto líquido); `src/app/planning/page.tsx` e `src/components/BudgetRow` (gasto líquido, barra e faixa com `max(0, gasto)`, texto exato); `src/app/categories/page.tsx` (total líquido e contagem com estornos na aba Gastos); `src/app/reports/page.tsx` (Despesas, média diária, gráfico receitas × despesas, gastos por categoria e categoria líder líquidos; maior despesa só `outcome`); `tests/ui/pages/dashboard.test.tsx`, `planning.test.tsx`, `categories.test.tsx`, `reports-investments.test.tsx`, `tests/ui/helpers/fixtures.ts` (só acrescenta um estorno de exemplo).
- **Objetivo:** todas as telas mensais mostram o gasto já descontado dos estornos, pela função da T2.
- **Pronto quando:**
  - `npx vitest run tests/ui/pages/dashboard.test.tsx tests/ui/pages/planning.test.tsx tests/ui/pages/categories.test.tsx tests/ui/pages/reports-investments.test.tsx` passa, com casos para: "Saiu" 70,00 e orçamento 70,00; só estorno → "Saiu" `−20,00` e barra 0% (CA6); Planejar "70,00 de 500,00" e caso negativo com barra 0% e faixa verde (CA7); Categorias total líquido e "2 lançamentos" (CA8); Relatórios Despesas e gastos por categoria líquidos, categoria ≤ 0 no fim, maior despesa sem estorno, Receitas sem estorno (CA9).
  - `npm run lint && npm run typecheck && npm test` passa.

## T5 — Importação

- **Entrega:** `src/features/invoice-import/types.ts` (`ImportEntryType` com `"refund"`); `src/features/invoice-import/categorize.ts` (linhas `refund` usam regras, histórico e palavras-chave de gasto); `src/lib/importValidators.ts` (aceita `refund` nos itens; regras continuam `income|outcome`); `src/app/api/imports/preview/route.ts` (`credit` → `refund`); `src/app/api/imports/route.ts` (valor positivo para `refund`, categoria `outcome`, `importedTotal` subtraindo estornos); `src/app/import/page.tsx` (seletor Gasto/Estorno/Receita, troca que mantém ou limpa a categoria, "Lembrar" de estorno grava regra `outcome`); `tests/api/imports.test.ts` (o caso "trata créditos como receita" passa a esperar `refund`), `tests/unit/lib/importValidators.test.ts`, `tests/unit/invoice-import/categorize.test.ts`, `tests/ui/pages/import.test.tsx`.
- **Objetivo:** linhas de estorno da fatura chegam e são gravadas como Estorno, na categoria de gasto certa.
- **Pronto quando:**
  - `npx vitest run tests/api/imports.test.ts tests/unit/lib/importValidators.test.ts tests/unit/invoice-import/categorize.test.ts tests/ui/pages/import.test.tsx` passa, com casos para: preview com `kind: "credit"` → `type: "refund"`, `include: true` e sugestão de categoria de gasto; confirmação gravando estorno positivo com `type: "refund"`; estorno com categoria `income` → `400` com `invalidItems` e sem `importBatch.create`; `importedTotal` descontando o estorno; "Lembrar" de estorno gravando regra `outcome` (CA10); linha de estorno com tipo Estorno, seletor com três opções e troca mantendo ou limpando a categoria (CA11).

## T6 — E2E, documentação e verificação completa

- **Entrega:** `tests/e2e/NN-estornos.spec.ts` (próximo número livre); `tests/support/pdf.ts` (acrescenta uma linha "ESTORNO" ao PDF de teste sem mudar as linhas existentes, ou um PDF novo); `docs/API.md` (§5.2 `refund` e sinal; §5.6 preview e confirmação com `refund`); `docs/FUNCIONALIDADES.md` (§0: Estorno no formulário, "Saiu" líquido, orçamentos e relatórios líquidos, importação); `docs/TESTES.md`; `src/app/ajuda/page.tsx` (partes "registrar", "importar fatura" e "planejar": o que é Estorno e como corrigir crédito antigo importado como receita); capturas regravadas.
- **Objetivo:** o fluxo completo funciona no app de verdade e a documentação acompanha.
- **Pronto quando:**
  - `npx playwright test tests/e2e/NN-estornos.spec.ts tests/e2e/11-invoice-import.spec.ts` passa, com: estorno registrado pela folha reduzindo "Saiu" no Mês e o gasto do orçamento em Planejar; PDF com "ESTORNO" importado como Estorno abatendo o gasto da categoria (CA14).
  - `npx vite-node tests/ajuda/capturas.ts` termina sem erro.
  - `npm run lint && npm run typecheck && npm test && npm run test:e2e` passa (CA15).

## Fatos verificados

| Fato | Onde (VERIFICADO em 18/10/2026, antes da 003/004/005) |
|---|---|
| `TransactionType` só tem `income`, `outcome`, `investment` | `src/types/transaction.ts:1` |
| `getTransactionType` infere pelo sinal quando não há tipo; `calculateSummary` separa receita/despesa pelo **sinal** (um estorno positivo hoje entra em `income`) | `src/utils/finance.ts:15-37` |
| A validação aceita só `income|outcome|investment` e não confere o sinal | `src/lib/validators.ts:3`, `:79-85` |
| Mês: "Saiu" é `Math.abs(outcome)` (um líquido negativo apareceria positivo) | `src/components/MonthSummary/index.tsx:31-33` |
| Mês, Planejar, Categorias e Relatórios calculam o gasto da categoria cada um à sua maneira, só com `outcome` | `src/app/page.tsx:69-82`; `src/app/planning/page.tsx:136-151`; `src/app/categories/page.tsx:161-173`; `src/app/reports/page.tsx:44-63` |
| Relatórios: "Maior despesa" é o `outcome` de menor valor; "Despesas", média diária e evolução vêm de `calculateSummary` | `src/app/reports/page.tsx:47-96` |
| A linha usa `formatSignedAmount` (já põe `+` em positivo) e cor vermelha só para `outcome` | `src/components/EntryRow/index.tsx:16-37`; `src/components/EntryRow/styles.ts:44-50`; `src/utils/formatters.ts:19-28` |
| Filtro de tipo de Lançamentos: Todos, Gastos, Receitas, Investimentos | `src/components/TransactionFilters/index.tsx:19`, `:38-41` |
| Preview: `credit` → `income`; tipo de importação só `outcome|income` | `src/app/api/imports/preview/route.ts:102`; `src/features/invoice-import/types.ts:26`; `src/lib/importValidators.ts:13` |
| Confirmação: `amount` negativo só para `outcome`; `importedTotal` soma `outcome` e subtrai o resto | `src/app/api/imports/route.ts:92-96`, `:129` |
| Tela de importação: rótulo "estorno/crédito", seletor com Gasto e Receita, troca de tipo limpa a categoria | `src/app/import/page.tsx:104`, `:327-329`, `:768-777` |
| Sugestão de categoria por palavra-chave só para `outcome`; histórico só de `income|outcome` | `src/features/invoice-import/categorize.ts:111`, `:205-211` |
| O classificador marca como crédito `ESTORNO`, `DEVOLUCAO`, `CASHBACK` e `REEMBOLSO` | `src/features/invoice-import/adapters/common.ts:51` |
| Teste de API atual espera crédito como receita | `tests/api/imports.test.ts:390-401` |
| CSV já exporta a coluna `type` | `src/app/settings/page.tsx:39-63` |
| O PDF de teste não tem linha de estorno | `grep -i estorno tests/support/pdf.ts` sem resultado |

**NÃO VERIFICADO** (depende de specs ainda não implementadas):

- Nomes finais das funções da 004 (soma em centavos) e da 005 (`getEffectiveMonth`, filtro de mês com cartões) e se Mês/Planejar/Relatórios já recebem `cardsById` quando esta spec começar.
- Se a 004 criou alguma `CHECK` no banco para os valores de `type`.
- Como a 005 expôs `card_payment` no formulário e no filtro (opção visível ou não).

## Incógnitas iniciais para o uphill

1. **Banco aceita `refund`?** Conferir no schema e nas migrations da 004/005 que `transactions.type` não tem `CHECK` de valores. Se tiver, esta spec precisaria de migration, o que a onda 5 não prevê (ver Questões).
2. **Estorno sem compra no mês (gasto líquido negativo).** Confirmar a exibição escolhida (R5–R8: valor exato com sinal no texto, barra em 0%, faixa verde) com o `ProgressBar` (aceita valor < 0? hoje recebe `%`), o `BudgetRow` e o `CategoryBreakdown`; decidir o tom de "Saiu" negativo com os tokens de `src/styles/global.ts`.
3. **Estornos antigos importados como receita.** Medir na produção (consulta somente leitura) quantos lançamentos `income` vieram de importação (`import_batch_items`) para dimensionar o aviso no guia; a conversão automática fica fora (spec).
4. **Cartão (K4).** Confirmar que o estorno de cartão herda o `cardId` do lote importado (K4) e cai no mês da fatura pelo mesmo `getEffectiveMonth`; e que o total do lote/fatura da 005 desconta estornos do mesmo jeito que o `importedTotal`.
5. **Sugestão para estorno.** Decidir a ordem na `categorize.ts` para linha `refund`: usar as regras e o histórico de `outcome` do mesmo estabelecimento (compra) e também o histórico de estornos anteriores; conferir que o histórico (`buildHistoryIndex`) passa a indexar `refund` sob a chave de `outcome`.
6. **Pagamento de fatura no formulário.** Se a 005 colocou "Pagamento de fatura" no seletor de tipo, decidir a ordem e o espaço dos cinco segmentos no celular (390px) sem quebrar o layout do `Segmented`.
7. **Somas em centavos.** Reutilizar o helper de centavos da 004 na nova função de gasto por categoria; confirmar o nome e a assinatura.
8. **Cashback.** `CASHBACK` vira `credit` e, portanto, Estorno por padrão (K5). Confirmar com o usuário se isso é aceitável (troca manual no preview) ou se precisa de questão ao orquestrador.
9. **Investimentos e Receitas.** Conferir que nenhuma soma de Investimentos ou de receitas (taxa de economia, "Entrou") passa a incluir `refund` por cair num `else`.

## Questões para o orquestrador

> **Decididas no portão do topo (18/10/2026).** As decisões estão em [`../README.md`](../README.md#portão-do-topo--decisões-18102026) e já constam em [`../contratos.md`](../contratos.md); o texto abaixo fica como histórico.
1. **`CHECK` em `type`.** Se a 004 ou a 005 criar `CHECK` com a lista de tipos, **proposta:** a 005 (última migration antes da onda 5) já inclui `refund` na lista, para que a 006 continue sem migration. Alternativa: a 006 ganhar permissão de migration na onda 5 (hoje não prevista em `contratos.md`).
