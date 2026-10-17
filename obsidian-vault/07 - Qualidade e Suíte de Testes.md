# 07 - Qualidade e Suíte de Testes

#testes #qualidade #vitest #playwright #engenharia #ci-cd

> [!NOTE] O Escudo de Confiabilidade
> Esta nota detalha a infraestrutura de testes do **Finanças Pessoais**: como o projeto migrou de zero testes para 1.288 testes automatizados, as estratégias de mock, o PostgreSQL descartável embutido, a fixação de fusos horários e a disciplina de validação contínua expressa no `AGENTS.md`.

---

## 🏛️ 1. A Estratégia de Qualidade e a Pirâmide de Testes

O projeto adota uma pirâmide de testes de 4 camadas complementares, cobrindo regras de negócio puras, contratos de API com autenticação criptográfica real, componentes visuais e fluxos completos de navegação ponta a ponta (E2E):

```mermaid
flowchart TD
    subgraph Piramide["Pirâmide de Testes (1.288 Testes no Total)"]
        E2E["Camada 4: E2E - Playwright (Chromium)<br/>11 arquivos • 128 testes • ~4 min<br/>(PostgreSQL Embutido Real na porta 54329)"]
        UI["Camada 3: UI - Vitest + Testing Library (jsdom)<br/>15 arquivos • 366 testes<br/>(Renderização React, styled-components e formulários)"]
        API["Camada 2: API - Vitest (node)<br/>12 arquivos • 352 testes<br/>(Route Handlers, sessão HMAC real, Prisma simulado)"]
        Unit["Camada 1: Unitário - Vitest (node)<br/>16 arquivos • 442 testes • ~3 seg<br/>(Regras de data, normalização, cálculos, parsers)"]
    end

    Unit --> API --> UI --> E2E
```

### Métricas de Cobertura de Código (Vitest sobre `src/`):
- **Linhas de Código:** **97,1%**
- **Ramos de Decisão (Branches):** **96,7%**
- **Funções:** **90,8%**
- *Auditoria Completa em 12/10/2026:* 1.160 testes Vitest e 128 testes Playwright aprovados com 100% de sucesso.

---

## 🎯 2. Decisões Arquiteturais da Suíte de Testes

### 2.1 Fuso Horário Travado em `America/Sao_Paulo`
Os arquivos de configuração `vitest.config.ts` e `playwright.config.ts` forçam o timezone para `America/Sao_Paulo` (GMT-3).
- **Por que isso é vital?** Conforme documentado em `[[03 - Funcionalidades e Telas#32-a-solução-definitiva-de-datas-e-fusos-horários-srcutilsdates-ts]]`, bugs de data só ocorrem quando o cliente opera em fuso negativo. Se a suíte rodasse em UTC (o padrão de servidores de CI/CD como o GitHub Actions), as conversões ingênuas de data nunca subtrairiam 3 horas e os testes passariam com falsos positivos.

### 2.2 Testes de API com Autenticação Criptográfica Real
Diferente de abordagens frágeis que simplesmente desativam o middleware em testes, os testes de API em `tests/api/`:
- Disparam requisições invocando diretamente os Route Handlers com objetos `NextRequest`.
- Injetam o cookie `session_token` assinado pela função real `createSessionToken` utilizando o `SESSION_SECRET` de teste.
- Exercitam de verdade a verificação do HMAC-SHA256, a checagem do cabeçalho `crypto.subtle.verify` e o descarte de tokens com prazo expirado.
- Simulam (`mock`) apenas as operações do Prisma Client (`@/lib/prisma`), testando validações de schema (`400`), isolamento por `userId`, violações de unicidade (`409`), manipulação de registros de terceiros (`404`) e falhas de infraestrutura (`500`).

### 2.3 E2E com PostgreSQL Embutido Descartável (`embedded-postgres`)
A execução E2E com Playwright foi concebida para ser 100% autossuficiente e independente de containers Docker ou bancos externos:
1. **Inicialização (`globalSetup`):** Baixa e inicializa um binário real do PostgreSQL na porta `54329`, com diretório de dados temporário em `.e2e-pg/`.
2. **Auditoria de Migrations:** Executa `npx prisma migrate deploy` contra esse banco local. Isso garante que todo o histórico de migrations do repositório é testado a cada bateria de testes.
3. **Servidor em Desenvolvimento:** Sobe o servidor Next.js na porta `3100` e pré-compila as rotas.
4. **Isolamento por Teste:** Cada teste E2E instancia um usuário novo e exclusivo com e-mail aleatório, permitindo paralelismo sem colisão de transações.
5. **Trava de Proteção Contra Desastres:** O `playwright.config.ts` aborta imediatamente se `DATABASE_URL` apontar para qualquer host diferente de `localhost:54329`, impossibilitando qualquer contaminação da base de produção.
6. **Desligamento (`globalTeardown`):** Finaliza o servidor PostgreSQL e limpa o diretório temporário. Se um teste for cancelado à força, o script `node scripts/e2e/stop-db.mjs` derruba o processo remanescente.

### 2.4 Login e Anti-bot sem Portas dos Fundos
O Google reCAPTCHA v3 bloqueia requisições locais. Para testar sem criar "brechas" ou atalhos inseguros no código de produção:
- Nos testes E2E com Playwright, a sessão do usuário é criada injetando o cookie assinado no navegador.
- A **tela de login** é testada interceptando as chamadas de rede no browser via `page.route("**/api/login")`.
- A **rota de backend** `/api/login` é testada exaustivamente na camada de API (38 cenários), simulando as respostas da API externa do Google.

### 2.5 Técnica de `knownBug` (Rastreamento Ativo de Débitos)
Para bugs conhecidos ainda não corrigidos (como a renomeação de categoria referenciada por texto, item P1):
- O teste é implementado descrevendo o **comportamento correto desejado**, envolvido pela função helper `knownBug("motivo")`.
- O teste passa enquanto a falha existir. No instante em que o desenvolvedor corrigir o bug no código-fonte, o teste passa a falhar ("passou inesperadamente"), atuando como um lembrete automático para remover a marcação.

---

## 📦 3. O Mapeamento Completo de Cada Camada

### 3.1 Camada 1: Testes Unitários (`tests/unit/` — 16 arquivos, 442 testes)
- `dates.test.ts`: Conversões entre datas civis locais e instantes UTC, viradas de ano e anos bissextos.
- `utils/finance.test.ts`: Comportamento de `isSameMonth`, cálculo de saldo com investimentos, taxa de poupança.
- `utils/formatters.test.ts`: Formatação monetária BRL, formatação de meses e datas.
- `lib/session.test.ts`: Assinatura HMAC-SHA256, adulteração de payloads, expiração de tokens e tamanho da chave.
- `lib/validators.test.ts`: Regras de entrada para transações, metas, orçamentos e categorias.
- `lib/tokens.test.ts`, `password.test.ts`, `auth.test.ts`, `http.test.ts`, `resend.test.ts`: Componentes de suporte e segurança.
- `proxy.test.ts`: Regras de redirecionamento de rotas protegidas e públicas.
- `invoice-import/parseInvoice.test.ts`: Parser de faturas em PDF: formatos de data, valores, parcelas, estornos, pagamentos e emissores.
- `invoice-import/normalize.test.ts`: Limpeza de nomes de estabelecimentos, remoção de adquirentes e impressões digitais.
- `invoice-import/categorize.test.ts`: Prioridade de categorização (Regra $\to$ Histórico $\to$ Palavras-chave).
- `invoice-import/pdf.test.ts`: Geração e leitura de PDFs sintéticos via pdf.js.

### 3.2 Camada 2: Testes de API (`tests/api/` — 12 arquivos, 352 testes)
Cobrem todos os verbos HTTP (`GET`, `POST`, `PATCH`, `DELETE`) de todas as rotas:
- `register.test.ts`, `login.test.ts`, `logout.test.ts`, `me.test.ts`
- `forgot-password.test.ts`, `reset-password.test.ts`
- `transactions.test.ts`, `categories.test.ts`, `budgets.test.ts`, `goals.test.ts`
- `imports.test.ts`: Teste de conciliação de fatura, duplicatas, substituição de lump-sum e rollback.
- `category-rules.test.ts`: CRUD de regras de estabelecimento.

### 3.3 Camada 3: Testes de UI (`tests/ui/` — 15 arquivos, 366 testes)
- `pages/`: Renderização e simulação de cliques em todas as páginas (`Dashboard`, `Transactions`, `Import`, `Categories`, `Planning`, `Reports`, `Investments`, `Settings`, `Login`).
- `components/`: Formulários (`TransactionForm`, `CategoryForm`, `BudgetForm`, `GoalForm`), tabela de preview de fatura (`ImportPreviewTable`), diálogos de confirmação, filtros e navegação acessível.
- `context/`: Ciclo de vida do `TransactionsContext` (carga, inserção, edição e captura de falhas).
- `services/`: Disparo correto de `ApiError` com status HTTP e mensagens amigáveis.

### 3.4 Camada 4: Testes E2E (`tests/e2e/` — 11 arquivos, 128 testes)
- `01-auth.spec.ts`: Proteção de rotas, login, cadastro, logout e recuperação de senha.
- `02-transactions.spec.ts`: Fluxo completo de criação de receitas/despesas, edição, exclusão, filtros e ordenação.
- `03-dashboard.spec.ts`: Integridade dos números consolidados e gráficos.
- `04-categories.spec.ts`: CRUD das categorias padrão e personalizadas.
- `05-budgets.spec.ts`: Alertas visuais de orçamentos e barras de limite.
- `06-goals.spec.ts`: Acompanhamento de metas financeiras.
- `07-investments-reports-settings.spec.ts`: Evolução patrimonial e exportação CSV/JSON.
- `08-multi-tenancy.spec.ts`: Verificação cruzada de que o Usuário B não visualiza nem altera dados do Usuário A.
- `09-responsive.spec.ts`: Testes em viewport móvel (390x844) validando menu drawer e ausência de overflow horizontal.
- `10-dates-timezone.spec.ts`: Regressões temporais (dia 1º do mês, último dia, transações após as 21h).
- `11-invoice-import.spec.ts`: Envio de PDF sintético real no navegador, conferência de preview, gravação atômica e botão Desfazer.

---

## 💻 4. Comandos e Guia de Execução

```bash
# Rodar todos os testes rápidos (Unitário + API + UI) — ~40s
npm test

# Rodar os testes E2E completos (com Postgres embutido) — ~4 min
npm run test:e2e

# Rodar apenas testes unitários e de API
npm run test:unit

# Rodar apenas testes de interface (Testing Library)
npm run test:ui

# Gerar relatório HTML de cobertura
npm run test:coverage

# Executar checagem de tipos estrita (App + Testes)
npm run typecheck

# Exibir relatório da última execução E2E
npx playwright show-report

# Derrubar manualmente o Postgres de teste se interrompido
node scripts/e2e/stop-db.mjs
```

---

## 🥇 5. As Regras de Ouro do `AGENTS.md` e Checklist de Entrega

> [!IMPORTANT] A Regra de Ouro da Engenharia
> **Antes de commitar qualquer alteração, SEMPRE rode `npm run lint`, `npm run typecheck` e `npm test`. Se quebrar, conserte antes de seguir.**

### Checklist de Autovalidação da IA / Desenvolvedor:
- [ ] O código respeita as diretrizes do **Next.js 16** e do **React 19 Compiler**?
- [ ] Os componentes visuais incluem a diretiva `'use client'` no topo?
- [ ] Nenhuma biblioteca ou dependência externa foi adicionada sem autorização?
- [ ] O estado não foi mutado diretamente (preservando a integridade do React Compiler)?
- [ ] Todas as mutações trafegam por Route Handlers REST com captura de `ApiError` nos serviços e exibição de `FormError`?
- [ ] Nenhuma manipulação de datas utiliza `new Date().toISOString().slice(...)` ou métodos locais sem `src/utils/dates.ts`?
- [ ] Os novos recursos possuem testes correspondentes adicionados nas camadas adequadas?
- [ ] As três etapas de verificação (`lint`, `typecheck`, `test`) passaram com 100% de sucesso?

---

## 🤖 6. Pipeline Sugerido de Integração Contínua (CI)

Workflow recomendado para execução automática em pull requests e pushes para a branch principal (`.github/workflows/ci.yml`):

```yaml
name: CI

on:
  push:
    branches: [master]
  pull_request:

jobs:
  verificacao-rapida:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ci
      DIRECT_URL: postgresql://postgres:postgres@localhost:5432/ci
      SESSION_SECRET: ci-session-secret-with-at-least-32-characters
      RESEND_API_KEY: re_ci_dummy
      TZ: America/Sao_Paulo
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

  testes-e2e:
    needs: verificacao-rapida
    runs-on: ubuntu-latest
    env:
      TZ: America/Sao_Paulo
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

---
*Retornar ao índice central: [[00 - Início (MOC)]].*
