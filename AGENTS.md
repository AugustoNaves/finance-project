<!-- BEGIN:nextjs-agent-rules -->

# Esta NÃO é a versão do Next.js que você conhece

Esta versão (Next.js 16) tem breaking changes — APIs, convenções e estrutura de arquivos podem diferir do seu conhecimento prévio. Antes de escrever qualquer código, leia o guia relevante em `node_modules/next/dist/docs/`. Respeite avisos de depreciação.

<!-- END:nextjs-agent-rules -->

## 1. Stack (Não adicione nada fora disso)

- **Next.js 16** (App Router), **React 19**, React Compiler ativado (`next.config.ts:5`).
- **Prisma 7** + PostgreSQL (Supabase) — adaptador `@prisma/adapter-pg` + `pg.Pool`.
- **styled-components** com SSR via `src/lib/registry.tsx`.
- **Google reCAPTCHA v3** apenas no login.
- TypeScript estrito (`tsconfig.json:7`).

## 2. Comandos

- `npm run dev` (localhost:3000)
- `npm run build`
- `npm run lint`
- `npm run start` (produção)
  _Nota: `prisma generate` roda automaticamente no postinstall._
  **Regra de Ouro:** Antes de commitar, SEMPRE rode `npm run lint`. Se quebrar, conserte antes de seguir.

## 3. Banco de Dados (Atenção Máxima)

- `prisma.config.ts` usa `DIRECT_URL` (conexão direta ao PostgreSQL, porta 5432).
- `src/lib/prisma.ts` usa `DATABASE_URL` via `pg.Pool` (conexão pooler, porta 6543).
- São URLs diferentes no mesmo banco Supabase. **Não troque uma pela outra.**
- Model único: `Transaction` (id, description, amount, category, payer, date).
- Para aplicar migrations: `npx prisma migrate dev`.

## 4. Autenticação (NÃO use middleware.ts)

O guarda de autenticação está em `src/proxy.ts`. É um padrão customizado, não o `middleware.ts` convencional. Se precisar proteger novas rotas, adicione ao matcher existente.
**Fluxo:**

1. Login envia email + senha + token reCAPTCHA → POST `/api/login`
2. API valida contra `EMAIL_ACESSO` / `SENHA_ACESSO` do `.env`
3. Seta cookie `auth_token` httpOnly (30 dias)
4. Proxy lê o cookie e redireciona: sem token → `/login`, com token → `/`

## 5. Convenções do Projeto

- Path alias: `@/*` → `./src/*`
- Componentes moram em pasta própria com `index.tsx` + `styles.ts` lado a lado.
- **Tudo é "use client":** O projeto não usa React Server Components.
- Mutações vão por API routes (`/api/transactions`), não por server actions.
- Estado global: `TransactionsContenxt` centraliza fetch, add e delete.
- Idioma: Textos de UI e documentação em português.

## 6. Armadilhas (Leia antes de modificar)

- `TransactionsContenxt.tsx` tem um erro de digitação no nome (faltou o 'x'). **Não renomeie**, ou quebrará todos os imports.
- O componente `Dashboard` (src/components/Dashboard/) não está sendo usado e deve ser ignorado. O dashboard real é montado direto em `src/app/page.tsx` com `SummaryCard`.
- Pastas `src/features/` e `src/utils/` estão vazias. Não crie nada nelas sem ordem explícita.
- Validação do reCAPTCHA está comentada na rota de login. Se ativar, defina um threshold.
- Não há framework de testes. Não rode testes.
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
