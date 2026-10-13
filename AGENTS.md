<!-- BEGIN:nextjs-agent-rules -->

# Esta NÃO é a versão do Next.js que você conhece

Esta versão (Next.js 16) tem breaking changes — APIs, convenções e estrutura de arquivos podem diferir do seu conhecimento prévio. Antes de escrever qualquer código, leia o guia relevante em `node_modules/next/dist/docs/`. Respeite avisos de depreciação.

<!-- END:nextjs-agent-rules -->

## 1. Stack (Não adicione nada fora disso)

- **Next.js 16** (App Router), **React 19**, React Compiler ativado (`next.config.ts:4`).
- **Prisma 7** + PostgreSQL (Supabase) — adaptador `@prisma/adapter-pg` + `pg.Pool`.
- **styled-components** com SSR via `src/lib/registry.tsx`.
- **Google reCAPTCHA v3** apenas no login.
- **Resend** para o e-mail de redefinição de senha, **recharts** para gráficos.
- TypeScript estrito (`tsconfig.json:7`).
- Testes: **Vitest** + Testing Library (unitário, API, UI) e **Playwright** (E2E) — apenas devDependencies.

## 2. Comandos

- `npm run dev` (localhost:3000)
- `npm run build`
- `npm run lint`
- `npm run start` (produção)
- A Vercel instala com **yarn** (existe `yarn.lock`) e roda `next build`; o `tsconfig.json` exclui `tests/` para o build não depender das ferramentas de teste.
- `npm test` (Vitest: unitário + API + UI), `npm run test:e2e` (Playwright, sobe Postgres local e o app). Detalhes em `docs/TESTES.md`.
  _Nota: `prisma generate` roda automaticamente no postinstall._
  **Regra de Ouro:** Antes de commitar, SEMPRE rode `npm run lint`, `npm run typecheck` e `npm test`. Se quebrar, conserte antes de seguir.
  _Nota: `npm install` falha sem `DIRECT_URL` no `.env` (o `prisma generate` do postinstall exige). Use `.env.example` como base._

## 3. Banco de Dados (Atenção Máxima)

- `prisma.config.ts` usa `DIRECT_URL` (conexão direta ao PostgreSQL, porta 5432).
- `src/lib/prisma.ts` usa `DATABASE_URL` via `pg.Pool` (conexão pooler, porta 6543).
- São URLs diferentes no mesmo banco Supabase. **Não troque uma pela outra.**
- Models: `User`, `Transaction`, `Category`, `Budget`, `Goal`, `PasswordResetToken` (ver `docs/API.md`). Todo dado pertence a um `userId`.
- `Transaction.category` e `Budget.category` guardam o **nome** da categoria (texto), não uma FK.
- Sinal de `amount`: receita positiva; despesa e investimento negativos.
- Para aplicar migrations: `npx prisma migrate dev`.

## 4. Autenticação (NÃO use middleware.ts)

O guarda de autenticação está em `src/proxy.ts` (convenção do Next 16). Se precisar proteger novas rotas, adicione à lista `rotasProtegidas` **e** ao `matcher`.
**Fluxo:**

1. Cadastro: POST `/api/register` (nome, e-mail, senha ≥ 8) cria o usuário e 18 categorias padrão.
2. Login envia email + senha + token reCAPTCHA → POST `/api/login`, que valida contra a tabela `users` (bcrypt).
3. Seta cookie `session_token` httpOnly (30 dias), assinado com HMAC-SHA256 usando `SESSION_SECRET` (`src/lib/session.ts`).
4. Proxy lê o cookie e redireciona: sem sessão → `/login`, com sessão em `/login` → `/`.
5. Toda rota de API chama `getAuthenticatedUser` (`src/lib/auth.ts`) e filtra por `userId`. Nunca leia `userId` do corpo da requisição.
6. Recuperação de senha: `/api/auth/forgot-password` + `/api/auth/reset-password` (token de 1 hora, uso único).

## 5. Convenções do Projeto

- Path alias: `@/*` → `./src/*`
- Componentes moram em pasta própria com `index.tsx` + `styles.ts` lado a lado.
- **Páginas e componentes são "use client".** As únicas exceções são `src/app/layout.tsx` e o redirect `src/app/budgets/page.tsx`.
- Mutações vão por API routes (`/api/*`), não por server actions. O acesso passa por `src/services/*.ts`, que **lançam `ApiError`** quando a API falha; formulários exibem a mensagem com `FormError`.
- Estado global: `TransactionsContenxt` centraliza fetch, add, update e delete de transações. Categorias, orçamentos e metas são carregados por página.
- **Datas:** transações e prazos são datas sem horário, gravadas como meia-noite UTC. Use sempre `src/utils/dates.ts` e `formatDate`; nunca `new Date().toISOString().slice(...)` para "hoje" nem `toLocaleDateString` direto.
- Idioma: Textos de UI e documentação em português.

## 6. Armadilhas (Leia antes de modificar)

- `TransactionsContenxt.tsx` tem um erro de digitação no nome (faltou o 'x'). **Não renomeie**, ou quebrará todos os imports.
- Os componentes `Dashboard`, `Header` e `TransactionTable` não estão sendo usados e devem ser ignorados. O dashboard real é montado direto em `src/app/page.tsx` com `SummaryCard`.
- O corte por `score` do reCAPTCHA está comentado na rota de login. Se ativar, defina um threshold.
- `/budgets` apenas redireciona para `/planning`; orçamentos e metas vivem na mesma tela.
- Ao alterar regra de negócio, atualize o teste correspondente em `tests/` e a documentação em `docs/`.
- O **React Compiler** está ativo: Evite mutação direta de estado.

## 7. Princípios e Checklist de Entrega

- Busque referências em código de qualidade.
- Não adicione bibliotecas ou stacks novas. Use apenas o `package.json` atual.
- Código limpo, sem comentários não solicitados.
  **Checklist de Autovalidação da IA:**
- [ ] O código respeita as regras do Next.js 16 (lidas na documentação local)?
- [ ] O componente inclui `'use client'` no topo?
- [ ] Nenhuma biblioteca nova foi introduzida?
- [ ] O estado não foi mutado diretamente (respeitando o React Compiler)?
