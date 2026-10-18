# SPEC 007 — Primeiros passos para conta nova

| | |
|---|---|
| Depende de | [001](../001-carga-erros-sessao/spec.md): `status` do `TransactionsContext` e leituras que lançam `ApiError` (K8) |
| Entrega | `src/features/first-steps/` (regras puras, detecção de instalação, "dispensado"), `src/components/FirstSteps/`, `src/app/page.tsx`, guia `src/app/ajuda/page.tsx` (seção Mês), testes em `tests/unit/first-steps/`, `tests/ui/` e `tests/e2e/14-primeiros-passos.spec.ts` |
| Docs de base | [`../visao-geral.md`](../visao-geral.md), [`../contratos.md`](../contratos.md) (K8, consumido), [`../../design/design-spec.md`](../../design/design-spec.md), [`../../PWA.md`](../../PWA.md), [`../../FUNCIONALIDADES.md`](../../FUNCIONALIDADES.md) §0 |

## Objetivo

Quem cria a conta hoje abre um Mês vazio, sem saber por onde começar. Esta spec põe no Mês uma lista curta, "Primeiros passos", com quatro itens. Cada item leva direto à ação e liga à parte certa do guia `/ajuda`. Os itens se marcam sozinhos conforme a pessoa usa o app. A lista pode ser dispensada e some quando não é mais necessária.

## Requisitos

| ID | Requisito |
|---|---|
| R1 | Na tela Mês (`/`), uma seção "Primeiros passos" mostra, nesta ordem, quatro itens: **Registrar o primeiro gasto**, **Criar um orçamento**, **Importar uma fatura** e **Instalar o app**. Cada item aparece como feito ou pendente, de forma acessível: o estado vai no nome acessível, não só no ícone. |
| R2 | "Registrar o primeiro gasto" está feito quando existe ao menos um lançamento do tipo gasto (`getTransactionType(t) === "outcome"`). Uma receita ou um investimento sozinhos não marcam o item. A ação "Registrar gasto" abre a folha com `openNewEntry("outcome")`. Quando o lançamento é salvo, o item fica feito sem recarregar a página. |
| R3 | "Criar um orçamento" está feito quando `GET /api/budgets` devolve ao menos um orçamento, de qualquer mês. A ação leva a `/planning`. |
| R4 | "Importar uma fatura" está feito quando `GET /api/imports` devolve ao menos um lote. A ação leva a `/import`. |
| R5 | "Instalar o app" está feito quando o app roda instalado: `matchMedia("(display-mode: standalone)").matches` ou `navigator.standalone === true` (iOS). Fora disso, inclusive quando não dá para detectar, fica pendente. A ação "Ver como instalar" abre `/ajuda#instalar`, e esse item não tem um "Saiba mais" separado, porque a ação já é o guia. |
| R6 | Os itens 1 a 3 têm um link "Saiba mais" para `/ajuda#registrar`, `/ajuda#planejar` e `/ajuda#importar`. Todo link para o guia abre em nova aba (`target="_blank"`, `rel="noopener noreferrer"`) com o texto acessível "(abre em nova aba)", como os outros links do guia. |
| R7 | O botão "Dispensar" esconde a lista na hora e grava a escolha no aparelho (`localStorage`). Ao recarregar, a lista continua escondida. Se o `localStorage` não estiver disponível ou lançar exceção, a lista fica escondida até recarregar, sem erro na tela. |
| R8 | **Quando aparece.** A lista só é mostrada quando valem todas as condições: <br>- os lançamentos estão em `status === "ready"`; <br>- as leituras de orçamentos e de importações terminaram **com sucesso**; <br>- a lista não foi dispensada neste aparelho; <br>- ao menos um dos três passos de dados (itens 1 a 3) está pendente. <br>Ela nunca aparece enquanto algo carrega nem quando uma dessas leituras falha, então não pisca. |
| R9 | **Quando some.** A lista some sozinha quando os quatro itens estão feitos. Como a instalação nem sempre é detectável (desktop, navegadores sem `display-mode`), ela também some quando os três passos de dados estão feitos. Assim, contas antigas e ativas não passam a ver a lista. |
| R10 | Visual "Caderneta": lista pautada com os tokens de `src/styles/global.ts`, sem card com sombra nem gradiente. A lista fica acima de "Orçamentos" e não muda de lugar ao trocar de mês. O "+ Registrar" da navegação continua sendo o único primário da tela; as ações dos itens são links ou botões discretos. |

## Fora de escopo

- Lista ou tutorial em outras telas além do Mês, e passos além dos quatro.
- Gravar "dispensado" no banco (coluna ou tabela nova): é uma conveniência do aparelho (R7). Em outro aparelho, a lista pode reaparecer enquanto houver passo de dados pendente.
- Botão "Instalar" pelo `beforeinstallprompt`: a ação leva às instruções do guia, como Configurações já faz.
- Mudar o lembrete "A fatura de … ainda não foi importada" ou o vazio "Nada registrado em …": continuam como estão, com o comportamento de erro da 001.
- Estados de carregando e de erro do Mês: são da 001. Esta spec só os consome.
- Novas seções ou âncoras no guia `/ajuda`: são usadas as existentes. Só a seção "Mês" ganha uma frase sobre a lista.
- Mudanças de dados por outras specs (categoria por id, centavos): os critérios usam `getTransactionType` e o tamanho das listas, sem depender desses formatos.

## Critérios de aceite

| ID | Critério | Requisitos cobertos | Verificado por |
|---|---|---|---|
| CA1 | `getFirstSteps({ transactions, budgets, batches, installed })` devolve os 4 itens na ordem de R1. Item 1 fica feito com um gasto; com só receita e investimento, não fica. Item 2 fica feito com ao menos um orçamento, de qualquer mês. Item 3 fica feito com ao menos um lote. Item 4 segue `installed`. | R1–R5 | T1 (`tests/unit/first-steps/steps.test.ts`) |
| CA2 | `shouldShowFirstSteps` devolve `false` em cada um destes casos, e `true` só quando a conta é nova, está tudo carregado e a lista não foi dispensada: <br>- `status` em `loading` ou em `error`; <br>- orçamentos ou importações ainda sem resposta (`null`) ou com erro; <br>- lista dispensada; <br>- os três passos de dados feitos, com ou sem instalação; <br>- os quatro feitos. | R8, R9 | T1 (`tests/unit/first-steps/steps.test.ts`) |
| CA3 | `isAppInstalled()` dá `true` com `matchMedia("(display-mode: standalone)")` verdadeiro e com `navigator.standalone === true`. Dá `false` quando nenhum dos dois vale e quando `matchMedia` não existe. | R5 | T1 (`tests/ui/first-steps/install.test.tsx`, jsdom) |
| CA4 | `readDismissed`/`writeDismissed`: a gravação faz a leitura seguinte dar `true`. Com `localStorage.getItem` e `setItem` lançando exceção, a leitura dá `false` e a gravação não lança. | R7 | T1 (`tests/ui/first-steps/storage.test.tsx`, jsdom) |
| CA5 | O componente `FirstSteps` mostra os 4 itens, com o estado feito ou pendente no nome acessível. "Registrar gasto" chama `openNewEntry("outcome")`. "Criar orçamento" tem `href="/planning"` e "Importar fatura" tem `href="/import"`. Cada "Saiba mais" e "Ver como instalar" tem o `href` da âncora certa, `target="_blank"`, `rel="noopener noreferrer"` e o texto "(abre em nova aba)". "Dispensar" chama `onDismiss`. | R1, R2–R6, R10 | T2 (`tests/ui/components/FirstSteps.test.tsx`) |
| CA6 | O guia `/ajuda` tem seções com `id` `registrar`, `planejar`, `importar` e `instalar`, os destinos dos links. | R6 | T2 (`tests/ui/pages/ajuda.test.tsx`) |
| CA7 | No Mês, todas as leituras com `200 []` mostram "Primeiros passos" com os 4 itens pendentes. Não mostram a lista: <br>- `GET /api/transactions` pendente; <br>- transações em `500`; <br>- `GET /api/imports` em `500`; <br>- `GET /api/budgets` em `500`; <br>- conta com gasto, orçamento e lote. <br>Com `matchMedia` standalone, o item 4 aparece feito. "Dispensar" esconde a lista, e ao montar a página de novo ela continua escondida. | R1, R5, R7, R8, R9 | T3 (`tests/ui/pages/dashboard.test.tsx`) |
| CA8 | No E2E, uma conta nova vê "Primeiros passos" no Mês. Registrar um gasto pela ação do item 1 marca esse item como feito sem recarregar. "Saiba mais" do item 1 tem `href="/ajuda#registrar"` e `target="_blank"`. Depois de "Dispensar" e recarregar, a lista não aparece. Uma conta com gasto, orçamento e importação não vê a lista. | R1, R2, R6, R7, R9 | T4 (`tests/e2e/14-primeiros-passos.spec.ts`) |
| CA9 | `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e` passam. O guia, `docs/FUNCIONALIDADES.md` §0 e `docs/TESTES.md` descrevem a lista. | todos | T5 |

## Validação manual

| Passo | Resultado esperado |
|---|---|
| iPhone (Safari): adicionar o app à Tela de Início com uma conta nova e abrir pelo ícone. | "Instalar o app" aparece feito (`navigator.standalone`). |
| Android (Chrome): instalar o app e abrir pelo ícone. | "Instalar o app" aparece feito (`display-mode: standalone`). |
| No mesmo celular, abrir pelo navegador, sem instalar. | "Instalar o app" aparece pendente, e "Ver como instalar" abre o guia em nova aba na seção "instalar". |
| Rede lenta (DevTools → Slow 3G) com uma conta nova. | A lista não pisca. Ela aparece uma vez, quando tudo carregou. |
| Tema escuro. | A lista fica legível, com os tokens do tema escuro e sem card. |
