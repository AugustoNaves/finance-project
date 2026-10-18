# SPEC 001 — Carregamento, erros de leitura e sessão expirada

| | |
|---|---|
| Depende de | — (onda 1, sozinha) |
| Entrega | `src/services/*.ts` (inclui `http.ts` e o novo `profile.ts`), `src/contexts/TransactionsContenxt.tsx`, `src/components/LoadState/`, páginas autenticadas (`/`, `/transactions`, `/planning`, `/categories`, `/investments`, `/reports`, `/settings`, `/import`), testes em `tests/ui/` e `tests/e2e/12-carga-erros-sessao.spec.ts` |
| Docs de base | [`../visao-geral.md`](../visao-geral.md), [`../contratos.md`](../contratos.md) (**K8 — esta spec é a dona**), [`../../MELHORIAS.md`](../../MELHORIAS.md) (P10, P11, P17, §4 `fetchImportBatches`), [`../../design/design-spec.md`](../../design/design-spec.md), [`../../TESTES.md`](../../TESTES.md) |

## Objetivo

Hoje, uma falha ao ler dados, ou uma sessão que expirou, aparece como "nenhum lançamento". Enquanto os dados chegam, as telas mostram zeros. Quando esta spec terminar, cada tela autenticada vai distinguir quatro situações: **carregando** (esqueleto), **erro** (mensagem e "Tentar de novo"), **vazio** (o convite de hoje) e **com dados**. Uma sessão expirada leva a pessoa ao login, em vez de deixá-la achar que perdeu os dados.

## Requisitos

| ID | Requisito |
|---|---|
| R1 | As funções de leitura de `src/services/*.ts` (`fetchTransactions`, `fetchCategories`, `fetchBudgets`, `fetchGoals`, `fetchImportBatches`, `getCategoryRules` e a nova `fetchProfile` de `GET /api/me`) conferem `response.ok` **antes** de chamar `json()`. Com `!ok`, lançam `ApiError` com o `status` da resposta e a mensagem da API, ou uma mensagem padrão quando o corpo não é JSON ou não traz `error`. |
| R2 | Lista vazia só sai de uma resposta `200` com lista vazia. Uma resposta `200` com corpo que não é lista lança `ApiError`, e uma falha de rede (`fetch` rejeitado) é propagada. Nenhuma leitura devolve `[]` por causa de uma falha. |
| R3 | `src/services/http.ts` exporta `handleUnauthorized()`, que chama `window.location.assign("/login")`. Toda função de serviço, de leitura **ou** de mutação, que recebe `401` passa por esse único ponto antes de lançar o `ApiError`. Várias respostas `401` simultâneas causam **um** redirecionamento. Os outros status (400, 403, 404, 409, 429, 500) não redirecionam. |
| R4 | O `TransactionsContext` expõe `status: "loading" \| "ready" \| "error"`, `error: string \| null` e `retry: () => Promise<void>` (K8). Ele começa em `loading`, vai para `ready` quando a leitura dá certo e para `error`, com a mensagem, quando ela falha. `retry` volta a `loading` e busca de novo. Uma falha de leitura nunca troca a lista atual por `[]`. |
| R5 | Nas páginas públicas (`/login`, `/forgot-password`, `/reset-password`, `/ajuda`, `/offline`), o provider **não** chama `GET /api/transactions`. Por isso, nelas não acontece `401` nem redirecionamento em laço. |
| R6 | O componente `src/components/LoadState` recebe `status`, `error`, `onRetry` e `children`, e opcionalmente o formato do esqueleto. Em `loading`, mostra um esqueleto com `aria-busy="true"` e o texto acessível "Carregando…". Em `error`, mostra a mensagem com `role="alert"` e o botão "Tentar de novo", que chama `onRetry`. Em `ready`, mostra `children`. As cores vêm só dos tokens de `src/styles/global.ts`. |
| R7 | **Mês (`/`).** Enquanto os lançamentos carregam, a tela não mostra "0,00" na sobra nem "Nada registrado em …": mostra o esqueleto. Se a leitura falha, aparece o erro com "Tentar de novo". "Orçamentos" tem estado próprio de carregando e de erro. O lembrete "A fatura de … ainda não foi importada" só aparece quando `GET /api/imports` respondeu com sucesso; se essa leitura falha, o lembrete some e o resto da tela continua funcionando. |
| R8 | **Lançamentos, Investimentos e Relatórios.** Mostram esqueleto em `loading` e erro com "Tentar de novo" em `error`. As mensagens de vazio aparecem só em `ready` com lista vazia. |
| R9 | **Planejar e Categorias.** As leituras próprias de cada tela (orçamentos, categorias e metas; categorias e regras) têm estado de carregando, de erro com "Tentar de novo" e de vazio, separados uns dos outros. Os totais que dependem dos lançamentos seguem o `status` do contexto. |
| R10 | **Configurações.** O perfil é lido por `fetchProfile`; um `401` leva ao login. As linhas "Lançamentos" e "Saldo acumulado" e os botões "Exportar CSV/JSON" ficam em carregando ou erro enquanto `status !== "ready"`. A exportação fica desabilitada fora de `ready`, para nunca gerar um arquivo vazio por causa de uma falha. |
| R11 | **Importar.** A falha ao ler o histórico (`fetchImportBatches`) ou as categorias mostra um erro com "Tentar de novo", em vez de lista vazia. |
| R12 | A animação do esqueleto só roda com `prefers-reduced-motion: no-preference`, como já fazem `ProgressBar` e `CustomModal`. |

## Fora de escopo

- Paginação ou carga por período de `GET /api/transactions` (P13): fora deste ciclo (visão geral).
- Limpar os dados em memória ao sair: o "Sair" já recarrega em `/login`. Nada muda aqui.
- Erros das **mutações** nos formulários (`FormError`): já funcionam. A única mudança nas mutações é passar o `401` por `handleUnauthorized` (R3).
- Revogação de sessão, versão do token e limite de tentativas: são da spec 002 (K7). Esta spec só reage ao `401` que a API devolver.
- Proxy por prefixo (P14) e mudanças em `src/proxy.ts`.
- Modo offline com leitura em cache: o service worker continua sem guardar `/api/*` (PWA.md).
- Outros itens de "Baixa" do MELHORIAS: logout sem tratamento de erro, título fixo "Transações" em Investimentos e itens estáticos de Configurações.
- O lembrete de fatura em si (texto e regra do mês): só passa a respeitar o erro de leitura (R7).

## Critérios de aceite

| ID | Critério | Requisitos cobertos | Verificado por |
|---|---|---|---|
| CA1 | Dado `GET` de cada recurso (transações, categorias, orçamentos, metas, importações, regras, `/api/me`) respondendo `500` com `{ error: "X" }`, quando a função de leitura é chamada, então ela lança `ApiError` com `status 500` e a mensagem "X". Com `500` em HTML, ela lança `ApiError` com a mensagem padrão, sem `SyntaxError`. | R1 | T1 (`tests/ui/services/services.test.tsx`) |
| CA2 | Com `200 []`, cada leitura devolve `[]`. Com `200 { }` (não é lista), lança `ApiError`. Com o `fetch` rejeitado, a rejeição chega a quem chamou. | R2 | T1 (`tests/ui/services/services.test.tsx`) |
| CA3 | Dado `401` numa leitura **e** numa mutação (`createTransaction`), então `window.location.assign` é chamado com `"/login"`. Com duas leituras `401` simultâneas, ele é chamado uma vez. Com `403`, `404` e `500`, ele não é chamado. | R3 | T1 (`tests/ui/services/http.test.tsx`) |
| CA4 | O contexto começa em `status "loading"` e passa a `"ready"` com os dados. Com `500`, passa a `"error"` com a mensagem e não esvazia a lista anterior em um `refreshTransactions` que falha. `retry()` passa por `"loading"` e chega a `"ready"` quando a API volta. | R4 | T2 (`tests/ui/context/TransactionsContext.test.tsx`) |
| CA5 | Com a rota atual em `/login`, `/forgot-password`, `/reset-password`, `/ajuda` ou `/offline`, o provider montado faz **zero** chamadas a `GET /api/transactions`. No E2E, abrir `/login`, `/ajuda` e `/offline` sem sessão não gera requisição a `/api/transactions` e a URL não muda. | R5 | T2 (`TransactionsContext.test.tsx`), T8 (`12-carga-erros-sessao.spec.ts`) |
| CA6 | `LoadState` em `loading` tem `aria-busy="true"` e o texto "Carregando…", e não mostra `children`. Em `error`, mostra um `alert` com a mensagem, e o clique em "Tentar de novo" chama `onRetry` uma vez. Em `ready`, mostra só `children`. | R6 | T3 (`tests/ui/components/LoadState.test.tsx`) |
| CA7 | No Mês, com `GET /api/transactions` pendente, não aparecem "0,00" nem "Nada registrado em outubro.", e aparece o esqueleto. Com `500`, aparecem o alerta e "Tentar de novo", e o clique recarrega e mostra os lançamentos. Com `GET /api/imports` em `500`, não há link "A fatura de outubro ainda não foi importada" e os orçamentos aparecem. Com `GET /api/budgets` em `500`, "Orçamentos" mostra o erro, e não "Nenhum orçamento para outubro.". | R7 | T4 (`tests/ui/pages/dashboard.test.tsx`) |
| CA8 | Em Lançamentos, Investimentos e Relatórios: com a leitura pendente, há esqueleto e nenhuma mensagem de vazio; com `500`, há alerta e "Tentar de novo" e nenhuma mensagem de vazio; com `200 []`, aparece a mensagem de vazio atual. | R8 | T5 (`tests/ui/pages/transactions.test.tsx`, `reports-investments.test.tsx`) |
| CA9 | Em Planejar, com `GET /api/goals` em `500`, a seção de metas mostra o erro e os orçamentos continuam visíveis; "Tentar de novo" refaz só a leitura que falhou. Em Categorias, com `GET /api/categories` em `500`, as abas mostram o erro em vez do texto de vazio; com `GET /api/category-rules` em `500`, a aba Regras mostra o erro. | R9 | T6 (`tests/ui/pages/planning.test.tsx`, `categories.test.tsx`, `category-rules.test.tsx`) |
| CA10 | Em Configurações, com `GET /api/transactions` pendente ou em `500`, os botões "Exportar CSV" e "Exportar JSON" ficam desabilitados e "Lançamentos" não mostra "0". Com `GET /api/me` em `401`, `window.location.assign("/login")` é chamado. Com `/api/me` em `500`, aparece "Indisponível", como hoje. | R10, R3 | T7 (`tests/ui/pages/settings.test.tsx`) |
| CA11 | Em Importar, com `GET /api/imports` em `500` (JSON ou HTML), o histórico mostra o erro com "Tentar de novo", e o clique refaz a leitura e mostra a lista. Com `GET /api/categories` em `500`, aparece o erro de categorias em vez de uma pré-visualização sem categorias. | R11 | T6 (`tests/ui/pages/import.test.tsx`) |
| CA12 | No E2E, com `GET /api/transactions` interceptado para `500`, o Mês mostra o erro; ao liberar a rota e tocar em "Tentar de novo", os lançamentos aparecem. Com o cookie de sessão trocado por um forjado (assinatura inválida) depois de a página carregar, salvar um lançamento pela folha leva a `/login`. Com cookie expirado, abrir `/` leva a `/login`. | R3, R4, R7 | T8 (`tests/e2e/12-carga-erros-sessao.spec.ts`) |
| CA13 | `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e` passam, e `docs/API.md`, `docs/FUNCIONALIDADES.md` e `docs/TESTES.md` descrevem os estados e o redirecionamento. | todos | T9 |

## Validação manual

| Passo | Resultado esperado |
|---|---|
| No celular, com "Reduzir movimento" ligado, abrir o Mês com a rede lenta (DevTools → Slow 3G). | O esqueleto aparece **parado**, sem pulsar. Com o ajuste desligado, ele pulsa (R12). |
| Num navegador logado, apagar o cookie `session_token` pelo DevTools e tocar em "Tentar de novo" ou salvar um lançamento. | Vai para `/login` uma vez, sem piscar nem entrar em laço. |
| Abrir o Mês no tema escuro, com erro forçado (DevTools → bloquear `/api/transactions`). | A mensagem e o botão "Tentar de novo" ficam legíveis nos tokens do tema escuro. |
