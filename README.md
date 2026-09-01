# 💰 Finanças Pessoais (Finance Dashboard)

Um sistema completo de gestão financeira pessoal (SaaS-like) focado em usabilidade, performance e segurança. Desenvolvido com uma arquitetura moderna para demonstrar boas práticas de engenharia de software no ecossistema React/Next.js.

## 🚀 Tecnologias Utilizadas

Este projeto foi construído utilizando as ferramentas mais modernas do mercado:

- **Framework:** [Next.js 16 (App Router)](https://nextjs.org/) + [React](https://react.dev/)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Banco de Dados:** PostgreSQL (via [Supabase](https://supabase.com/))
- **ORM:** [Prisma](https://www.prisma.io/)
- **Estilização:** [styled-components](https://styled-components.com/)
- **Autenticação e Segurança:** Gerenciamento de sessões com proteção de rotas privadas
- **Envio de E-mails:** [Resend](https://resend.com/)

## ✨ Principais Funcionalidades

- **Dashboard Interativo:** Visão geral rápida sobre receitas, despesas e saldo atual do mês.
- **Gestão de Transações:** CRUD completo (Criar, Ler, Atualizar, Deletar) de receitas e despesas.
- **Categorização Personalizada:** Os usuários podem organizar seus gastos criando categorias personalizadas com ícones e cores, permitindo uma análise clara de onde o dinheiro está sendo gasto.
- **Isolamento de Dados (Multi-tenancy):** Arquitetura segura onde cada usuário autenticado só tem acesso aos seus próprios dados financeiros no banco de dados relacional.
- **UI/UX Moderna:** Interface 100% responsiva (Mobile-First) com suporte nativo a transições fluidas e Tema Escuro (Dark Mode).

## 💻 Como rodar o projeto localmente

Siga os passos abaixo para testar o projeto na sua própria máquina:

### 1. Clone o repositório
\\\ash
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
cd finance-project-with-next-no-ia
\\\

### 2. Instale as dependências
\\\ash
npm install
# ou
yarn install
\\\

### 3. Configure as Variáveis de Ambiente
Crie um arquivo chamado \.env\ na raiz do projeto e configure suas chaves (use o arquivo \.env.example\ como base, se houver):
\\\nv
DATABASE_URL="sua_string_de_conexao_do_postgresql"
# (Adicione outras chaves como as do Resend, se necessário)
\\\

### 4. Execute as Migrations do Banco de Dados
Isso criará as tabelas (Users, Transactions, Categories, etc.) no seu PostgreSQL:
\\\ash
npx prisma generate
npx prisma db push
\\\

### 5. Inicie o Servidor de Desenvolvimento
\\\ash
npm run dev
\\\
O projeto estará rodando em [http://localhost:3000](http://localhost:3000).

## 🧠 Arquitetura e Decisões Técnicas

- **Next.js App Router:** Escolhido por permitir SSR (Server-Side Rendering) e Server Actions, removendo a necessidade de construir uma API REST separada para operações triviais do banco.
- **Prisma:** Garante a segurança de tipos de ponta a ponta (Type-Safety) entre o banco de dados PostgreSQL e os componentes React.
- **Estilização por Componentes:** O uso do \styled-components\ evitou vazamento de CSS global e facilitou a estruturação do Dark Mode utilizando um Theme Provider nativo.

---

Feito com dedicação para fins de estudo e portfólio.
