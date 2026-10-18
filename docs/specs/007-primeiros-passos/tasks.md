# Tasks — SPEC 007

Executar na ordem, depois de a 001 estar concluída (onda 2). Cada task só fecha quando os comandos de "Pronto quando" passam e o resultado está registrado em `downhill.md`. O **como** de cada task está em `uphill.md`.

| ID | Task | Depende de | Cobre | Status |
|---|---|---|---|---|
| T1 | Regras puras, detecção de instalação e "dispensado" em `src/features/first-steps/` | 001 concluída | R1–R5, R7–R9, CA1, CA2, CA3, CA4 | ⬜ |
| T2 | Componente `FirstSteps` e conferência das âncoras do guia | T1 | R1–R6, R10, CA5, CA6 | ⬜ |
| T3 | Lista no Mês, sem piscar e respeitando os erros de leitura | T1, T2 | R7, R8, R9, CA7 | ⬜ |
| T4 | E2E dos primeiros passos | T3 | CA8 | ⬜ |
| T5 | Guia, documentação e verificação completa | T1–T4 | CA9 | ⬜ |

## T1 — Regras de primeiros passos

- **Entrega:**
  - `src/features/first-steps/steps.ts`: `getFirstSteps` e `shouldShowFirstSteps`.
  - `src/features/first-steps/install.ts`: `isAppInstalled`.
  - `src/features/first-steps/storage.ts`: `readDismissed` e `writeDismissed`.
  - Testes: `tests/unit/first-steps/steps.test.ts` (node), `tests/ui/first-steps/install.test.tsx` e `tests/ui/first-steps/storage.test.tsx` (jsdom).
- **Objetivo:** concentrar a regra de cada item, a regra de visibilidade, a detecção de instalação e a gravação de "dispensado" em funções puras e testáveis, fora do componente (convenção `src/features/<nome>/` do AGENTS.md).
- **Pronto quando:**
  - `npx vitest run tests/unit/first-steps` passa, cobrindo:
    - item 1: gasto marca; só receita e investimento não marcam;
    - item 2: orçamento de outro mês marca;
    - item 3: lote marca;
    - item 4: segue `installed`;
    - `shouldShowFirstSteps` em cada condição de CA2, inclusive "três de dados feitos sem instalação → `false`".
  - `npx vitest run tests/ui/first-steps` passa, cobrindo:
    - `isAppInstalled` com `display-mode` standalone, com `navigator.standalone`, sem nenhum dos dois e sem `matchMedia`;
    - `readDismissed`/`writeDismissed` normais e com `localStorage` lançando exceção.

## T2 — Componente `FirstSteps`

- **Entrega:** `src/components/FirstSteps/index.tsx`, `src/components/FirstSteps/styles.ts`, `tests/ui/components/FirstSteps.test.tsx` e o caso das âncoras em `tests/ui/pages/ajuda.test.tsx`.
- **Objetivo:** a lista pautada com os 4 itens, as ações, os links "Saiba mais" em nova aba e o "Dispensar". O componente recebe os itens prontos e os callbacks; não busca nada.
- **Pronto quando:**
  - `npx vitest run tests/ui/components/FirstSteps.test.tsx` passa, com os casos de CA5:
    - nomes acessíveis com o estado;
    - `openNewEntry("outcome")`;
    - `href` de `/planning` e de `/import`;
    - as quatro âncoras com `target`/`rel` e "(abre em nova aba)";
    - `onDismiss`.
  - `npx vitest run tests/ui/pages/ajuda.test.tsx` passa, com um caso que confere as seções `#registrar`, `#planejar`, `#importar` e `#instalar`.
  - `grep -nE "#[0-9a-fA-F]{3,6}\b|rgb\(|box-shadow|gradient" src/components/FirstSteps/styles.ts` não encontra nada (R10).

## T3 — Lista no Mês

- **Entrega:** `src/app/page.tsx` e `tests/ui/pages/dashboard.test.tsx`.
- **Objetivo:** o Mês decide a visibilidade com `shouldShowFirstSteps`, usando:
  - o `status` do contexto (001);
  - os estados de orçamentos e de importações que a 001 separou;
  - `isAppInstalled`;
  - `readDismissed`.

  A lista aparece acima de "Orçamentos". O "Dispensar" esconde na hora e grava a escolha.
- **Pronto quando:**
  - `npx vitest run tests/ui/pages/dashboard.test.tsx` passa, com os casos de CA7:
    - conta nova → lista com 4 pendentes;
    - transações pendentes → sem lista;
    - transações em `500` → sem lista;
    - importações em `500` → sem lista;
    - orçamentos em `500` → sem lista;
    - conta com gasto, orçamento e lote → sem lista;
    - standalone → item 4 feito;
    - "Dispensar" e remontar → sem lista.
  - Os testes da 001 nesse arquivo continuam passando, inclusive "lembrete de fatura some quando `/api/imports` falha".

## T4 — E2E

- **Entrega:** `tests/e2e/14-primeiros-passos.spec.ts`. Nos `tests/e2e/support/*`, só acréscimos.
- **Objetivo:** provar no navegador que a lista aparece, se marca, abre o guia em nova aba e fica dispensada após recarregar.
- **Pronto quando:** `npx playwright test tests/e2e/14-primeiros-passos.spec.ts` passa, com os casos:
  - conta nova vê a lista;
  - "Registrar gasto" → salvar → item 1 feito, sem recarregar;
  - "Saiba mais" do item 1 com `href="/ajuda#registrar"` e `target="_blank"`;
  - "Dispensar" + `page.reload()` → sem lista;
  - conta com gasto, orçamento e lote criados pela API → sem lista.

  Além disso, `npx playwright test tests/e2e/03-dashboard.spec.ts` continua passando ("usuário novo vê o mês zerado com convites").

## T5 — Guia, documentação e verificação completa

- **Entrega:**
  - `src/app/ajuda/page.tsx`: na seção "mes", uma frase sobre "Primeiros passos" e o "Dispensar".
  - `docs/FUNCIONALIDADES.md` §0 (linha do Mês) e `docs/TESTES.md` (novos arquivos e contagens).
  - Capturas regravadas com `npx vite-node tests/ajuda/capturas.ts`, se o uphill confirmar que a lista aparece em alguma delas.
- **Objetivo:** guia e documentação descrevem a lista, e a spec fecha com a verificação inteira.
- **Pronto quando:**
  - `npm run lint && npm run typecheck && npm test` passa;
  - `npm run test:e2e` passa;
  - `grep -n "Primeiros passos" src/app/ajuda/page.tsx docs/FUNCIONALIDADES.md` encontra as duas descrições.

## Fatos verificados

| Fato | Onde (VERIFICADO em 18/10/2026) |
|---|---|
| O guia tem seções com `id` `instalar`, `navegar`, `registrar`, `mes`, `lancamentos`, `importar`, `planejar`, `categorias` e `relatorios`, e cada uma vira `<Section id={section.id}>` | `src/app/ajuda/page.tsx:33`, `:52`, `:80`, `:100`, `:123`, `:142`, `:172`, `:191`, `:209`, `:298` |
| Links do guia em nova aba usam `target="_blank"`, `rel="noopener noreferrer"` e o texto `sr-only` "(abre em nova aba)" | `src/components/LedgerSection/index.tsx:18-25`; `src/components/AppNavigation/index.tsx:36`, `:67`; `src/app/login/page.tsx:217` |
| `openNewEntry(defaultType = "outcome")` abre a folha Registrar; `TransactionType` é `income \| outcome \| investment` | `src/contexts/EntrySheetContext.tsx:13`, `:58`; `src/types/transaction.ts:1` |
| O Mês já lê `fetchBudgets()` e `fetchImportBatches()` ao montar, e lê os lançamentos do contexto | `src/app/page.tsx:37-57` |
| O Mês tem o vazio "Nada registrado em …" com "Registrar o primeiro" e o lembrete de fatura | `src/app/page.tsx:85-88`, `:108-113`, `:135-141` |
| `getTransactionType` existe em `src/utils/finance.ts` e hoje infere pelo sinal quando falta `type` | `src/utils/finance.ts:15`; `docs/specs/fatos-verificados.md` |
| `Transaction` (cliente) não tem `userId`, então o Mês não sabe o id do usuário sem chamar `/api/me` | `src/types/transaction.ts:3-12` |
| O manifesto declara `display: "standalone"` | `src/app/manifest.ts:12` |
| O projeto não usa `localStorage`, `display-mode` nem `navigator.standalone` em lugar nenhum | `grep -rn "localStorage\|standalone\|matchMedia" src` → só `manifest.ts:12` |
| O setup de UI cria `window.matchMedia` falso (`matches: false`) quando não existe | `tests/setup/ui.ts:24-38` |
| Configurações já tem a seção "Instalar o app" com link ao guia em nova aba | `src/app/settings/page.tsx:164-175` |
| O E2E "usuário novo vê o mês zerado com convites" confere textos do Mês de uma conta nova | `tests/e2e/03-dashboard.spec.ts:27-37` |
| As capturas do guia criam orçamentos de outubro para a conta fictícia | `tests/ajuda/capturas.ts:87-89` |

**NÃO VERIFICADO:**

- Se a conta das capturas tem gasto, orçamento **e** lote de importação. Se faltar o lote, a lista apareceria na captura `mes.jpg`. É a incógnita 5.
- Se `matchMedia("(display-mode: standalone)")` é `true` no Safari do iOS para o app adicionado à Tela de Início, ou se só `navigator.standalone` funciona. Fica para a validação manual.
- Os nomes e o formato exatos dos estados de orçamentos e importações que a 001 deixará no `src/app/page.tsx`.

## Incógnitas iniciais para o uphill

1. **(a) Critério de "conta nova".** A spec assume (R8, R9) que a lista aparece enquanto ao menos um dos três passos de dados está pendente e some quando os três estão feitos, mesmo sem instalação. Assim, contas antigas e ativas não a veem. Falta confirmar com os dados de produção, numa consulta somente leitura de contagens:
   - quantas contas teriam a lista visível só por não terem orçamento ou importação;
   - se isso é aceitável ou se é preciso um critério adicional, como "sem nenhum lançamento antes de hoje − N dias".
2. **(b) Instalação no iOS e quando não dá para detectar.** No iOS, falta confirmar se `navigator.standalone` é o único sinal confiável e se `display-mode: standalone` também funciona (Safari 15.5+). Também falta tipar `navigator.standalone` sem `any` (`Navigator & { standalone?: boolean }`). Quando não dá para detectar (desktop, Firefox), o item fica pendente e não impede a lista de sumir (R9).
3. **(c) Evitar o flash.** Com `status === "loading"` ou com orçamentos e importações ainda `null`, nada é renderizado (R8). Falta resolver três pontos:
   - `isAppInstalled` e `readDismissed` dependem de `window`, mas as páginas são `"use client"` e mesmo assim passam pelo SSR. É preciso ler na montagem (`useEffect` ou `useSyncExternalStore`) sem divergência de hidratação e sem a lista aparecer e sumir;
   - o React Compiler está ativo; usar o padrão recomendado pelos docs do React 19/Next 16 em `node_modules/next/dist/docs/`;
   - "dispensado" ainda não lido conta como "não mostrar".
4. **Chave do "dispensado".** O cliente não conhece o `userId` (`Transaction` não o traz). As opções são:
   - uma chave única por aparelho (`finance-app:primeiros-passos:dispensado`), em que duas contas no mesmo aparelho compartilham a escolha;
   - ler `/api/me` no Mês para montar a chave por usuário, o que é uma leitura a mais.

   A proposta é a chave única, por ser uma conveniência por aparelho. O uphill confirma.
5. **Capturas do guia.** Conferir em `tests/ajuda/capturas.ts` se a conta fictícia tem lote de importação. Se não tiver, a lista aparece em `mes.jpg`. Decidir entre aceitar e regravar, ou criar o lote na captura. Só acrescentar dados, sem mudar a captura de outras telas.
6. **Lista e lembrete de fatura juntos.** Para uma conta nova, aparecem o lembrete "A fatura de … ainda não foi importada" e o item "Importar uma fatura". A spec mantém os dois (fora de escopo mudar o lembrete). O uphill confirma com o `design-spec.md` que isso não fere "um primário por tela", já que nenhum dos dois é primário.
7. **Atualização dos itens 2 e 3 sem recarregar.** Orçamento e importação são criados em outras telas (`/planning`, `/import`). Falta confirmar que voltar ao Mês remonta a página e relê `fetchBudgets` e `fetchImportBatches` (navegação cliente do App Router), para que os itens apareçam feitos.

## Questões para o orquestrador

> **Decididas no portão do topo (18/10/2026).** As decisões estão em [`../README.md`](../README.md#portão-do-topo--decisões-18102026) e já constam em [`../contratos.md`](../contratos.md); o texto abaixo fica como histórico.
1. **Pasta `src/features/first-steps/`.** O README lista para a 007 só `src/app/page.tsx` e `src/components/FirstSteps`. Pela convenção do AGENTS.md (regras de domínio em `src/features/<nome>/`), as regras puras ficam em `src/features/first-steps/`. Nenhuma outra spec da onda 2 toca essa pasta. Proposta: acrescentá-la à linha da onda 2.
2. **`src/app/ajuda/page.tsx` e capturas.** A 007 altera a seção "mes" do guia (T5) e talvez regrave capturas. Nenhuma outra spec da onda 2 deve mexer no guia ao mesmo tempo, ou a regravação de capturas precisa ser serializada.
3. **Número do arquivo E2E.** A spec assume `tests/e2e/14-primeiros-passos.spec.ts`. Se a 002 ficar com o `13` (ver questão 3 da 001), a 007 passa para o próximo número livre. O orquestrador fixa os números.
4. **Dependência do formato do Mês da 001.** A T3 usa os estados de orçamentos e de importações que a T4 da 001 cria em `src/app/page.tsx`. Se a 001 mudar essa forma no uphill, o uphill da 007 se ajusta. O K8 não muda.
