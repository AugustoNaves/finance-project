# 💰 Finanças Pessoais (Finance Dashboard)

Um sistema completo de gestão financeira pessoal (SaaS-like) focado em usabilidade, performance e segurança. Desenvolvido com uma arquitetura moderna para demonstrar boas práticas de engenharia de software no ecossistema React/Next.js.

## 🚀 Tecnologias Utilizadas

Este projeto foi construído utilizando as ferramentas mais modernas do mercado:

- **Framework:** [Next.js 16 (App Router)](https://nextjs.org/) + [React](https://react.dev/)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Banco de Dados:** PostgreSQL (via [Supabase](https://supabase.com/))
- **ORM:** [Prisma](https://www.prisma.io/)
- **Estilização:** [styled-components](https://styled-components.com/)
- **Gráficos:** [recharts](https://recharts.org/)
- **Testes:** [Vitest](https://vitest.dev/), Testing Library e [Playwright](https://playwright.dev/)
- **Autenticação e Segurança:** Gerenciamento de sessões com proteção de rotas privadas
- **Envio de E-mails:** [Resend](https://resend.com/)

## ✨ Principais Funcionalidades

- **Contas e sessão:** cadastro, login com reCAPTCHA v3, recuperação de senha por e-mail e logout.
- **Dashboard:** receitas, despesas, investimentos e saldo acumulados, resumo do mês e indicadores.
- **Transações:** criar, editar, excluir, buscar, filtrar (tipo, categoria, período) e ordenar.
- **Importação de fatura por PDF:** lê a fatura do cartão no navegador, sugere categorias, mostra um preview editável, registra tudo de uma vez e permite desfazer.
- **Categorias:** por tipo (receita, despesa, investimento), com cor e sigla; 18 categorias padrão no cadastro.
- **Planejamento:** orçamentos mensais por categoria com progresso de gasto, e metas financeiras.
- **Investimentos:** total aportado, aportes do mês e evolução em 6 meses.
- **Relatórios:** indicadores e gráficos por mês selecionado.
- **Configurações:** dados da conta e exportação das transações em JSON/CSV.
- **Isolamento de dados:** cada usuário só acessa os próprios registros.
- **Interface responsiva** em tema escuro.

## 📚 Documentação

| Documento | Conteúdo |
|---|---|
| [docs/FUNCIONALIDADES.md](docs/FUNCIONALIDADES.md) | Mapa funcional de todas as telas, regras de negócio e matriz de funcionalidades |
| [docs/API.md](docs/API.md) | Arquitetura, modelo de dados, autenticação e referência da API |
| [docs/TESTES.md](docs/TESTES.md) | Como rodar os testes e o que cada suíte cobre |
| [docs/MELHORIAS.md](docs/MELHORIAS.md) | Melhorias aplicadas e pendentes, com prioridade |
| [docs/specs/SPEC-importacao-fatura-pdf.md](docs/specs/SPEC-importacao-fatura-pdf.md) | Especificação da importação de fatura por PDF |

## 💻 Como rodar o projeto localmente

### 1. Clone o repositório

```bash
git clone https://github.com/AugustoNaves/finance-project.git
cd finance-project
```

### 2. Configure as variáveis de ambiente

Faça isso **antes** do `npm install`: o `postinstall` roda `prisma generate`, que falha sem `DIRECT_URL`.

```bash
cp .env.example .env
```

Preencha os valores conforme os comentários do arquivo (detalhes em [docs/API.md](docs/API.md#2-variáveis-de-ambiente)).

### 3. Instale as dependências

```bash
npm install
```

### 4. Aplique as migrations

```bash
npx prisma migrate deploy
```

### 5. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

O projeto estará rodando em [http://localhost:3000](http://localhost:3000).

## 🧪 Testes

```bash
npm test            # Vitest: unitário, API e UI
npm run test:e2e    # Playwright: fluxo completo com Postgres local
```

Veja [docs/TESTES.md](docs/TESTES.md).

## 🧠 Arquitetura e Decisões Técnicas

- **Next.js App Router:** páginas como Client Components consumindo Route Handlers (`/api/*`). O projeto não usa Server Actions.
- **Prisma:** tipagem ponta a ponta entre o PostgreSQL e a API.
- **Sessão própria:** cookie httpOnly assinado com HMAC-SHA256, validado no `src/proxy.ts` e em cada rota de API.
- **styled-components:** estilos por componente com SSR.

---

Feito com dedicação para fins de estudo e portfólio.
