# Arquitetura, dados e API

Documento técnico do backend do **Finanças Pessoais**. O mapa funcional das telas está em [FUNCIONALIDADES.md](FUNCIONALIDADES.md).

## 1. Stack e organização

| Camada | Tecnologia | Onde |
|---|---|---|
| Framework | Next.js 16 (App Router), React 19, React Compiler | `next.config.ts` |
| UI | styled-components (SSR via `src/lib/registry.tsx`), recharts | `src/components`, `src/app/**/page.tsx` |
| API | Route Handlers (`route.ts`) — não há Server Actions | `src/app/api/**` |
| Banco | PostgreSQL (Supabase) com Prisma 7 + `@prisma/adapter-pg` | `prisma/schema.prisma`, `src/lib/prisma.ts` |
| Sessão | Cookie assinado (HMAC-SHA256) — implementação própria | `src/lib/session.ts` |
| Proteção de rotas | `src/proxy.ts` (convenção do Next 16 que substitui `middleware.ts`) | `src/proxy.ts` |
| E-mail | Resend | `src/lib/resend.ts` |
| Anti-bot | Google reCAPTCHA v3, só no login | `src/app/api/login/route.ts` |

Todas as páginas são Client Components (`"use client"`). Os dados chegam por `fetch` às rotas `/api/*` através de `src/services/*.ts`.

## 2. Variáveis de ambiente

Modelo em [`.env.example`](../.env.example).

| Variável | Uso | Obrigatória |
|---|---|---|
| `DATABASE_URL` | Conexão da aplicação (pooler, porta 6543) | Sim |
| `DIRECT_URL` | Conexão do Prisma CLI/migrations (porta 5432). Sem ela, `prisma generate` — e portanto `npm install` — falha | Sim |
| `SESSION_SECRET` | Chave HMAC da sessão; mínimo 32 caracteres, senão toda verificação de sessão lança erro | Sim |
| `NEXT_PUBLIC_APP_URL` | Base do link de redefinição de senha (padrão `http://localhost:3000`) | Produção |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY` | reCAPTCHA v3 do login | Sim (login) |
| `RESEND_API_KEY` / `EMAIL_FROM` | Envio do e-mail de redefinição. O SDK do Resend lança erro na importação do módulo se a chave estiver vazia | Sim (esqueci a senha) |

## 3. Modelo de dados

```
User 1─N Transaction
     1─N Category            @@unique(userId, name, type)
     1─N Budget              @@unique(userId, category, month)
     1─N Goal
     1─N PasswordResetToken  token @unique
     1─N ImportBatch 1─N ImportBatchItem 1─1 Transaction
     1─N CategoryRule        @@unique(userId, pattern)
```

Todas as relações usam `onDelete: Cascade` a partir de `User`.

| Modelo | Campos relevantes | Observações |
|---|---|---|
| `User` | `name`, `email` (único, minúsculo), `passwordHash` (bcrypt, 12 rounds) | |
| `Transaction` | `description`, `amount` (Float), `category` (nome, texto), `date`, `type?` (`income`/`outcome`/`investment`), `paymentMethod?`, `notes?` | **Sinal do valor:** receita positiva; despesa e investimento negativos. `category` guarda o **nome**, não uma FK. |
| `Category` | `name`, `type`, `color?`, `icon?` | 18 categorias padrão são criadas no cadastro. |
| `Budget` | `category` (nome), `amount`, `month` (`YYYY-MM`) | Um orçamento por categoria/mês. |
| `Goal` | `name`, `targetAmount`, `currentAmount`, `deadline?`, `color?` | Progresso é informado manualmente. |
| `PasswordResetToken` | `token` (UUID), `expiresAt` (1 h), `usedAt?` | |
| `ImportBatch` | `fileName`, `fileHash` (SHA-256 do PDF), `issuer?`, `referenceMonth`, `dueDate?`, `statedTotal?`, `importedTotal`, `itemCount` | Um lote por fatura importada. O PDF não é armazenado. |
| `ImportBatchItem` | `batchId`, `transactionId` (único) | Liga a transação ao lote; some junto com qualquer um dos dois. A tabela `transactions` não tem coluna nova. |
| `CategoryRule` | `pattern` (estabelecimento normalizado), `category`, `type` | Regra "lembrar para as próximas faturas". |

Consequências do desenho atual:

- Renomear ou excluir uma categoria **não** atualiza transações e orçamentos que a referenciam pelo nome.
- Valores monetários em `Float` (ver `MELHORIAS.md`).
- Datas de transação são gravadas como meia-noite UTC do dia escolhido (o formulário envia `YYYY-MM-DD`).

## 4. Autenticação e sessão

1. **Cadastro** — `POST /api/register` cria o usuário e as 18 categorias padrão (transação única). Não inicia sessão.
2. **Login** — `POST /api/login` valida reCAPTCHA, e-mail e senha, e grava o cookie `session_token`.
3. **Cookie** — `httpOnly`, `sameSite=lax`, `secure` em produção, 30 dias, `path=/`. Conteúdo: `base64url(JSON{userId,email,exp}).base64url(HMAC-SHA256)`. A sessão é *stateless*: não há tabela de sessões nem revogação.
4. **Proxy** (`src/proxy.ts`) — para `/`, `/transactions`, `/investments`, `/planning`, `/categories`, `/budgets`, `/reports`, `/settings`: sem sessão válida redireciona para `/login`. Com sessão, `/login` redireciona para `/`. O casamento é por caminho exato.
5. **APIs** — cada handler chama `getAuthenticatedUser(request)` (`src/lib/auth.ts`), que valida o cookie e confirma no banco que o usuário existe. Falha -> `401 {"error":"Não autenticado."}`.
6. **Isolamento** — toda consulta filtra por `userId` do cookie; `PATCH`/`DELETE` usam `updateMany`/`deleteMany` com `{ id, userId }`, então o registro de outro usuário responde `404`, nunca `403`. O `userId` nunca é lido do corpo.
7. **Limite de tentativas de login** — 5 por 15 min por `email:ip`, em memória do processo (ver limitação em `MELHORIAS.md`).

## 5. Endpoints

Convenções: corpo e resposta em JSON; erros no formato `{"error": "mensagem"}`; corpo que não é JSON válido -> `400`; falha inesperada -> `500`.

### 5.1 Autenticação

| Método | Rota | Auth | Corpo | Sucesso | Erros |
|---|---|---|---|---|---|
| POST | `/api/register` | Não | `{name, email, senha}` (`password` também aceito) | `201 {user:{id,name,email}}` | `400` campos obrigatórios / e-mail inválido / senha < 8; `409` e-mail já cadastrado |
| POST | `/api/login` | Não | `{email, senha, recaptchaToken}` | `200 {success:true, mensagem}` + cookie | `400` campos ou token ausentes; `429` muitas tentativas; `403` reCAPTCHA reprovado; `503` falha ao consultar o Google; `401` credenciais inválidas |
| POST | `/api/logout` | Não | — | `200` + cookie expirado | — |
| GET | `/api/me` | Sim | — | `200 {user:{id,name,email}}` | `401` |
| POST | `/api/auth/forgot-password` | Não | `{email}` | `200 {message}` — mesma resposta exista ou não a conta | `400` e-mail ausente |
| POST | `/api/auth/reset-password` | Não | `{token, password}` | `200 {message}` | `400` token ausente / senha < 8 / link inválido, usado ou expirado |

Validação do reCAPTCHA: `success` verdadeiro, `action === "login"` e `hostname` igual ao host da requisição. O corte por `score` está **comentado** no código.

Outros detalhes:

- O e-mail é normalizado (`trim` + minúsculas) antes do limite de tentativas e da consulta.
- Para e-mail inexistente a senha é comparada com um hash fictício, igualando o tempo de resposta ao de uma conta real.
- `forgot-password` invalida os tokens anteriores ainda não usados do usuário e responde `200` mesmo se o envio do e-mail falhar (o erro vai para o log).
- `reset-password` troca a senha e marca o token como usado em uma única transação de banco.
- O token de sessão é verificado com `crypto.subtle.verify` (comparação em tempo constante); tokens sem `exp` numérico são rejeitados.

### 5.2 Transações

| Método | Rota | Corpo | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/transactions` | — | `200 Transaction[]` (ordem: `date` desc) | `401` |
| POST | `/api/transactions` | `{description, amount, category, type?, paymentMethod?, notes?, date?}` | `201 Transaction` | `400` validação; `401` |
| PATCH | `/api/transactions/[id]` | Qualquer subconjunto dos campos acima | `200 Transaction` | `400`; `401`; `404` |
| DELETE | `/api/transactions/[id]` | — | `200 {message}` | `401`; `404` |

Regras (`src/lib/validators.ts`): `description` e `category` texto não vazio (com `trim`); `amount` número finito diferente de zero; `type` em `income|outcome|investment` ou `null`; `date` interpretável como data; `paymentMethod` e `notes` texto ou `null`. Sem `date`, o banco usa o instante atual. `PATCH` sem nenhum campo -> `400 "Nenhum campo para atualizar."`. O sinal de `amount` **não** é conferido contra `type`.

### 5.3 Categorias

| Método | Rota | Corpo | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/categories` | — | `200 Category[]` (ordem: `type`, `name`) | `401` |
| POST | `/api/categories` | `{name, type, color?, icon?}` | `201 Category` | `400`; `401`; `409` nome+tipo já existe |
| PATCH | `/api/categories/[id]` | `{name, type, color?, icon?}` | `200 Category` | `400`; `401`; `404`; `409` |
| DELETE | `/api/categories/[id]` | — | `200 {message}` | `401`; `404` |

Regras: `name` não vazio (com `trim`); `type` em `income|outcome|investment`.

### 5.4 Orçamentos

| Método | Rota | Corpo | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/budgets` | — | `200 Budget[]` (ordem: `month` desc, `category`) | `401` |
| POST | `/api/budgets` | `{category, amount, month}` | `201 Budget` | `400`; `401`; `409` já existe orçamento da categoria no mês |
| PATCH | `/api/budgets/[id]` | `{category, amount, month}` | `200 Budget` | `400`; `401`; `404`; `409` |
| DELETE | `/api/budgets/[id]` | — | `200 {message}` | `401`; `404` |

Regras: `category` não vazio; `amount` > 0; `month` no formato `YYYY-MM` (mês 01–12). A API não verifica se a categoria existe para o usuário.

### 5.5 Metas

| Método | Rota | Corpo | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/goals` | — | `200 Goal[]` (ordem: `createdAt` desc) | `401` |
| POST | `/api/goals` | `{name, targetAmount, currentAmount?, deadline?, color?}` | `201 Goal` | `400`; `401` |
| PATCH | `/api/goals/[id]` | Subconjunto dos campos | `200 Goal` | `400`; `401`; `404` |
| DELETE | `/api/goals/[id]` | — | `200 {message}` | `401`; `404` |

Regras: `name` não vazio; `targetAmount` > 0; `currentAmount` >= 0; `deadline` data válida, `null` ou `""` (os dois últimos limpam o prazo; campo ausente no `PATCH` mantém o valor). `PATCH` sem nenhum campo -> `400`.

### 5.6 Importação de fatura

Lógica em `src/features/invoice-import/` e `src/lib/importValidators.ts`. A extração do PDF acontece no navegador; a API recebe só os lançamentos.

| Método | Rota | Corpo | Sucesso | Erros |
|---|---|---|---|---|
| POST | `/api/imports/preview` | `ImportPreviewRequest` (`fileName`, `fileHash`, `issuer`, `referenceMonth`, `dueDate`, `statedTotal`, `useInvoiceMonth?`, `items[]`) | `200 ImportPreviewResponse` | `400`; `401` |
| POST | `/api/imports` | `ImportConfirmRequest` (cabeçalho + `items[]`, `rules[]?`, `replaceTransactionId?`) | `201 {batch, created, replaced}` | `400`; `401`; `500` (nada é gravado) |
| GET | `/api/imports` | — | `200 ImportBatchSummary[]` (mais recentes primeiro) | `401` |
| DELETE | `/api/imports/[id]` | — | `200 {message, removed}` | `401`; `404` |
| GET | `/api/category-rules` | — | `200 [{id, pattern, category, type, createdAt}]` | `401` |
| DELETE | `/api/category-rules/[id]` | — | `200 {message}` | `401`; `404` |

Os tipos estão em `src/features/invoice-import/types.ts`.

**Preview** devolve, para cada linha: data efetiva (`getEffectiveDate`: parcela 2+ vai para o mês de referência), estabelecimento normalizado, tipo (`credit` vira receita), categoria sugerida e origem (`rule`, `history`, `keyword`), `duplicateOf` (transação existente com a mesma data, estabelecimento e valor) e `include` (falso para pagamento da fatura e para duplicata). Devolve também `alreadyImported` (lote com o mesmo `fileHash`) e `lumpCandidate` (despesa não importada com valor igual ao total da fatura, no mês de referência ou vizinho).

**Confirmação** roda em uma única transação de banco: remove `replaceTransactionId` (se for do usuário), cria o lote, cria cada transação (`paymentMethod = "Cartão de crédito"`, observação "Importado da fatura <emissor> <MM/AAAA>" + parcela, despesa negativa e receita positiva) com seu `ImportBatchItem`, e grava as regras por `upsert`.

Regras: 1 a 500 linhas; descrição não vazia; valor > 0; data `AAAA-MM-DD`; tipo `outcome|income`; categoria obrigatória na confirmação. Linha inválida -> `400 {error, invalidItems:[{index, error}]}`.

## 6. Migrations

`prisma/migrations` contém 10 migrations (de `init` até `add_invoice_import`). A `add_invoice_import` cria `import_batches`, `import_batch_items` e `category_rules` sem tocar em `transactions`; enquanto não for aplicada, só a tela de importação falha. A `drop_legacy_budget_index` remove um índice único antigo de orçamentos (categoria + mês, sem usuário) que a migration de multiusuário não conseguiu remover; **ela ainda precisa ser aplicada em produção**. Aplicar com `npx prisma migrate deploy` (produção) ou `npx prisma migrate dev` (desenvolvimento). O `README` antigo sugeria `prisma db push`, que ignora o histórico.
