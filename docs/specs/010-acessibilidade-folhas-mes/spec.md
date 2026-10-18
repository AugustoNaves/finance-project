# SPEC 010 — Acessibilidade das folhas e seletor de mês

| | |
|---|---|
| Depende de | — (onda 2, em paralelo com 002 e 007) |
| Entrega | `src/components/CustomModal` (foco e `inert`); novo `src/components/MonthPicker` (`index.tsx` + `styles.ts`); `src/components/PeriodFilter`; seletor de mês de `src/app/planning/page.tsx` e `styles.ts`; testes em `tests/ui/components`, `tests/ui/pages/{planning,reports-investments}.test.tsx` e `tests/e2e` |
| Docs de base | [`visao-geral.md`](../visao-geral.md), [`contratos.md`](../contratos.md) (K10, dono), [`fatos-verificados.md`](../fatos-verificados.md), [`../../design/design-spec.md`](../../design/design-spec.md), [`../../FUNCIONALIDADES.md`](../../FUNCIONALIDADES.md) §0 e §5.4, [`../../MELHORIAS.md`](../../MELHORIAS.md) P16 e §4, [`../../TESTES.md`](../../TESTES.md) |

## Objetivo

Quem usa teclado ou leitor de tela passa a conseguir usar as folhas do app sem se perder: ao abrir, o foco vai para dentro da folha; Tab não escapa para a página de trás; ao fechar, o foco volta para o botão que a abriu. E o mês de Relatórios e Planejar passa a ser escolhido num seletor próprio (grade de meses com setas de ano), que funciona igual no Safari de desktop, no Firefox e no celular, em vez do `<input type="month">` invisível que vira texto em alguns navegadores.

## Requisitos

| ID | Requisito |
|---|---|
| R1 | Ao abrir, o `CustomModal` põe o foco no elemento do conteúdo marcado com `data-autofocus`; sem ele, no primeiro elemento focável do conteúdo (o ✕ do cabeçalho não conta); sem nenhum, no próprio diálogo (`tabIndex={-1}`). |
| R2 | Enquanto aberto, Tab no último elemento focável do diálogo vai para o primeiro (o ✕), e Shift+Tab no primeiro vai para o último; o foco nunca sai do diálogo do topo. |
| R3 | Enquanto aberto, todo filho do `<body>` que não seja o diálogo do topo recebe o atributo `inert`; ao fechar ou desmontar, o atributo é retirado só dos elementos em que o modal o pôs (quem já era `inert` continua). |
| R4 | Ao fechar por qualquer caminho (✕, `Esc`, clique no fundo, `onClose` chamado pela tela depois de salvar), o foco volta ao elemento que estava focado quando a folha abriu, se ele ainda estiver no documento e não estiver `inert`; se não estiver, nenhum erro é lançado e o foco não fica num elemento removido. |
| R5 | Com folhas empilhadas (confirmação de exclusão sobre a folha de edição), a de baixo fica `inert` enquanto a de cima está aberta; ao fechar a de cima, a de baixo volta a ser interativa e o foco volta ao botão que abriu a de cima (ex.: "Excluir"). `Esc` continua fechando só a do topo. |
| R6 | A folha "Mais", a folha Registrar/Editar e os diálogos de confirmação (`ConfirmDialog`) herdam R1–R5 sem código próprio de foco. Na confirmação, o foco inicial é "Cancelar" (primeiro focável). |
| R7 | A API do `CustomModal` não muda (`isOpen`, `onClose`, `title`, `maxWidth`, `children`), nem o `role="dialog"`, `aria-modal`, nome acessível, travamento do scroll e `Esc` de hoje. |
| R8 | Novo componente `MonthPicker` (`value`/`onChange` em `YYYY-MM`, `id`, rótulo associado) mostra um gatilho com o mês por extenso ("Outubro de 2026") que expõe o valor `YYYY-MM` aos testes e, ao ser ativado (clique, Enter ou Espaço), abre uma folha `CustomModal` "Escolher mês" com o ano, as setas "Ano anterior" e "Próximo ano" e a grade dos 12 meses (abreviados na tela, nome acessível completo, ex.: "outubro de 2026"); o mês selecionado fica marcado com `aria-current="date"`. |
| R9 | Na folha, o foco inicial é o mês selecionado (se o ano exibido for o do valor) ou janeiro; setas ← → movem um mês, ↑ ↓ movem uma linha da grade (3 colunas × 4 linhas) sem sair do ano exibido, Home/End vão para janeiro/dezembro, PageUp/PageDown trocam o ano; Enter ou Espaço escolhem o mês, chamam `onChange` com `YYYY-MM`, fecham a folha e devolvem o foco ao gatilho; `Esc` fecha sem chamar `onChange`. |
| R10 | O `MonthPicker` nunca emite valor vazio nem fora do formato `YYYY-MM`; trocar de ano sem escolher mês não altera o valor. |
| R11 | Relatórios (`PeriodFilter`, rótulo "Período", `id="reports-period"`) e Planejar (rótulo "Mês", `id="planning-month-filter"`) usam o `MonthPicker` no lugar do `<input type="month">`; as setas "Mês anterior"/"Próximo mês" continuam como estão e no mesmo lugar, qualquer que seja o nome do mês. |
| R12 | O gatilho e as células da grade têm alvo mínimo de 44 px, foco visível e usam só os tokens de `src/styles/global.ts` (claro e escuro); no celular (< 960 px) a escolha acontece na folha inferior, sem rolagem horizontal em 390 px. |

## Fora de escopo

- Campos de mês visíveis em formulários (`BudgetForm`, mês de referência em Importar): continuam `<input type="month">`; são editáveis como texto mesmo onde o seletor nativo não existe. Se virarem problema, entram numa spec própria reaproveitando o `MonthPicker`.
- Seletor de **data** (dia) nos formulários e nos filtros De/Até de Lançamentos.
- Seletor de mês da tela Mês (`MonthSwitcher`): só tem setas, sem campo, e não muda.
- Limites de período (mês mínimo/máximo) no `MonthPicker`.
- Mudanças visuais nas folhas além do foco visível, e animações.
- Auditoria completa de acessibilidade do app (contraste, rótulos de gráficos): esta spec cobre P16 e o seletor de mês.
- Erros de carga e sessão expirada: spec [001](../001-carga-erros-sessao/spec.md).

## Critérios de aceite

| ID | Critério | Requisitos cobertos | Verificado por |
|---|---|---|---|
| CA1 | Dado um `Modal` com um formulário, quando abre, então o foco está no primeiro campo (não no ✕); com um elemento `data-autofocus`, nele; sem focáveis no conteúdo, no próprio diálogo. | R1, R7 | T1 (`tests/ui/components/modal-focus.test.tsx`) |
| CA2 | Dado um `Modal` aberto, quando Tab é pressionado no último focável, então o foco vai para o ✕; Shift+Tab no ✕ vai para o último; nenhuma sequência de Tab foca o botão de fora. | R2 | T1 (`tests/ui/components/modal-focus.test.tsx`) |
| CA3 | Dado um botão que abre o `Modal`, quando a folha fecha por ✕, `Esc`, clique no fundo ou `onClose` externo, então o foco volta ao botão; se o botão foi removido enquanto a folha estava aberta, o fechamento não lança erro e `document.activeElement` é o `body`. | R4 | T1 (`tests/ui/components/modal-focus.test.tsx`) |
| CA4 | Dado um `Modal` aberto, então os outros filhos do `body` têm `inert` e o diálogo não; ao fechar, nenhum tem `inert`, exceto um elemento que já era `inert` antes de abrir. | R3 | T2 (`tests/ui/components/modal-focus.test.tsx`) |
| CA5 | Dadas duas folhas empilhadas, então a de baixo tem `inert` enquanto a de cima está aberta; `Esc` fecha só a de cima, a de baixo perde o `inert` e o foco volta ao botão que abriu a de cima. | R5 | T2 (`tests/ui/components/modal-focus.test.tsx`) |
| CA6 | Dada a `ConfirmDialog`, quando abre, o foco está em "Cancelar"; dada a navegação, quando "Mais" abre a folha, o foco está no primeiro link e, ao fechar com `Esc`, volta ao botão "Mais". Os testes existentes de `Modal`, `ConfirmDialog` e `AppNavigation` continuam passando. | R6, R7 | T2 (`tests/ui/components/modal-navigation.test.tsx`) |
| CA7 | Dado `MonthPicker` com `2026-10`, então o gatilho mostra "Outubro de 2026", tem o rótulo informado e expõe `2026-10`; quando ativado, abre a folha "Escolher mês" com "2026", 12 meses e "outubro de 2026" com `aria-current="date"` e com o foco. | R8, R9 | T3 (`tests/ui/components/month-picker.test.tsx`) |
| CA8 | Dada a folha aberta em outubro de 2026, então → foca "novembro de 2026", ← volta a outubro, ↑ foca "julho de 2026", ↓ a partir de outubro (última linha) não muda o foco, Home foca janeiro, End foca dezembro, PageDown mostra 2027 com o foco no mesmo mês; Enter em novembro chama `onChange("2026-11")`, fecha e devolve o foco ao gatilho; `Esc` fecha sem `onChange`. | R9, R10 | T3 (`tests/ui/components/month-picker.test.tsx`) |
| CA9 | Dada a folha aberta, quando "Próximo ano" e depois "jan." são clicados, então `onChange("2027-01")`; quando "Próximo ano" é clicado e a folha é fechada sem escolher, `onChange` não é chamado. | R8, R10 | T3 (`tests/ui/components/month-picker.test.tsx`) |
| CA10 | Dadas as telas Relatórios e Planejar, então não existe `input[type="month"]` nelas; escolher setembro de 2026 pelo seletor troca o conteúdo da tela (balanço do período; orçamentos do mês); as setas continuam trocando o mês e virando o ano. | R11 | T4 (`tests/ui/pages/reports-investments.test.tsx`, `tests/ui/pages/planning.test.tsx`, `tests/ui/components/modal-navigation.test.tsx`) |
| CA11 | Dado o app no Chromium do E2E, quando a folha Registrar abre pelo botão da coluna, então o foco está dentro do diálogo; 15 Tabs seguidos nunca focam elemento fora dele; `main` tem `inert`; `Esc` fecha e o foco volta ao botão "Registrar". Na edição, "Excluir" abre a confirmação com foco em "Cancelar", e `Esc` devolve o foco a "Excluir". | R1–R6 | T5 (`tests/e2e/13-acessibilidade-folhas-mes.spec.ts`) |
| CA12 | Dado o E2E, quando a pessoa escolhe setembro de 2026 em Relatórios pelo mouse e julho de 2026 em Planejar só pelo teclado, então as telas mostram os dados desses meses e o gatilho expõe `2026-09`/`2026-07`; os testes que preenchiam o campo com `.fill("AAAA-MM")` (`05-budgets`, `07-investments-reports-settings`, `10-dates-timezone`) passam usando o seletor. | R8, R9, R11 | T5 (`tests/e2e/13-acessibilidade-folhas-mes.spec.ts` e os três arquivos citados) |
| CA13 | O teste "setas de mês ficam no mesmo lugar qualquer que seja o nome do mês" de `tests/e2e/03-dashboard.spec.ts` passa **sem alteração**. | R11 | T5 (`npx playwright test tests/e2e/03-dashboard.spec.ts`) |
| CA14 | Dado o viewport de 390 × 844, quando o seletor abre em Planejar, então a grade cabe inteira na largura (nenhuma célula além de 390 px) e cada célula tem pelo menos 44 × 44 px. | R12 | T5 (`tests/e2e/13-acessibilidade-folhas-mes.spec.ts`) |
| CA15 | `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e` passam com a spec inteira aplicada. | todos | T6 |


## Validação manual

| ID | O que conferir | Quem | Requisitos |
|---|---|---|---|
| VM1 | Safari de desktop (macOS): Relatórios e Planejar abrem o seletor, escolhem mês por mouse e teclado; folha Registrar prende o foco e devolve ao fechar. | Usuário | R2, R4, R8, R11 |
| VM2 | iPhone (Safari e app instalado) com VoiceOver: a folha "Mais" e a de Registrar anunciam o título, o gesto de varrer não sai da folha (efeito do `inert`), e o seletor de mês lê "outubro de 2026, atual". | Usuário | R3, R8, R12 |
| VM3 | Firefox desktop: mesmo roteiro do VM1. | Usuário | R8, R11 |
