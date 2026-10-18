# SPEC 006 — Estornos abatem o gasto

| | |
|---|---|
| Depende de | 003 (categoria por id, K3), 004 (centavos e tipo obrigatório, K1/K2), 005 (cartões e mês da fatura, K4). Onda 7, sozinha. |
| Entrega | `src/types/transaction.ts`, `src/lib/validators.ts`, `src/lib/importValidators.ts`, rotas `src/app/api/transactions` e `src/app/api/imports` (inclui `preview`), `src/utils/finance.ts`, `src/features/invoice-import/{types,categorize}.ts`, `src/components/{TransactionForm,EntryRow,TransactionFilters,MonthSummary,BudgetRow}`, páginas `/`, `/transactions`, `/planning`, `/categories`, `/reports`, `/import`, `/settings`; testes em `tests/` (inclui `tests/e2e/NN-estornos.spec.ts`, número definido no uphill) |
| Docs de base | [`../visao-geral.md`](../visao-geral.md), [`../contratos.md`](../contratos.md) (**K5 — esta spec é a dona**; estende K2 com `refund`; consome K1, K3 e K4), [`../../API.md`](../../API.md) §5.2 e §5.6, [`../../FUNCIONALIDADES.md`](../../FUNCIONALIDADES.md) §0, [`../../design/design-spec.md`](../../design/design-spec.md), [`../SPEC-importacao-fatura-pdf.md`](../SPEC-importacao-fatura-pdf.md) |

## Objetivo

Hoje um estorno (a loja devolveu R$ 30 de uma compra) entra como **receita**: infla o "Entrou" e não reduz o gasto da categoria nem do orçamento. Quando esta spec terminar, existe o tipo **Estorno**: ele usa as categorias de gasto e **abate** o "Saiu" do mês, o gasto da categoria e o do orçamento, em todas as telas. Na importação de fatura, as linhas de crédito/estorno já chegam como Estorno.

## Requisitos

| ID | Requisito |
|---|---|
| R1 | **Tipo e API.** `TransactionType` ganha `"refund"` (K2). `POST`/`PATCH /api/transactions` aceitam `type: "refund"` com `amount > 0` e categoria do tipo `outcome` (K3). Estorno com `amount ≤ 0` ou com categoria de outro tipo responde `400` e não grava; os demais tipos continuam como na 004/005. |
| R2 | **Formulário.** A folha Registrar/Editar tem a opção **Estorno** ao lado de Gasto, Receita e Investimento (e de "Pagamento de fatura", se a 005 o expuser no formulário). Com Estorno, os chips mostram as categorias de **gasto** (mais usadas primeiro, contando gastos e estornos), e o valor é salvo positivo. Trocar entre Gasto e Estorno mantém a categoria escolhida; trocar para Receita ou Investimento a limpa, como hoje. Editar um estorno abre com Estorno marcado. |
| R3 | **Resumo do mês.** Em `src/utils/finance.ts`, `calculateSummary` passa a dar `outcome = −(Σ|outcome| − Σrefund)` (K5); o estorno **não** entra em `income` nem em `investment`; `total` (sobra) continua sendo a soma dos valores, então o estorno aumenta a sobra exatamente pelo seu valor. As somas passam por centavos (K1). |
| R4 | **Gasto por categoria.** `src/utils/finance.ts` ganha uma função única que, para um mês e uma lista de lançamentos, devolve o gasto líquido de cada `categoryId` de gasto: Σ|outcome| − Σrefund. O valor pode ser negativo (estorno sem compra no mês). O mês de cada lançamento é o mês efetivo de K4 (`getEffectiveMonth`): estorno com `cardId` conta no mês da fatura. |
| R5 | **Mês (`/`).** "Saiu" mostra o gasto líquido; se ele for negativo, aparece com sinal (`−20,00`) e sem o tom vermelho. As barras de orçamento do mês usam o gasto líquido da categoria (R4), com mínimo 0 na barra e a ordem por % usado calculada sobre esse mínimo. |
| R6 | **Planejar.** O "gasto de limite" de cada orçamento é o gasto líquido da categoria no mês (R4). A barra e a faixa de cor (verde/âmbar/vermelho) usam `max(0, gasto)`; o texto mostra o valor exato, inclusive negativo (K5). A linha de total soma os valores exatos. |
| R7 | **Categorias.** Na aba Gastos, o total do mês de cada categoria é o gasto líquido (R4), e "n lançamentos" conta gastos **e** estornos da categoria. Receitas e Investimentos não mudam. |
| R8 | **Relatórios.** "Despesas" do período é o gasto líquido do mês (R3); "Média diária" e o gráfico receitas × despesas usam esse valor; "Saldo", "Taxa de economia" e a evolução do saldo continuam vindo de `total`, que já inclui o estorno. "Gastos por categoria" e "Categoria líder" usam o gasto líquido por categoria (R4): categorias com gasto ≤ 0 aparecem no fim com o valor exato e barra vazia, e o percentual de cada uma é calculado sobre a soma dos gastos positivos. "Maior despesa" continua sendo o maior lançamento `outcome` (estorno não conta). |
| R9 | **Importação.** No preview, linhas `kind: "credit"` vêm com `type: "refund"` por padrão (antes `income`) e com sugestão de categoria de **gasto** (regras, histórico e palavras-chave de gasto do mesmo estabelecimento). O seletor de tipo da linha oferece Gasto, Estorno e Receita; trocar entre Gasto e Estorno mantém a categoria, trocar para Receita a limpa. `POST /api/imports` aceita itens `refund` (valor gravado positivo, categoria `outcome`; categoria de outro tipo → `400` com `invalidItems`, nada gravado). "Lembrar" numa linha de estorno grava a regra como `outcome` (a mesma regra serve à compra e ao estorno do estabelecimento). O total importado do lote continua subtraindo créditos. |
| R10 | **Listas.** Em Mês, Lançamentos e na busca, o estorno aparece com valor `+` e o rótulo "Estorno" na linha de detalhe (ex.: "Estorno · Vestuário"), sem o vermelho de saída; o nome acessível da linha inclui "Estorno". Lançamentos ganha o filtro de tipo "Estornos". |
| R11 | **Exportação.** O CSV e o JSON de Configurações trazem o tipo do estorno (`refund`) na coluna/campo `type`, sem outra mudança de formato. |

## Fora de escopo

- **Converter estornos já importados como receita.** Os créditos importados antes desta spec são lançamentos `income` com categoria de **receita**. Virar `refund` exige escolher uma categoria de gasto para cada um (a categoria da compra original não foi guardada), o que não dá para decidir automaticamente sem errar números de orçamento. Quem quiser corrige abrindo o lançamento e trocando para Estorno (R2). O guia `/ajuda` explica isso.
- Ligar o estorno à compra original (referência entre lançamentos), estorno parcial casado com parcela, ou detectar estorno duplicado.
- Estorno de receita ou de investimento: só existe estorno de gasto (K5).
- Separar "cashback" de "estorno" na leitura do PDF: hoje os dois viram `kind: "credit"` e passam a vir como Estorno; quem preferir troca para Receita no preview (R9). Mudar o classificador fica fora.
- Regras de importação com tipo `refund`: a regra continua `income` ou `outcome` (R9).
- Mudança de schema ou migration: `type` é texto desde a 004; nenhuma coluna nova.
- Pagamento de fatura (`card_payment`) e o mês da fatura: são da 005 (K4); aqui só se usa `getEffectiveMonth`.

## Critérios de aceite

Cada critério tem de ser verificável por comando, sem humano.

| ID | Critério | Requisitos cobertos | Verificado por |
|---|---|---|---|
| CA1 | `POST /api/transactions` com `type: "refund"`, `amount: 30` e categoria `outcome` do usuário → `201`. **Erros:** `refund` com `amount: -30` → `400`; `refund` com categoria `income` → `400`; `PATCH` que troca um gasto para `refund` sem inverter o sinal → `400`. Nos erros, nada é gravado. | R1 | T1 (`tests/unit/lib/validators.test.ts`, `tests/api/transactions.test.ts`) |
| CA2 | Na folha Registrar, escolher Estorno mostra só categorias de gasto e salvar envia `type: "refund"` com valor positivo e o `categoryId` escolhido; trocar Gasto → Estorno mantém a categoria e Estorno → Receita a limpa; editar um estorno abre com Estorno marcado. | R2 | T3 (`tests/ui/components/TransactionForm.test.tsx`) |
| CA3 | `calculateSummary` com gasto de 100,00, estorno de 30,00 e receita de 500,00 dá `income 500`, `outcome −70`, `total 430`; com estorno de 120,00 e gasto de 100,00 dá `outcome +20`; somas com centavos (0,10 + 0,20 de estorno) não acumulam erro. | R3 | T2 (`tests/unit/utils/finance.test.ts`) |
| CA4 | A função de gasto por categoria devolve, para um mês, 70,00 na categoria com gasto 100,00 e estorno 30,00, −20,00 na categoria só com estorno de 20,00, ignora receitas, investimentos e outros meses, e nunca mistura categorias por nome. | R4 | T2 (`tests/unit/utils/finance.test.ts`) |
| CA5 | Estorno com `cardId` cuja compra cai depois do fechamento conta no mês da fatura (K4) no resumo e no gasto por categoria; estorno sem `cardId` conta no mês da data. | R4 | T2 (`tests/unit/utils/finance.test.ts`) |
| CA6 | Mês: com gasto 100,00 e estorno 30,00, "Saiu" mostra 70,00 e o orçamento da categoria mostra o gasto 70,00; com só estorno de 20,00, "Saiu" mostra `−20,00` e a barra do orçamento fica em 0%. | R5 | T4 (`tests/ui/pages/dashboard.test.tsx`) |
| CA7 | Planejar: orçamento de 500,00 com gasto 100,00 e estorno 30,00 mostra "70,00 de 500,00"; com só estorno de 20,00 mostra o valor negativo no texto, barra em 0% e faixa verde. | R6 | T4 (`tests/ui/pages/planning.test.tsx`) |
| CA8 | Categorias: a linha da categoria de gasto mostra o total líquido e "2 lançamentos" para 1 gasto + 1 estorno; as abas Receitas e Investimentos não mudam. | R7 | T4 (`tests/ui/pages/categories.test.tsx`) |
| CA9 | Relatórios: "Despesas" e "Gastos por categoria" líquidos; categoria com gasto ≤ 0 aparece no fim com o valor exato; "Maior despesa" ignora o estorno; o estorno não aparece em "Receitas". | R8 | T4 (`tests/ui/pages/reports-investments.test.tsx`) |
| CA10 | Importação (API): o preview devolve `type: "refund"` e `include: true` para `kind: "credit"`, com sugestão de categoria de gasto do mesmo estabelecimento; a confirmação grava o estorno com valor positivo e `type: "refund"`; item `refund` com categoria `income` → `400` com `invalidItems` e sem lote criado; o `importedTotal` subtrai o estorno; "Lembrar" numa linha de estorno grava regra `outcome`. | R9 | T5 (`tests/api/imports.test.ts`, `tests/unit/lib/importValidators.test.ts`, `tests/unit/invoice-import/categorize.test.ts`) |
| CA11 | Importação (tela): a linha de estorno abre com o tipo Estorno; o seletor tem Gasto, Estorno e Receita; Estorno → Gasto mantém a categoria e Estorno → Receita a limpa. | R9 | T5 (`tests/ui/pages/import.test.tsx`) |
| CA12 | A linha de um estorno mostra `+30,00`, o rótulo "Estorno" no detalhe e não usa o tom de saída; o filtro "Estornos" de Lançamentos mostra só estornos. | R10 | T3 (`tests/ui/components/transactions-list.test.tsx`, `tests/ui/pages/transactions.test.tsx`) |
| CA13 | O CSV exportado tem `refund` na coluna `type` da linha do estorno. | R11 | T3 (`tests/ui/pages/settings.test.tsx`) |
| CA14 | E2E: registrar um estorno pela folha reduz "Saiu" e o gasto do orçamento no Mês e em Planejar; importar o PDF de teste com uma linha "ESTORNO" a registra como Estorno e abate o gasto da categoria. | R2, R5, R6, R9 | T6 (`tests/e2e/NN-estornos.spec.ts`) |
| CA15 | `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e` passam. | todos | T6 |

## Validação manual

- Importar uma fatura real que tenha um estorno, conferir no celular que a linha chega como Estorno com a categoria esperada e que o orçamento da categoria baixa. Registrar em [`../validacao-manual.md`](../validacao-manual.md).
