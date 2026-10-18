# Tasks — SPEC 001

Executar na ordem. Cada task só fecha quando os comandos de "Pronto quando" passam e o resultado está registrado em `downhill.md`. O **como** de cada task está em `uphill.md`.

| ID | Task | Depende de | Cobre | Status |
|---|---|---|---|---|
| T1 | Serviços de leitura lançam `ApiError`; `handleUnauthorized` único; `fetchProfile` | — | R1, R2, R3, CA1, CA2, CA3 | ⬜ |
| T2 | `TransactionsContext` com `status`/`error`/`retry` e sem leitura nas páginas públicas | T1 | R4, R5, CA4, CA5 | ⬜ |
| T3 | Componente `LoadState` (esqueleto, erro e "Tentar de novo") | — | R6, R12, CA6 | ⬜ |
| T4 | Mês: esqueleto, erro, orçamentos e lembrete de fatura independentes | T1, T2, T3 | R7, CA7 | ⬜ |
| T5 | Lançamentos, Investimentos e Relatórios distinguem carregando, erro e vazio | T2, T3 | R8, CA8 | ⬜ |
| T6 | Planejar, Categorias e Importar com erro e "Tentar de novo" por leitura | T1, T2, T3 | R9, R11, CA9, CA11 | ⬜ |
| T7 | Configurações: `fetchProfile` e exportação só com dados prontos | T1, T2, T3 | R10, CA10 | ⬜ |
| T8 | E2E de erro de leitura, sessão inválida e páginas públicas | T4, T7 | CA5, CA12 | ⬜ |
| T9 | Documentação e verificação completa | T1–T8 | CA13 | ⬜ |

## T1 — Serviços de leitura e `handleUnauthorized`

- **Entrega:**
  - `src/services/http.ts`: `handleUnauthorized()` e o ponto onde o `401` passa por ela.
  - `src/services/{transactions,categories,budgets,goals,imports,categoryRules}.ts`: leituras.
  - `src/services/profile.ts` (novo): `fetchProfile()`.
  - `tests/ui/services/services.test.tsx`, `tests/ui/services/category-rules.test.tsx` e `tests/ui/services/http.test.tsx` (novo).
- **Objetivo:** nenhuma leitura transforma falha em lista vazia, e todo `401` de serviço leva a `/login` por um só ponto.
- **Pronto quando:**
  - `npx vitest run tests/ui/services` passa, com casos para cada leitura:
    - `500` em JSON → `ApiError(500, msg da API)`;
    - `500` em HTML → `ApiError` com a mensagem padrão;
    - `200 []` → `[]`;
    - `200 {}` → `ApiError`;
    - rede rejeitada → a rejeição é propagada.
  - Os testes `[comportamento atual]` e "devolve [] quando a API responde erro" foram **reescritos** para o comportamento novo, e não apagados.
  - O mesmo comando cobre o `http.test.tsx`:
    - `401` em leitura e em `createTransaction` chamam `location.assign("/login")`;
    - duas leituras `401` simultâneas chamam uma vez;
    - `403`, `404` e `500` não chamam.

## T2 — Estado de carga no `TransactionsContext`

- **Entrega:** `src/contexts/TransactionsContenxt.tsx` (sem renomear o arquivo) e `tests/ui/context/TransactionsContext.test.tsx`.
- **Objetivo:** expor `status`, `error` e `retry` (K8) e não buscar lançamentos nas páginas públicas.
- **Pronto quando:**
  - `npx vitest run tests/ui/context/TransactionsContext.test.tsx` passa, com os casos:
    - `loading` → `ready`;
    - `500` → `error` com a mensagem;
    - `refreshTransactions` com falha mantém a lista anterior;
    - `retry` passa por `loading` e chega a `ready`;
    - para cada rota pública (`/login`, `/forgot-password`, `/reset-password`, `/ajuda`, `/offline`), zero chamadas a `GET /api/transactions`.
  - `npm run typecheck` passa, com todos os consumidores do contexto compilando.

## T3 — Componente `LoadState`

- **Entrega:** `src/components/LoadState/index.tsx`, `src/components/LoadState/styles.ts` e `tests/ui/components/LoadState.test.tsx`.
- **Objetivo:** um único componente para esqueleto, erro com "Tentar de novo" e conteúdo, no padrão "Caderneta" (tokens CSS, linhas pautadas, sem card).
- **Pronto quando:**
  - `npx vitest run tests/ui/components/LoadState.test.tsx` passa, com os casos:
    - `loading`: `aria-busy="true"`, texto "Carregando…" e `children` ausente;
    - `error`: `role="alert"` com a mensagem, e o clique em "Tentar de novo" chama `onRetry` uma vez;
    - `ready`: só os `children`.
  - `grep -n "prefers-reduced-motion: no-preference" src/components/LoadState/styles.ts` encontra a regra que envolve a animação (R12).
  - `grep -nE "#[0-9a-fA-F]{3,6}\b|rgb\(" src/components/LoadState/styles.ts` não encontra nada, porque as cores vêm só de tokens.

## T4 — Mês

- **Entrega:** `src/app/page.tsx`, `src/app/styles.ts` (se precisar) e `tests/ui/pages/dashboard.test.tsx`.
- **Objetivo:** o Mês não mostra zeros nem "Nada registrado" enquanto carrega. Os orçamentos e o lembrete de fatura têm cada um o próprio estado, em vez de um `Promise.all` que falha junto.
- **Pronto quando:**
  - `npx vitest run tests/ui/pages/dashboard.test.tsx` passa, com os casos:
    - com transações pendentes, sem "0,00" e sem "Nada registrado em outubro.", e com o esqueleto;
    - transações em `500` → alerta, e "Tentar de novo" mostra os lançamentos;
    - `/api/imports` em `500` → sem o lembrete e com os orçamentos visíveis;
    - `/api/budgets` em `500` → erro em "Orçamentos" e sem "Nenhum orçamento para outubro.".
  - Os testes atuais do lembrete continuam passando: ele aparece com `[]` e some quando há lote do mês.

## T5 — Lançamentos, Investimentos e Relatórios

- **Entrega:** `src/app/transactions/page.tsx`, `src/app/investments/page.tsx`, `src/app/reports/page.tsx`, `tests/ui/pages/transactions.test.tsx` e `tests/ui/pages/reports-investments.test.tsx`.
- **Objetivo:** cada tela usa o `LoadState` com o `status` do contexto. O vazio só aparece em `ready`.
- **Pronto quando:**
  - `npx vitest run tests/ui/pages/transactions.test.tsx tests/ui/pages/reports-investments.test.tsx` passa, com três casos por tela:
    - pendente → esqueleto, sem texto de vazio;
    - `500` → alerta e "Tentar de novo", sem texto de vazio;
    - `200 []` → o texto de vazio atual.

## T6 — Planejar, Categorias e Importar

- **Entrega:**
  - `src/app/planning/page.tsx`, `src/app/categories/page.tsx` e `src/app/import/page.tsx`;
  - `tests/ui/pages/planning.test.tsx`, `tests/ui/pages/categories.test.tsx`, `tests/ui/pages/category-rules.test.tsx` e `tests/ui/pages/import.test.tsx`.
- **Objetivo:**
  - cada leitura própria da tela tem carregando, erro com "Tentar de novo" (que refaz só ela) e vazio;
  - em Importar, deixam de existir `.catch(() => [])` e `.catch(() => null)`.
- **Pronto quando:**
  - `npx vitest run tests/ui/pages/planning.test.tsx tests/ui/pages/categories.test.tsx tests/ui/pages/category-rules.test.tsx tests/ui/pages/import.test.tsx` passa, com os casos:
    - metas em `500` mostram o erro e os orçamentos continuam visíveis;
    - "Tentar de novo" chama de novo só `GET /api/goals`;
    - categorias em `500` → erro nas abas;
    - regras em `500` → erro na aba Regras;
    - Importar com `/api/imports` em `500` (JSON e HTML) → erro, e o "Tentar de novo" mostra a lista;
    - Importar com `/api/categories` em `500` → erro de categorias.
  - `grep -nE "catch\(\(\) => (\[\]|null)\)" src/app/import/page.tsx` não encontra nada.

## T7 — Configurações

- **Entrega:** `src/app/settings/page.tsx` e `tests/ui/pages/settings.test.tsx`.
- **Objetivo:**
  - o perfil é lido por `fetchProfile`, então o `401` vai para o login;
  - os dados que dependem dos lançamentos e a exportação esperam `status === "ready"`.
- **Pronto quando:**
  - `npx vitest run tests/ui/pages/settings.test.tsx` passa, com os casos:
    - transações pendentes e em `500` → "Exportar CSV" e "Exportar JSON" desabilitados, e "Lançamentos" sem "0";
    - `/api/me` em `401` → `location.assign("/login")`;
    - `/api/me` em `500` → "Indisponível".
  - Os testes atuais de exportação e de logout continuam passando.

## T8 — E2E

- **Entrega:** `tests/e2e/12-carga-erros-sessao.spec.ts`. Nos `tests/e2e/support/*`, só acréscimos (regra de [contratos.md](../contratos.md#recursos-compartilhados-e-donos-por-onda)).
- **Objetivo:** provar no navegador real o erro com recuperação, o `401` levando ao login e as páginas públicas sem leitura de lançamentos.
- **Pronto quando:** `npx playwright test tests/e2e/12-carga-erros-sessao.spec.ts` passa, com os casos:
  - `page.route` com `500` em `GET /api/transactions` → erro no Mês; ao liberar a rota, "Tentar de novo" mostra os lançamentos;
  - cookie forjado depois do carregamento + salvar pela folha Registrar → URL `/login`;
  - cookie expirado (`createSessionToken(user, -60)`) e abrir `/` → `/login`;
  - `/login`, `/ajuda` e `/offline` sem sessão → nenhuma requisição a `/api/transactions` e a URL sem mudança.

## T9 — Documentação e verificação completa

- **Entrega:**
  - `docs/API.md`: o contrato de erro dos serviços e o `401` → `/login`;
  - `docs/FUNCIONALIDADES.md`: §0 e §1.4, com os estados de carga e o novo contexto;
  - `docs/TESTES.md`: os novos testes e as contagens.
  - Guia `/ajuda`: nenhuma mudança visível nas capturas, porque elas são feitas com os dados prontos. O uphill confirma; se mudar, regravar com `npx vite-node tests/ajuda/capturas.ts`.
- **Objetivo:** a documentação descreve o comportamento novo, e a spec fecha com a verificação inteira.
- **Pronto quando:**
  - `npm run lint && npm run typecheck && npm test` passa;
  - `npm run test:e2e` passa;
  - `grep -n "handleUnauthorized" docs/API.md docs/FUNCIONALIDADES.md` encontra a descrição.

## Fatos verificados

| Fato | Onde (VERIFICADO em 18/10/2026) |
|---|---|
| `fetchTransactions` chama `response.json()` antes de conferir `ok` e devolve `[]` em erro | `src/services/transactions.ts:4-13` |
| Mesmo padrão em `fetchCategories`, `fetchBudgets` e `fetchGoals` | `src/services/categories.ts:4-13`, `src/services/budgets.ts:4-13`, `src/services/goals.ts:4-13` |
| `fetchImportBatches` devolve `[]` quando `!ok` | `src/services/imports.ts` (função `fetchImportBatches`, `if (!response.ok) return [];`) |
| `getCategoryRules` já confere `ok` e lança `ApiError`, mas devolve `[]` com `200` que não é lista | `src/services/categoryRules.ts:4-18` |
| `ApiError(message, status)` e `toApiError(response, fallback)` existem; não há tratamento de `401` | `src/services/http.ts:1-27` |
| O contexto não tem estado de carga, troca a lista por `[]` em erro e busca no `useEffect` de montagem, sem olhar a rota | `src/contexts/TransactionsContenxt.tsx:29-51` |
| O `TransactionsProvider` envolve **todas** as páginas, inclusive as públicas, no layout raiz | `src/app/layout.tsx:72-74` |
| O Mês busca orçamentos e importações num `Promise.all`; o lembrete aparece com `batches !== null` e sem lote do mês | `src/app/page.tsx:43-57`, `:85-88` |
| Hoje, `/api/imports` com erro → `[]` → o lembrete aparece indevidamente | `src/services/imports.ts` + `src/app/page.tsx:85-88` |
| Planejar já tem `loadError` único para as três leituras, sem "Tentar de novo" | `src/app/planning/page.tsx:112-131` |
| Categorias tem erro de categorias e estado próprio de regras (`rulesLoading`/`rulesError`) | `src/app/categories/page.tsx:118-157` |
| Importar engole as falhas: `fetchCategories().catch(() => [])` e `fetchImportBatches().catch(() => null)` | `src/app/import/page.tsx:159-178` |
| Configurações lê `/api/me` com `fetch` direto e tem `ProfileState` com loading/error; a exportação usa `transactions` sem olhar a carga | `src/app/settings/page.tsx:20`, `:73-100`, `:103-112` |
| Login, cadastro, esqueci e redefinir senha usam `fetch` direto, sem serviços; um `401` de credencial inválida não passaria por `handleUnauthorized` | `src/app/login/page.tsx:88`, `:116`; `src/app/forgot-password/page.tsx:33`; `src/app/reset-password/page.tsx:55` |
| O proxy protege só as rotas autenticadas; `/ajuda` e `/offline` ficam fora do `matcher` | `src/proxy.ts:9-44`; `tests/unit/proxy.test.ts:68-69`, `:107-109` |
| O token tem `exp`, e o token expirado é recusado | `src/lib/session.ts:111-135` |
| O E2E cria a sessão com `createSessionToken(user, expiresInSeconds)`, que aceita validade negativa | `tests/e2e/support/session.ts:12-27` |
| Os testes de UI simulam `fetch` com `reply`, `replyRaw` e `networkError`; o padrão já usado para `location` é `vi.stubGlobal("location", …)` | `tests/ui/helpers/api.ts:31-45`; `tests/ui/components/modal-navigation.test.tsx:390-396` |
| Há animação condicionada a `prefers-reduced-motion: no-preference` no projeto | `src/components/ProgressBar/styles.ts:25`; `src/components/CustomModal/style.ts:51` |
| Os testes atuais fixam "lista: devolve [] quando a API responde erro" | `tests/ui/services/services.test.tsx:90-108` |
| `EmptyState` só aceita `children: string` | `src/components/EmptyState/index.tsx` |

**NÃO VERIFICADO:**

- Se `usePathname()` está disponível e estável no provider do layout raiz durante a primeira renderização das páginas públicas. É a incógnita (a).
- Se, numa navegação **cliente** (`<Link>`) para uma rota protegida com o cookie inválido, o proxy redireciona antes de a página montar e chamar as leituras.
- Os textos exatos de vazio de Lançamentos, Investimentos e Relatórios, e a mensagem padrão de cada leitura. O uphill lista os textos.

## Incógnitas iniciais para o uphill

1. **(a) Páginas públicas sem leitura.** Como evitar que o provider dispare `GET /api/transactions` em `/login`, `/forgot-password`, `/reset-password`, `/ajuda` e `/offline`, gerando `401` → redirecionamento em laço? As opções são:
   - checar `usePathname()` contra uma lista de rotas públicas no provider;
   - carga preguiçosa, na qual a página autenticada pede a carga;
   - tirar o provider do layout raiz para um grupo de rotas.

   Qual tem menos impacto nas regras do Next 16 (ler `node_modules/next/dist/docs/`) e no `EntrySheetProvider`, que depende do contexto?
2. **(b) Testar o redirecionamento.**
   - No jsdom, `window.location.assign` não navega. Falta confirmar o padrão com `vi.stubGlobal("location", { assign: vi.fn() })` e como zerar a trava de "um só redirecionamento" entre testes. Ela é de módulo, então talvez precise de um reset exportado só para teste ou de `vi.resetModules`.
   - No E2E, falta confirmar como trocar o cookie depois do carregamento (`context.clearCookies()` + `addCookies` com um valor forjado) e se uma navegação cliente passa pelo proxy antes do `401` da API.
3. **(c) `prefers-reduced-motion`.** O esqueleto deve só "parar" ou também mudar de forma? A proposta da spec (R12) é seguir o padrão de `ProgressBar`: animação só com `no-preference`. Falta conferir se o Playwright emula `reducedMotion` caso se queira um teste automático, além da validação manual.
4. Onde a trava de "um só redirecionamento" fica. Uma variável de módulo em `http.ts` sobrevive entre navegações cliente; depois do `assign("/login")` a página recarrega, então não precisa ser zerada em produção? Confirmar.
5. Formato do esqueleto por tela: linhas pautadas genéricas (n linhas) ou formatos específicos (sobra do mês, trio, lista). Definir a prop opcional do `LoadState` sem criar variantes que nenhum CA pede.
6. Se `refreshTransactions` com falha (usado por Importar depois de confirmar) deve ir para `status "error"`, escondendo a lista atual, ou manter `ready` com a lista e mostrar o erro só na tela que pediu. CA4 exige não esvaziar a lista; falta decidir o `status`.
7. Planejar: separar o `Promise.all` em três leituras independentes, e decidir o que mostrar quando **categorias** falha mas os orçamentos carregam (o formulário de orçamento depende das categorias).
8. Quantos testes atuais mudam de comportamento (títulos `[comportamento atual]` e "devolve []") e quais testes E2E dependem de `gotoAndWaitForTransactions` com o novo esqueleto. Inventariar antes do downhill.

## Questões para o orquestrador

> **Decididas no portão do topo (18/10/2026).** As decisões estão em [`../README.md`](../README.md#portão-do-topo--decisões-18102026) e já constam em [`../contratos.md`](../contratos.md); o texto abaixo fica como histórico.
1. **`fetchProfile` em `src/services/profile.ts`.** O K8 lista as leituras "e as que vierem depois". Hoje `/api/me` é lido com `fetch` direto em Configurações. A proposta é criar `fetchProfile()` em `src/services/profile.ts`, para que o `401` também passe por `handleUnauthorized`. O contrato não muda, mas a lista do K8 pode citar a função.
2. **`handleUnauthorized` também nas mutações.** O K8 diz "`ApiError` com `status === 401`", sem separar leitura e mutação. Esta spec aplica às duas (R3), passando por `toApiError` ou por um ponto equivalente em `http.ts`. Confirmar que é a leitura pretendida.
3. **Número do arquivo E2E.** Esta spec usa `tests/e2e/12-carga-erros-sessao.spec.ts`. A 002, na mesma onda, também deve criar um E2E. Proposta: a 001 fica com o `12`, a 002 com o `13`, e a 007 (onda 2) com o próximo livre. Alternativa: o orquestrador fixa a numeração no README.
4. **Consumidores do K8 na onda 2.** A 007 depende do `status` do contexto e de as leituras de orçamentos e importações do Mês terem estados separados (T4). Mudar a forma desse estado no uphill da 001 afeta a 007.
