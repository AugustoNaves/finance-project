# SPEC 008 — Lançamentos recorrentes

| | |
|---|---|
| Depende de | 003 (categoria por id, K3), 004 (centavos e tipo, K1 e K2), 005 (cartões e mês da fatura, K4) |
| Entrega | `src/features/recurring/`, `src/app/api/recurring/`, `src/components/TransactionForm`, `src/contexts/TransactionsContenxt.tsx`, lista em `src/app/planning/page.tsx`, migration `recurring_rules` |
| Docs de base | [`../visao-geral.md`](../visao-geral.md), [`../contratos.md`](../contratos.md) (K1–K4, K6, K8), [`../fatos-verificados.md`](../fatos-verificados.md), [`../../API.md`](../../API.md), [`../../FUNCIONALIDADES.md`](../../FUNCIONALIDADES.md) §0, [`../../design/design-spec.md`](../../design/design-spec.md), [`../005-cartoes-e-faturas/spec.md`](../005-cartoes-e-faturas/spec.md) |

## Objetivo

Aluguel, salário e assinaturas passam a ser registrados **uma vez**. Ao marcar "Repetir todo mês" no formulário, o app cria uma regra, e o lançamento de cada mês aparece sozinho quando a pessoa abre o app. Nada é duplicado, mesmo com duas abas abertas. As regras ficam numa lista própria, em que a pessoa pausa, edita, encerra ou exclui.

## Decisões desta spec

| Ponto | Proposta | Justificativa |
|---|---|---|
| Onde fica a lista de recorrências | Seção **"Todo mês"** em Planejar (`/planning`), entre Orçamentos e Metas. | Recorrência é plano do mês, como orçamento e meta. Usa a tela que já existe, sem rota nova no proxy nem item novo na navegação. Validar com o usuário (VM1). |
| Meses que ficaram sem abrir o app | A geração recupera os meses que faltam desde o último gerado, até no máximo 12 meses para trás. | Quem passa dois meses sem abrir o app não fica sem o aluguel desses meses. O limite evita criar centenas de lançamentos por engano. |
| Lançamento gerado e depois excluído | Não volta. | A regra guarda o último mês gerado (`lastGeneratedMonth`). Excluir o lançamento do mês é a forma de "pular" aquele mês. |
| "Mês corrente" | Quem informa é o cliente (`month` no corpo, pelo fuso do aparelho). O servidor só aceita um mês que esteja no máximo 1 mês à frente do mês UTC do servidor. | As datas do app são do calendário local (`src/utils/dates.ts`). O limite impede gerar meses futuros. |

## Requisitos

| ID | Requisito |
|---|---|
| R1 | A tabela `recurring_rules` existe com os campos do K6 e mais `lastGeneratedMonth String?` (`YYYY-MM`), com RLS ligado. Tem FK para `users` (`CASCADE`), `categories` (`RESTRICT`, K3) e `credit_cards` (`SET NULL`). `transactions.recurringRuleId` é FK `ON DELETE SET NULL`, com índice único `(recurringRuleId, date)`. |
| R2 | O formulário Registrar mostra a opção "Repetir todo mês" só em lançamento **novo** dos tipos Gasto, Receita e Investimento. Marcada, salvar cria a regra e o lançamento daquela data na mesma operação. A regra fica com `dayOfMonth` = dia da data, `startMonth` = mês da data e `lastGeneratedMonth` = mês da data. A forma de pagamento e o cartão (K4) vão para a regra. |
| R3 | `POST /api/recurring` cria a regra e o primeiro lançamento numa transação de banco e responde 201 `{ rule, transaction }`. `GET /api/recurring` lista as regras do usuário com o nome da categoria (e o do cartão, quando houver). `PATCH /api/recurring/[id]` edita descrição, valor, categoria, dia, forma de pagamento, cartão, `endMonth` e `active`. `DELETE /api/recurring/[id]` exclui a regra. Tudo é filtrado pelo `userId` da sessão; a regra de outro usuário responde 404. |
| R4 | A validação segue os contratos: `type` só `income`, `outcome` ou `investment` (K6); o sinal do valor combina com o tipo (K2); `categoryId` é do usuário e de tipo compatível (K3); `dayOfMonth` é inteiro de 1 a 31; `startMonth` e `endMonth` estão em `YYYY-MM`, com `endMonth ≥ startMonth`; `cardId` é do usuário e exige forma "Cartão de crédito" (K4). Violação responde 400 com mensagem em português. |
| R5 | `POST /api/recurring/generate { month }` cria, para cada regra ativa do usuário, os lançamentos dos meses `m` que cumprem todas as condições abaixo e responde `{ created }`. Para cada mês tratado, o `lastGeneratedMonth` da regra avança. A chamada repetida responde `{ created: 0 }`. As condições para cada `m`: (1) depois de `lastGeneratedMonth`; (2) a partir de `startMonth`; (3) até `endMonth`, quando existe; (4) até `month`; (5) no máximo 12 meses antes de `month`. |
| R6 | A data do lançamento gerado é `dayOfMonth` naquele mês. Quando o mês não tem esse dia, a data passa a ser o último dia do mês: dia 31 em abril → 30/04; dia 30 em fevereiro → 28/02 ou 29/02. A data é gravada como meia-noite UTC. |
| R7 | O lançamento gerado copia da regra, **no momento da geração**: descrição, valor, tipo, categoria, forma de pagamento e cartão. Também recebe `recurringRuleId`. Com cartão, o servidor grava o `invoiceMonth` como no `POST /api/transactions` (K4 e 005 R4), e o lançamento cai na fatura certa. |
| R8 | A geração é segura contra concorrência. Duas chamadas simultâneas para o mesmo mês criam cada lançamento uma vez só. A violação do índice único (`P2002`) não vira erro 500: o lançamento é contado como já existente. |
| R9 | `month` ausente, mal formado ou mais de 1 mês à frente do mês UTC do servidor responde 400. Sem sessão, 401. Falha do banco, 500 com mensagem. |
| R10 | Ao abrir o app (montagem do `TransactionsProvider`), o cliente chama `POST /api/recurring/generate` com o mês local corrente e **depois** busca os lançamentos. Se a geração falhar, o erro é registrado no console e a carga segue normalmente, sem mudar o estado de erro de leitura do K8. |
| R11 | Editar a regra não altera nenhum lançamento já gerado; vale só para os próximos meses. Editar ou excluir um lançamento gerado não altera a regra. |
| R12 | Pausar (`active: false`) faz a geração ignorar a regra. Retomar (`active: true`) exige `month` no corpo e leva `lastGeneratedMonth` a pelo menos o mês anterior a `month`: os meses pausados **não** são criados depois. |
| R13 | Encerrar grava `endMonth` = mês corrente: o lançamento do mês corrente que já existe fica, e nenhum mês seguinte é gerado. A regra encerrada (com `endMonth` anterior ao mês corrente) aparece na lista como "Encerrada". |
| R14 | Excluir a regra (com confirmação) mantém os lançamentos gerados, que ficam com `recurringRuleId` nulo (`SET NULL`). |
| R15 | Planejar mostra a seção "Todo mês". Cada linha traz a descrição, o valor com sinal, "todo dia X", a categoria, o cartão (se houver) e a situação: Ativa, Pausada ou Encerrada. Tocar na linha abre a edição, que tem Pausar ou Retomar, Encerrar e Excluir. A falha de leitura aparece com a mensagem (K8), não como lista vazia. |
| R16 | Excluir uma categoria usada por uma regra responde 409, e `usage` passa a incluir `recurring` (contagem de regras). |
| R17 | Excluir um cartão usado por uma regra põe `cardId` nulo na regra (`SET NULL`). Os próximos lançamentos saem sem cartão, e os já gerados não mudam. |

## Fora de escopo

- Frequências além de "todo mês" (semanal, anual, a cada N meses) e "dia útil".
- Gerar meses **futuros** para previsão ou orçamento projetado. A geração vai só até o mês corrente.
- Recorrência de `card_payment` e de `refund` (o K6 limita a `income`, `outcome` e `investment`).
- Transformar um lançamento já existente em recorrente, ou criar regra a partir da edição. A opção existe só no lançamento novo.
- Marca visual de "recorrente" nas linhas de lançamento e atalho da edição do lançamento para a regra.
- Geração no servidor sem o app aberto (cron), que dependeria de agendamento na Vercel. Push está fora do ciclo.
- Reajuste automático de valor e observação na regra (o K6 não tem `notes`).
- Compra parcelada (vem da importação ou é registrada à mão, spec 005).

## Critérios de aceite

| ID | Critério | Requisitos | Verificado por |
|---|---|---|---|
| CA1 | A migration cria `recurring_rules` com `ENABLE ROW LEVEL SECURITY`, as FKs de R1, `transactions.recurringRuleId` com `ON DELETE SET NULL` e o índice único `(recurringRuleId, date)`. Aplica sem erro sobre um banco com dados. | R1 | T1 (`npx prisma migrate dev` + `grep` na migration) |
| CA2 | A data da ocorrência é dia 15 → 15; dia 31 em abril → 30; dia 29, 30 e 31 em fevereiro de ano bissexto e não bissexto → 29 ou 28; dia 31 em dezembro → 31. | R6 | T2 `tests/unit/recurring/schedule.test.ts` |
| CA3 | Os meses a gerar são: marcador nulo → de `startMonth` até `month`; marcador igual a `month` → nenhum; `endMonth` corta o fim; `startMonth` depois de `month` → nenhum; 2 meses sem abrir → os 2 meses e o atual; mais de 12 meses → só os últimos 12; virada de ano (nov → fev). | R5 | T2 `tests/unit/recurring/schedule.test.ts` |
| CA4 | `POST /api/recurring` responde 201 com a regra e o lançamento vinculado (`recurringRuleId`, `lastGeneratedMonth` = mês da data). `GET` lista só as regras do usuário, com o nome da categoria. `PATCH` altera a regra sem tocar nos lançamentos. `DELETE` remove a regra, e o lançamento continua com `recurringRuleId` nulo. | R3, R11, R14 | T3 `tests/api/recurring.test.ts` |
| CA5 | **Erros** do CRUD: 401 sem sessão; 400 para tipo `card_payment` ou `refund`, sinal incompatível, `dayOfMonth` 0, 32 ou não inteiro, mês mal formado, `endMonth < startMonth`, `categoryId` de outro usuário ou de tipo incompatível, `cardId` de outro usuário, `cardId` sem "Cartão de crédito", retomar sem `month` e JSON malformado; 404 para `PATCH`/`DELETE` de regra de outro usuário; 500 quando o banco falha. | R3, R4, R12 | T3 `tests/api/recurring.test.ts`, `tests/unit/lib/validators.test.ts` |
| CA6 | `DELETE /api/categories/[id]` de uma categoria usada por uma regra responde 409 com `usage.recurring = 1` e não exclui nada. | R16 | T3 `tests/api/categories.test.ts` |
| CA7 | `generate` cria o lançamento do mês com os dados atuais da regra e avança `lastGeneratedMonth`. A segunda chamada responde `created: 0`. O lançamento gerado e depois excluído não volta. A regra pausada não gera, e ao retomar os meses pausados não são criados. A regra encerrada não gera depois de `endMonth`. A regra com dia 31 em novembro gera 30/11. A regra com cartão gera com `cardId` e `invoiceMonth`. Meses faltantes são recuperados até o limite. | R5, R6, R7, R11, R12, R13 | T4 `tests/api/recurring-generate.test.ts` |
| CA8 | **Erros e concorrência** do `generate`: 401 sem sessão; 400 para `month` ausente, mal formado ou 2 meses à frente do mês do servidor; `P2002` na criação não gera 500, e `created` conta só o que foi criado; 500 com mensagem quando o banco falha. | R8, R9 | T4 `tests/api/recurring-generate.test.ts` |
| CA9 | No formulário, "Repetir todo mês" aparece só em lançamento novo e nos três tipos permitidos. Marcado, o envio vai para `POST /api/recurring` com `dayOfMonth`, `startMonth` e `cardId` tirados do formulário, e o lançamento criado entra na lista. Desmarcado, o envio vai para `/api/transactions`, como hoje. O erro da API aparece no `FormError` e a folha continua aberta. | R2 | T5 `tests/ui/components/TransactionForm.test.tsx` |
| CA10 | O `TransactionsProvider` chama `generate` com o mês local **antes** de `GET /api/transactions`. Se `generate` responder 500 ou falhar na rede, a lista carrega mesmo assim e o estado não vira `error`. | R10 | T5 `tests/ui/context/TransactionsContext.test.tsx` |
| CA11 | Planejar mostra a seção "Todo mês" com as linhas e as situações. Pausar, retomar, editar e encerrar chamam a API certa e atualizam a linha. Excluir pede confirmação. A falha de leitura mostra a mensagem e "Tentar de novo". | R13, R15 | T6 `tests/ui/pages/planning.test.tsx` |
| CA12 | Ponta a ponta: registrar um gasto com "Repetir todo mês"; recarregar a página duas vezes sem duplicar; disparar duas gerações em paralelo pela API e ter um lançamento por mês; pausar e excluir a regra pela seção "Todo mês", com o lançamento continuando em Lançamentos. | R2, R5, R8, R14, R15 | T7 `tests/e2e/18-recurring.spec.ts` |
| CA13 | Dado uma regra com `cardId` e um lançamento já gerado com esse cartão, quando o cartão é excluído (`DELETE /api/credit-cards/:id`), então a regra fica com `cardId` nulo, o lançamento já gerado não muda nos campos da regra (descrição, valor, categoria, data) e a geração do mês seguinte cria o lançamento sem cartão. | R17 | T3 (teste de API em `tests/api/recurring.test.ts`) |

## Validação manual

Registrar em [`../validacao-manual.md`](../validacao-manual.md).

| ID | O que conferir | Requisitos |
|---|---|---|
| VM1 | O usuário aprova o lugar da lista ("Todo mês" em Planejar) e o visual da opção "Repetir todo mês" no formulário, antes de T5 e T6. | R2, R15 |
| VM2 | No PWA instalado, com o app fechado de um mês para o outro, ao abrir no mês novo o aluguel aparece uma vez só. | R5, R10 |
