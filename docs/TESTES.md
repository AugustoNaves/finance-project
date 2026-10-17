# Testes

O projeto não tinha testes. Esta suíte foi criada no mapeamento de 12/10/2026 e cobre as funcionalidades listadas em [FUNCIONALIDADES.md](FUNCIONALIDADES.md) em quatro camadas.

| Camada | Ferramenta | Onde | Arquivos | Testes | Precisa de banco? |
|---|---|---|---|---|---|
| Unitário | Vitest (node) | `tests/unit/` | 16 | 442 | Não |
| API | Vitest (node) | `tests/api/` | 12 | 352 | Não (Prisma simulado) |
| UI | Vitest + Testing Library (jsdom) | `tests/ui/` | 15 | 366 | Não (`fetch` simulado) |
| E2E | Playwright (Chromium) | `tests/e2e/` | 11 | 128 | Sim — Postgres local embutido |
| **Total** | | | **54** | **1.288** | |

Cobertura das suítes Vitest (unitário + API + UI) sobre `src/`, sem contar arquivos de estilo: **97,1% das linhas, 96,7% dos ramos, 90,8% das funções**. Última execução completa em 12/10/2026: 1.160 testes Vitest e 128 testes Playwright aprovados; `npm run lint` e `npm run build` sem erros.

## Como rodar

```bash
npm test
```

Roda unitário + API + UI (cerca de 40 s).

```bash
npm run test:e2e
```

Roda o E2E (cerca de 4 min). Na primeira vez, instale o navegador:

```bash
npx playwright install chromium
```

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm run test:unit` | Só unitário + API |
| `npm run test:ui` | Só UI |
| `npm run test:watch` | Vitest em modo watch |
| `npm run test:coverage` | Cobertura (relatório HTML em `coverage/`) |
| `npm run typecheck` | Typecheck de `src/` **e** dos testes (`tsconfig.test.json`). O `tsconfig.json` do app exclui os testes para que o `next build` não dependa das ferramentas de teste |
| `npx playwright test tests/e2e/02-transactions.spec.ts` | Uma spec E2E |
| `npx playwright show-report` | Relatório HTML da última execução E2E |
| `E2E_SHOW_BUGS=1 npx playwright test` | Mostra as falhas reais dos testes de bug conhecido |
| `node scripts/e2e/stop-db.mjs` | Derruba o Postgres de teste se uma execução foi interrompida à força |

## Pré-requisitos

- `.env` na raiz (use `.env.example`). Para o E2E, `DATABASE_URL` e `DIRECT_URL` **precisam apontar para `localhost:54329`**; o `playwright.config.ts` aborta se apontarem para qualquer outro host, para nunca rodar contra produção.
- Docker **não** é necessário: o E2E usa o pacote `embedded-postgres` (binários reais do PostgreSQL).

## Decisões da suíte

### Fuso horário fixo

`vitest.config.ts` e `playwright.config.ts` fixam `America/Sao_Paulo`. Os erros de data do sistema só aparecem em fuso negativo; em uma máquina ou CI em UTC os testes passariam com o código errado.

### API sem banco

Os testes de API chamam os handlers de `src/app/api/**/route.ts` diretamente com `NextRequest`, simulando `@/lib/prisma`. A sessão é real: o cookie é gerado por `createSessionToken`, então o caminho de autenticação é exercitado de verdade. Cada recurso verifica `401` sem cookie e com cookie inválido, filtro por `userId`, `userId` do corpo ignorado, `400` de validação, `409` de duplicidade, `404` para registro de outro usuário e `500` quando o banco falha.

Limite: as transações de banco (`$transaction`) e as restrições únicas só são exercitadas de verdade no E2E.

### E2E local, com Postgres embutido

1. `globalSetup` sobe um PostgreSQL descartável na porta 54329 (dados em `.e2e-pg/`, apagados ao final).
2. Aplica o schema com `prisma migrate deploy` — o histórico de migrations é testado a cada execução.
3. Sobe o app com `npm run dev` na porta 3100 e pré-compila as rotas.
4. Cada teste recebe um usuário próprio, então as specs rodam em paralelo sem interferência.

O relógio do navegador é fixado em 15/10/2026 12:00 (horário de Brasília); os testes de borda de data trocam esse valor.

### Login e reCAPTCHA

O login real exige verificação do Google reCAPTCHA v3, que não passa em ambiente local. Por isso:

- nos testes E2E a sessão é criada gravando o cookie `session_token` assinado com o `SESSION_SECRET` local;
- a **tela** de login é testada com a resposta de `/api/login` interceptada (sucesso, `401`, `429`);
- a **rota** de login é coberta nos testes de API, com a chamada ao Google simulada (38 testes).

Nenhum atalho foi adicionado ao código de produção para os testes.

### Testes de bug conhecido

No E2E, `knownBug("motivo")` marca um teste que descreve o comportamento **correto** de algo ainda quebrado. Ele conta como aprovado enquanto o bug existir e passa a falhar ("passou inesperadamente") quando o bug for corrigido — sinal para remover a marcação. Restam dois, ambos do item P1 de [MELHORIAS.md](MELHORIAS.md): renomear categoria e excluir categoria em uso (`04-categories.spec.ts`).

Nos testes Vitest, títulos com `[comportamento atual]`, `[bug]` ou `[UX]` fixam um comportamento questionável que ainda existe; ao corrigir o código, o teste correspondente deve ser atualizado junto.

## O que cada suíte cobre

### Unitário — `tests/unit/`

| Arquivo | Cobre |
|---|---|
| `dates.test.ts` | Data local x data gravada em UTC, mês local, data inválida |
| `utils/finance.test.ts` | `isSameMonth` (dia 1º, último dia, virada de ano, 29/02), resumo, investimentos, taxa de economia |
| `utils/formatters.test.ts` | Moeda, data e mês em pt-BR |
| `lib/session.test.ts` | Criação e verificação do token, adulteração, expiração, segredo ausente ou curto, opções do cookie |
| `lib/validators.test.ts` | Regras de transação, meta, categoria e orçamento |
| `lib/tokens.test.ts`, `lib/password.test.ts`, `lib/auth.test.ts`, `lib/http.test.ts`, `lib/resend.test.ts` | Token de redefinição, bcrypt, usuário autenticado, leitura de JSON, envio de e-mail |
| `proxy.test.ts` | Redirecionamento de cada rota protegida e de `/login` com sessão; arquivos do PWA e `/offline` ficam públicos |
| `sw.test.ts` | Service worker: não intercepta `/api/*` nem outras origens, não guarda páginas, cai na página offline, guarda só estáticos de build, limpa caches antigos |
| `invoice-import/parseInvoice.test.ts` | Parser de fatura: formatos de data e valor, parcelas, estornos, encargos, pagamento, linhas ignoradas, virada de ano, cabeçalho |
| `invoice-import/normalize.test.ts` | Normalização de estabelecimento, impressão digital, regra de data das parcelas |
| `invoice-import/categorize.test.ts`, `lib/importValidators.test.ts` | Prioridade das sugestões de categoria; validação dos corpos de preview e confirmação |
| `invoice-import/pdf.test.ts` | Gerador de PDF sintético (`tests/support/pdf.ts`) e leitura de volta com pdf.js |

### API — `tests/api/`

Um arquivo por recurso: `register`, `login`, `logout`, `me`, `forgot-password`, `reset-password`, `transactions`, `categories`, `budgets`, `goals`, `imports`, `category-rules`. Cobrem todos os métodos de todas as rotas.

### UI — `tests/ui/`

| Pasta | Cobre |
|---|---|
| `pages/` | Mês (início), Lançamentos, Importar fatura (com extração do PDF simulada), Categorias, Planejamento (+ redirect de `/budgets`), Relatórios, Investimentos, Configurações (perfil, exportação JSON/CSV, logout), Login/Cadastro, Esqueci a senha, Redefinir senha |
| `components/` | Formulários (lançamento, categoria, orçamento, meta), filtros, lista agrupada por dia e edição pela folha, modal/folha, diálogo de confirmação, navegação (barra inferior, coluna, folha "Mais", Sair), linhas de categoria/orçamento/meta, resumo do mês e gráficos (nível fumaça) |
| `context/` | `TransactionsContext`: carga inicial, criar, editar, excluir, falhas |
| `services/` | Os quatro serviços: método, URL, corpo e `ApiError` com mensagem da API ou padrão |

Helpers em `tests/ui/helpers/`: `mockApi` (roteia "MÉTODO /rota" para respostas), navegação simulada, dados fixos, `freezeDate` e `renderWithProvider` (com `TransactionsProvider` e `EntrySheetProvider`, como no layout).

Helpers E2E em `tests/e2e/support/ui.ts`: `openRegister`, `createTransactionViaUi`, `fillTransactionForm` (rádios de tipo e categoria), `transactionRow`/`transactionRows` (linhas pelo nome acessível "Descrição, … Editar"), `openTransaction`, `entryCount`, `ledger` (valor com sinal como nas listas) e `confirmDeletion`.

### E2E — `tests/e2e/`

| Spec | Testes | Cobre |
|---|---|---|
| `01-auth` | 30 | Proteção de rotas, cadastro, login (API interceptada), logout, esqueci/redefinir senha |
| `02-transactions` | 19 | Folha Registrar (receita/gasto/investimento, categorias por uso, descrição opcional, vírgula), editar e excluir pela linha, filtros, agrupamento por dia, ordenação, validação, erros, Esc |
| `03-dashboard` | 7 | Mês: sobra, trio, saldo acumulado, troca de mês, últimos 7, orçamentos, lembrete da fatura, navegação completa |
| `04-categories` | 14 | 18 categorias padrão, CRUD, duplicidade, uso no formulário de transação, métricas por nome+tipo |
| `05-budgets` | 8 | CRUD, faixas de progresso, duplicidade, filtro de mês |
| `06-goals` | 10 | CRUD, progresso, validação |
| `07-investments-reports-settings` | 11 | Totais, "Novo Aporte", gráficos, período, média diária, perfil, exportação |
| `08-multi-tenancy` | 7 | Isolamento na interface e na API, cookie forjado, índice de orçamentos |
| `09-responsive` | 13 | 390x844: barra inferior e folha "Mais", CRUD em linhas tocando, sobra visível no topo, login, sem rolagem horizontal nas telas |
| `10-dates-timezone` | 11 | Regressões de data: dia 1º, último dia do mês, após 21h, edição mantém a data |
| `11-invoice-import` | 5 | PDF sintético enviado pelo navegador: leitura real com pdf.js, preview, registro, regra lembrada, reenvio detectado, desfazer, substituição da fatura lançada como total |

## O que não está coberto

- **Login real de ponta a ponta** e **entrega do e-mail de redefinição** — dependem de Google e Resend reais. Vale um teste manual após cada deploy.
- **Build de produção no E2E** — a suíte roda contra `next dev`.
- **Firefox e Safari** — só Chromium.
- **Conteúdo dos gráficos** — o jsdom não desenha o recharts; no E2E verifica-se presença, quantidade de fatias/pontos e eixos.
- **Outros fusos** além de `America/Sao_Paulo`.
- **`src/app/layout.tsx`** — exercitado apenas pelo E2E.

## CI

Ainda não há pipeline no repositório. Sugestão de workflow (`.github/workflows/ci.yml`) para rodar lint, typecheck e `npm test` em push para `master` e em pull requests:

```yaml
name: CI

on:
  push:
    branches: [master]
  pull_request:

jobs:
  verificar:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ci
      DIRECT_URL: postgresql://postgres:postgres@localhost:5432/ci
      SESSION_SECRET: ci-session-secret-with-at-least-32-characters
      RESEND_API_KEY: re_ci_dummy
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
```

Para incluir o E2E, adicione um job com `npx playwright install --with-deps chromium` e `npm run test:e2e`.
