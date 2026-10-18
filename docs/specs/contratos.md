# Contratos entre as specs 001–010

Interfaces que mais de uma spec usa. **Uma spec não muda um contrato sozinha**: registra a necessidade em "Questões para o orquestrador" do seu `uphill.md`, e o contrato só muda aqui, depois de decidido. Cada contrato diz quem o cria (dono) e quem o consome.

As specs são executadas em ondas ([`README.md`](README.md#ondas)). Um contrato criado numa onda pode ser usado pelas ondas seguintes.

---

## K1 — Dinheiro em centavos (dono: 004 · consomem: 003, 005, 006, 008)

- **Banco:** valores passam a ser inteiros em centavos.
  - `transactions.amountCents Int`, `budgets.amountCents Int`;
  - `goals.targetCents Int` e `goals.currentCents Int`;
  - `import_batches.statedTotalCents Int?` e `import_batches.importedTotalCents Int`;
  - `recurring_rules.amountCents Int` (criada pela 008).
  - As colunas `Float` antigas são removidas na mesma migration, depois da cópia.
- **API (fronteira):** continua recebendo e devolvendo **`amount` em reais** (número com até 2 casas), para o front não mudar de unidade. A conversão fica num único lugar:

  ```ts
  // src/lib/money.ts
  export function toCents(amount: number): number;   // Math.round(amount * 100); NaN/Infinity lançam erro
  export function fromCents(cents: number): number;  // cents / 100
  ```
- **Somas no cliente:** `src/utils/finance.ts` soma em centavos internamente (`Math.round(x * 100)` por item) e devolve reais (função `sumAmounts`). Nenhuma soma de `Float` sem passar por centavos.
- `goals.currentCents` tem `@default(0)`. A API nunca expõe campos `*Cents`.
- **Implantação:** a migration da 004 remove as colunas que o código antigo lê. Aplicar a migration e publicar o código novo acontecem juntos, na mesma janela aprovada pelo usuário.

## K2 — Tipo do lançamento e sinal (dono: 004 · estendido por 005 e 006)

- **Obrigatório** no banco (`transactions.type String NOT NULL`) e na API. Os registros antigos sem tipo são preenchidos pelo sinal, na migration da 004.
- **Valores e sinal** (`amount`, em reais):

  | `type` | Sinal de `amount` | Entra em | Criado por |
  |---|---|---|---|
  | `income` | > 0 | Entrou | 004 |
  | `outcome` | < 0 | Saiu e gasto da categoria | 004 |
  | `investment` | < 0 | Investiu | 004 |
  | `card_payment` | < 0 | **Nada.** É transferência da conta para o cartão | 005 |
  | `refund` | > 0 | **Abate** Saiu e o gasto da categoria | 006 |
- A API responde `400` quando o sinal não combina com o tipo. Classificação sempre pelo tipo (`getTransactionType` deixa de inferir pelo sinal).
- `card_payment` também fica fora da **sobra do mês** e do **saldo acumulado**: o dinheiro já foi contado nas compras do cartão.
- A lista de tipos é validada **na API**, sem `CHECK` no banco. Assim a 006 acrescenta `refund` sem migration.
- **Tipo único:**

  ```ts
  // src/types/transaction.ts
  export type TransactionType = "income" | "outcome" | "investment" | "card_payment" | "refund";
  ```

  A 004 cria o tipo com os três primeiros valores; a 005 e a 006 acrescentam os seus.

## K3 — Categoria por identificador (dono: 003 · consomem: 005, 006, 008)

- **Banco:** `transactions.categoryId`, `budgets.categoryId` e `category_rules.categoryId` passam a ser `String NOT NULL`, com FK para `categories(id)` e `ON DELETE RESTRICT`.
  - A migration da **005** torna `transactions.categoryId` anulável e acrescenta `CHECK ("categoryId" IS NOT NULL OR "type" = 'card_payment')`. É o único `CHECK` sobre tipo, e existe só para garantir a regra do `card_payment`.
  - As colunas de texto `category` são removidas depois da cópia.
  - O índice único de orçamento passa a ser `(userId, categoryId, month)`.
- **API:**
  - recebe **`categoryId`**;
  - devolve `categoryId` **e** `category` (nome atual, por join) para exibição;
  - `DELETE /api/categories/:id` de categoria em uso responde `409 { error, usage: { transactions, budgets, rules } }`. A 008 acrescenta `recurring` a `usage`.
  - Mudar o tipo de uma categoria em uso também responde `409`.
  - Regras de importação cuja categoria não existe mais são apagadas na migration, porque hoje já são ignoradas.
- **Regra de posse:** a API valida que `categoryId` pertence ao usuário da sessão e é de um tipo compatível:
  - `income` usa categoria `income`;
  - `outcome` e `refund` usam categoria `outcome`;
  - `investment` usa categoria `investment`;
  - `card_payment` não tem categoria; nesse caso o `categoryId` é nulo, e esta é a única exceção à obrigatoriedade.

## K4 — Cartões e mês da fatura (dono: 005 · consomem: 006, 008)

- **Modelo:** `CreditCard` (`credit_cards`) já existe: `name`, `limit`, `closingDay`, `dueDay`, `color?`, `brand?`. A 004 converte `limit` para `limitCents`. A relação é `Transaction.cardId?`.
- **API:** CRUD em `/api/credit-cards`, sempre filtrado pelo `userId` da sessão.
- **Função pura do mês da fatura:**

  ```ts
  // src/features/credit-cards/invoice.ts
  export function getInvoiceMonth(purchaseDate: string /* YYYY-MM-DD */, closingDay: number, dueDay: number): string /* YYYY-MM */;
  export function getEffectiveMonth(transaction: Transaction, cardsById: Map<string, CreditCard>): string /* YYYY-MM */;
  ```
- **Mês da fatura congelado:** `transactions.invoiceMonth String?` (`YYYY-MM`).
  - O servidor calcula esse mês ao criar ou editar um lançamento com `cardId`, a partir de `date` e do fechamento do cartão.
  - A importação grava o mês de referência da fatura.
  - `card_payment` guarda a fatura que está pagando.
  - Mudar o fechamento do cartão **não** move lançamentos antigos.
- **Em que mês conta:** `getEffectiveMonth` devolve `invoiceMonth` quando existe; senão, o mês da data. Vale em todas as telas mensais (Mês, Planejar, Relatórios, Categorias).
- **Pagamento da fatura:** lançamento `card_payment` com `cardId`. Não entra em Entrou, Saiu nem Investiu.
- **Importação:** `ImportBatch.cardId?`. Os lançamentos importados recebem o `cardId` do lote quando o usuário escolhe o cartão no preview.

## K5 — Estorno (dono: 006)

- **Lançamento:** `type: "refund"`, `amount > 0`, categoria de gasto.
- **Mês:** "Saiu" do mês = Σ|outcome| − Σrefund.
- **Orçamento e categoria:** o gasto é Σ|outcome| − Σrefund da categoria no mês, com mínimo de 0 na barra; o valor exato aparece no texto.
- **Importação:** linhas `kind: "credit"` viram `refund` por padrão, e não mais `income`. O preview continua permitindo trocar o tipo.

## K6 — Recorrências (dono: 008)

- **Tabela `recurring_rules`** (com RLS):
  - `id`, `userId`, `description`, `amountCents`;
  - `type` (`income` | `outcome` | `investment`), `categoryId`;
  - `dayOfMonth` (1–31), `startMonth` (`YYYY-MM`), `endMonth?`;
  - `paymentMethod?`, `cardId?`, `active`.
- **Vínculo com o lançamento:** `Transaction.recurringRuleId?`, com FK `ON DELETE SET NULL` e índice único `(recurringRuleId, date)`. É isso que garante a idempotência.
- **Controle de geração:** `recurring_rules.lastGeneratedMonth String?`. Um lançamento gerado e depois excluído não volta, e os meses em que o app não foi aberto são recuperados até o mês pedido.
- **Geração:** `POST /api/recurring/generate { month: "YYYY-MM" }`.
  - É idempotente: cria só os lançamentos que faltam no mês;
  - em mês de 30 dias, o dia 31 vira o último dia do mês;
  - responde `{ created: number }`.

## K7 — Sessão e tentativas (dono: 002)

- **Revogação de sessão:**
  - `users.sessionVersion Int @default(0)`;
  - o token de sessão ganha o campo `v` (versão), e token sem `v` vale como `v = 0`;
  - `getAuthenticatedUser` recusa token com `v` diferente de `users.sessionVersion`;
  - trocar a senha (redefinição) e "Sair de todos os aparelhos" incrementam a versão.
- **Limite de tentativas compartilhado:**
  - tabela `auth_attempts` (`key`, `windowStart`, `count`, com RLS);
  - a chave é `ação:e-mail normalizado`;
  - o IP entra só como segundo contador, nunca como única chave;
  - em "redefinir senha", a chave é `reset_password:<e-mail do dono do token>`; com token inexistente, só o contador de IP.
- **"Sair de todos os aparelhos":** `POST /api/auth/logout-all`.
- **Proxy:** confere a versão da sessão só em `/login`, para evitar laço de redirecionamento. Nas páginas, a sessão revogada aparece como `401` das APIs e cai no `handleUnauthorized` (K8).
- **Contas no E2E:** passam a ser criadas por SQL. O cadastro e o "esqueci a senha" pela tela são testados com a resposta da API interceptada no navegador. Não há atalho de reCAPTCHA no código de produção.
- **Token de redefinição:** `password_reset_tokens` guarda `tokenHash` (SHA-256 hex), e não o token. O uso é atômico (`updateMany ... where usedAt: null`).

## K8 — Erros de leitura e sessão expirada no cliente (dono: 001 · consomem: todas as telas)

- **Serviços:** as funções de leitura de `src/services/*.ts` (`fetchTransactions`, `fetchCategories`, `fetchBudgets`, `fetchGoals`, `fetchImportBatches` e as que vierem depois) **lançam `ApiError`** quando `!response.ok`, conferindo `ok` antes do `json()`. Lista vazia só vem de resposta `200` vazia.
- **Sessão expirada:** `ApiError` com `status === 401` leva a `window.location.assign("/login")` por um único ponto, `src/services/http.ts → handleUnauthorized()`. Vale para leitura **e** escrita feitas por `src/services/*`. As telas de login e de senha chamam `fetch` direto e não passam por ele.
- `/api/me` ganha serviço próprio: `fetchProfile()` em `src/services/profile.ts`.
- **Estado de carga:** o `TransactionsContext` expõe:

  ```ts
  status: "loading" | "ready" | "error";
  error: string | null;
  retry: () => Promise<void>;
  ```

  As páginas mostram esqueleto enquanto `loading` e a mensagem com "Tentar de novo" em `error`, pelo componente `src/components/LoadState`.

## K9 — Busca e ordem (dono: 009)

- **Busca:**

  ```ts
  // src/utils/search.ts
  export function normalizeSearch(text: string): string; // minúsculas, sem acentos (NFD), espaços colapsados
  export function matchesSearch(transaction: Transaction, query: string): boolean; // descrição, nome da categoria e observação
  ```
- **Ordem estável no cliente:** data, depois `createdAt`, depois `id`, decrescentes (crescentes quando a ordem pedida for "Mais antigas"). A API não muda.

  ```ts
  // src/utils/search.ts
  export function compareTransactionsByDate(a: Transaction, b: Transaction, direction: "asc" | "desc"): number;
  ```

## K10 — Seletor de mês e folhas acessíveis (dono: 010)

- **`src/components/MonthPicker`:** substitui o `<input type="month">` invisível em Relatórios (`PeriodFilter`) e Planejar.
  - Abre uma folha ou popover com a grade dos 12 meses e as setas de ano;
  - `value`/`onChange` em `YYYY-MM`;
  - funciona por teclado e no Safari.
- **`CustomModal`:**
  - prende o foco dentro da folha;
  - devolve o foco ao elemento que a abriu;
  - marca o resto da página como `inert` enquanto está aberta.

  A API do componente (`isOpen`, `onClose`, `title`, `maxWidth`) não muda.

---

## Recursos compartilhados e donos por onda

Depois do portão do topo (18/10/2026), as ondas ficaram assim (detalhe em [`README.md`](README.md#ondas)): 1 → 001 · 2 → 002, 007, 010 · 3 → 004 · 4 → 003 · 5 → 009 · 6 → 005 · 7 → 006 · 8 → 008.

| Recurso | Regra |
|---|---|
| `prisma/schema.prisma` e `prisma/migrations/` | Uma spec por onda cria migration: 002 (onda 2), 004 (3), 003 (4), 005 (6), 008 (8). Toda tabela nova com RLS. |
| Teste de migration com dados antigos | A 004 cria o utilitário em `tests/migrations/`, com Postgres embutido em porta própria. A 003, a 005 e a 008 reutilizam. |
| `src/utils/finance.ts` | 004 (3), 003 (4), 005 (6), 006 (7). |
| `src/lib/validators.ts` e `src/lib/importValidators.ts` | 004 (3), 003 (4), 005 (6), 006 (7), 008 (8). |
| `src/components/TransactionForm` | 003 (4: categoria por id), 005 (6: cartão), 006 (7: tipo Estorno), 008 (8: "Repetir todo mês"). |
| `src/app/page.tsx` (Mês) | 001 (1), 007 (2), 004 (3), 003 (4), 009 (5), 005 (6), 006 (7), 008 (8). Nunca duas specs na mesma onda. |
| `src/app/settings/page.tsx` | 001 (1), 002 (2). |
| `tests/e2e/support/*`, `tests/e2e/global-setup.ts` e `tests/ui/helpers/*` | A spec da onda **pode alterar** os helpers que o seu contrato muda. Exemplos: a 002 troca a criação de contas e os tokens de redefinição; a 004 dá tipo a `t9` e `t10` das fixtures; a 003 traduz nome em `categoryId`. Na onda 2, só a 002 altera helpers; a 007 e a 010 apenas acrescentam. |
| Guia `/ajuda` e `tests/ajuda/capturas.ts` | Na onda 2, a 002 ajusta `capturas.ts` (criação de conta) e a 007 edita o guia. Nas demais ondas, a spec que muda a tela atualiza o guia e regrava as capturas. |
| Arquivos E2E novos | 001 `12-carga-erros-sessao`, 010 `13-acessibilidade-folhas-mes`, 007 `14-primeiros-passos`, 004 `15-valores-centavos` e `16-migracao-centavos`, 005 `17-credit-cards`, 008 `18-recurring`. |
| `docs/` fora de `docs/specs/` | Cada spec atualiza `API.md`, `FUNCIONALIDADES.md` e `TESTES.md` na parte que mudou. |
