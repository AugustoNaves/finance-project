# Mapa funcional do frontend — Finanças Pessoais

Documento gerado a partir da leitura integral do código-fonte do frontend (páginas, componentes, contexto, serviços, utilitários, tipos e estilos). Toda afirmação traz referência `arquivo:linha`.

Observações de escopo:

- **Base de referência: working tree da branch `docs-testes-melhorias`** (alterações ainda não commitadas sobre o commit `deb71c9`), relido em 12/10/2026 depois das correções de frontend e backend. As referências `arquivo:linha` valem para esse estado. A primeira versão deste documento descrevia o commit `deb71c9`; a seção 5 registra o que mudou desde então.
- Documentos relacionados: `docs/API.md` (backend e contratos das rotas), `docs/TESTES.md` (estratégia e suíte de testes), `docs/MELHORIAS.md` (backlog priorizado; a seção 5 daqui lista problemas e situação, sem priorizar) e `docs/specs/SPEC-importacao-fatura-pdf.md`.
- Trechos marcados "(verificado ao vivo em 12/10/2026)" vêm da exploração do aplicativo publicado, que rodava o build do commit `deb71c9`, em fuso America/Sao_Paulo e viewport de cerca de 674px (layout com drawer mobile). Eles comprovam o comportamento **anterior** às correções quando citados em itens marcados como corrigidos.
- Itens marcados "a confirmar" dependem de comportamento de navegador/execução que não foi possível comprovar só pelo código.

---

## 0. Interface atual — redesign "Caderneta" (17/10/2026)

A interface foi redesenhada e o app virou PWA (decisões em `docs/design/`, PWA em `docs/PWA.md`). **As regras de dados, cálculos, rotas e chamadas de API descritas nas seções 1 a 5 continuam valendo.** Textos de tela, estrutura visual e as referências `arquivo:linha` de páginas e componentes nessas seções descrevem a interface **anterior**; onde houver conflito, vale esta seção.

**Visual.** Tokens CSS em `src/styles/global.ts` (claro e escuro via `prefers-color-scheme`), Public Sans na interface e Literata nos valores. Listas pautadas em vez de cards; valores com sinal tipográfico (`−45,70`, `+1.800,00`) e saídas em vermelho; totais com sublinhado duplo.

**Navegação** (`src/components/AppNavigation`). Celular (< 960px): barra inferior fixa Mês · Lançamentos · (+) Registrar · Planejar · Mais. "Mais" abre uma folha com Importar fatura, Categorias e regras, Investimentos, Relatórios, Configurações e **Sair**. Desktop: coluna à esquerda com o nome, "+ Registrar" e os grupos "Dia a dia" (Mês, Lançamentos, Planejar) e "Organizar" (demais áreas) e Sair. Item ativo com `aria-current="page"`; `/budgets` marca Planejar. Sair faz `POST /api/logout` e recarrega em `/login` (limpa a lista em memória — resolve o item 24 da seção 5).

**Folha Registrar/Editar** (`src/contexts/EntrySheetContext.tsx`, `src/components/TransactionForm`). Provider no layout raiz; `openNewEntry(tipo?)` e `openEditEntry(lançamento)` podem ser chamados de qualquer tela. `CustomModal` vira folha inferior no celular e diálogo no desktop. Formulário: tipo em rádios (Gasto · Receita · Investimento), valor grande que aceita `1.234,56` ou `1234.56`, categorias em chips ordenadas pelas mais usadas no tipo (a primeira já vem escolhida), descrição opcional (vazia usa o nome da categoria), data (hoje local), forma de pagamento e observação. Valor ≤ 0 ou inválido mostra "Informe um valor maior que zero."; sem categoria, "Escolha uma categoria.". Na edição, "Excluir" abre a confirmação.

| Tela | O que mudou |
|---|---|
| Mês (`/`) | Seletor de mês com setas (h1 = "outubro de 2026"). "Sobra do mês" (saldo do mês) com Entrou/Saiu/Investiu e "Saldo acumulado" de todo o histórico em linha discreta. Lembrete âmbar quando a fatura do mês corrente ainda não foi importada (`GET /api/imports`). Orçamentos do mês ordenados por % usado (até 4). Últimos 7 lançamentos do mês; tocar edita. Os 4 cards de totais históricos e os 4 indicadores saíram (os indicadores estão em Relatórios). |
| Lançamentos (`/transactions`) | Busca e chips de tipo sempre visíveis; "Filtros (n)" abre Categoria, De, Até, Ordenar e Limpar. Lista agrupada por dia com subtotal quando ordenada por data; por valor, a data vai na linha. Sem botões Editar/Excluir na linha. |
| Importar fatura (`/import`) | Três passos numerados (enviar PDF com arrastar e soltar, conferir em lista pautada, importações anteriores). Valores editáveis aceitam vírgula. Mesma funcionalidade de antes. |
| Categorias e regras (`/categories`) | Abas Gastos · Receitas · Investimentos · Regras com contagem (setas do teclado navegam). Categoria = linha com ponto de cor, total e nº de lançamentos do mês; tocar edita, excluir fica dentro da edição. Cor escolhida numa paleta acessível (`ColorSwatches`) ou personalizada. |
| Planejar (`/planning`) | Seletor de mês próprio; orçamentos em linhas com "gasto de limite", barra (verde < 80%, âmbar 80–100%, vermelho > 100%), situação e linha de total; metas com atual/alvo, % · faltam · prazo, "Atualizar progresso" e "Excluir". Criação por links discretos nos cabeçalhos. |
| Investimentos (`/investments`) | "Total investido" e "Aportes no mês", distribuição por categoria, evolução dos aportes e lista de aportes (agrupada por dia, edição pela folha). "Novo aporte" abre a folha já em Investimento. |
| Relatórios (`/reports`) | Período com setas. "Balanço do período" em linhas (Receitas, Despesas, Investimentos, Saldo, Taxa de economia, Média diária, Maior despesa, Categoria líder, Movimento do período). Gráficos: receitas vs despesas e evolução do saldo (com lista mês → saldo). O donut por categoria foi substituído pela lista "Gastos por categoria". |
| Configurações (`/settings`) | Perfil (nome, e-mail, moeda, lançamentos, saldo acumulado; "Indisponível" se `/api/me` falhar), exportar CSV/JSON, instruções de instalação do app e Sair. |
| Login, esqueci e redefinir senha | Coluna estreita com a marca; no desktop, uma "página de caderno" ilustrativa. Mesmos fluxos e mensagens (sem "com sucesso"). |
| Offline (`/offline`) | Página pública exibida pelo service worker quando a navegação falha sem internet. |

Componentes removidos: SummaryCard, InsightCard, LatestTransactions, Dashboard, Header, TransactionTable, ExpenseDonutChart, ReportMetricCard, SettingsCard, CategoryCard, BudgetCard, GoalCard. Novos: MonthSwitcher, MonthSummary (reescrito), LedgerSection, EntryRow, CategoryRow, BudgetRow, GoalRow, ColorSwatches, ImportAmountInput, ServiceWorkerRegister.

## 1. Visão geral

### 1.1 O que é o sistema

Aplicação web de finanças pessoais, multiusuário, com interface em português (`<html lang="pt-BR">`, `src/app/layout.tsx:24`; título "Finanças Pessoais", descrição "Controle financeiro simplificado", `src/app/layout.tsx:13-16`). Permite cadastrar transações (receitas, despesas, investimentos), organizar categorias, definir orçamentos mensais por categoria, acompanhar metas, ver relatórios mensais com gráficos e exportar dados.

Características técnicas relevantes para o comportamento:

- Next.js 16 App Router; todas as telas são Client Components (`"use client"`), exceto `src/app/layout.tsx` e `src/app/budgets/page.tsx` (Server Components).
- Estilo com styled-components e registro de SSR (`src/lib/registry.tsx:7-31`). Tema único escuro, com cores fixas no código (`src/styles/global.ts:6-27`, `color-scheme: dark`); não existe `ThemeProvider` nem alternância claro/escuro. Fonte DM Sans (`src/app/layout.tsx:7-11`). `src/app/globals.css` é importado mas está vazio (0 bytes).
- Gráficos com `recharts` (`src/components/ExpenseDonutChart/index.tsx:3`, `IncomeOutcomeBarChart/index.tsx:3-11`, `BalanceLineChart/index.tsx:3-11`).
- Moeda sempre BRL, formato `pt-BR` (`src/utils/formatters.ts:1-6`).
- Datas de transações e prazos são tratadas como datas civis gravadas à meia-noite UTC; a exibição usa `toLocaleDateString("pt-BR", { timeZone: "UTC" })` (`src/utils/formatters.ts:8-10`) e os cálculos usam os helpers de `src/utils/dates.ts` (ver 1.5).

### 1.2 Rotas e telas

| Rota | Tela | Protegida? | Arquivo |
|---|---|---|---|
| `/login` | Login e Cadastro (mesma tela, dois modos) | Não. Usuário com sessão é redirecionado para `/` (`src/proxy.ts:24-26`) | `src/app/login/page.tsx` |
| `/forgot-password` | Esqueci a senha | Não (fora do `matcher`, `src/proxy.ts:31-43`) | `src/app/forgot-password/page.tsx` |
| `/reset-password?token=...` | Redefinir senha | Não (fora do `matcher`) | `src/app/reset-password/page.tsx` |
| `/` | Dashboard ("Visão geral") | Sim | `src/app/page.tsx` |
| `/transactions` | Transações | Sim | `src/app/transactions/page.tsx` |
| `/import` | Importar fatura por PDF (seção 2.12) | Sim | `src/app/import/page.tsx` |
| `/categories` | Categorias | Sim | `src/app/categories/page.tsx` |
| `/investments` | Investimentos | Sim | `src/app/investments/page.tsx` |
| `/planning` | Planejamento (orçamentos + metas) | Sim | `src/app/planning/page.tsx` |
| `/budgets` | Sem tela própria: `redirect("/planning")` | Sim | `src/app/budgets/page.tsx:3-5` |
| `/reports` | Relatórios | Sim | `src/app/reports/page.tsx` |
| `/settings` | Configurações | Sim | `src/app/settings/page.tsx` |

Os 7 destinos da navegação renderizam e `/budgets` redireciona para `/planning` (verificado ao vivo em 12/10/2026).

Proteção (`src/proxy.ts`):

- Lista de rotas protegidas por comparação exata do pathname (`src/proxy.ts:9-18`). Sem sessão válida → redireciona para `/login` (`src/proxy.ts:20-22`).
- Com sessão válida em `/login` → redireciona para `/` (`src/proxy.ts:24-26`).
- O `matcher` cobre só as 8 rotas protegidas e `/login` (`src/proxy.ts:31-43`). Rotas `/api/*` não passam pelo proxy; cada rota de API valida a sessão e responde 401 (ver `docs/API.md`).
- A sessão vem do cookie `session_token`, com validade de 30 dias (`src/proxy.ts:6`; `src/lib/session.ts:3-4`).

### 1.3 Estrutura de navegação

Não há sidebar nem bottom nav. O `AppShell` (`src/components/AppShell/index.tsx:11-18`) renderiza uma **barra superior** (`AppNavigation`) e o conteúdo em `<main>` com largura máxima de 1120px (`src/components/AppShell/styles.ts:44-54`). Só as telas autenticadas usam `AppShell`; login, esqueci e redefinir senha não têm navegação.

Itens, nesta ordem (`src/components/AppNavigation/index.tsx:23-31`):

| # | Rótulo | Destino |
|---|---|---|
| 1 | Início | `/` |
| 2 | Transações | `/transactions` |
| 3 | Categorias | `/categories` |
| 4 | Investimentos | `/investments` |
| 5 | Planejamento | `/planning` |
| 6 | Relatórios | `/reports` |
| 7 | Configurações | `/settings` |

- Não existe item "Orçamentos": orçamentos ficam dentro de Planejamento.
- Marca "F Finanças" à esquerda é link para `/` com `aria-label="Ir para o início"` (`src/components/AppNavigation/index.tsx:48-51`).
- Item ativo: `/` só quando o pathname é exatamente `/`; os demais por prefixo (`pathname.startsWith(href)`) (`src/components/AppNavigation/index.tsx:33-35`).
- Não há botão de sair na navegação; o logout está apenas em Configurações.
- Responsivo (≤768px): a lista horizontal some (`src/components/AppNavigation/styles.ts:83-85`) e aparece o botão "Menu" (`styles.ts:182-184`; `index.tsx:65-78`, com `aria-expanded` e `aria-controls="mobile-navigation"`). O botão abre um drawer lateral direito de largura `min(86vw, 340px)` (`styles.ts:216-229`) com os mesmos 7 itens (`index.tsx:99-111`). Fecha por: botão "Fechar" (`index.tsx:94-96`), clique no overlay (`index.tsx:80`) ou clique em qualquer link (`index.tsx:105`). O drawer não fecha com Esc (diferente dos modais, ver seção 3).

### 1.4 Estado global e fluxo de dados

`TransactionsProvider` envolve **toda** a aplicação no layout raiz, inclusive as telas públicas (`src/app/layout.tsx:28`). Por isso o console de `/login` registra um 401 de `GET /api/transactions` (verificado ao vivo em 12/10/2026).

| Dado | Quem carrega | Quando | Chamada |
|---|---|---|---|
| Transações (todas do usuário, sem paginação) | `TransactionsProvider` | Uma vez, na montagem do provider (`src/contexts/TransactionsContenxt.tsx:28-40`). Não há recarga ao navegar nem ao focar a aba | `GET /api/transactions` (`src/services/transactions.ts:4-13`) |
| Metas (para o insight do Dashboard) | Dashboard | Na montagem da página (`src/app/page.tsx:28-39`) | `GET /api/goals` |
| Categorias | Página Categorias (`src/app/categories/page.tsx:44-55`); página Planejamento (`src/app/planning/page.tsx:91-109`); `TransactionForm` a cada abertura do formulário (`src/components/TransactionForm/index.tsx:62-86`) | Na montagem de cada um | `GET /api/categories` |
| Orçamentos e metas | Página Planejamento, em `Promise.all` com categorias (`src/app/planning/page.tsx:94-98`) | Na montagem | `GET /api/budgets`, `GET /api/goals` |
| Usuário logado | Página Configurações (`src/app/settings/page.tsx:77-99`) | Na montagem | `GET /api/me` |

Operações do contexto (`src/contexts/TransactionsContenxt.tsx`):

- `addTransaction` → `POST /api/transactions`; insere o retorno **no início** da lista em memória (`:42-49`).
- `updateTransaction` → `PATCH /api/transactions/:id`; substitui o item na lista (`:51-59`).
- `deleteTransaction` → `DELETE /api/transactions/:id`; remove da lista (`:61-67`).
- As três **propagam a exceção** do serviço quando a API falha; o estado só muda em caso de sucesso.

Camada de serviços (`src/services/*.ts`):

- **Leituras** (`fetchTransactions`, `fetchCategories`, `fetchBudgets`, `fetchGoals`): resposta não-OK ou que não seja array vira `[]`, sem mensagem (`src/services/transactions.ts:8-10`, `categories.ts:8-10`, `budgets.ts:8-10`, `goals.ts:8-10`).
- **Mutações** (criar, editar, excluir): resposta não-OK lança `ApiError` com a mensagem `error` devolvida pela API ou, na falta dela, um texto padrão (`src/services/http.ts:1-25`). Textos padrão: "Não foi possível salvar/atualizar/excluir a transação." (`src/services/transactions.ts:25,41,53`), "... a categoria." (`categories.ts:23,37,49`), "... o orçamento." (`budgets.ts:23,37,49`), "... a meta." (`goals.ts:23,37,47`).
- Os formulários e o diálogo de confirmação capturam a exceção e mostram a mensagem em um bloco `role="alert"` (`src/components/FormError/index.tsx:9-13`; `getErrorMessage`, `src/services/http.ts:27-29`).

Consequências:

- Dashboard, Transações, Categorias (métricas dos cards), Investimentos, Planejamento (gasto dos orçamentos), Relatórios e Configurações (contagem, saldo, exportação) derivam tudo da mesma lista em memória; todos os cálculos são feitos no cliente.
- O login faz recarga completa (`window.location.href = "/"`, `src/app/login/page.tsx:227`), o que remonta o provider e carrega as transações do usuário. O logout usa navegação cliente (`router.push`), então a lista em memória não é limpa (item 24 da seção 5).

### 1.5 Regras de domínio transversais

Tipos (`src/types/transaction.ts:1-14`): `type` é `"income" | "outcome" | "investment"`, opcional/nulo para registros legados; `category` é o **nome** da categoria (string), não um id; `date` é string ISO.

Convenção de sinal de `amount` ao salvar pelo formulário (`src/components/TransactionForm/index.tsx:128-129`):

| Tipo escolhido | Valor gravado |
|---|---|
| Entrada (`income`) | `+valor digitado` |
| Saída (`outcome`) | `-valor digitado` |
| Investimento (`investment`) | `-valor digitado` |

Tipo efetivo de uma transação (`getTransactionType`, `src/utils/finance.ts:15-17`): usa `type` se existir; senão, `income` quando `amount > 0` e `outcome` caso contrário.

Resumo (`calculateSummary`, `src/utils/finance.ts:19-37`):

- `investment` soma `amount` das transações de tipo efetivo investimento (resultado negativo; este campo não é usado por nenhuma tela).
- Para as demais, a separação é **pelo sinal**, não pelo tipo: `amount > 0` soma em `income`; `amount <= 0` soma em `outcome` (resultado negativo).
- `total` soma `amount` de **todas** as transações, inclusive investimentos. Logo: saldo = receitas − despesas − investimentos.

Outras funções:

- `calculateInvestments`: soma de `|amount|` das transações de tipo investimento (`src/utils/finance.ts:39-43`).
- `calculateSavingsRate(income, balance)`: se `income <= 0` → "Sem receitas"; senão `"{round(balance / income * 100)}% economizado"` (`src/utils/finance.ts:45-49`). Pode ser negativo.

Datas e "mês" (`src/utils/dates.ts`), regra única para todas as telas:

| Helper | O que devolve | Uso |
|---|---|---|
| `getDateKey(valor)` (`:13-19`) | `AAAA-MM-DD` da data gravada, lida em **UTC** (string vazia se inválida) | Dia da transação: filtros De/Até (`src/app/transactions/page.tsx:38`), valor inicial da data na edição (`TransactionForm/index.tsx:58-60`) |
| `getMonthKey(valor)` (`:21-23`) | `AAAA-MM` da data gravada, em UTC | Mês da transação em Planejamento (`planning/page.tsx:114`), Relatórios (`reports/page.tsx:41-43`), Investimentos (`investments/page.tsx:17-19`) e em `isSameMonth` |
| `getLocalDateKey(data)` (`:5-7`) | `AAAA-MM-DD` de "agora" no **fuso local** | Data padrão do formulário de transação (`TransactionForm/index.tsx:59,157`) |
| `getLocalMonthKey(data)` (`:9-11`) | `AAAA-MM` de "agora" no fuso local | Mês atual em Planejamento (`planning/page.tsx:40-42`), Relatórios (`reports/page.tsx:37-39`), Investimentos (`investments/page.tsx:57`), `BudgetForm` (`BudgetForm/index.tsx:21-23`) e nas séries de 6 meses |
| `dateKeyToISOString(chave)` (`:25-27`) | ISO da meia-noite UTC do dia | Prazo da meta (`GoalForm/index.tsx:55`) |

`isSameMonth(data, referência)` compara o mês UTC da data gravada com o mês local da referência (`src/utils/finance.ts:4-6`); é o critério de "mês corrente" no Dashboard (`src/app/page.tsx:43`) e nos cards de Categorias (`src/app/categories/page.tsx:60-66`). Como o formulário envia `AAAA-MM-DD` e o backend grava meia-noite UTC, o dia e o mês que o usuário digitou são os mesmos que aparecem e entram nos cálculos, em qualquer fuso.

Formato de exibição de valores nas listas (`src/components/TransactionList/index.tsx:106-108,153-155`; `LatestTransactions/index.tsx:61-63,91-93`): investimento mostra `|amount|` sem sinal; os demais mostram prefixo `+` quando `amount > 0` e o valor formatado (negativos saem como `-R$ ...`).

---

## 2. Telas

### 2.1 Login / Cadastro — `/login`

**Propósito.** Autenticar usuário existente ou criar conta. Um único formulário com dois modos, controlado por `isRegisterMode` (`src/app/login/page.tsx:174`).

**Elementos.**

| Elemento | Detalhe | Referência |
|---|---|---|
| Cabeçalho | Logo "F", título "Bem-vindo", subtítulo "Acesse ou crie sua conta para gerenciar suas finanças com dados isolados." | `login/page.tsx:355-361` |
| Campo Nome | Só no modo cadastro; `type="text"`, `required`, placeholder "Seu nome" | `:241-258` |
| Campo E-mail | `type="email"`, `required`, placeholder "seu@email.com" | `:260-274` |
| Campo Senha | `type="password"`, `required`; `minLength={8}` apenas no modo cadastro | `:276-291` |
| Link "Esqueceu a senha?" | Só no modo login; vai para `/forgot-password` | `:292` |
| Mensagem | Bloco de erro ou sucesso (`FormMessage` com variante) | `:294` |
| Botão principal | "Entrar na conta" (login), "Criar conta" (cadastro), "Aguarde..." durante envio; desabilitado durante envio | `:296-302` |
| Divisor | Texto fixo "protegido por reCAPTCHA" (aparece nos dois modos) | `:304-306` |
| Alternador de modo | "Não tem uma conta? Cadastre-se" / "Já tem uma conta? Entrar"; ao alternar limpa a mensagem; desabilitado durante envio | `:308-320` |
| Selo | Texto fixo "Conexão criptografada e segura" | `:322-325` |
| Painel decorativo | Marca, "Suas finanças, sob controle.", "Gerencie receitas, despesas e saldo com clareza e segurança." e widgets **estáticos** (calendário "Maio 2026" com dia 4 marcado, cartão "•••• 4289 / Finanças Pro", "Saldo Total R$ 4.850,00", "↑ +12% este mês") | `:138-170,341-351` |

Todos os campos ficam desabilitados durante o envio (`disabled={isSubmitting}`, `:251,268,284`).

**Fluxo de login** (`:211-231`).

1. Se `executeRecaptcha` não estiver disponível → erro "reCAPTCHA ainda não carregou. Tente novamente." (`:211-214`). A chave vem de `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, com fallback para string vazia (`:332`).
2. Obtém token com a ação `"login"` (`:216`).
3. `POST /api/login` com `{ email, senha, recaptchaToken }` (`:218-222`).
4. Resposta OK → `window.location.href = "/"` (recarga completa) (`:226-227`).
5. Resposta não-OK → mostra `data.error` ou "Não foi possível entrar." (`:229`).

Mensagens que o servidor pode devolver e que a tela exibe literalmente (`src/app/api/login/route.ts`): "E-mail e senha são obrigatórios.", "Token do reCAPTCHA ausente", "Muitas tentativas. Tente novamente em alguns minutos." (5 tentativas em 15 minutos, `route.ts:12-13`), "Acesso bloqueado. Atividade suspeita detectada.", "Não foi possível validar o reCAPTCHA. Tente novamente." (503, quando o Google está inacessível), "Configuração do reCAPTCHA ausente.", "E-mail ou senha inválidos.", "Erro interno do servidor".

**Fluxo de cadastro** (`:189-209`).

1. `POST /api/register` com `{ name, email, senha }` (`:190-194`). Não usa reCAPTCHA.
2. Erro → `data.error` ou "Não foi possível criar a conta." (`:197-199`). Mensagens do servidor (`src/app/api/register/route.ts`): "Nome, e-mail e senha são obrigatórios.", "Informe um e-mail válido.", "A senha deve ter pelo menos 8 caracteres.", "Já existe uma conta com este e-mail.", "Erro interno do servidor."
3. Sucesso → volta ao modo login, limpa a senha, **mantém o e-mail** e mostra "Conta criada com sucesso. Agora entre com seu e-mail e senha." (`:202-208`). Não há login automático.
4. O backend cria, na mesma transação de banco, 18 categorias padrão para o novo usuário: receita (Salário, Freelance, Investimentos, Outros), despesa (Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Vestuário, Contas, Outros), investimento (Ações, Criptomoedas, Renda Fixa, Fundos, Outros) (`src/app/api/register/route.ts:55-74`). "Outros" existe nos três tipos.

**Erro inesperado** (exceção de rede, JSON inválido ou falha do reCAPTCHA): "Erro inesperado. Tente novamente." (`:231-233`).

**Responsivo.** ≤720px: layout de 2 colunas vira 1 e o painel decorativo é ocultado (`src/app/login/style.ts:86-88,101-103`). ≤480px: ajuste de padding do cartão (`style.ts:277`).

### 2.2 Esqueci a senha — `/forgot-password`

**Propósito.** Solicitar e-mail com link de redefinição.

**Elementos.** Título "Recuperar senha"; subtítulo "Informe seu email e enviaremos um link para redefinir sua senha." (`src/app/forgot-password/page.tsx:77-80`); campo E-mail (`type="email"`, `required`, desabilitado durante envio, `:87-95`); botão "Enviar link" / "Enviando..." (`:102-104`); link "Voltar para o login" → `/login` (`:107`).

**Fluxo** (`:41-70`).

- `POST /api/auth/forgot-password` com `{ email }` (`:47-51`).
- Não-OK → `data.error` ou "Erro ao enviar solicitação." (`:55-57`). Servidor pode enviar "Informe um email válido." ou "Erro ao processar a solicitação." (`src/app/api/auth/forgot-password/route.ts`).
- OK → mensagem neutra "Se este email estiver cadastrado, você receberá um link de recuperação em breve." e o campo é limpo (`:60-64`). O backend responde 200 genérico exista ou não a conta.
- Exceção → "Erro inesperado. Tente novamente." (`:65-66`).

O link enviado por e-mail aponta para `/reset-password?token=...`; o token expira em 1 hora (`src/lib/tokens.ts:4`) e um novo pedido invalida os anteriores (ver `docs/API.md`).

**Responsivo.** Cartão único centralizado; ajuste de padding ≤480px (`src/app/forgot-password/styles.ts:64`).

### 2.3 Redefinir senha — `/reset-password`

**Propósito.** Definir nova senha a partir do token recebido por e-mail.

**Elementos.** Título "Nova senha"; subtítulo "Digite sua nova senha abaixo." (`src/app/reset-password/page.tsx:100-103`); campos "Nova senha" e "Confirmar senha" (`type="password"`, `required`, `minLength={8}`, `:110-119,127-136`); botão "Redefinir senha" / "Redefinindo...", **desabilitado quando não há token na URL** ou durante envio (`:143-145`). Não há link de volta para o login.

**Regras** (`:45-93`), na ordem:

1. Senha com menos de 8 caracteres → "A senha deve ter pelo menos 8 caracteres." (`:49-52`).
2. Senhas diferentes → "As senhas não coincidem." (`:54-57`).
3. Token ausente → "Token inválido ou ausente." (`:59-62`). Na prática inalcançável pelo botão, que já fica desabilitado sem token.
4. `POST /api/auth/reset-password` com `{ token, password }` (`:67-71`).
5. Não-OK → `data.error` ou "Erro ao redefinir senha." (`:75-77`). Servidor: "Token inválido.", "A nova senha deve ter pelo menos 8 caracteres.", "Link inválido ou expirado.", "Erro ao redefinir senha." (`src/app/api/auth/reset-password/route.ts`).
6. OK → "Senha redefinida com sucesso. Redirecionando para o login..." e `router.push("/login")` após 2 segundos (`:80-87`).
7. Exceção → "Erro inesperado. Tente novamente." (`:88-89`).

O token é lido com `useSearchParams` dentro de `Suspense` com fallback nulo (`:38-39,152-157`).

### 2.4 Dashboard — `/`

**Propósito.** Visão geral: totais acumulados, últimas transações, resumo do mês corrente e quatro indicadores.

**Cabeçalho** (`src/app/page.tsx:81-87`): eyebrow "Visão geral", título "Controle financeiro", subtítulo "Acompanhe receitas, despesas, investimentos e saldo total em um painel simples para o dia a dia.", botão "+ Nova Transação" (abre o modal "Nova Transação", ver 2.5.1).

**Cards de resumo** (`:89-110`) — calculados sobre **todas as transações carregadas**, não só o mês (`:42`). Na aplicação publicada os cards mostravam o acumulado enquanto o "Resumo do mês" mostrava outubro (verificado ao vivo em 12/10/2026).

| Card | Fórmula |
|---|---|
| Receitas | `summary.income` (soma dos `amount > 0` que não são investimento) |
| Despesas | `summary.outcome` (soma dos `amount <= 0` que não são investimento; exibido negativo) |
| Investimentos | `calculateInvestments` (soma de `|amount|` dos investimentos) |
| Saldo Total | `summary.total` (soma de todos os `amount`, investimentos inclusive) |

**Últimas transações** (`src/components/LatestTransactions/index.tsx`): recebe a lista ordenada por data decrescente (`src/app/page.tsx:73-75`) e mostra as 5 primeiras (`LatestTransactions/index.tsx:27`). Colunas: Descrição, Valor, Categoria, Data (`:46-49`). Título "Últimas transações", legenda "Movimentações mais recentes registradas no app." (`:33-34`). Vazio: "Nenhuma transação registrada ainda." (`:39`). Sem ações de editar/excluir aqui.

**Resumo do mês** (`src/components/MonthSummary/index.tsx`; dados em `src/app/page.tsx:43-44,117-123`): rótulo com mês e ano por extenso (`formatMonthYear`, `src/utils/formatters.ts:12-17`); "Entradas" = `income` do mês; "Saídas" = `outcome` do mês (negativo); "Saldo do mês" = `total` do mês; selo com a taxa de economia `calculateSavingsRate(income do mês, total do mês)` (`page.tsx:62`).

**Insights** (`src/app/page.tsx:126-167`), todos sobre o mês corrente (regra de 1.5), exceto a meta:

| Card | Valor | Descrição | Vazio |
|---|---|---|---|
| Maior despesa | `amount` (negativo) da transação de tipo despesa com menor `amount` no mês (`:46-48`) | "{descrição} foi a maior saída deste mês." | "Sem dados" / "Cadastre despesas para visualizar este indicador." |
| Categoria em destaque | Nome da categoria com maior soma de `|amount|` entre despesas do mês (`:50-60`) | "{total} concentrados nesta categoria." | "Sem dados" / "As categorias aparecerão conforme você registrar transações." |
| Movimento do mês | Quantidade de transações do mês, de qualquer tipo (`:149`) | "Total de transações registradas no mês atual." | Mostra "0" |
| Meta mais próxima | `round(currentAmount / targetAmount * 100)%` da meta com maior razão de progresso entre as **ainda não concluídas** (`targetAmount > 0` e `currentAmount < targetAmount`) (`:64-71,155-158`) | "{nome}: {atual} de {alvo}." | "Sem metas" / "Cadastre metas em Planejamento para acompanhar o progresso." |

**APIs.** `GET /api/transactions` (pelo contexto) e `GET /api/goals` (`:28-39`).

**Estados.** Não há indicador de carregamento: enquanto os dados não chegam, os cards mostram R$ 0,00 e os textos de vazio. Erros de carga só vão para o console (`:33-35`).

**Responsivo** (`src/app/styles.ts`): cards de resumo e insights em 4 colunas → 2 (≤1080px) → 1 (≤560px) (`:17-23,48-54`); grade principal de 2 colunas → 1 (≤920px) (`:33-35`). A tabela de últimas transações vira lista de cards ≤720px (`src/components/LatestTransactions/styles.ts:61-63,118-120`).

### 2.5 Transações — `/transactions`

**Propósito.** Listar, buscar, filtrar, ordenar, criar, editar e excluir transações.

**Cabeçalho** (`src/app/transactions/page.tsx:81-87`): "Transações" / "Todas as movimentações" / "Busque, filtre e acompanhe todas as receitas, despesas e investimentos cadastrados." / botão "+ Nova Transação".

**Filtros** (`src/components/TransactionFilters/index.tsx`; estado inicial em `transactions/page.tsx:17-24`). Todos se combinam com E lógico (`page.tsx:55-61`) e atuam em memória. Os ids dos controles têm prefixo `transaction-filter-` (`TransactionFilters/index.tsx:49-51,60-62,76-78,92-94,102-104,112-114`), distintos dos ids do formulário de transação.

| Filtro | Controle (id) | Opções / regra | Padrão |
|---|---|---|---|
| Buscar | `type="search"` (`transaction-filter-search`), placeholder "Buscar por descrição..." | Substring na **descrição**, sem diferenciar maiúsculas, com `trim` (`page.tsx:39-42`). Não busca em categoria, observação ou valor | vazio |
| Tipo | select (`transaction-filter-type`) | Todos, Receitas, Despesas, Investimentos (`TransactionFilters/index.tsx:68-71`); compara com o tipo efetivo (`page.tsx:43-45`) | Todos |
| Categoria | select (`transaction-filter-category`) | "Todas" + nomes distintos presentes **nas transações** (não vem do cadastro de categorias), em ordem alfabética (`page.tsx:32-34,46-47`) | Todas |
| De | `type="date"` (`transaction-filter-start-date`) | `getDateKey(data) >= De`, comparação de strings `AAAA-MM-DD` (`page.tsx:38,48-50`) | vazio |
| Até | `type="date"` (`transaction-filter-end-date`) | `getDateKey(data) <= Até` (`page.tsx:51-53`) | vazio |
| Ordenar | select (`transaction-filter-sort`) | Mais recentes, Mais antigas, Maior valor, Menor valor; valor compara `|amount|`; sem critério de desempate (`page.tsx:63-77`) | Mais recentes |
| Limpar filtros | botão | Restaura o estado inicial (`page.tsx:94`) | — |

**Lista** (`src/components/TransactionList/index.tsx`): título "Transações" e contador "{n} registro(s) encontrado(s)" (`:77-78`). Tabela com colunas Descrição, Valor, Categoria, Data, Ações (`:90-94`); cada linha tem "Editar" e "Excluir" (`:117-129`). Vazio: "Nenhuma transação encontrada com os filtros atuais." (`:83`). Forma de pagamento e observação **não são exibidas** na lista; só aparecem no formulário de edição. Não há paginação nem totalizador.

**Excluir** (`:59-64,180-191`): diálogo "Confirmar exclusão" com a mensagem "Tem certeza que deseja excluir a transação "{descrição}"?" (fallback "Tem certeza que deseja excluir esta transação?"), botões "Cancelar" e "Confirmar exclusão". Confirma → `DELETE /api/transactions/:id`. Sucesso fecha o diálogo; falha mantém o diálogo aberto com a mensagem de erro (ver `ConfirmDialog` na seção 3).

**Editar** (`:66-71,193-206`): modal "Editar transação" com o mesmo formulário, botão "Salvar alterações" → `PATCH /api/transactions/:id`. Sucesso fecha o modal; falha mantém o modal aberto, com os valores digitados e a mensagem de erro. Valores iniciais (`:35-45`): descrição, `amount`, categoria, tipo (ou inferido pelo sinal), forma de pagamento (ou "Pix"), observação e **data original** da transação.

**Responsivo.** Painel de filtros em 7 colunas → 3 (≤1080px) → 1 (≤680px) (`src/components/TransactionFilters/styles.ts:25-35`). Tabela oculta e cards exibidos ≤780px (`src/components/TransactionList/styles.ts:61-63,157-159`); cada card mostra descrição, "categoria • data", valor e os botões (`TransactionList/index.tsx:144-173`). Cabeçalho da página empilha e o botão ocupa 100% ≤640px (`src/components/PageHeader/styles.ts:18,115-117`).

#### 2.5.1 Formulário de transação (modal "Nova Transação" / "Novo Aporte" / "Editar transação")

Usado pelo `NewTransactionModal` (Dashboard, Transações, Investimentos) e pela edição na lista. Componente: `src/components/TransactionForm/index.tsx`. Props relevantes: `initialValues`, `defaultType` (padrão `outcome`), `submitLabel` (`:28-40`).

| Campo | Controle | Validação | Padrão (novo) | Referência |
|---|---|---|---|---|
| Descrição | texto, placeholder "Ex: Salário, Aluguel..." | `required` (o backend aplica `trim` e rejeita vazio) | vazio | `:163-173` |
| Valor | `type="number"`, placeholder "R$ 0,00" | `required`, `min="0.01"`, `step="0.01"` | vazio; na edição, `|amount|` (`:47-49`) | `:175-187` |
| Data | `type="date"` | `required` | hoje no fuso local (`getLocalDateKey`); na edição, a data da transação (`getDateKey`) | `:58-60,189-198` |
| Tipo | 3 botões: "Entrada", "Saída", "Investimento" | — | `defaultType`: "Saída", exceto em Investimentos, que passa "Investimento" | `:43-45,200-228` |
| Categoria | select (`transaction-category`) | `required`; opção vazia "Selecione uma categoria" (ou "Carregando categorias..." durante a carga) | primeira categoria do tipo atual, selecionada automaticamente (`:88-96`) | `:230-253` |
| "+" (ao lado de Categoria) | botão, `aria-label="Nova categoria"` | — | — | `:254-261` |
| Forma de pagamento | select | Opções: Pix, Dinheiro, Cartão de débito, Cartão de crédito, Transferência, Boleto, Outro | Pix | `:265-280` |
| Observação | textarea (3 linhas), placeholder "Detalhes opcionais sobre esta transação..." | opcional; `trim`; vazio vira `null` (`:142`) | vazio | `:282-291` |
| Erro | bloco `role="alert"` acima do botão | — | oculto | `:293` |
| Botão | "Salvar Transação" (novo) / "Salvar alterações" (edição); desabilitado durante o envio | — | — | `:38,295-297` |

Regras:

- As opções de categoria são apenas as do **tipo selecionado** (`:98-100`). Trocar o tipo troca a lista e seleciona a primeira categoria do novo tipo, ou vazio se não houver (`:109-114`).
- Na edição, se a categoria original não existir mais entre as opções do tipo (renomeada, excluída ou de outro tipo), ela é mantida como opção extra (`:104-107,245-247`).
- Ao enviar, o valor recebe sinal conforme o tipo (ver 1.5) e o payload é `{ description, amount, category, type, paymentMethod, date, notes }` (`:125-143`).
- **Falha** (exceção do `onSubmit`): mostra a mensagem da API ou "Não foi possível salvar a transação.", reabilita o botão e **mantém os valores** (`:144-148`). Mensagens de validação do backend que podem aparecer: "Descrição é obrigatória.", "Informe um valor numérico diferente de zero.", "Categoria é obrigatória.", "Data inválida." (`src/lib/validators.ts`; lista completa em `docs/API.md`).
- **Sucesso**: o formulário volta aos padrões (`:150-157`) e quem o abriu fecha o modal (`src/components/NewTransactionModal/index.tsx:23-26`; `TransactionList/index.tsx:66-71`).
- Botão "+": abre um segundo modal "Nova categoria" (largura máxima 420px) com o `CategoryForm` pré-preenchido com o tipo atual, cor `#00c48c` e botão "Criar categoria" (`:300-311`). Ao salvar: `POST /api/categories`, recarrega `GET /api/categories`, seleciona a nova categoria e fecha o modal aninhado (`:116-123`). Se a criação falhar, o erro aparece dentro do `CategoryForm` e o modal aninhado continua aberto.

**APIs do formulário.** `GET /api/categories` na montagem; `POST /api/categories` (criação rápida); `POST /api/transactions` ou `PATCH /api/transactions/:id`.

### 2.6 Categorias — `/categories`

**Propósito.** Manter as categorias por tipo e ver quanto cada uma movimentou no mês corrente.

**Cabeçalho** (`src/app/categories/page.tsx:123-129`): "Categorias" / "Organize seus grupos" / "Crie categorias de receitas, despesas e investimentos para acompanhar onde o dinheiro entra, sai e é aplicado." / botão "+ Nova Categoria".

**Seções**, nesta ordem: Despesas, Receitas, Investimentos (`:132-193`). Cada uma mostra "{n} categoria(s)" e, quando vazia, respectivamente "Nenhuma categoria de despesa cadastrada.", "Nenhuma categoria de receita cadastrada.", "Nenhuma categoria de investimento cadastrada." (`:138,159,180`).

**Card** (`src/components/CategoryCard/index.tsx`):

- Marca colorida com as 2 primeiras letras do campo ícone em maiúsculas ou, sem ícone, a inicial do nome (`:44-46`). Digitar "food" exibe "FO" (verificado ao vivo em 12/10/2026). A cor da categoria é usada como destaque do card (`:42,44`).
- Nome e rótulo do tipo ("Receita", "Despesa", "Investimento"), mostrado duas vezes: subtítulo e selo (`:34-39,48-51`) (verificado ao vivo em 12/10/2026).
- "Transações no mês": quantidade de transações cujo `category` é igual ao **nome** da categoria, cujo **tipo efetivo é igual ao tipo da categoria** e cuja data está no mês corrente. "Total no mês": soma de `|amount|` dessas transações (`src/app/categories/page.tsx:59-78`).
- Botões "Editar" e "Excluir" (`CategoryCard/index.tsx:65-72`).

**Formulário** (`src/components/CategoryForm/index.tsx`), usado em "Nova categoria" (`page.tsx:196-198`) e "Editar categoria" (`:200-213`):

| Campo | Controle | Regra | Padrão |
|---|---|---|---|
| Nome | texto, placeholder "Ex: Alimentação" | `required`; enviado com `trim` (`:37,60-69`) | vazio |
| Tipo | select: Receita, Despesa, Investimento (`:78-80`) | — | Despesa (`:23`) |
| Cor | `type="color"` (seletor nativo) (`:85-93`) | — | `#00c48c` (`:24`) |
| Ícone simples | texto livre, placeholder "Ex: food, car, home" (`:95-103`) | opcional; vazio é enviado como `null`, o que permite remover o ícone na edição (`:40`). Não é um seletor de ícones: só as 2 primeiras letras aparecem no card | vazio |
| Erro | bloco `role="alert"` (`:104`) | — | oculto |
| Botão | "Salvar categoria" (novo) / "Salvar alterações" (edição) / "Criar categoria" (criação rápida); desabilitado durante o envio (`:19,106-108`) | — | — |

**Ações e APIs.**

- Criar → `POST /api/categories`; sucesso acrescenta ao **fim** da lista e fecha o modal (`page.tsx:80-85`).
- Editar → `PATCH /api/categories/:id`; sucesso substitui e fecha (`:87-98`).
- Excluir → diálogo "Confirmar exclusão" com "Tem certeza que deseja excluir a categoria {nome}?" e botão "Confirmar exclusão" (`:215-222`) → `DELETE /api/categories/:id`; sucesso remove e fecha (`:100-109`).
- Falha em criar/editar: o modal permanece aberto, os valores são mantidos e a mensagem aparece no formulário (`CategoryForm/index.tsx:42-46`). Nome+tipo duplicado → "Já existe uma categoria com este nome e tipo." (409, `src/app/api/categories/route.ts:61`, `src/app/api/categories/[id]/route.ts:47`); nome só com espaços → "Nome e tipo são obrigatórios." (`src/lib/validators.ts`). Fallback: "Não foi possível salvar a categoria."
- Falha em excluir: mensagem dentro do diálogo de confirmação.
- Renomear ou excluir uma categoria **não altera** transações nem orçamentos, que continuam com o nome antigo (o `PATCH`/`DELETE` só toca a tabela de categorias, `src/app/api/categories/[id]/route.ts:32-35,71-73`).

**Estados.** Sem indicador de carregamento (as três seções aparecem vazias até a resposta). Erro de carga só no console (`page.tsx:49-51`).

**Responsivo.** Grade de 3 colunas → 2 (≤980px) → 1 (≤640px) (`src/app/categories/styles.ts:55-65`).

### 2.7 Investimentos — `/investments`

**Propósito.** Acompanhar aportes (transações do tipo investimento).

**Cabeçalho** (`src/app/investments/page.tsx:75-81`): "Investimentos" / "Aportes e patrimônio" / "Acompanhe para onde seus investimentos estão indo e a evolução dos aportes ao longo do tempo." / botão "+ Novo Aporte".

**Regras.**

- Conjunto base: transações com tipo efetivo `investment` (`:47-50`). Registros sem `type` nunca entram.
- "Total investido": soma de `|amount|` de todos os investimentos, sem recorte de período (`:52-55,85-89`).
- "Aportes no mês": soma de `|amount|` dos investimentos cujo mês (`getMonthKey`) é o mês atual (`getLocalMonthKey`) (`:57,90-101`).
- "Evolução dos aportes — Últimos 6 meses": para cada um dos 6 meses terminando no mês atual, soma de `|amount|` do mês (valor mensal, **não acumulado**) (`:30-40,58-71,104-108`). Usa o `BalanceLineChart`, cuja série se chama "Saldo" (`src/components/BalanceLineChart/index.tsx:55`).
- Não há conceito de resgate, rentabilidade ou patrimônio: todo investimento conta como aporte pelo valor absoluto.

**Lista.** O mesmo `TransactionList` de Transações, com editar e excluir, recebendo só os investimentos na ordem em que estão no contexto (sem filtros nem ordenação próprios) (`:110-116`).

**Botão "+ Novo Aporte".** Abre o `NewTransactionModal` com título "Novo Aporte" e o tipo "Investimento" já selecionado (`title="Novo Aporte"`, `defaultType="investment"`, `:119-124`; `NewTransactionModal/index.tsx:11-12,18-19,31-36`). As categorias listadas já são as de investimento.

**APIs.** Nenhuma própria; usa o contexto e as chamadas do formulário.

**Responsivo.** Dois cards lado a lado → 1 coluna ≤640px (`src/app/investments/styles.ts:21-28`). Gráfico com altura fixa de 280px e largura 100% (`BalanceLineChart/index.tsx:30`).

### 2.8 Orçamentos — parte de `/planning` (e redirecionamento de `/budgets`)

**Rota `/budgets`.** Não tem tela: redireciona para `/planning` (`src/app/budgets/page.tsx:3-5`). O arquivo `src/app/budgets/styles.ts` existe mas não é importado por ninguém.

**Cabeçalho da página Planejamento** (`src/app/planning/page.tsx:211-215`): "Planejamento" / "Orçamentos e metas" / "Defina limites mensais de gasto e acompanhe o progresso das suas metas financeiras." (sem botão de ação no cabeçalho).

**Seção de orçamentos** (`:218-267`).

- Título "Orçamentos — {mês por extenso}" (ex.: "Orçamentos — outubro de 2026") e contador "{n} orçamento(s) neste mês" (`:221-222`). Os títulos de seção não forçam mais maiúsculas; a versão publicada exibia "Orçamentos — Outubro De 2026" e "Metas Financeiras" por causa de `text-transform: capitalize`, já removido de `src/app/planning/styles.ts` (verificado ao vivo em 12/10/2026).
- Filtro "Mês" (`type="month"`, id `planning-month-filter`), padrão mês atual no fuso local; se o usuário limpar o campo, volta ao mês atual (`:89,225-235`).
- Botão "+ Novo orçamento" (`:236-241`).
- Lista: orçamentos cujo `month` (string `AAAA-MM`) é igual ao mês selecionado, ordenados por nome da categoria (`:203-205`).
- Vazio: "Nenhum orçamento cadastrado para este mês." (`:246`).

**Como o orçamento casa com as transações** (`getBudgetMetrics`, `:111-137`):

- `gasto` = soma de `|amount|` das transações em que `transaction.category === budget.category` (comparação por **nome**, exata), `getMonthKey(data)` é igual a `budget.month` e o tipo efetivo é `outcome`.
- `progresso` = `gasto / limite * 100` (0 se o limite não for positivo).
- `restante` = `limite − gasto` (pode ficar negativo e é exibido assim).
- `status`: `progresso >= 100` → `danger`; `>= 80` → `warning`; senão `safe` (`:125`).
- Exemplo: limite R$ 10,00 e gasto R$ 12,34 mostra "123%", "Restante -R$ 2,34" e "Limite ultrapassado" (verificado ao vivo em 12/10/2026).

**Card** (`src/components/BudgetCard/index.tsx`): categoria, mês por extenso, percentual arredondado (pode passar de 100%), barra de progresso (limitada a 0–100%; cor verde/azul abaixo de 80, laranja a partir de 80, vermelha a partir de 100 — `src/components/ProgressBar/index.tsx:11`, `ProgressBar/styles.ts:21-26`), métricas "Limite", "Gasto", "Restante" (`:53-66`), alerta textual "Dentro do previsto" / "Atenção: acima de 80%" / "Limite ultrapassado" (`:34-39`), botões "Editar" e "Excluir".

**Formulário** (`src/components/BudgetForm/index.tsx`), em "Novo orçamento" e "Editar orçamento" (`planning/page.tsx:297-324`):

| Campo | Controle | Regra | Padrão |
|---|---|---|---|
| Categoria | select | `required`; só categorias do tipo **despesa** (`:32`); opção vazia "Selecione uma categoria"; na edição, mantém a categoria original como opção extra se ela não existir mais (`:84-86`) | primeira categoria de despesa (`:33,41`) |
| Limite mensal | `type="number"`, `min="0.01"`, `step="0.01"`, placeholder "R$ 0,00" (`:95-107`) | `required` | vazio |
| Mês | `type="month"` (`:109-118`) | `required` | `defaultMonth`, que a página preenche com o **mês selecionado no filtro** (`BudgetForm/index.tsx:36-38`; `planning/page.tsx:305`); sem ele, mês atual |
| Erro | bloco `role="alert"` (`:120`) | — | oculto |
| Botão | "Salvar orçamento" / "Salvar alterações"; desabilitado durante o envio (`:29,122-124`) | — | — |

**Ações e APIs.**

- Criar → `POST /api/budgets` `{ category, amount, month }`; sucesso insere no início, **muda o filtro para o mês do orçamento criado** e fecha (`planning/page.tsx:139-145`).
- Editar → `PATCH /api/budgets/:id`; sucesso substitui, muda o filtro para o mês do orçamento e fecha (`:147-159`).
- Excluir → diálogo "Confirmar exclusão" / "Tem certeza que deseja excluir o orçamento de {categoria}?" (`:349-356`) → `DELETE /api/budgets/:id` (`:161-170`).
- Falha em criar/editar: modal aberto, valores mantidos e mensagem no formulário (`BudgetForm/index.tsx:58-62`). Orçamento duplicado para a mesma categoria e mês → "Já existe um orçamento para esta categoria neste mês." (409, `src/app/api/budgets/route.ts:61`, `src/app/api/budgets/[id]/route.ts:46`). Fallback: "Não foi possível salvar o orçamento." Na versão publicada o mesmo cenário devolvia 500, o modal ficava aberto sem mensagem e os campos eram limpos (verificado ao vivo em 12/10/2026).

**Responsivo.** Grade de 2 colunas → 1 (≤860px) (`src/app/planning/styles.ts:137-145`); cabeçalho da seção empilha ≤720px (`:126`); métricas do card em 3 colunas → 1 (≤560px) (`src/components/BudgetCard/styles.ts:76-81`).

### 2.9 Planejamento — metas (`/planning`)

**Seção** (`src/app/planning/page.tsx:269-294`): título "Metas financeiras", contador "{n} meta(s) em andamento" (conta todas as metas, inclusive concluídas), botão "+ Nova meta" (`:272-277`). Vazio: "Nenhuma meta cadastrada ainda." (`:281`).

**Regras.**

- `progresso` = `currentAmount / targetAmount * 100`, ou 0 se o alvo não for positivo (`:71-76`). Exibido arredondado (pode passar de 100%); a barra é limitada a 100% e usa a cor da meta (`src/components/GoalCard/index.tsx:35,38`).
- `restante` = `max(targetAmount − currentAmount, 0)` (`GoalCard/index.tsx:29`).
- O progresso é **manual**: não há vínculo com transações nem com investimentos. Atualiza-se editando "Valor atual".
- Prazo, quando existe: "Prazo: {dd/mm/aaaa}", formatado com `formatDate` em UTC, portanto igual ao dia digitado (`GoalCard/index.tsx:55-59`). Na versão publicada, prazo 31/12 aparecia como "Prazo: 30/12/2026" (verificado ao vivo em 12/10/2026). Não há indicação de prazo vencido nem de meta concluída.

**Card**: nome, percentual, barra, "Atual", "Alvo", "Restante", prazo, botões "Atualizar progresso" e "Excluir" (`GoalCard/index.tsx:31-69`).

**Formulário** (`src/components/GoalForm/index.tsx`), em "Nova meta" e "Atualizar meta" (`planning/page.tsx:326-347`):

| Campo | Controle | Regra | Padrão |
|---|---|---|---|
| Nome da meta | texto, placeholder "Ex: Reserva de emergência" (`:77-87`) | `required`; `trim` (`:52`) | vazio |
| Valor alvo | number, `min="0.01"`, `step="0.01"` (`:89-101`) | `required` | vazio |
| Valor atual | number, `min="0"`, `step="0.01"` (`:103-114`) | opcional; vazio vira 0 (`:54`) | vazio |
| Prazo (opcional) | `type="date"` (`:116-124`) | enviado como meia-noite UTC do dia (`dateKeyToISOString`) ou `null` (`:55`) | vazio; na edição, os 10 primeiros caracteres do ISO (`:37-39`) |
| Cor | `type="color"` (`:126-134`) | — | `#00c48c` (`:40`) |
| Erro | bloco `role="alert"` (`:136`) | — | oculto |
| Botão | "Salvar meta" / "Salvar alterações"; desabilitado durante o envio (`:27,138-140`) | — | — |

"Atualizar progresso" abre o formulário completo (todos os campos editáveis), não um campo único de valor.

**Ações e APIs.** Criar → `POST /api/goals` (insere no início, `:172-177`); editar → `PATCH /api/goals/:id` (`:179-190`); excluir → diálogo "Confirmar exclusão" / "Tem certeza que deseja excluir a meta {nome}?" (`:358-365`) → `DELETE /api/goals/:id` (`:192-201`). Falhas mantêm o modal aberto com a mensagem da API (por exemplo "Valor alvo deve ser um número maior que zero.", `src/lib/validators.ts`) ou o fallback "Não foi possível salvar a meta." (`GoalForm/index.tsx:58-62`).

**Carga da página.** `GET /api/budgets`, `GET /api/categories` e `GET /api/goals` em paralelo (`:91-109`); erro só no console.

### 2.10 Relatórios — `/reports`

**Propósito.** Análise de um mês e evolução dos 6 meses que terminam nele. Somente leitura.

**Cabeçalho** (`src/app/reports/page.tsx:129-133`): "Relatórios" / "Análise do período" / "Veja receitas, despesas, categorias mais fortes e a evolução do saldo sem gráficos externos." (sem botão).

**Filtro "Período"** (`src/components/PeriodFilter/index.tsx:13-21`): `type="month"`, id `reports-period`; padrão mês atual no fuso local; limpar volta ao mês atual (`reports/page.tsx:68,137-140`).

**Base de cálculo.** Transações cujo mês (`getMonthKey`) é igual ao mês selecionado (`:70-72`).

**Métricas** (`:143-194`):

| Card | Fórmula | Descrição exibida |
|---|---|---|
| Receitas | `summary.income` do mês | "Total de entradas registradas no período." |
| Despesas | `summary.outcome` do mês (negativo) | "Total de saídas registradas no período." |
| Saldo | `summary.total` do mês (inclui investimentos como saída) | "Diferença entre receitas e despesas do mês." |
| Maior despesa | `amount` da despesa de menor `amount` (`:77-79`); vazio: "Sem dados" | "{descrição} foi a maior saída do período." / "Cadastre despesas para visualizar este indicador." |
| Categoria líder | Categoria com maior soma de `|amount|` entre as despesas (`:80-99`); vazio: "Sem dados" | "{valor} concentrados nesta categoria." / "As categorias aparecerão conforme houver despesas." |
| Média diária | `|summary.outcome| / dias`, onde `dias` = dia de hoje se o mês selecionado é o atual, senão o número de dias do mês (`:88,100-107`) | "Média de despesas por dia no mês selecionado." |
| Taxa de economia | `calculateSavingsRate(income, total)` | "Proporção estimada do saldo sobre as receitas do mês." |

Exemplo com dados reais de 08/2026 (verificado ao vivo em 12/10/2026): receitas R$ 1.861,62; despesas −R$ 783,10; saldo R$ 578,52 (um investimento de R$ 500,00 foi descontado); taxa "31% economizado"; média diária R$ 25,26 (783,10 / 31, mês encerrado).

**Gráficos** (`:196-226`):

| Bloco | Componente | Dados | Vazio |
|---|---|---|---|
| "Despesas por categoria" (rótulo "Donut") | `ExpenseDonutChart` | Soma de `|amount|` por categoria entre as despesas do mês, ordem decrescente (`:96-98`). Paleta fixa de 6 cores em ciclo (`ExpenseDonutChart/index.tsx:15,36-41`); tooltip em BRL; sem legenda | "Nenhuma despesa para exibir no gráfico." |
| "Receitas vs despesas" ("Últimos 6 meses") | `IncomeOutcomeBarChart` | Por mês: `income` e `|outcome|` (`:108-121`); séries "Receitas" (verde) e "Despesas" (vermelha) | "Nenhum movimento para exibir no gráfico." (inalcançável: sempre há 6 pontos) |
| "Linha do saldo" ("Últimos 6 meses") | `BalanceLineChart` | Por mês: `total` | "Nenhum saldo para exibir no gráfico." (inalcançável) |

Os "6 meses" são os 6 meses que **terminam no mês selecionado** (`getPreviousMonths(selectedMonth, 6)`, `:54-64,108`), não os últimos 6 a partir de hoje. Eixo Y dos gráficos de barras e linha: `R$ {valor/1000}k`, com ponto decimal (ex.: "R$ 0.15k") (`IncomeOutcomeBarChart/index.tsx:39`, `BalanceLineChart/index.tsx:38`) (verificado ao vivo em 12/10/2026).

**Listas** (`:228-263`):

- "Gastos por categoria" com contador "{n} categoria(s)": para cada categoria, valor, barra e "{round(%)}% das despesas", onde % = total da categoria / `|summary.outcome|` (`:89-95`; `src/components/CategoryBreakdown/index.tsx:32-44`). Vazio: "Nenhuma despesa encontrada neste período." (`CategoryBreakdown/index.tsx:26-28`).
- "Evolução do saldo" ("Últimos 6 meses"): por mês, rótulo curto (ex.: "Out. de 2026", só a primeira letra em maiúscula, `src/app/reports/styles.ts`), barra com largura `|saldo| / max(|saldos|, 1) * 100` e valor; verde se saldo ≥ 0, vermelho se negativo (`:122-125,245-260`). Mostra o saldo líquido de cada mês, não o acumulado (verificado ao vivo em 12/10/2026).

**APIs.** Nenhuma própria; usa o contexto.

**Responsivo** (`src/app/reports/styles.ts`): métricas em 4 colunas → 2 (≤1120px) → 1 (≤640px) (`:38-47`); gráficos e listas em 2 colunas → 1 (≤920px) (`:52-61,70-75`); item da evolução empilha ≤520px (`:128-130`).

### 2.11 Configurações — `/settings`

**Propósito.** Ver dados da conta, exportar transações e sair.

**Cabeçalho** (`src/app/settings/page.tsx:121-125`): "Configurações" / "Conta e dados" / "Gerencie preferências simples, exporte seus registros e encerre a sessão com segurança."

**Card "Perfil"** — "Informações básicas da sessão atual." (`:129-155`):

| Item | Origem |
|---|---|
| Conta | `user.name` de `GET /api/me`; fallback "Usuário autenticado" (`:136`) |
| E-mail | `user.email`; fallback "Carregando..." (`:140`) |
| Moeda padrão | Texto fixo "Real brasileiro (BRL)" (`:144`) |
| Transações carregadas | Quantidade de transações no contexto (`:148`) |
| Saldo em memória | Soma de `amount` de todas as transações do contexto (`:72-75,152`) |

Não há edição de perfil, troca de senha, preferências ou exclusão de conta.

**Card "Exportar dados"** — "Baixe uma cópia simples das transações carregadas no app." (`:157-169`):

- "Exportar JSON": baixa `transacoes.json` com `JSON.stringify(transactions, null, 2)`, isto é, os objetos como vieram da API (`:101-107`).
- "Exportar CSV": baixa `transacoes.csv` com cabeçalho `id,description,amount,category,type,paymentMethod,notes,date`; todos os valores entre aspas duplas, aspas internas duplicadas, linhas separadas por `\n`, nulos como string vazia (`:33-66,109-111`).
- A exportação é feita no navegador (Blob + link temporário, `:22-31`), sempre com **todas** as transações em memória, sem filtros. Com lista vazia gera arquivo só com o cabeçalho (CSV) ou `[]` (JSON).

**Card "Segurança"** — "O acesso usa sessão assinada em cookie httpOnly." (`:171-183`): três frases fixas ("Cookie de sessão assinado com expiração de 30 dias.", "reCAPTCHA v3 permanece ativo apenas no login.", "Ao sair, a sessão local é removida pela API de logout.") e botão "Sair da conta".

**Logout** (`:113-117`): `POST /api/logout`, depois `router.push("/login")` e `router.refresh()`. Sem confirmação e sem tratamento de erro.

**APIs.** `GET /api/me`, `POST /api/logout`.

**Responsivo.** Cards em 2 colunas → 1 (≤860px) (`src/app/settings/styles.ts:26-35`); itens do perfil em 4 colunas → 2 (≤980px) → 1 (≤560px) (`:42-51`).

---

### 2.12 Importar fatura por PDF — `/import`

Adicionada depois do mapeamento original; fica entre Transações e Categorias na navegação. Especificação e situação em `docs/specs/SPEC-importacao-fatura-pdf.md`; contratos da API em `docs/API.md` (seção 5.6).

**Propósito.** Ler a fatura do cartão em PDF, mostrar os lançamentos com categoria sugerida, deixar o usuário corrigir e registrar tudo de uma vez como transações.

**Fluxo e elementos** (`src/app/import/page.tsx`):

1. **Enviar fatura.** Campo de arquivo "Arquivo PDF da fatura" (aceita `application/pdf`). Recusa arquivo que não é PDF ("Envie um arquivo PDF.") ou maior que 10 MB ("O arquivo é maior que 10 MB."). O PDF é lido no navegador com `pdfjs-dist` (`src/features/invoice-import/pdfText.ts`) e não é enviado ao servidor; calcula-se o SHA-256 do arquivo. PDF com senha: aparece o campo "Senha do PDF" e o botão "Abrir PDF".
2. **Extração.** `parseInvoice` (`src/features/invoice-import/parseInvoice.ts`) reconhece emissor, vencimento, total impresso, mês de referência e as linhas (data, descrição, valor, parcela, tipo de linha). Sem linhas reconhecidas: "Nenhum lançamento reconhecido. O PDF pode ser digitalizado (imagem) ou de um layout não suportado."
3. **Conferir lançamentos.** Cabeçalho com arquivo, emissor, vencimento, total impresso e quantidade de linhas; campo "Mês de referência" e a opção "Lançar tudo no mês da fatura" (ambos refazem o preview). Tabela com uma linha por lançamento: Incluir, Data, Descrição, Parcela, Valor, Tipo (Despesa/Receita) e Categoria (categorias do usuário do tipo da linha).
4. **Registrar.** Botão "Registrar N transação(ões)"; mensagem de sucesso com link para Transações. O contexto de transações é recarregado.
5. **Importações anteriores.** Lista dos lotes com "Desfazer importação" (diálogo de confirmação), que exclui todas as transações do lote.

**Regras.**

- Linha de pagamento da fatura ("pagamento da fatura") e linha igual a uma transação existente ("possível duplicata de dd/mm/aaaa") vêm desmarcadas.
- Estorno/crédito entra como Receita; encargos (IOF, juros, anuidade) como Despesa.
- Data: compra à vista ou parcela 1 mantém a data da compra; parcela 2 em diante vai para o mês de referência, no mesmo dia (limitado ao último dia do mês).
- Categoria sugerida, nesta ordem: regra do usuário ("regra sua"), histórico de transações com o mesmo estabelecimento ("histórico"), palavras-chave ("palavra-chave"). Só é sugerida categoria que exista para o usuário.
- Ao trocar a categoria aparecem "Aplicar às outras N de <estabelecimento>" e "Lembrar para as próximas faturas" (grava a regra na confirmação).
- Conferência de total: soma das linhas incluídas (despesas menos receitas) contra o total impresso. Igual: "A soma das linhas incluídas confere com o total da fatura." Diferente: aviso com o valor e a caixa "Registrar mesmo com a diferença", obrigatória para liberar o botão.
- O botão fica desabilitado enquanto houver linha incluída sem categoria, sem descrição, com valor inválido ou data inválida ("N pendência(s) para resolver").
- Mesmo arquivo já importado: "Esta fatura já foi importada em dd/mm/aaaa."
- Fatura já lançada como valor único: aviso com a caixa "Substituir esse lançamento pelo detalhamento"; marcada, a transação antiga é excluída na mesma operação.
- Transações criadas: forma de pagamento "Cartão de crédito" e observação "Importado da fatura <emissor> <MM/AAAA>" (+ parcela).

**Chamadas.** `GET /api/categories`, `GET /api/imports`, `POST /api/imports/preview`, `POST /api/imports`, `DELETE /api/imports/[id]`, `GET /api/transactions` (recarga).

**Responsivo.** A tabela rola na horizontal em telas estreitas; o cabeçalho passa de 5 para 2 colunas (≤980px).

**Não implementado.** Criar categoria dentro do preview; tela de gestão das regras; adaptadores por emissor (ver a spec).

---

## 3. Componentes e módulos compartilhados

| Componente / módulo | Responsabilidade | Usado por |
|---|---|---|
| `AppShell` | Moldura das telas autenticadas: navegação + `<main>` | Dashboard, Transações, Categorias, Investimentos, Planejamento, Relatórios, Configurações |
| `AppNavigation` | Barra superior, estado ativo, drawer mobile | `AppShell` |
| `PageHeader` | Eyebrow, título, subtítulo e botão de ação opcional (só renderiza o botão com `actionLabel` e `onAction`, `PageHeader/index.tsx:28`) | As 7 telas autenticadas |
| `CustomModal` (`Modal`) | Modal em portal no `body` (`CustomModal/index.tsx:86`); `role="dialog"`, `aria-modal="true"` e `aria-label` igual ao título (`:66-72`); fecha por botão "✕" com `aria-label="Fechar"` (`:75-77`), clique no overlay (`:65`) e tecla **Esc** (`:46-60`); clique dentro não fecha; trava o scroll do body e compensa a barra de rolagem (`:27-44`); largura máxima 480px por padrão (`CustomModal/style.ts:41`). Não move nem prende o foco | `NewTransactionModal`, `ConfirmDialog`, `TransactionList`, `TransactionForm`, Categorias, Planejamento (e `TransactionTable`, morto) |
| `ConfirmDialog` | Confirmação com "Cancelar" e botão de confirmação (rótulo padrão "Confirmar", `ConfirmDialog/index.tsx:22`). Aguarda `onConfirm`; durante a espera o botão de confirmação fica desabilitado (`:34-45,57-59`); se `onConfirm` lançar, mostra a mensagem em `role="alert"` (fallback "Não foi possível concluir a ação.") e permanece aberto (`:40-42,50-52`); fechar limpa o erro (`:29-32`) | `TransactionList`, Categorias, Planejamento |
| `FormError` | Bloco de erro `role="alert"`; não renderiza nada sem mensagem (`FormError/index.tsx:9-13`) | `TransactionForm`, `CategoryForm`, `BudgetForm`, `GoalForm`, `ConfirmDialog` |
| `EmptyState` | Texto de lista vazia | Categorias, Planejamento |
| `NewTransactionModal` | Modal de criação ligado a `addTransaction`; props `title` (padrão "Nova Transação") e `defaultType` (`NewTransactionModal/index.tsx:8-20`); só fecha após sucesso (`:23-26`) | Dashboard, Transações, Investimentos |
| `TransactionForm` | Formulário de transação (criar/editar) com criação rápida de categoria, erro e estado de envio | `NewTransactionModal`, `TransactionList` |
| `TransactionFilters` | Painel de filtros e ordenação | Transações |
| `TransactionList` | Tabela/cards com editar e excluir | Transações, Investimentos |
| `LatestTransactions` | 5 transações mais recentes (somente leitura) | Dashboard |
| `SummaryCard` | Card de total com ícone por tipo (`income`, `outcome`, `investment`, `total`) | Dashboard, Investimentos |
| `MonthSummary` | Resumo do mês com taxa de economia | Dashboard |
| `InsightCard` | Card de indicador (variantes green/blue/red) | Dashboard |
| `CategoryCard` / `CategoryForm` | Card e formulário de categoria | Categorias; `CategoryForm` também em `TransactionForm` |
| `BudgetCard` / `BudgetForm` | Card e formulário de orçamento | Planejamento |
| `GoalCard` / `GoalForm` | Card e formulário de meta | Planejamento |
| `ProgressBar` | Barra limitada a 0–100% com cor por faixa ou cor fixa | `BudgetCard`, `GoalCard` |
| `PeriodFilter` | Seletor de mês | Relatórios |
| `ReportMetricCard` | Card de métrica | Relatórios |
| `CategoryBreakdown` | Lista de gastos por categoria com percentuais | Relatórios |
| `ExpenseDonutChart` | Donut de despesas por categoria | Relatórios |
| `IncomeOutcomeBarChart` | Barras receitas x despesas | Relatórios |
| `BalanceLineChart` | Linha de saldo/aportes | Relatórios, Investimentos |
| `SettingsCard` | Card com título e descrição | Configurações |
| `src/services/http.ts` | `ApiError` (mensagem + status), `toApiError` (extrai `error` do corpo ou usa o texto padrão) e `getErrorMessage` (`:1-29`) | Os 4 serviços, os 4 formulários e `ConfirmDialog` |
| `src/utils/dates.ts` | Chaves de dia e mês (UTC para datas gravadas, local para "agora") e conversão de dia para ISO (`:5-27`) | `finance.ts`, páginas Transações, Investimentos, Planejamento, Relatórios, `TransactionForm`, `BudgetForm`, `GoalForm` |
| `src/utils/finance.ts` | Regras de resumo, tipo efetivo, mês corrente, investimentos e taxa de economia | Dashboard, Transações, Categorias, Investimentos, Planejamento, Relatórios, listas |
| `src/utils/formatters.ts` | `formatCurrency`, `formatDate` (UTC), `formatMonthYear` | Listas, cards e páginas |

### 3.1 Código morto e sobras (verificado por busca de imports em `src/`)

| Item | Situação |
|---|---|
| `src/components/Dashboard/` (`index.tsx`, `styled.ts`) | Nenhum import. Contém valores fixos de exemplo ("R$ 2.500,00", "R$ 4.000,00", "R$ 1.500,00", `Dashboard/index.tsx:11-30`) e não tem `"use client"` |
| `src/components/Header/` | Nenhum import (substituído por `AppNavigation` + `PageHeader`) |
| `src/components/TransactionTable/` | Nenhum import (substituído por `TransactionList`) |
| `src/app/budgets/styles.ts` | Nenhum import; a página é só um redirect |
| `src/app/globals.css` | Importado em `layout.tsx:1`, mas vazio |
| `public/*.svg` (`file`, `globe`, `next`, `trash`, `vercel`, `window`) | Nenhuma referência em `src/` |
| Campo `investment` de `calculateSummary` | Calculado em `src/utils/finance.ts:25` e nunca lido |
| Dependências `google`, `recaptcha`, `v3` (`package.json`) | Nenhum import no repositório (fora de `node_modules`). O reCAPTCHA usa apenas `react-google-recaptcha-v3` (`src/app/login/page.tsx:4-7`) |
| `@types/styled-components` ^5 (`package.json:43`) | Desnecessário e de versão incompatível: styled-components 6 já traz os próprios tipos |
| Helpers ainda duplicados | `formatMonthLabel` e `getPreviousMonths` em `reports/page.tsx:45-64` e `investments/page.tsx:21-40`; `getCurrentMonth` (invólucro de `getLocalMonthKey`) em `planning/page.tsx:40-42`, `reports/page.tsx:37-39`, `BudgetForm/index.tsx:21-23` |

---

## 4. Matriz de funcionalidades

Os IDs F-01 a F-131 são os da primeira versão (regras atualizadas onde o comportamento mudou); F-132 em diante são comportamentos novos.

| ID | Funcionalidade | Tela | Regra resumida |
|---|---|---|---|
| F-01 | Bloqueio de rota protegida sem sessão | Proxy | As 8 rotas protegidas redirecionam para `/login` sem sessão válida |
| F-02 | Redirecionar usuário logado para fora do login | Proxy | Com sessão válida, `/login` redireciona para `/` |
| F-03 | Rotas públicas de recuperação | Proxy | `/forgot-password` e `/reset-password` abrem sem sessão |
| F-04 | Redirecionamento de `/budgets` | Orçamentos | `/budgets` leva a `/planning` |
| F-05 | Login com sucesso | Login | `POST /api/login` com e-mail, senha e token reCAPTCHA (ação "login"); OK → recarrega em `/` |
| F-06 | Campos obrigatórios do login | Login | E-mail (`type=email`) e senha `required`; sem tamanho mínimo no modo login |
| F-07 | Erro de credenciais/servidor no login | Login | Mostra `data.error` ou "Não foi possível entrar." |
| F-08 | reCAPTCHA indisponível | Login | Sem `executeRecaptcha` → "reCAPTCHA ainda não carregou. Tente novamente." e não chama a API |
| F-09 | Estado de envio do login/cadastro | Login | Botão "Aguarde...", campos, botão e alternador desabilitados |
| F-10 | Erro inesperado no login/cadastro | Login | Exceção → "Erro inesperado. Tente novamente." |
| F-11 | Alternar entre login e cadastro | Login | Mostra/oculta Nome e "Esqueceu a senha?"; troca rótulos; limpa mensagem |
| F-12 | Cadastro de conta | Login | `POST /api/register` com `{name, email, senha}`; Nome obrigatório; senha `minLength=8` |
| F-13 | Pós-cadastro | Login | Volta ao modo login, limpa senha, mantém e-mail, mostra "Conta criada com sucesso. Agora entre com seu e-mail e senha." |
| F-14 | Erro no cadastro | Login | Mostra `data.error` ou "Não foi possível criar a conta." |
| F-15 | Link "Esqueceu a senha?" | Login | Só no modo login; vai para `/forgot-password` |
| F-16 | Painel decorativo | Login | Conteúdo estático; oculto ≤720px |
| F-17 | Solicitar recuperação de senha | Esqueci a senha | `POST /api/auth/forgot-password` com `{email}`; e-mail obrigatório |
| F-18 | Confirmação neutra | Esqueci a senha | OK → "Se este email estiver cadastrado, você receberá um link de recuperação em breve."; limpa o campo |
| F-19 | Erro na solicitação | Esqueci a senha | `data.error` ou "Erro ao enviar solicitação."; exceção → "Erro inesperado. Tente novamente." |
| F-20 | Estado de envio | Esqueci a senha | Botão "Enviando..." e campo desabilitado |
| F-21 | Voltar para o login | Esqueci a senha | Link para `/login` |
| F-22 | Leitura do token | Redefinir senha | Token vem de `?token=`; sem token o botão fica desabilitado |
| F-23 | Senha mínima | Redefinir senha | Menos de 8 caracteres → "A senha deve ter pelo menos 8 caracteres." |
| F-24 | Confirmação de senha | Redefinir senha | Diferentes → "As senhas não coincidem." |
| F-25 | Redefinir com sucesso | Redefinir senha | `POST /api/auth/reset-password` `{token, password}`; mensagem de sucesso e ida a `/login` após 2s |
| F-26 | Erro ao redefinir | Redefinir senha | `data.error` ou "Erro ao redefinir senha."; exceção → "Erro inesperado. Tente novamente." |
| F-27 | Estado de envio | Redefinir senha | Botão "Redefinindo..." e campos desabilitados |
| F-28 | Itens e ordem da navegação | Navegação | Início, Transações, Importar, Categorias, Investimentos, Planejamento, Relatórios, Configurações |
| F-29 | Destaque do item ativo | Navegação | `/` por igualdade; demais por prefixo do pathname |
| F-30 | Marca como link | Navegação | "Finanças" leva a `/` |
| F-31 | Menu mobile | Navegação | ≤768px: botão "Menu" abre drawer; fecha por "Fechar", overlay ou clique em link |
| F-32 | Fechamento do modal por clique | Modal | Fecha por "✕" e por clique no overlay; clique dentro não fecha; trava scroll do body |
| F-33 | Diálogo de confirmação | ConfirmDialog | "Cancelar" fecha sem agir; botão de confirmação executa a ação |
| F-34 | Carga inicial de transações | Contexto | `GET /api/transactions` uma vez na montagem do provider |
| F-35 | Falha na carga de transações | Contexto | Resposta não-OK ou não-array → lista vazia, sem mensagem |
| F-36 | Inclusão no estado | Contexto | Criação OK insere no início da lista |
| F-37 | Atualização no estado | Contexto | Edição OK substitui o item pelo retorno da API |
| F-38 | Remoção do estado | Contexto | Exclusão OK remove o item |
| F-39 | Falha de mutação | Contexto / serviços | Resposta não-OK lança `ApiError` com a mensagem da API ou o texto padrão; o estado não muda |
| F-40 | Cards de resumo | Dashboard | Receitas, Despesas, Investimentos e Saldo Total sobre todo o histórico |
| F-41 | Regra do resumo | Dashboard / Relatórios | Investimento por tipo; receita/despesa pelo sinal; total soma tudo |
| F-42 | Últimas transações | Dashboard | 5 mais recentes por data; colunas Descrição, Valor, Categoria, Data |
| F-43 | Formatação de valores nas listas | Dashboard / Transações | "+" para positivos; investimento em valor absoluto sem sinal |
| F-44 | Vazio de últimas transações | Dashboard | "Nenhuma transação registrada ainda." |
| F-45 | Resumo do mês | Dashboard | Entradas, Saídas e Saldo das transações cujo mês (UTC da data gravada) é o mês local atual; rótulo do mês |
| F-46 | Taxa de economia | Dashboard / Relatórios | `round(saldo/receitas*100)% economizado`; sem receitas → "Sem receitas" |
| F-47 | Insight "Maior despesa" | Dashboard | Despesa de menor `amount` no mês; vazio "Sem dados" |
| F-48 | Insight "Categoria em destaque" | Dashboard | Categoria com maior soma de despesas no mês; vazio "Sem dados" |
| F-49 | Insight "Movimento do mês" | Dashboard | Quantidade de transações do mês |
| F-50 | Insight "Meta mais próxima" | Dashboard | Meta não concluída com maior `atual/alvo` (`GET /api/goals`); vazio "Sem metas" |
| F-51 | Abrir "Nova Transação" | Dashboard / Transações | Botão "+ Nova Transação" abre o modal |
| F-52 | Responsividade do dashboard | Dashboard | Grades 4→2→1 colunas; tabela vira cards ≤720px |
| F-53 | Campos e padrões do formulário | Formulário de transação | Tipo "Saída" (ou `defaultType`), pagamento "Pix", data de hoje no fuso local, demais vazios |
| F-54 | Obrigatoriedade | Formulário de transação | Descrição, Valor, Data e Categoria obrigatórios; Observação opcional |
| F-55 | Convenção de sinal | Formulário de transação | Entrada grava positivo; Saída e Investimento gravam negativo |
| F-56 | Troca de tipo | Formulário de transação | Filtra categorias pelo tipo e seleciona a primeira |
| F-57 | Carga de categorias | Formulário de transação | `GET /api/categories` ao abrir; "Carregando categorias..." durante a carga; auto-seleção da primeira do tipo |
| F-58 | Formas de pagamento | Formulário de transação | Pix, Dinheiro, Cartão de débito, Cartão de crédito, Transferência, Boleto, Outro |
| F-59 | Observação | Formulário de transação | `trim`; vazio enviado como `null` |
| F-60 | Criação rápida de categoria | Formulário de transação | Botão "+" abre "Nova categoria" com o tipo atual; cria, recarrega e seleciona |
| F-61 | Criar transação | Formulário de transação | `POST /api/transactions`; em sucesso o modal fecha e o item aparece no topo do estado |
| F-62 | Pré-preenchimento na edição | Formulário de transação | Valor em módulo, tipo, categoria (mantida mesmo órfã), pagamento, observação, data |
| F-63 | Salvar edição | Formulário de transação | `PATCH /api/transactions/:id`; em sucesso o modal fecha |
| F-64 | Data na edição | Formulário de transação | O campo abre com a data da transação; salvar sem mexer preserva a data |
| F-65 | Tabela de transações | Transações | Colunas Descrição, Valor, Categoria, Data, Ações |
| F-66 | Cards no mobile | Transações | ≤780px a tabela é substituída por cards com as mesmas ações |
| F-67 | Contador de registros | Transações | "{n} registro(s) encontrado(s)" reflete os filtros |
| F-68 | Busca por descrição | Transações | Substring sem diferenciar maiúsculas, com `trim` |
| F-69 | Filtro por tipo | Transações | Todos, Receitas, Despesas, Investimentos (tipo efetivo) |
| F-70 | Filtro por categoria | Transações | Opções derivadas das transações existentes, em ordem alfabética |
| F-71 | Filtro "De" | Transações | Dia da transação (`AAAA-MM-DD` em UTC) ≥ dia informado, inclusive |
| F-72 | Filtro "Até" | Transações | Dia da transação ≤ dia informado, inclusive |
| F-73 | Ordenação | Transações | Mais recentes (padrão), Mais antigas, Maior valor, Menor valor (módulo) |
| F-74 | Combinação de filtros | Transações | Todos os filtros aplicados em conjunto (E) |
| F-75 | Limpar filtros | Transações | Restaura o estado inicial |
| F-76 | Vazio da lista | Transações / Investimentos | "Nenhuma transação encontrada com os filtros atuais." |
| F-77 | Excluir transação | Transações / Investimentos | Confirmação → `DELETE /api/transactions/:id`; fecha em sucesso |
| F-78 | Editar transação | Transações / Investimentos | Modal "Editar transação" com "Salvar alterações" |
| F-79 | Carga de categorias | Categorias | `GET /api/categories` na montagem |
| F-80 | Agrupamento por tipo | Categorias | Seções Despesas, Receitas, Investimentos com "{n} categoria(s)" |
| F-81 | Vazios por seção | Categorias | Uma mensagem específica por tipo |
| F-82 | Card de categoria | Categorias | Marca com 2 letras do ícone ou inicial do nome; cor; nome; tipo |
| F-83 | Métricas do card | Categorias | Quantidade e soma de `|amount|` das transações do mês com o mesmo nome **e** o mesmo tipo da categoria |
| F-84 | Criar categoria | Categorias | Nome obrigatório (trim), Tipo (padrão Despesa), Cor (padrão `#00c48c`), Ícone opcional; `POST /api/categories` |
| F-85 | Editar categoria | Categorias | `PATCH /api/categories/:id`; "Salvar alterações" |
| F-86 | Excluir categoria | Categorias | Confirmação com o nome → `DELETE /api/categories/:id` |
| F-87 | Sem propagação de renomeação/exclusão | Categorias | Comportamento atual: transações e orçamentos mantêm o nome antigo |
| F-88 | Grade responsiva | Categorias | 3→2→1 colunas |
| F-89 | Seleção de investimentos | Investimentos | Só transações com tipo efetivo `investment` |
| F-90 | Total investido | Investimentos | Soma de `|amount|` de todos os investimentos |
| F-91 | Aportes no mês | Investimentos | Soma de `|amount|` dos investimentos do mês atual |
| F-92 | Evolução dos aportes | Investimentos | Linha com o total mensal dos últimos 6 meses (não acumulado) |
| F-93 | Lista de investimentos | Investimentos | `TransactionList` com editar e excluir |
| F-94 | Novo aporte | Investimentos | "+ Novo Aporte" abre o modal de criação (ver F-139) |
| F-95 | Carga do planejamento | Planejamento | `GET /api/budgets`, `/api/categories`, `/api/goals` em paralelo |
| F-96 | Filtro de mês dos orçamentos | Orçamentos | Padrão mês atual (fuso local); campo vazio volta ao mês atual |
| F-97 | Lista de orçamentos do mês | Orçamentos | Filtra por `month` igual ao selecionado; ordena por categoria; título e contador |
| F-98 | Gasto do orçamento | Orçamentos | Soma de `|amount|` das despesas com mesmo nome de categoria e mesmo mês |
| F-99 | Progresso e restante | Orçamentos | `gasto/limite*100`; `limite − gasto` (pode ser negativo) |
| F-100 | Status do orçamento | Orçamentos | ≥100% "Limite ultrapassado"; ≥80% "Atenção: acima de 80%"; senão "Dentro do previsto" |
| F-101 | Barra de progresso | Orçamentos / Metas | Largura limitada a 0–100%; cor por faixa (orçamento) ou cor da meta |
| F-102 | Criar orçamento | Orçamentos | Categoria (só despesas), Limite (`min 0.01`, `step 0.01`), Mês; `POST /api/budgets` |
| F-103 | Salto do filtro após salvar | Orçamentos | Após criar/editar, o filtro passa ao mês do orçamento |
| F-104 | Editar orçamento | Orçamentos | `PATCH /api/budgets/:id`; categoria órfã preservada como opção |
| F-105 | Excluir orçamento | Orçamentos | Confirmação com a categoria → `DELETE /api/budgets/:id` |
| F-106 | Vazio de orçamentos | Orçamentos | "Nenhum orçamento cadastrado para este mês." |
| F-107 | Lista de metas | Metas | Todas as metas; contador "{n} meta(s) em andamento" |
| F-108 | Progresso da meta | Metas | `atual/alvo*100`, arredondado; barra limitada a 100% |
| F-109 | Restante e prazo | Metas | `max(alvo − atual, 0)`; "Prazo: dd/mm/aaaa" igual ao dia digitado |
| F-110 | Criar meta | Metas | Nome (trim, obrigatório), Alvo (`min 0.01`), Atual (opcional → 0), Prazo opcional, Cor; `POST /api/goals` |
| F-111 | Atualizar meta | Metas | "Atualizar progresso" abre o formulário completo; `PATCH /api/goals/:id` |
| F-112 | Excluir meta | Metas | Confirmação com o nome → `DELETE /api/goals/:id` |
| F-113 | Vazio de metas | Metas | "Nenhuma meta cadastrada ainda." |
| F-114 | Filtro de período | Relatórios | Seletor de mês; padrão mês atual; vazio volta ao atual |
| F-115 | Métricas Receitas/Despesas/Saldo | Relatórios | `calculateSummary` das transações do mês selecionado |
| F-116 | Métrica "Maior despesa" | Relatórios | Despesa de menor `amount`; vazio "Sem dados" |
| F-117 | Métrica "Categoria líder" | Relatórios | Categoria com maior soma de despesas; vazio "Sem dados" |
| F-118 | Métrica "Média diária" | Relatórios | `|despesas| / dias do mês`; no mês atual, ver F-147 |
| F-119 | Métrica "Taxa de economia" | Relatórios | Mesma regra de F-46 para o mês selecionado |
| F-120 | Donut de despesas | Relatórios | Fatias por categoria; vazio "Nenhuma despesa para exibir no gráfico." |
| F-121 | Barras receitas x despesas | Relatórios | 6 meses terminando no mês selecionado |
| F-122 | Linha do saldo | Relatórios | Saldo mensal dos mesmos 6 meses |
| F-123 | Gastos por categoria | Relatórios | Valor, barra e "% das despesas" por categoria; vazio "Nenhuma despesa encontrada neste período." |
| F-124 | Evolução do saldo | Relatórios | Saldo líquido por mês; barras proporcionais ao maior saldo absoluto; cor por sinal |
| F-125 | Layout responsivo | Relatórios | Métricas 4→2→1; gráficos e listas 2→1 |
| F-126 | Perfil | Configurações | Nome e e-mail de `GET /api/me`; fallbacks "Usuário autenticado" e "Carregando..." |
| F-127 | Contagem e saldo em memória | Configurações | Quantidade e soma de `amount` das transações carregadas |
| F-128 | Exportar JSON | Configurações | `transacoes.json` com todas as transações em memória |
| F-129 | Exportar CSV | Configurações | `transacoes.csv`; 8 colunas; valores entre aspas com escape de aspas |
| F-130 | Sair da conta | Configurações | `POST /api/logout` e navegação para `/login` |
| F-131 | Card "Segurança" | Configurações | Três frases informativas fixas |
| F-132 | Erro da API nos formulários | Transação, Categoria, Orçamento, Meta | Falha ao salvar mostra a mensagem da API (ou o texto padrão) em `role="alert"`; modal continua aberto e os valores são mantidos |
| F-133 | Bloqueio de envio duplo | Transação, Categoria, Orçamento, Meta | Botão de envio desabilitado enquanto a requisição está pendente |
| F-134 | Erro na confirmação de exclusão | ConfirmDialog | Falha mostra a mensagem (fallback "Não foi possível concluir a ação."), diálogo permanece aberto; botão de confirmação desabilitado enquanto pendente; fechar limpa o erro |
| F-135 | Fechar modal com Esc | Modal | Tecla Esc chama `onClose` de todo modal aberto |
| F-136 | Semântica do modal | Modal | `role="dialog"`, `aria-modal="true"`, `aria-label` = título; botão de fechar com nome acessível "Fechar" |
| F-137 | Valor mínimo e centavos | Formulário de transação | Campo Valor com `min="0.01"` e `step="0.01"`: recusa 0 e negativos e aceita centavos |
| F-138 | Data padrão local | Formulário de transação | Nova transação abre com o dia de hoje no fuso do navegador |
| F-139 | Modal "Novo Aporte" | Investimentos | Título "Novo Aporte" e tipo "Investimento" pré-selecionado, com categorias de investimento |
| F-140 | Confirmação cita a transação | Transações / Investimentos | "Tem certeza que deseja excluir a transação "{descrição}"?" |
| F-141 | Orçamento duplicado | Orçamentos | Mesma categoria e mês → "Já existe um orçamento para esta categoria neste mês." no formulário |
| F-142 | Categoria duplicada | Categorias / criação rápida | Mesmo nome e tipo → "Já existe uma categoria com este nome e tipo." no formulário |
| F-143 | Mês padrão do novo orçamento | Orçamentos | "Novo orçamento" abre com o mês selecionado no filtro da página |
| F-144 | Remover ícone da categoria | Categorias | Ícone vazio é enviado como `null` e apaga o ícone salvo |
| F-145 | Data civil consistente | Todas as listas e cards | A data digitada é a exibida e a usada em filtros e meses, em qualquer fuso (`formatDate` e chaves em UTC) |
| F-146 | Erro na criação rápida de categoria | Formulário de transação | Falha mostra a mensagem dentro do modal "Nova categoria", que continua aberto |
| F-147 | Média diária no mês corrente | Relatórios | Se o mês selecionado é o atual, divide pelo dia de hoje; meses encerrados dividem pelo total de dias |
| F-148 | Título da seção de orçamentos | Orçamentos | "Orçamentos — {mês} de {ano}" com o mês em minúsculas (sem capitalização forçada) |
| F-149 | Série de 6 meses independente de fuso | Relatórios / Investimentos | Os 6 meses terminam sempre no mês selecionado/atual, calculados no fuso local |
| F-150 | Meta concluída fora do insight | Dashboard | Metas com `atual >= alvo` não entram em "Meta mais próxima" |
| F-151 | Prazo da meta como data civil | Metas | Prazo enviado como meia-noite UTC do dia e exibido igual ao digitado |
| F-152 | Envio de PDF: tipo e tamanho | Importar | Só PDF, até 10 MB; erro específico para cada caso |
| F-153 | Leitura do PDF no navegador | Importar | Texto extraído com pdf.js; o arquivo não é enviado |
| F-154 | PDF com senha | Importar | Pede a senha e tenta de novo; senha errada avisa |
| F-155 | Reconhecimento de lançamentos | Importar | Data, descrição, valor, parcela; emissor, vencimento e total |
| F-156 | PDF sem lançamentos | Importar | Mensagem de PDF digitalizado ou layout não suportado |
| F-157 | Preview editável | Importar | Incluir, data, descrição, valor, tipo e categoria por linha |
| F-158 | Sugestão de categoria | Importar | Regra do usuário, depois histórico, depois palavra-chave |
| F-159 | Pagamento da fatura desmarcado | Importar | Linha de pagamento não é incluída por padrão |
| F-160 | Estorno como receita | Importar | Linha de crédito entra como Receita |
| F-161 | Data das parcelas | Importar | Parcela 2+ no mês de referência; opção de lançar tudo no mês da fatura |
| F-162 | Possível duplicata | Importar | Linha igual a transação existente vem desmarcada e sinalizada |
| F-163 | Fatura já importada | Importar | Aviso pelo hash do arquivo |
| F-164 | Substituir lançamento único | Importar | Oferece trocar a "fatura" lançada como total pelo detalhamento |
| F-165 | Conferência de total | Importar | Diferença exige aceite explícito |
| F-166 | Bloqueio por pendência | Importar | Linha incluída sem categoria/valor/data bloqueia o registro |
| F-167 | Aplicar categoria ao estabelecimento | Importar | Copia a categoria para as outras linhas iguais |
| F-168 | Lembrar categoria | Importar | Grava regra usada nas próximas faturas |
| F-169 | Registro atômico | Importar | Todas as transações ou nenhuma; cartão de crédito e observação padrão |
| F-170 | Histórico e desfazer | Importar | Lista lotes e exclui todas as transações do lote |
| F-171 | Isolamento da importação | Importar | Lotes e regras filtrados por usuário; 404 para lote alheio |

Total: 171 linhas (131 originais + 20 das correções + 20 da importação de fatura).

---

## 5. Inconsistências e pontos de atenção encontrados no código

Severidade: alta = perda/corrupção de dado ou número errado na tela em uso normal; média = comportamento incorreto em cenário plausível ou falta de feedback; baixa = borda, acabamento ou manutenção.

Os itens 1 a 50 mantêm a numeração da primeira versão (levantada no commit `deb71c9`); 51 a 53 foram acrescentados nesta revisão. A situação de cada item foi conferida no código do working tree. A priorização do que resta está em `docs/MELHORIAS.md`.

### 5.0 Resumo da situação

| Severidade | Total | Corrigidos | Abertos |
|---|---|---|---|
| Alta | 5 | 4 | 1 |
| Média | 17 | 11 | 6 |
| Baixa | 31 | 8 | 23 |
| **Total** | **53** | **23** | **30** |

Cinco itens abertos estão parcialmente resolvidos (14, 21, 28, 34, 48); o texto de cada um diz o que falta.

### 5.1 Dados errados ou perdidos

1. **[alta] Editar uma transação trocava a data para hoje.** O formulário de edição não recebia `date`, iniciava com o dia atual e sempre enviava a data no `PATCH`. **Situação: Corrigido.** `getTransactionFormValues` passa `date: transaction.date` (`src/components/TransactionList/index.tsx:43`) e o formulário inicia com `getDateKey(initialValues.date)` (`src/components/TransactionForm/index.tsx:58-60`).
2. **[alta] Datas apareciam com um dia a menos em fusos negativos (Brasil).** A data civil era gravada à meia-noite UTC e exibida no fuso local. Na versão publicada: data 13/10 no formulário aparecia como 12/10 na lista e prazo 31/12 como "Prazo: 30/12/2026" (verificado ao vivo em 12/10/2026). **Situação: Corrigido.** `formatDate` usa `timeZone: "UTC"` (`src/utils/formatters.ts:8-10`); `GoalCard` usa `formatDate` (`src/components/GoalCard/index.tsx:57`); o prazo é enviado com `dateKeyToISOString` (`src/components/GoalForm/index.tsx:55`).
3. **[alta] "Mês" calculado de duas formas diferentes** (local em Dashboard/Categorias, UTC nas demais telas). **Situação: Corrigido.** Todas as telas usam `getMonthKey` para o mês da transação e `getLocalMonthKey` para o mês atual (`src/utils/dates.ts:9-23`; `src/utils/finance.ts:4-6`; `planning/page.tsx:114`; `reports/page.tsx:41-43`; `investments/page.tsx:17-19`).
4. **[alta] Falhas ao criar/editar/excluir transação eram silenciosas e o modal fechava.** **Situação: Corrigido.** Os serviços lançam `ApiError` (`src/services/transactions.ts:24-26,40-42,52-54`), o contexto não engole a exceção (`src/contexts/TransactionsContenxt.tsx:42-67`), o modal só fecha após sucesso (`src/components/NewTransactionModal/index.tsx:23-26`; `TransactionList/index.tsx:59-71`) e o erro aparece no formulário ou no diálogo (`TransactionForm/index.tsx:144-148,293`; `ConfirmDialog/index.tsx:38-42`).
5. **[alta] Categoria é referenciada por nome; renomear ou excluir não propaga.** Transações e orçamentos guardam o nome (`src/types/transaction.ts:7`, `src/types/budget.ts:3`) e as comparações são por nome (`src/app/categories/page.tsx:62`, `src/app/planning/page.tsx:117`); o `PATCH`/`DELETE` de categoria só altera a própria categoria (`src/app/api/categories/[id]/route.ts:32-35,71-73`). Renomear zera as métricas do card e o gasto do orçamento; excluir deixa nomes órfãos. **Situação: Aberto.** Correção: referenciar por id, ou atualizar transações e orçamentos na mesma operação e bloquear exclusão de categoria em uso.
6. **[média] Campo Valor sem `min` nem `step`.** Aceitava 0 e negativos; um negativo invertia a convenção de sinal. A suspeita de que centavos seriam bloqueados não se confirmou: 12,34 foi aceito na versão publicada (verificado ao vivo em 12/10/2026). **Situação: Corrigido.** `min="0.01"` e `step="0.01"` (`src/components/TransactionForm/index.tsx:180-181`); o backend também rejeita valor zero (`src/lib/validators.ts:64`).
7. **[média] Receita/despesa separadas pelo sinal em um lugar e pelo tipo em outro.** `calculateSummary` usa o sinal (`src/utils/finance.ts:24-30`); filtros, insights, orçamentos e o donut usam `getTransactionType` (`:15-17`). Quando sinal e tipo divergem (dados legados ou criados fora do formulário), os percentuais de "Gastos por categoria" deixam de somar 100% (`src/app/reports/page.tsx:80-95`). **Situação: Aberto** (a correção do item 6 impede novos casos pelo formulário, mas a regra continua dupla). Correção: classificar sempre pelo tipo efetivo.
8. **[média] Saldo desconta investimentos, mas os textos dizem "receitas e despesas".** `total` soma todos os valores (`src/utils/finance.ts:32`) e investimentos são gravados negativos; a descrição do card diz "Diferença entre receitas e despesas do mês." (`src/app/reports/page.tsx:159`). A taxa de economia também cai quando o usuário investe (`src/app/page.tsx:62`). Confirmado com dados de 08/2026: 1.861,62 − 783,10 − 500,00 = 578,52 (verificado ao vivo em 12/10/2026). **Situação: Aberto.** Correção: decidir a regra (investimento é ou não saída) e alinhar cálculo e textos.
9. **[média] Métricas do card de categoria ignoravam o tipo** (os três "Outros" mostravam os mesmos números). **Situação: Corrigido.** O filtro exige também `getTransactionType(transaction) === category.type` (`src/app/categories/page.tsx:60-66`).
10. **[média] Cards do topo do Dashboard são de todo o histórico.** `calculateSummary(transactions)` sem recorte (`src/app/page.tsx:42,89-110`), ao lado de um bloco "Resumo do mês", sem rótulo de período (verificado ao vivo em 12/10/2026). **Situação: Aberto.** Correção: rotular como acumulado ou trocar para o mês.
11. **[média] "+ Novo Aporte" abria o formulário como "Saída".** **Situação: Corrigido.** A página passa `title="Novo Aporte"` e `defaultType="investment"` (`src/app/investments/page.tsx:119-124`; `NewTransactionModal/index.tsx:11-12,31-36`; `TransactionForm/index.tsx:37,43-45`).
12. **[baixa] Não era possível remover o ícone de uma categoria.** **Situação: Corrigido.** O campo vazio é enviado como `null` (`src/components/CategoryForm/index.tsx:40`).
13. **[baixa] Limiares do orçamento.** Exatamente 100% já mostra "Limite ultrapassado" e exatamente 80% mostra "acima de 80%" (`src/app/planning/page.tsx:125`; `src/components/BudgetCard/index.tsx:34-39`). **Situação: Aberto.** Correção: usar `>` ou ajustar os textos.
14. **[baixa] "Meta mais próxima" podia ser uma meta já concluída; o contador "em andamento" conta todas.** **Situação: Aberto (parcial).** O insight agora filtra `currentAmount < targetAmount` (`src/app/page.tsx:65`); o contador "{n} meta(s) em andamento" continua contando todas as metas (`src/app/planning/page.tsx:273`). Correção: contar só as não concluídas ou trocar o texto.
15. **[baixa] Média diária dividia pelo total de dias do mês mesmo no mês em curso.** **Situação: Corrigido.** No mês atual divide pelo dia de hoje (`src/app/reports/page.tsx:105-107`).

### 5.2 Datas e fuso (além dos itens 2 e 3)

16. **[média] Filtros "De"/"Até" comparavam hora local com data gravada em UTC.** Na versão publicada, a transação lançada como 13/10 só era encontrada com De=Até=12/10 (verificado ao vivo em 12/10/2026). **Situação: Corrigido.** Comparação de chaves `AAAA-MM-DD` com `getDateKey` (`src/app/transactions/page.tsx:38,48-53`).
17. **[média] "Hoje" e "mês atual" obtidos por `toISOString()` (UTC).** Às 21h20 locais o formulário já sugeria 13/10 (verificado ao vivo em 12/10/2026). **Situação: Corrigido.** `getLocalDateKey` e `getLocalMonthKey` (`src/utils/dates.ts:5-11`) em `TransactionForm/index.tsx:59,157`, `planning/page.tsx:40-42`, `reports/page.tsx:37-39`, `investments/page.tsx:57`, `BudgetForm/index.tsx:21-23`. Não resta `toISOString().slice` fora de `src/utils/dates.ts`.
18. **[média] `getPreviousMonths` deslocava um mês em fusos à frente de UTC.** **Situação: Corrigido.** A chave é gerada com `getLocalMonthKey(date)` (`src/app/reports/page.tsx:54-64`; `src/app/investments/page.tsx:30-40`).
19. **[baixa] Possível divergência de hidratação.** As páginas são renderizadas no servidor e usam "agora" no render (`src/app/page.tsx:41,77`; `planning/page.tsx:89`; `reports/page.tsx:68`); perto de viradas de dia/mês o valor do servidor (UTC) pode diferir do cliente (a confirmar). **Situação: Aberto.** Correção: calcular datas dependentes de "agora" após a montagem.

### 5.3 Erros, feedback e estado

20. **[média] Categorias, orçamentos e metas não mostravam erro da API** e os formulários de criação eram limpos mesmo na falha. Na versão publicada, orçamento duplicado devolvia 500, o modal ficava aberto sem mensagem e os campos eram limpos (verificado ao vivo em 12/10/2026). **Situação: Corrigido.** Serviços lançam `ApiError` (`src/services/categories.ts:23,37,49`, `budgets.ts:23,37,49`, `goals.ts:23,37,47`); os formulários mostram a mensagem e preservam os valores (`CategoryForm/index.tsx:42-46,104`; `BudgetForm/index.tsx:58-62,120`; `GoalForm/index.tsx:58-62,136`); o backend responde 409 com mensagem específica para duplicidade (`src/app/api/budgets/route.ts:61`, `src/app/api/categories/route.ts:61`).
21. **[média] Sessão expirada não leva ao login.** **Situação: Aberto (parcial).** Mutações agora exibem a mensagem do 401 ("Não autenticado.") no formulário; as **leituras** continuam convertendo 401 em lista vazia (`src/services/transactions.ts:8-10`, `categories.ts:8-10`, `budgets.ts:8-10`, `goals.ts:8-10`), e não há redirecionamento. Correção: tratar 401 de forma central e redirecionar para `/login`.
22. **[média] Sem estado de carregamento.** Enquanto os dados carregam, as telas exibem zeros e mensagens de vazio (`src/app/page.tsx:42`; `LatestTransactions/index.tsx:38-39`; `categories/page.tsx:137-138`; `planning/page.tsx:245-246`). **Situação: Aberto.** Correção: flag `loading` no contexto e nas páginas.
23. **[média] Botões de envio não bloqueavam duplo clique.** **Situação: Corrigido.** Estado de envio com botão desabilitado em `TransactionForm/index.tsx:57,295-297`, `CategoryForm/index.tsx:27,106-108`, `BudgetForm/index.tsx:40,122-124`, `GoalForm/index.tsx:42,138-140` e `ConfirmDialog/index.tsx:27,57-59`.
24. **[baixa] Dados permanecem em memória após o logout.** O provider está no layout raiz (`src/app/layout.tsx:28`) e o logout navega sem recarregar (`src/app/settings/page.tsx:113-117`). O login seguinte recarrega a página, então não há vazamento entre contas na interface. **Situação: Aberto.** Correção: limpar o contexto no logout ou usar `window.location`.
25. **[baixa] Provider busca transações também nas telas públicas** (`layout.tsx:28`; `TransactionsContenxt.tsx:28-40`), gerando um 401 no console de `/login` (verificado ao vivo em 12/10/2026). **Situação: Aberto.** Correção: mover o provider para as rotas autenticadas.
26. **[baixa] Configurações: `loadUser` sem `try/catch` e sem estado de erro.** Se `/api/me` falhar, o e-mail fica "Carregando..." indefinidamente (`src/app/settings/page.tsx:80-92,140`); o logout também não trata falha (`:113-117`). **Situação: Aberto.** Correção: tratar erro e mostrar mensagem.
27. **[baixa] Uma falha derruba as três cargas do Planejamento.** `Promise.all` com um único `catch` (`src/app/planning/page.tsx:93-105`). **Situação: Aberto.** Correção: `Promise.allSettled`.
28. **[baixa] Redefinir senha.** Sem token o botão ficava desabilitado sem explicação; após o sucesso o formulário é reabilitado durante os 2 segundos de espera; não há link para o login. **Situação: Aberto (parcial).** Sem token, a tela agora mostra o alerta "Link inválido ou incompleto." com link para `/forgot-password` (`src/app/reset-password/page.tsx`). Faltam: manter o formulário bloqueado após o sucesso e o link para o login.
29. **[baixa] Exportações.** O JSON inclui os objetos como vieram da API, inclusive campos internos como `userId` (`settings/page.tsx:101-107`; o `GET` não seleciona campos, `src/app/api/transactions/route.ts:15-20`). O CSV não tem BOM (acentos no Excel, a confirmar) nem neutraliza células iniciadas por `=`, `+`, `-`, `@` (`settings/page.tsx:33-37`). **Situação: Aberto.** Correção: selecionar campos, prefixar BOM e escapar fórmulas.
30. **[baixa] Sem paginação.** Todas as transações são carregadas e renderizadas de uma vez (`TransactionsContenxt.tsx:31-32`; `TransactionList/index.tsx:98`). **Situação: Aberto.** Correção: paginar ou virtualizar.
31. **[baixa] Forma de pagamento e observação não aparecem em nenhuma listagem** (`TransactionList/index.tsx:90-131`); só ao abrir a edição. **Situação: Aberto.** Correção: exibir no card/linha ou em detalhe.
32. **[baixa] Descrição só com espaços passava pelo formulário e a falha era silenciosa.** **Situação: Corrigido.** O backend aplica `trim` e rejeita descrição vazia com "Descrição é obrigatória." (`src/lib/validators.ts:56`), e a mensagem aparece no formulário (`TransactionForm/index.tsx:144-148`). O campo continua sem `trim` no cliente (`:163-173`).
33. **[baixa] Formulário de orçamento ignorava o mês selecionado na página.** **Situação: Corrigido.** Prop `defaultMonth` (`src/components/BudgetForm/index.tsx:16,36-38`) preenchida com `selectedMonth` (`src/app/planning/page.tsx:305`).

### 5.4 Acessibilidade

34. **[média] Modal sem semântica nem teclado.** Na versão publicada, Esc não fechava os modais (verificado ao vivo em 12/10/2026). **Situação: Aberto (parcial).** Já há `role="dialog"`, `aria-modal`, `aria-label`, Esc e botão "Fechar" com nome acessível (`src/components/CustomModal/index.tsx:46-60,66-77`). Falta gerenciar o foco: nada move o foco para o modal ao abrir, prende o Tab dentro dele ou devolve o foco ao fechar. Correção: foco inicial, armadilha de foco e restauração.
35. **[média] `id="transaction-category"` duplicado** entre o filtro e o formulário. **Situação: Corrigido.** Os ids do filtro passaram a `transaction-filter-*` (`src/components/TransactionFilters/index.tsx:49-51,76-78`). Observação para testes: com o modal aberto em `/transactions` continuam existindo dois rótulos com o texto "Categoria" (filtro e formulário), agora ligados a ids diferentes.
36. **[baixa] Drawer mobile.** Não fecha com Esc nem prende o foco, e os links continuam alcançáveis por teclado com o drawer fechado, pois ele só fica transparente (`src/components/AppNavigation/index.tsx:80-88`; `styles.ts:200-214`). **Situação: Aberto.** Correção: `inert`/`visibility: hidden` quando fechado e Esc.
37. **[baixa] Seletor de tipo e barra de progresso sem semântica.** **Situação: Corrigido.** Os botões de tipo expõem `aria-pressed` (`src/components/TransactionForm/index.tsx`) e a barra tem `role="progressbar"` com `aria-valuenow/min/max` (`src/components/ProgressBar/index.tsx`). No mesmo lote: link ativo da navegação com `aria-current="page"` (`src/components/AppNavigation/index.tsx`) e mensagens das telas de autenticação com `role="alert"`/`"status"`. O rótulo "Tipo" continua sem associação formal ao grupo de botões.
38. **[baixa] Gráficos sem alternativa textual e donut sem legenda.** As fatias usam paleta fixa de 6 cores que se repete e ignora a cor da categoria (`src/components/ExpenseDonutChart/index.tsx:15,36-41`). **Situação: Aberto.** Correção: legenda e cor da categoria.

### 5.5 Conteúdo estático, placeholders e textos enganosos

O que **não** é alimentado por dados reais:

39. **[baixa] Painel decorativo do login é fictício.** Calendário "Maio 2026", cartão "•••• 4289", "Saldo Total R$ 4.850,00", "+12% este mês" (`src/app/login/page.tsx:138-170`). **Situação: Aberto.** Correção: manter como ilustração sem números que pareçam reais, ou remover.
40. **[baixa] Configurações tem itens fixos.** "Moeda padrão: Real brasileiro (BRL)" e as três frases de "Segurança" são texto estático (`src/app/settings/page.tsx:144,175-179`); o subtítulo promete "preferências simples" que não existem (`:124`). **Situação: Aberto.** Correção: ajustar o texto ou implementar.
41. **[baixa] "protegido por reCAPTCHA" aparece no cadastro, que não usa reCAPTCHA** (`src/app/login/page.tsx:190-194,304-306`). **Situação: Aberto.** Correção: ocultar no modo cadastro ou proteger o cadastro.
42. **[baixa] Subtítulo de Relatórios diz "sem gráficos externos"**, mas a tela usa `recharts` (`src/app/reports/page.tsx:132`); o rótulo "Donut" é nome técnico (`:200`). **Situação: Aberto.** Correção: reescrever.
43. **[baixa] Investimentos promete "patrimônio"** (`src/app/investments/page.tsx:77`), mas só soma aportes; o gráfico de aportes exibe a série "Saldo" e o eixo no formato `R$ 0.15k`, com ponto decimal (`src/components/BalanceLineChart/index.tsx:38,55`) (verificado ao vivo em 12/10/2026). **Situação: Aberto.** Correção: ajustar título, nome da série e formatação.
44. **[baixa] Mensagem de vazio cita filtros onde não há filtros.** "Nenhuma transação encontrada com os filtros atuais." também aparece em Investimentos (`TransactionList/index.tsx:83`). **Situação: Aberto.** Correção: mensagem configurável.
45. **[baixa] Estados de vazio inalcançáveis.** Os gráficos de barras e de linha sempre recebem 6 pontos (`IncomeOutcomeBarChart/index.tsx:25-27`; `BalanceLineChart/index.tsx:24-26`). **Situação: Aberto.** Correção: tratar "todos zero" como vazio.

Além disso, o campo "Ícone simples" sugere nomes de ícone no placeholder ("Ex: food, car, home"), mas o card só mostra as duas primeiras letras em maiúsculas (`CategoryForm/index.tsx:95-103`; `CategoryCard/index.tsx:44-46`) (verificado ao vivo em 12/10/2026). Todo o restante (Dashboard, Transações, Categorias, Investimentos, Planejamento, Relatórios, perfil e exportação) usa dados reais da API.

### 5.6 Código morto e dependências

46. **[baixa] Componentes sem uso:** `Dashboard`, `Header`, `TransactionTable`; arquivo `src/app/budgets/styles.ts`; `globals.css` vazio; SVGs em `public/`; campo `investment` de `calculateSummary` (`src/utils/finance.ts:25`). **Situação: Aberto** (`TransactionTable` e `budgets/styles.ts` chegaram a ser editados nesta rodada, mas seguem sem importadores). Correção: remover.
47. **[baixa] Dependências sem uso:** `google`, `recaptcha`, `v3` e `@types/styled-components`. **Situação: Corrigido.** Removidas do `package.json`.
48. **[baixa] Helpers de mês duplicados.** **Situação: Aberto (parcial).** A lógica de chave de dia/mês foi centralizada em `src/utils/dates.ts`, eliminando a origem das divergências; `formatMonthLabel` e `getPreviousMonths` continuam copiados em `src/app/reports/page.tsx:45-64` e `src/app/investments/page.tsx:21-40`. Correção: mover os dois para `src/utils/dates.ts`.

### 5.7 Documentação

49. **[média] `AGENTS.md` não correspondia ao código** (model único com `payer`, credenciais em `.env`, cookie `auth_token`, reCAPTCHA "comentado", pastas "vazias", "sem framework de testes", `proxy.ts` como "padrão customizado", stack sem `recharts`/`resend`). **Situação: Corrigido.** O arquivo foi reescrito: models reais e referência por nome (`AGENTS.md`, seção 3), fluxo de autenticação com `session_token` (seção 4), serviços com `ApiError` e regra de datas (seção 5), testes e stack atualizados (seções 1 e 2). Resíduos menores no item 53.
50. **[média] `README.md` não correspondia ao código** (dashboard "do mês", "Dark Mode" com Theme Provider, "Mobile-First", Server Actions, `.env.example` inexistente, funcionalidades omitidas). **Situação: Corrigido.** O README descreve os totais como acumulados (`README.md:22`), lista Planejamento e Investimentos (`:25-26`), declara que não usa Server Actions (`:92`) e aponta para o novo `.env.example` (`:56`).

### 5.8 Itens acrescentados nesta revisão

51. **[baixa] Transações com a mesma data não têm ordem estável.** A ordenação compara só a data (`src/app/transactions/page.tsx:63-77`; `src/app/page.tsx:73-75`) e a API ordena só por `date desc` (`src/app/api/transactions/route.ts:15-20`); como todas as datas são meia-noite UTC, empates são a regra, e a ordem entre eles depende da ordem devolvida pelo banco e do fato de novas transações entrarem no início da lista (`TransactionsContenxt.tsx:45-48`). Itens do mesmo dia trocaram de posição entre renderizações (verificado ao vivo em 12/10/2026). **Situação: Aberto.** Correção: desempatar por `createdAt` (ou `id`) na API e no cliente.
52. **[baixa] Esc fechava todos os modais empilhados de uma vez.** Cada `Modal` aberto registrava o próprio listener de teclado em `document`; com o modal "Nova categoria" aberto sobre o formulário de transação, um Esc fechava os dois e descartava a transação em preenchimento. **Situação: Corrigido.** Os modais abertos entram em uma pilha e só o do topo responde ao Esc (`src/components/CustomModal/index.tsx`, `openModals`).
53. **[baixa] Resíduos no `AGENTS.md` reescrito** (linha do React Compiler em `next.config.ts`, afirmação de que tudo é "use client", lista de componentes sem uso). **Situação: Corrigido.** As três passagens foram ajustadas.
