# Tasks — SPEC 010

Executar na ordem. Cada task só fecha quando os comandos de "Pronto quando" passam e o resultado está registrado em `downhill.md`. O **como** de cada task está em `uphill.md`.

| ID | Task | Depende de | Cobre | Status |
|---|---|---|---|---|
| T1 | `CustomModal`: foco inicial, foco preso e devolução do foco | — | R1, R2, R4, R7, CA1, CA2, CA3 | ⬜ |
| T2 | `CustomModal`: fundo `inert` e folhas empilhadas; "Mais" e confirmação | T1 | R3, R5, R6, R7, CA4, CA5, CA6 | ⬜ |
| T3 | Componente `MonthPicker` | T2 | R8, R9, R10, R12, CA7, CA8, CA9 | ⬜ |
| T4 | `MonthPicker` em Relatórios e Planejar | T3 | R11, CA10 | ⬜ |
| T5 | E2E: folhas acessíveis, seletor de mês e migração dos testes de mês | T4 | R1–R6, R8, R9, R11, R12, CA11, CA12, CA13, CA14 | ⬜ |
| T6 | Documentação, guia e verificação completa | T5 | CA15 | ⬜ |

## T1 — Foco inicial, foco preso e devolução do foco

- **Entrega:** `src/components/CustomModal/index.tsx` (e `style.ts` só se o diálogo precisar de `outline` ao receber foco); novo `tests/ui/components/modal-focus.test.tsx`.
- **Objetivo:** ao abrir, o foco entra na folha; Tab circula dentro dela; ao fechar, volta ao elemento de origem — sem mudar a API do componente.
- **Pronto quando:**
  - `npx vitest run tests/ui/components/modal-focus.test.tsx` passa com: foco no primeiro campo do conteúdo (não no ✕); `data-autofocus` vence; conteúdo sem focáveis foca o diálogo (CA1); Tab no último vai para o ✕, Shift+Tab no ✕ vai para o último, 10 Tabs seguidos não focam o botão de fora (CA2); fechar por ✕, `Esc`, fundo e `onClose` externo (rerender com `isOpen=false`) devolve o foco ao botão de origem; botão removido durante a folha aberta → sem erro e foco no `body` (CA3).
  - `npx vitest run tests/ui/components/modal-navigation.test.tsx` continua passando sem alterar os casos de `Modal` (R7).
  - `npm run lint && npm run typecheck` passam.

## T2 — Fundo `inert` e folhas empilhadas

- **Entrega:** `src/components/CustomModal/index.tsx` (marca/desmarca `inert` nos irmãos do diálogo do topo, guardando quem já era `inert`; integra com a pilha `openModals` existente); casos novos em `tests/ui/components/modal-focus.test.tsx` e em `tests/ui/components/modal-navigation.test.tsx` (ConfirmDialog e AppNavigation).
- **Objetivo:** o resto da página fica fora do alcance do teclado e do leitor de tela enquanto a folha está aberta, inclusive com uma folha sobre outra.
- **Pronto quando:**
  - `npx vitest run tests/ui/components/modal-focus.test.tsx` passa com: irmãos do diálogo com `inert` e o diálogo sem; nenhum `inert` depois de fechar, exceto o elemento que já era `inert` (CA4); duas folhas: a de baixo `inert` enquanto a de cima está aberta, `Esc` fecha só a de cima, a de baixo perde `inert` e o foco volta ao botão que abriu a de cima; desmontar a de cima sem fechar (troca de tela) também limpa (CA5).
  - `npx vitest run tests/ui/components/modal-navigation.test.tsx` passa com os casos novos: `ConfirmDialog` abre com foco em "Cancelar"; "Mais" abre com foco no primeiro link e `Esc` devolve o foco ao botão "Mais" (CA6), e todos os casos antigos.
  - `npx vitest run tests/ui` passa inteiro (folha Registrar/Editar, Categorias, Planejar e Importar usam o `Modal`).
  - `npm run lint && npm run typecheck` passam.

## T3 — Componente `MonthPicker`

- **Entrega:** `src/components/MonthPicker/index.tsx` e `styles.ts` (`"use client"`, gatilho + folha `CustomModal` "Escolher mês" com ano, "Ano anterior"/"Próximo ano" e grade 3 × 4); novo `tests/ui/components/month-picker.test.tsx`.
- **Objetivo:** um seletor de mês que funciona igual em qualquer navegador, por mouse, toque e teclado, com valor sempre em `YYYY-MM`.
- **Pronto quando:**
  - `npx vitest run tests/ui/components/month-picker.test.tsx` passa com: gatilho "Outubro de 2026" com o rótulo dado e valor `2026-10` exposto; ativar por clique, Enter e Espaço abre "Escolher mês" com "2026", 12 meses e "outubro de 2026" com `aria-current="date"` e foco (CA7); teclado → ← ↑ ↓ Home End PageDown/PageUp conforme CA8; Enter em novembro → `onChange("2026-11")`, folha fechada e foco no gatilho; `Esc` fecha sem `onChange` (CA8); "Próximo ano" + "jan." → `onChange("2027-01")`; trocar o ano e fechar sem escolher não chama `onChange`; nunca emite string vazia (CA9).
  - O componente só usa tokens de `src/styles/global.ts` (`grep -nE "#[0-9a-fA-F]{3,6}" src/components/MonthPicker/styles.ts` vazio) e as células têm `min-height`/`min-width` de 44 px (R12).
  - `npm run lint && npm run typecheck` passam.

## T4 — `MonthPicker` em Relatórios e Planejar

- **Entrega:** `src/components/PeriodFilter/index.tsx` e `styles.ts` (sem `Input`/`openPicker`; rótulo "Período", `id="reports-period"`); `src/app/planning/page.tsx` e `styles.ts` (sem `MonthInput`/`openMonthPicker`; rótulo "Mês", `id="planning-month-filter"`; `MonthStep` intactos); `tests/ui/components/modal-navigation.test.tsx` (bloco `PeriodFilter`), `tests/ui/pages/reports-investments.test.tsx`, `tests/ui/pages/planning.test.tsx` migrados de `fireEvent.change` para o seletor.
- **Objetivo:** trocar o campo nativo invisível pelo seletor próprio sem mexer nas setas nem no layout da barra do mês.
- **Pronto quando:**
  - `npx vitest run tests/ui/components/modal-navigation.test.tsx tests/ui/pages/reports-investments.test.tsx tests/ui/pages/planning.test.tsx` passa com: nenhum `input[type="month"]` em Relatórios e Planejar; escolher setembro de 2026 pelo seletor muda o balanço do período e os orçamentos exibidos; as setas trocam o mês e viram o ano (CA10). O caso antigo "string vazia ao limpar" é removido (R10 torna o vazio impossível) e isso fica anotado no `downhill.md`.
  - `npm run lint && npm run typecheck` passam.

## T5 — E2E

- **Entrega:** novo `tests/e2e/13-acessibilidade-folhas-mes.spec.ts`; `tests/e2e/05-budgets.spec.ts`, `tests/e2e/07-investments-reports-settings.spec.ts`, `tests/e2e/10-dates-timezone.spec.ts` (troca de `.fill("AAAA-MM")`/`toHaveValue` pelo seletor e pelo valor exposto no gatilho); se útil, um helper **novo** `chooseMonth(page, label, "AAAA-MM")` em `tests/e2e/support/ui.ts` (só acrescentado).
- **Objetivo:** provar no navegador real o que o jsdom não prova (`inert` e ordem de Tab) e manter a suíte existente verde com o seletor novo.
- **Pronto quando:**
  - `npx playwright test tests/e2e/13-acessibilidade-folhas-mes.spec.ts` passa com: folha Registrar com foco dentro, 15 Tabs sem sair do diálogo, `main` com `inert`, `Esc` devolve o foco a "Registrar"; "Excluir" na edição abre a confirmação com foco em "Cancelar" e `Esc` devolve o foco a "Excluir" (CA11); setembro de 2026 em Relatórios pelo mouse e julho de 2026 em Planejar só pelo teclado, com os dados do mês na tela e o valor exposto no gatilho (CA12); em 390 × 844 a grade cabe na largura e cada célula tem ≥ 44 × 44 px (CA14).
  - `npx playwright test tests/e2e/05-budgets.spec.ts tests/e2e/07-investments-reports-settings.spec.ts tests/e2e/10-dates-timezone.spec.ts` passa (CA12).
  - `npx playwright test tests/e2e/03-dashboard.spec.ts` passa e `git diff --stat tests/e2e/03-dashboard.spec.ts` está vazio (CA13).

## T6 — Documentação, guia e verificação completa

- **Entrega:** `docs/FUNCIONALIDADES.md` §0 (Relatórios e Planejar: seletor de mês com grade; folhas com foco preso e devolvido) e §5.4 (itens de foco resolvidos); `docs/TESTES.md` (o que `modal-focus`, `month-picker` e o E2E 12 cobrem; limite do jsdom com `inert`); `docs/MELHORIAS.md` (P16 e o item de §4 marcados como aplicados); `docs/design/design-spec.md` se registrar o padrão do seletor; guia `/ajuda` (partes "Planejar" e "Relatórios": "toque no mês para escolher") e capturas regravadas.
- **Objetivo:** documentação igual ao comportamento e a spec inteira provada.
- **Pronto quando:**
  - `npm run lint && npm run typecheck && npm test` passam.
  - `npm run test:e2e` passa.
  - `npx vite-node tests/ajuda/capturas.ts` roda sem erro e as capturas que mudaram (Planejar, Relatórios e as folhas, se o anel de foco aparecer) estão no commit.

## Fatos verificados

| Fato | Onde |
|---|---|
| VERIFICADO — `CustomModal` renderiza `null` fechado, usa portal no `body`, `role="dialog"`, `aria-modal`, `aria-label={title}`, ✕ com "Fechar"; trava o scroll; pilha `openModals` para `Esc` fechar só o topo | `src/components/CustomModal/index.tsx:12`, `:29-46`, `:54-72`, `:74-98` |
| VERIFICADO — `CustomModal` não move foco nem usa `inert` (nenhum `.focus(` nem `inert` em `src/components`) | `grep -rn "\.focus(\|inert" src` → só `planning/page.tsx:240`, `PeriodFilter/index.tsx:31`, `categories/page.tsx:241` |
| VERIFICADO — A folha "Mais" é um `Modal`; o botão "Mais" tem `aria-expanded` e `aria-haspopup="dialog"`; fechada, a folha não existe no DOM (a parte "drawer alcançável quando fechado" do P16 já foi resolvida pelo redesign) | `src/components/AppNavigation/index.tsx:162-201` |
| VERIFICADO — `ConfirmDialog` é um `Modal` com "Cancelar" antes do botão de confirmar | `src/components/ConfirmDialog/index.tsx:47-60` |
| VERIFICADO — A confirmação "Excluir" da edição é um segundo `Modal` (folhas empilhadas) | `src/contexts/EntrySheetContext.tsx:71-91`, `src/components/TransactionForm/index.tsx:304` |
| VERIFICADO — Outros usuários do `Modal`: Categorias, Planejar, Importar, `NewTransactionModal`, `TransactionForm` | `grep -rln CustomModal src` |
| VERIFICADO — `PeriodFilter`: rótulo "Período" para `id="reports-period"`, `<input type="month">` invisível sobre o texto do mês, setas "Mês anterior"/"Próximo mês" fora do campo; vazio é repassado ao `onChange` | `src/components/PeriodFilter/index.tsx:36-59`, `styles.ts:19-81` |
| VERIFICADO — Planejar: `MonthInput` `id="planning-month-filter"`, `aria-label="Mês"`, invisível (`opacity: 0`), setas `MonthStep`; vazio volta para o mês atual | `src/app/planning/page.tsx:232-242`, `:263-290`; `src/app/planning/styles.ts:97-111` |
| VERIFICADO — Outros `type="month"` visíveis (fora de escopo): `BudgetForm` e Importar | `src/components/BudgetForm/index.tsx:127`, `src/app/import/page.tsx:578` |
| VERIFICADO — Testes que dependem do campo nativo: UI `getByLabelText("Período")` com `toHaveValue`/`fireEvent.change` e `type="month"`; Planejar por `getElementById("planning-month-filter")`; E2E com `toHaveValue` e `.fill()` | `tests/ui/components/modal-navigation.test.tsx:415-447`; `tests/ui/pages/reports-investments.test.tsx:50-187`; `tests/ui/pages/planning.test.tsx:24`; `tests/e2e/05-budgets.spec.ts:9,33,196,212,217`; `tests/e2e/07-investments-reports-settings.spec.ts:139,194,206,209`; `tests/e2e/10-dates-timezone.spec.ts:113,117,197,205` |
| VERIFICADO — Teste "setas de mês ficam no mesmo lugar" cobre `/` e `/planning`, medindo o `x` das setas em outubro, novembro e julho | `tests/e2e/03-dashboard.spec.ts:149-174` |
| VERIFICADO — jsdom 30.1.2 não aplica `inert` ao foco (TODO no código) e não expõe a propriedade `inert` gerada | `node_modules/jsdom/lib/jsdom/living/helpers/focusing.js:18`, `:168`; `grep inert node_modules/jsdom/lib/jsdom/living/generated/HTMLElement.js` vazio |
| VERIFICADO — React 19.2 e Playwright 1.64 no projeto | `package.json` |
| VERIFICADO — Folha inferior no celular e diálogo a partir de 960 px | `src/components/CustomModal/style.ts:5-51` |
| NÃO VERIFICADO — Suporte a `inert` no Safari iOS alvo (15.5+ pela documentação pública) e comportamento do VoiceOver | incógnita (a), VM2 |
| NÃO VERIFICADO — `toHaveValue` (jest-dom e Playwright) aceita `<button>`; se não aceitar, os testes que leem o valor precisam de outra forma | incógnita (c) |

## Incógnitas iniciais para o uphill

- **(a) `inert` no jsdom e no Safari iOS.** jsdom 30 só guarda o atributo (não bloqueia foco): os testes de UI afirmam o atributo e a armadilha de Tab precisa funcionar **sem depender** de `inert` (handler de Tab próprio). O efeito real fica no E2E (Chromium) e na validação manual (Safari). Confirmar na doc do WebKit/MDN a versão mínima do Safari iOS com `inert` e decidir se precisa de alternativa (`aria-hidden` nos irmãos) para versões anteriores.
- **(b) Folha ou popover.** Proposta da spec: o `MonthPicker` abre um `CustomModal` (folha inferior no celular, diálogo no desktop), herdando foco preso e `inert` da T1/T2 sem código novo. Avaliar no uphill se um popover ancorado no desktop seria melhor e o custo (posicionamento, foco, `inert` próprio); o K10 aceita os dois. Decidir também se o título da folha é "Escolher mês" ou o rótulo do campo ("Período"/"Mês").
- **(c) Rótulos, ids e valor exposto.** Manter `getByLabel("Período")` e `#planning-month-filter` no gatilho. O gatilho é `<button>` (rótulo por `<label htmlFor>` funciona) com o valor em `value`/`data-value`, ou `<input readonly>` com papel de combobox (mantém `toHaveValue`, mas `.fill()` falha por ser somente leitura)? Medir quantas asserções mudam em cada opção e escolher a que preserva o nome acessível do campo.
- **(d) Elemento de origem que some.** Fechar a folha de edição depois de excluir remove a linha que a abriu: confirmar que o foco cai no `body` sem erro e se vale mandar para o `<main>`/título da tela (exigiria `tabIndex={-1}`; não está na spec).
- **(e) `inert` e o portal.** O diálogo é portado para o `body`; os irmãos são a raiz do Next e portais de outras bibliotecas (ex.: tooltip do recharts, `ServiceWorkerRegister`). Conferir que nenhum elemento necessário fica `inert` e que o estado é restaurado com React Compiler/Strict Mode (efeitos rodando duas vezes no dev).
- **(f) Mês nas bordas do ano.** ← em janeiro e → em dezembro: param no ano ou trocam de ano? A spec só fixa ↑/↓; decidir e testar.
- **(g) Capturas do guia.** O foco inicial pode deixar um anel de foco visível nas capturas das folhas (`tests/ajuda/capturas.ts`); decidir se o anel aparece só com `:focus-visible` (teclado) para não mudar as capturas tiradas por clique.
- **(h) Folha sobre a folha.** O `MonthPicker` em Planejar abre sobre a página, mas não sobre outra folha; confirmar que nenhuma tela o usa dentro de um `Modal` (senão a pilha da T2 precisa cobrir).

## Questões para o orquestrador

> **Decididas no portão do topo (18/10/2026).** As decisões estão em [`../README.md`](../README.md#portão-do-topo--decisões-18102026) e já constam em [`../contratos.md`](../contratos.md); o texto abaixo fica como histórico.
1. **Número do arquivo E2E novo.** A spec usa `tests/e2e/13-acessibilidade-folhas-mes.spec.ts`. Outras specs da onda 2 podem criar arquivos `12-*`; o número não afeta a execução (o Playwright roda tudo), mas convém o orquestrador fixar a numeração para evitar dois `12-`.
2. **Testes E2E existentes alterados.** A 010 precisa editar `05-budgets`, `07-investments-reports-settings` e `10-dates-timezone` (trocar `.fill()` no campo de mês pelo seletor). A 004 (mesma onda) também pode tocar `05-budgets` (valores de orçamento). Proposta: a 010 altera só as linhas do campo de mês e usa o helper novo `chooseMonth`; quem descer depois faz o rebase.
