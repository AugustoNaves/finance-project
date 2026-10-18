# SPEC 005 — Cartões de crédito e faturas

| | |
|---|---|
| Depende de | 003 (categoria por id, K3), 004 (centavos e tipo obrigatório, K1 e K2) |
| Entrega | `src/features/credit-cards/`, `src/app/api/credit-cards/`, tela `/cards`, `src/components/TransactionForm`, `src/app/page.tsx` (bloco da fatura), telas mensais, importação, `src/utils/finance.ts`, migration |
| Docs de base | [`../visao-geral.md`](../visao-geral.md), [`../contratos.md`](../contratos.md) (K1–K4), [`../fatos-verificados.md`](../fatos-verificados.md), [`../../API.md`](../../API.md), [`../../FUNCIONALIDADES.md`](../../FUNCIONALIDADES.md) §0, [`../../design/design-spec.md`](../../design/design-spec.md), [`../SPEC-importacao-fatura-pdf.md`](../SPEC-importacao-fatura-pdf.md) |

## Objetivo

A pessoa passa a ver o mês **pela fatura que vai pagar**. Hoje isso só acontece na importação de PDF, que joga tudo no mês do vencimento. Com esta spec, a compra registrada à mão no cartão cai sozinha na fatura certa, pelo fechamento e pelo vencimento do cartão. O Mês mostra cada fatura como um bloco que se abre ("Fatura Nubank · vence 10/out · R$ 1.234,56"). O pagamento da fatura é registrado como transferência: não conta como gasto de novo.

Esta é a "etapa 2" combinada com o usuário em 17/10/2026. A tabela `credit_cards` já existe na produção, com 1 registro e nenhuma rota nem tela.

## Decisões desta spec (a confirmar no protótipo, task T1)

| Ponto | Proposta | Justificativa |
|---|---|---|
| Onde ficam os cartões | Tela própria **`/cards`**, item "Cartões" na folha Mais (celular) e no grupo "Organizar" (desktop), logo depois de "Importar fatura". | Cartão é dado financeiro do dia a dia: a pessoa consulta o fechamento e o vencimento, e o bloco da fatura leva até ele. Configurações hoje reúne conta, exportação e instalação (`src/app/settings/page.tsx`). Misturar os dois esconderia o cartão. |
| Compras do cartão na lista "Últimos lançamentos" do Mês | Saem da lista solta e aparecem só dentro do bloco da fatura. | Evita ver a mesma compra duas vezes na mesma tela. |
| Compra feita no dia do fechamento | Vai para a fatura **seguinte**. | É a regra usual dos emissores (o fechamento corta naquele dia). Confirmar no uphill (incógnita I1). |

## Requisitos

| ID | Requisito |
|---|---|
| R1 | Existe a tela `/cards` ("Cartões"), aberta pela folha Mais e pela coluna do desktop. Ela lista os cartões do usuário com nome, limite, "fecha dia X · vence dia Y" e o número de lançamentos vinculados. Tocar num cartão abre a edição; "Novo cartão" abre a criação. A exclusão fica dentro da edição. |
| R2 | A API `/api/credit-cards` oferece `GET` e `POST`, e `/api/credit-cards/[id]` oferece `PATCH` e `DELETE`, sempre filtradas pelo `userId` da sessão. Campos: `name` (1–60 caracteres), `limit` em reais (≥ 0, até 2 casas, gravado em `limitCents` pelo K1), `closingDay` e `dueDay` (inteiros de 1 a 31), `color?` e `brand?`. O `GET` devolve também `transactionCount`. Dado inválido responde 400 com mensagem em português; cartão de outro usuário ou inexistente responde 404; sem sessão, 401. |
| R3 | `getInvoiceMonth(purchaseDate, closingDay, dueDay)` devolve o mês do vencimento da fatura em que a compra entra. A compra feita **antes** do dia do fechamento entra na fatura que fecha naquele mês. A compra feita **no dia do fechamento ou depois** entra na fatura que fecha no mês seguinte. Quando o mês é curto, o dia do fechamento e o do vencimento são ajustados ao último dia do mês. O mês da fatura é o mês do fechamento quando `dueDay > closingDay`, e o mês seguinte ao fechamento quando `dueDay ≤ closingDay`. |
| R4 | Ao criar ou editar um lançamento com `cardId` (exceto `card_payment`), o servidor calcula e grava `transactions.invoiceMonth` com `getInvoiceMonth`. O valor fica congelado: mudar depois o fechamento ou o vencimento do cartão não move lançamentos antigos. Mudar a data ou o cartão do lançamento recalcula o valor, e tirar o cartão o apaga. |
| R5 | `getEffectiveMonth(transaction, cardsById)` devolve, nesta ordem: o mês da data, para `card_payment`; o `invoiceMonth`, quando existe; `getInvoiceMonth` pelo cartão do mapa, quando há `cardId` sem `invoiceMonth`; e, nos demais casos, o mês da data. |
| R6 | Todas as telas mensais (Mês, orçamentos de Planejar, Relatórios, Categorias e Investimentos) contam os lançamentos pelo mês de `getEffectiveMonth`. Isso vale também para `getMonthlyTransactions` em `src/utils/finance.ts`. |
| R7 | O tipo `card_payment` existe (K2). Exige `amount < 0`, `cardId` de um cartão do usuário e `invoiceMonth` (`YYYY-MM`), e tem `categoryId` nulo (K3). Não entra em Entrou, Saiu nem Investiu, nem no saldo do mês nem no saldo acumulado. |
| R8 | Lançamento com `cardId` de outro tipo exige `paymentMethod = "Cartão de crédito"`. O `cardId` precisa pertencer ao usuário da sessão; se não pertencer, a resposta é 400 "Cartão não encontrado.". |
| R9 | No formulário Registrar/Editar, o campo "Cartão" aparece quando a forma de pagamento é "Cartão de crédito". Com um cartão cadastrado, ele já vem escolhido; com vários, a pessoa escolhe; sem nenhum, aparece o link "Cadastrar cartão" e o lançamento é salvo sem cartão, como hoje. Trocar a forma de pagamento remove o cartão. Na edição, o cartão gravado aparece escolhido. |
| R10 | O Mês mostra um bloco por cartão que tenha lançamentos com mês efetivo igual ao mês exibido: "Fatura `<nome>` · vence `<dd/mmm>` · R$ `<total>`", seguido da situação. A situação é **aberta** antes do fechamento, **fechada** do dia do fechamento em diante e **paga** quando os pagamentos dessa fatura somam pelo menos o total. Com pagamento parcial, aparece "falta R$ X". Tocar no bloco abre e fecha a lista das compras, e tocar numa compra abre a edição pela folha. |
| R11 | O total da fatura do cartão C no mês M é −Σ`amount` dos lançamentos de C com mês efetivo M que não são `card_payment`. O valor pago é Σ|`amount`| dos `card_payment` com `cardId = C` e `invoiceMonth = M`. |
| R12 | O bloco tem "Registrar pagamento", que fica oculto quando a fatura está paga. Ele abre uma folha com o valor sugerido (total − já pago), a data de hoje e a forma de pagamento (Pix por padrão). Salvar cria um `card_payment` com o `cardId` e o `invoiceMonth` da fatura. O Saiu do mês não muda. |
| R13 | Na importação de fatura, o preview tem o campo "Cartão", com "Nenhum" como padrão e a lista de cartões. Com um cartão escolhido, o lote grava `import_batches.cardId`. Cada lançamento importado recebe esse `cardId` e `invoiceMonth = referenceMonth`, e a opção "mês da compra" fica oculta, porque tudo conta na fatura. Sem cartão, a importação funciona como hoje. |
| R14 | Excluir um cartão exige confirmação, que informa quantos lançamentos estão vinculados. Depois da exclusão, esses lançamentos e os lotes ficam com `cardId` nulo (`SET NULL`), **continuam no mesmo mês** (o `invoiceMonth` é preservado) e deixam de aparecer no bloco da fatura. |
| R15 | O cartão que já existe na produção continua válido depois da migration: aparece em `/cards`, pode ser editado e mantém nome, limite, fechamento e vencimento. |
| R16 | `/cards` entra em `rotasProtegidas` **e** no `matcher` de `src/proxy.ts`. |

## Fora de escopo

- **Limite disponível** (limite − fatura em aberto − parcelas futuras): exige projetar parcelas futuras, que o app não registra. A tela mostra só o limite cadastrado.
- **Compra parcelada registrada à mão** (gerar N lançamentos): continua sendo um lançamento por parcela. Parcelas importadas já chegam uma por fatura.
- Vincular a um cartão as importações e os lançamentos feitos **antes** desta spec.
- Juros, pagamento mínimo, fatura vencida e lembrete de vencimento. Notificação push está fora do ciclo (visão geral).
- Recalcular o `invoiceMonth` de lançamentos antigos quando o fechamento do cartão muda (R4 congela de propósito).
- Filtro por cartão em Lançamentos (`/transactions`). Essa tela continua filtrando pela **data** do lançamento.
- Edição de `brand` na tela: a API aceita e preserva o campo, mas a tela não o mostra.
- Estornos (spec 006) e recorrências no cartão (spec 008). Esta spec só garante que `refund` com `cardId` entra no total da fatura pela fórmula de R11.

## Critérios de aceite

| ID | Critério | Requisitos | Verificado por |
|---|---|---|---|
| CA1 | `getInvoiceMonth` acerta a tabela de casos: compra antes do fechamento; **no dia** do fechamento (vai para a seguinte); depois do fechamento; virada de ano (dez → jan); fechamento no dia 31 em fevereiro e em mês de 30 dias; `dueDay < closingDay` (vencimento no mês seguinte ao fechamento); `dueDay == closingDay`. | R3 | T2 `tests/unit/credit-cards/invoice.test.ts` |
| CA2 | `getEffectiveMonth` segue a ordem de R5: `card_payment` → mês da data; `invoiceMonth` presente → ele, mesmo com o cartão fora do mapa; `cardId` sem `invoiceMonth` → calculado; sem cartão → mês da data. | R5 | T2 `tests/unit/credit-cards/invoice.test.ts` |
| CA3 | O resumo de faturas (total, pago, situação aberta/fechada/paga e "falta") de um mês sai certo para: fatura sem pagamento antes e depois do fechamento; pagamento parcial; pagamento igual ao total; `refund` com cartão abatendo o total. | R10, R11 | T2 `tests/unit/credit-cards/invoice.test.ts` |
| CA4 | `GET /api/credit-cards` lista só os cartões do usuário, com `limit` em reais e `transactionCount`. `POST` cria (201). `PATCH` altera. `DELETE` remove e põe `cardId` nulo nos lançamentos, preservando `invoiceMonth`. | R2, R14 | T3 `tests/api/credit-cards.test.ts` |
| CA5 | **Erros** da API de cartões: 401 sem sessão; 400 para nome vazio ou com mais de 60 caracteres, limite negativo ou não numérico, `closingDay`/`dueDay` fora de 1–31 ou não inteiros, e JSON malformado; 404 para `PATCH`/`DELETE` de cartão de outro usuário ou inexistente; 500 com mensagem quando o banco falha. | R2 | T3 `tests/api/credit-cards.test.ts` |
| CA6 | `POST`/`PATCH /api/transactions` com `cardId` grava `invoiceMonth` calculado. Trocar a data recalcula, tirar o cartão apaga e editar o fechamento do cartão não altera lançamentos existentes. | R4 | T3 `tests/api/transactions.test.ts` |
| CA7 | **Erros** de lançamento com cartão: 400 para `cardId` de outro usuário; `cardId` com forma de pagamento diferente de "Cartão de crédito" (fora de `card_payment`); `card_payment` sem `cardId`, sem `invoiceMonth`, com `invoiceMonth` mal formado, com `amount > 0` ou com `categoryId`. | R7, R8 | T3 `tests/api/transactions.test.ts` |
| CA8 | A migration preserva o cartão existente: depois de `prisma migrate dev` sobre um banco com um cartão criado pelo SQL antigo, `GET /api/credit-cards` devolve o cartão com os mesmos dados. | R15 | T3 `tests/api/credit-cards.test.ts` (caso com registro criado como na produção) e verificação somente leitura de T9 |
| CA9 | `calculateSummary` ignora `card_payment` em Entrou, Saiu, Investiu e saldo. `getMonthlyTransactions` usa o mês efetivo: uma compra de 05/09 no cartão que fecha dia 3 e vence dia 10 conta em outubro, e não em setembro; com fecha 25 e vence 5, uma compra de 28/09 conta em novembro. | R5, R6, R7 | T4 `tests/unit/utils/finance.test.ts` |
| CA10 | Mês, Planejar (gasto do orçamento), Relatórios, Categorias e Investimentos contam a compra de cartão no mês da fatura. Em cada tela, um lançamento com `invoiceMonth` diferente do mês da data aparece no mês da fatura. | R6 | T4 `tests/ui/pages/dashboard.test.tsx`, `planning.test.tsx`, `reports-investments.test.tsx`, `categories.test.tsx` |
| CA11 | `/cards` lista, cria, edita e exclui cartões. A confirmação de exclusão mostra "N lançamentos". Erro da API aparece com `FormError`, e a falha ao carregar mostra a mensagem de erro, não uma lista vazia. | R1, R14 | T5 `tests/ui/pages/cards.test.tsx` |
| CA12 | `/cards` sem sessão redireciona para `/login`. | R16 | T5 `tests/unit/proxy.test.ts` |
| CA13 | No formulário, "Cartão" só aparece com "Cartão de crédito". Com um cartão, ele vem escolhido; sem cartões, aparece "Cadastrar cartão" e o envio sai sem `cardId`; trocar a forma remove o `cardId` do envio; a edição mostra o cartão gravado. | R9 | T5 `tests/ui/components/TransactionForm.test.tsx` |
| CA14 | O Mês mostra o bloco "Fatura X · vence dd/mmm · R$ total" com a situação certa, abre e fecha a lista de compras, e essas compras não aparecem em "Últimos lançamentos". | R10, R11 | T6 `tests/ui/pages/dashboard.test.tsx` |
| CA15 | "Registrar pagamento" sugere total − pago, envia `card_payment` com `cardId` e `invoiceMonth`, e depois o bloco mostra "paga" sem mudar o Saiu. Se a API falhar, a folha mostra o erro e continua aberta. | R12, R7 | T6 `tests/ui/pages/dashboard.test.tsx` |
| CA16 | `POST /api/imports` com `cardId` grava o cartão no lote e nos lançamentos, com `invoiceMonth = referenceMonth`. Sem `cardId`, os lançamentos saem como hoje. Com `cardId` de outro usuário, responde 400 e não grava nada. | R13 | T7 `tests/api/imports.test.ts`, `tests/unit/lib/importValidators.test.ts` |
| CA17 | No preview da importação, o campo "Cartão" lista os cartões e começa em "Nenhum". Escolher um cartão oculta a opção "mês da compra" e envia `cardId` na confirmação. | R13 | T7 `tests/ui/pages/import.test.tsx` |
| CA18 | Ponta a ponta: cadastrar um cartão (fecha 3, vence 10), registrar uma compra no dia 5 do mês corrente e ver o bloco no mês seguinte; registrar o pagamento e ver "paga" com o Saiu igual; importar uma fatura escolhendo o cartão e ver os lançamentos no bloco. | R1, R9, R10, R12, R13 | T8 `tests/e2e/17-credit-cards.spec.ts` |

## Validação manual

Registrar em [`../validacao-manual.md`](../validacao-manual.md).

| ID | O que conferir | Requisitos |
|---|---|---|
| VM1 | O usuário aprova a estrutura (onde ficam os cartões, lugar do bloco no Mês, compras fora de "Últimos lançamentos") e o protótipo do bloco da fatura e da folha de pagamento, antes de qualquer task de UI (skill `direcao-design-produto`, pontos A e C). | R1, R10, R12 |
| VM2 | No celular instalado (PWA), com o cartão real da produção: uma compra registrada à mão cai na fatura que o app do banco mostra. | R3, R10 |
