# Tasks — SPEC 009

Executar na ordem. Cada task só fecha quando os comandos de "Pronto quando" passam e o resultado está registrado em `downhill.md`. O **como** de cada task está em `uphill.md`.

| ID | Task | Depende de | Cobre | Status |
|---|---|---|---|---|
| T1 | `normalizeSearch` e `matchesSearch` em `src/utils/search.ts` | — | R1, R2, CA1, CA2, CA3 | ⬜ |
| T2 | `compareTransactionsByDate` e `createdAt` no tipo `Transaction` | — | R4, R7, CA4, CA9 | ⬜ |
| T3 | Lançamentos: busca nova, texto do campo e ordem estável | T1, T2 | R3, R5, R8, CA5, CA6 | ⬜ |
| T4 | Mês e Investimentos com ordem estável | T2 | R6, R8, CA7, CA8 | ⬜ |
| T5 | E2E, documentação, guia `/ajuda` e verificação completa | T3, T4 | CA10 | ⬜ |

## T1 — Busca normalizada

- **Entrega:** `src/utils/search.ts` (novo) com `normalizeSearch` e `matchesSearch` (assinaturas do K9); `tests/unit/utils/search.test.ts` (novo).
- **Objetivo:** uma regra única de busca, sem acento e sem diferenciar maiúsculas, em descrição, categoria e observação.
- **Pronto quando:**
  - `npx vitest run tests/unit/utils/search.test.ts` passa com os casos do CA1, do CA2 e os de erro/limite do CA3 (observação `null` e ausente; `"("`, `"*"`, `"a.b"`).

## T2 — Ordem estável e `createdAt`

- **Entrega:**
  - `src/utils/search.ts`: `compareTransactionsByDate(a, b, direction: "asc" | "desc")`.
  - `src/types/transaction.ts`: `createdAt?: string` em `Transaction`; `TransactionPayload` sem `createdAt`.
  - `tests/unit/utils/search.test.ts`: casos do CA4.
  - `tests/ui/components/TransactionForm.test.tsx`: confere que o corpo enviado não tem `createdAt` (CA9).
- **Objetivo:** um único critério de desempate (data → `createdAt` → `id`), reaproveitado pelas três telas.
- **Pronto quando:**
  - `npx vitest run tests/unit/utils/search.test.ts tests/ui/components/TransactionForm.test.tsx` passa com: desempate por `createdAt` em `"desc"` e `"asc"`; desempate por `id` com `createdAt` igual e com `createdAt` ausente; `[...lista].sort(...)` não muda a lista original; corpo do formulário sem `createdAt`.
  - `npm run typecheck` passa.

## T3 — Página Lançamentos

- **Entrega:**
  - `src/app/transactions/page.tsx`: filtro de busca por `matchesSearch`; ordenação por `compareTransactionsByDate` e desempate de valor (R5).
  - `src/components/TransactionFilters/index.tsx`: placeholder "Buscar por descrição, categoria ou observação".
  - `tests/ui/helpers/fixtures.ts`: **acrescenta** uma lista nova (por exemplo `sameDayTransactions`) com três lançamentos do mesmo dia e `createdAt` distintos e dois de mesmo valor; os fixtures existentes não mudam.
  - `tests/ui/pages/transactions.test.tsx`: o teste "[comportamento atual] a busca não considera acentos nem a categoria" (linha 98) é **substituído** pelos casos do CA5; entram os casos do CA6.
- **Objetivo:** a busca acha o que a pessoa digitou, com ou sem acento, e a lista não troca de ordem.
- **Pronto quando:**
  - `npx vitest run tests/ui/pages/transactions.test.tsx` passa com: "salario" → Salário; "Moradia" → Aluguel; "vence" → Aluguel; "xyz" → estado vazio; ordem do mesmo dia por `createdAt` em "Mais recentes" e "Mais antigas"; mesma ordem com a resposta da API invertida; empate de valor desfeito pela data.
  - Os testes que já existem nesse arquivo (busca com espaços nas pontas, filtros, período, ordenação por valor, "Limpar filtros") continuam passando sem alteração.

## T4 — Mês e Investimentos

- **Entrega:**
  - `src/app/page.tsx`: "Últimos lançamentos" ordenados por `compareTransactionsByDate(…, "desc")` (ver Questões: arquivo da 007 na mesma onda).
  - `src/app/investments/page.tsx`: aportes ordenados pelo mesmo critério.
  - `tests/ui/pages/dashboard.test.tsx` e `tests/ui/pages/reports-investments.test.tsx`: um caso cada com lançamentos do mesmo dia em ordem embaralhada.
- **Objetivo:** as listas do Mês e de Investimentos seguem a mesma ordem de Lançamentos.
- **Pronto quando:**
  - `npx vitest run tests/ui/pages/dashboard.test.tsx tests/ui/pages/reports-investments.test.tsx` passa com os casos do CA7 e do CA8, e os casos atuais ("do mais novo para o mais antigo", "no máximo 7", "do mais recente para o mais antigo") continuam passando.

## T5 — E2E, documentação e verificação completa

- **Entrega:**
  - `tests/e2e/02-transactions.spec.ts`, bloco "Lançamentos — busca, filtros e ordenação": a busca "salario", a busca por categoria e a ordem estável após recarregar (CA10). O teste "busca por descrição sem diferenciar maiúsculas" continua.
  - `docs/FUNCIONALIDADES.md` (§0 linha de Lançamentos; §2.5 linhas "Buscar" e "Ordenar"), `docs/TESTES.md` (novo arquivo de teste unitário), `docs/MELHORIAS.md` (P19 e o item Baixa do desempate como aplicados).
  - Guia `/ajuda` (`src/app/ajuda/page.tsx:132`): dizer que a busca acha descrição, categoria e observação, com ou sem acento. Se a captura de Lançamentos mostra o placeholder do campo, regravar com `npx vite-node tests/ajuda/capturas.ts`.
- **Objetivo:** provar no app real e deixar a documentação igual ao código.
- **Pronto quando:**
  - `npx playwright test tests/e2e/02-transactions.spec.ts` passa.
  - `npm run lint && npm run typecheck && npm test && npm run test:e2e` passa.

## Fatos verificados

| Fato | Onde (VERIFICADO) |
|---|---|
| A busca atual é `description.toLowerCase().includes(search.trim().toLowerCase())`, só na descrição | `src/app/transactions/page.tsx:36-39` |
| A ordenação atual só compara data (ou `|amount|`); sem desempate | `src/app/transactions/page.tsx:60-74` |
| O Mês ordena os últimos 7 por `b.date.localeCompare(a.date)` | `src/app/page.tsx:65-67` |
| Investimentos ordena os aportes por `date.localeCompare` | `src/app/investments/page.tsx:32-34` |
| Investimentos mostra a lista por `TransactionList` (agrupada por dia, na ordem recebida) | `src/app/investments/page.tsx` (bloco da lista, `TransactionList transactions={investments}`); `src/components/TransactionList/index.tsx:17-31` |
| O placeholder do campo é "Buscar por descrição" e o rótulo acessível é "Buscar" | `src/components/TransactionFilters/index.tsx:67-76` |
| `Transaction` não declara `createdAt`; `TransactionPayload = Omit<Transaction, "id" \| "date">` | `src/types/transaction.ts:3-14` |
| O banco tem `createdAt @default(now())` em `transactions` | `prisma/schema.prisma:37` |
| `GET /api/transactions` devolve as linhas inteiras do Prisma (sem `select`), então `createdAt` chega ao cliente; `POST` e `PATCH` também devolvem a linha inteira | `src/app/api/transactions/route.ts:15-22,52-59`; `src/app/api/transactions/[id]/route.ts:48-50` |
| A API ordena só por `date desc` | `src/app/api/transactions/route.ts:17-19` |
| O contexto põe o lançamento criado no topo da lista e troca o editado no lugar | `src/contexts/TransactionsContenxt.tsx:53-70` |
| As datas são ISO à meia-noite UTC; comparar strings ISO de mesmo formato equivale a comparar instantes | `AGENTS.md` §5; `src/app/api/imports/route.ts:25-27` |
| Teste atual que documenta a busca sem acento e sem categoria | `tests/ui/pages/transactions.test.tsx:98-108` |
| Os fixtures de UI não têm `createdAt` e não têm dois lançamentos no mesmo dia | `tests/ui/helpers/fixtures.ts:10-53` |
| E2E atual de busca: "MERCADO" acha dois lançamentos | `tests/e2e/02-transactions.spec.ts:274-279` |
| O guia `/ajuda` cita a busca em Lançamentos | `src/app/ajuda/page.tsx:132` |

**NÃO VERIFICADO:**

- Se a captura de Lançamentos do guia (`public/ajuda/*.jpg`) mostra o placeholder do campo de busca (decide se a T5 regrava capturas).
- Se `createdAt` de lançamentos criados em sequência rápida pela API no E2E sai distinto (precisão de milissegundos do `TIMESTAMP(3)`); se não, o desempate cai no `id` (UUID aleatório), que é estável entre carregamentos mas não segue a ordem de criação.
- Custo real de normalizar a cada tecla com milhares de lançamentos no celular.

## Incógnitas iniciais para o uphill

1. **`createdAt` no cliente.** Confirmado que a rota devolve a linha inteira hoje. Depois da 004 (onda 2), as rotas passam a montar a resposta para trocar `amountCents` por `amount`: confirmar com a 004 que `createdAt` continua na resposta (R4 da 004 diz que sim) e testar isso no CA9/CA10.
2. **Custo da normalização.** Normalizar descrição + categoria + observação de milhares de lançamentos a cada tecla. Medir com 5.000 lançamentos em teste descartável. Opções: cache por objeto (`WeakMap<Transaction, string>`), que se renova sozinho quando o contexto troca o objeto; `useMemo` na página (o React Compiler já memoriza); ou `useDeferredValue` na busca. Escolher com número medido.
3. **NFD no jsdom e nos navegadores-alvo.** `String.prototype.normalize("NFD")` e a classe `\p{Diacritic}` ou o intervalo `[̀-ͯ]`: confirmar suporte no Safari iOS 15.5+ e no Node dos testes, e o resultado para "ç", "ü" e "ñ".
4. **Lançamento recém-criado.** O contexto põe o lançamento novo no topo; com a ordem estável, ele vai para o lugar certo pela data. Confirmar que a resposta do `POST` traz `createdAt` para o desempate funcionar sem recarregar.
5. **Ordem do desempate de valor.** O K9 só fala da ordem por data. Esta spec escolhe desempatar "Maior/Menor valor" pela data decrescente (R5). Confirmar que isso não muda o teste atual "ordena por data crescente e por valor absoluto".
6. **Mesmo `createdAt` no E2E.** Se lançamentos criados pela API no mesmo segundo empatarem, o CA10 só pode exigir "mesma ordem antes e depois de recarregar", não "ordem de criação".

## Questões para o orquestrador

> **Decididas no portão do topo (18/10/2026).** As decisões estão em [`../README.md`](../README.md#portão-do-topo--decisões-18102026) e já constam em [`../contratos.md`](../contratos.md); o texto abaixo fica como histórico.
1. **`src/app/page.tsx` na onda 2.** O README dá a página do Mês à 007 nesta onda, mas o R6 desta spec muda a ordenação dos "Últimos lançamentos" (uma linha, `src/app/page.tsx:65-67`). **Proposta:** a 009 faz só essa linha depois que a 007 terminar a página (ou a 007 já usa `compareTransactionsByDate` quando a T2 da 009 estiver pronta). **Motivo:** a ordem precisa ser a mesma nas três telas, e a mudança é mínima.
2. **Arquivos também tocados pela 004 na onda 2:** `src/types/transaction.ts` (004: `type` obrigatório; 009: `createdAt`), `src/app/investments/page.tsx` (004: somas; 009: ordem) e `tests/ui/pages/transactions.test.tsx` (004: remove o caso de tipo inferido pelo sinal; 009: troca o caso de busca). **Proposta:** a 009 desce antes da T6 da 004; as mudanças são em linhas diferentes.
3. **Função nova no K9.** O K9 define a ordem mas não o nome da função. Esta spec acrescenta `compareTransactionsByDate(a, b, direction)` em `src/utils/search.ts`. **Proposta:** registrar o nome no K9 para que a 005 e a 008 (que mexem no Mês) reaproveitem o mesmo critério.
