# SPEC 009 — Busca e ordem dos lançamentos

| | |
|---|---|
| Depende de | — (onda 5, sozinha) |
| Entrega | `src/utils/search.ts` (novo); `src/types/transaction.ts` (`createdAt`); `src/app/transactions/page.tsx`; `src/components/TransactionFilters` (texto do campo); ordenação em `src/app/page.tsx` (últimos lançamentos) e `src/app/investments/page.tsx`; testes em `tests/unit/utils`, `tests/ui/pages` e `tests/e2e/02-transactions.spec.ts` |
| Docs de base | [`../visao-geral.md`](../visao-geral.md), [`../contratos.md`](../contratos.md) (**K9 — esta spec é a dona**), [`../../MELHORIAS.md`](../../MELHORIAS.md) (P19 e §2 Baixa "Transações com a mesma data não têm critério de desempate"), [`../../FUNCIONALIDADES.md`](../../FUNCIONALIDADES.md) §0 e §2.5, [`../../TESTES.md`](../../TESTES.md) |

## Objetivo

Hoje a busca de Lançamentos só olha a descrição e diferencia acentos: "salario" não encontra "Salário", e buscar "Moradia" não acha o aluguel. Lançamentos do mesmo dia trocam de ordem entre um carregamento e outro, porque a lista só ordena pela data. Quando esta spec terminar, a busca ignora acentos e maiúsculas e procura na descrição, no nome da categoria e na observação; e a ordem dos lançamentos é sempre a mesma em Lançamentos, no Mês e em Investimentos.

## Requisitos

| ID | Requisito |
|---|---|
| R1 | `normalizeSearch(text)` (K9, `src/utils/search.ts`) devolve o texto em minúsculas, sem acentos (decomposição NFD e remoção das marcas combinantes), com espaços das pontas removidos e sequências de espaços reduzidas a um. |
| R2 | `matchesSearch(transaction, query)` (K9) devolve `true` quando a busca normalizada está vazia, ou quando ela aparece como trecho da descrição, do nome da categoria ou da observação normalizados. Observação nula ou ausente não quebra a busca. A busca é por trecho literal: caracteres como `(`, `*`, `.` e `+` não têm significado especial. |
| R3 | A busca de Lançamentos usa `matchesSearch` e se combina com os filtros de tipo, categoria e período como hoje. O campo de busca passa a dizer "Buscar por descrição, categoria ou observação" e continua com o rótulo acessível "Buscar". |
| R4 | Ordem estável (K9): `src/utils/search.ts` exporta `compareTransactionsByDate(a, b, direction)`, que ordena por data, depois por `createdAt`, depois por `id`, todos decrescentes em `"desc"` e crescentes em `"asc"`. Lançamento sem `createdAt` é comparado só por `id` no desempate. A função não altera os objetos. |
| R5 | Em Lançamentos, "Mais recentes" usa `"desc"` e "Mais antigas" usa `"asc"`. Em "Maior valor" e "Menor valor", os empates de valor são desfeitos por `compareTransactionsByDate(…, "desc")`. |
| R6 | "Últimos lançamentos" do Mês (os 7 mais recentes do mês) e a lista de aportes de Investimentos usam `compareTransactionsByDate(…, "desc")`. |
| R7 | `Transaction` (`src/types/transaction.ts`) declara `createdAt?: string`, que a API já devolve; `TransactionPayload` não envia `createdAt`. A API não muda (K9). |
| R8 | A ordem não depende da ordem em que a API devolve a lista: a mesma lista em ordem embaralhada aparece igual na tela. |

## Fora de escopo

- **Destaque do trecho encontrado.** Não é trivial: a normalização NFD muda o comprimento do texto, e mapear a posição de volta ao texto com acento exige código próprio em `EntryRow`. Fica para depois.
- Busca por valor, forma de pagamento ou data digitada.
- Busca aproximada (erros de digitação, plural) ou por várias palavras em campos diferentes.
- Busca ou ordenação no servidor; a ordem de `GET /api/transactions` não muda (K9).
- Ordenação de Relatórios, Categorias, Planejar e Importar.
- Paginação e carga por período (P13, fora do ciclo).
- Mostrar forma de pagamento e observação na lista (item Baixa separado do MELHORIAS).

## Critérios de aceite

| ID | Critério | Requisitos cobertos | Verificado por |
|---|---|---|---|
| CA1 | `normalizeSearch("  Salário   Mensal ")` = `"salario mensal"`; `normalizeSearch("AÇÃO Ü")` = `"acao u"`; `normalizeSearch("")` = `""`; `normalizeSearch("   ")` = `""`. | R1 | T1 (`tests/unit/utils/search.test.ts`) |
| CA2 | `matchesSearch` encontra "salario" na descrição "Salário", "SALÁRIO" na descrição "salario", "moradia" na categoria "Moradia" e "vence" na observação "Vence dia 6"; devolve `true` para busca vazia ou só com espaços; devolve `false` quando nenhum dos três campos contém o trecho. | R1, R2 | T1 (`tests/unit/utils/search.test.ts`) |
| CA3 | **Erro/limite:** `matchesSearch` com observação `null` ou ausente não lança erro e busca nos outros campos; busca por `"("`, `"*"` ou `"a.b"` não lança erro e casa só com o trecho literal. | R2 | T1 (`tests/unit/utils/search.test.ts`) |
| CA4 | `compareTransactionsByDate`: mesmo dia e `createdAt` diferentes → o criado depois vem primeiro em `"desc"` e por último em `"asc"`; mesmo dia e mesmo `createdAt` → desempate por `id`; sem `createdAt` → desempate por `id`, sem erro; a lista original não é alterada. | R4 | T2 (`tests/unit/utils/search.test.ts`) |
| CA5 | Na página Lançamentos, digitar "salario" lista "Salário"; "Moradia" lista "Aluguel"; "vence" lista "Aluguel"; "xyz" mostra "Nenhum lançamento encontrado com esses filtros." O teste "[comportamento atual] a busca não considera acentos nem a categoria" é substituído por estes casos. | R2, R3 | T3 (`tests/ui/pages/transactions.test.tsx`) |
| CA6 | Na página Lançamentos, três lançamentos do mesmo dia aparecem na ordem de `createdAt` decrescente em "Mais recentes" e crescente em "Mais antigas", e na mesma ordem quando a API os devolve em outra ordem; em "Maior valor", dois lançamentos de mesmo valor aparecem pelo mais recente. | R4, R5, R8 | T3 (`tests/ui/pages/transactions.test.tsx`) |
| CA7 | No Mês, "Últimos lançamentos" mostra os lançamentos do mesmo dia por `createdAt` decrescente, qualquer que seja a ordem da API. | R6, R8 | T4 (`tests/ui/pages/dashboard.test.tsx`) |
| CA8 | Em Investimentos, a lista de aportes mostra aportes do mesmo dia por `createdAt` decrescente, qualquer que seja a ordem da API. | R6, R8 | T4 (`tests/ui/pages/reports-investments.test.tsx`) |
| CA9 | `npm run typecheck` passa com `createdAt?: string` em `Transaction`, e o corpo de `POST`/`PATCH` enviado pelo formulário não contém `createdAt`. | R7 | T2 (`npm run typecheck`, `tests/ui/components/TransactionForm.test.tsx`) |
| CA10 | No app real: buscar "salario" acha "Salário mensal"; buscar pelo nome de uma categoria acha os lançamentos dela; três lançamentos criados no mesmo dia aparecem na mesma ordem antes e depois de recarregar a página. | R2, R3, R4, R5 | T5 (`tests/e2e/02-transactions.spec.ts`) |
