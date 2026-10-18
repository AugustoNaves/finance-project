# Tasks — SPEC 002

Executar na ordem. Cada task só fecha quando os comandos de "Pronto quando" passam e o resultado está registrado em `downhill.md`. O **como** de cada task está em `uphill.md`.

| ID | Task | Depende de | Cobre | Status |
|---|---|---|---|---|
| T1 | Schema e migration: `sessionVersion`, `auth_attempts` com RLS, `tokenHash` | — | R10, R16, R18, CA19 | ⬜ |
| T2 | Módulos `rateLimit` e `recaptcha` com testes unitários | T1 | R1, R3, R4, R5, R6, R8, CA1, CA2, CA3, CA4 | ⬜ |
| T3 | Limite e reCAPTCHA nas rotas de login, cadastro e "esqueci a senha" | T2 | R1, R2, R3, R5, R7, R8, CA4, CA5, CA6, CA7 | ⬜ |
| T4 | Token de redefinição por hash, consumo atômico e revogação na troca de senha | T1, T2 | R1, R12, R16, R17, CA8, CA9 | ⬜ |
| T5 | Versão da sessão: token, `getAuthenticatedUser`, proxy em `/login` e `POST /api/auth/logout-all` | T1 | R10, R11, R13, R15, CA10, CA11, CA12, CA13 | ⬜ |
| T6 | Telas: reCAPTCHA no cadastro e em "Recuperar senha", aviso, "Sair de todos os aparelhos" | T3, T5 | R2, R9, R14, CA14, CA15 | ⬜ |
| T7 | E2E: suporte sem cadastro pela API, revogação, limite compartilhado, hash e RLS | T3, T4, T5, T6 | R11–R18, R20, CA16, CA17, CA18, CA19, CA20 | ⬜ |
| T8 | Aplicar a migration na produção — **requer aprovação do usuário** | T7 | R19, VM1 | ⬜ |
| T9 | Documentação e verificação completa | T7 | R20, CA20, CA21 | ⬜ |

## T1 — Schema e migration

- **Entrega:** `prisma/schema.prisma` (`User.sessionVersion Int @default(0)`; model `AuthAttempt` mapeado para `auth_attempts` com `key String @id`, `windowStart DateTime`, `count Int`; `PasswordResetToken.tokenHash String @unique` no lugar de `token`); `prisma/migrations/<timestamp>_auth_hardening/migration.sql`.
- **Objetivo:** criar as estruturas do K7 numa única migration, com RLS na tabela nova e conversão dos tokens existentes para hash, sem invalidar links ainda válidos.
- **Pronto quando:**
  - `npx prisma validate` e `npx prisma generate` passam.
  - Num Postgres local vazio (o do E2E, `.e2e-pg`), `npx prisma migrate deploy` aplica todas as migrations sem erro e `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url <local>` sai vazio.
  - Consulta no banco local: `select relrowsecurity from pg_class where relname = 'auth_attempts'` → `true`; `password_reset_tokens` sem coluna `token`.
  - Experimento registrado no `downhill.md`: um token em texto inserido antes da migration continua válido depois dela (o `tokenHash` gerado no SQL é igual ao `sha256` hex do Node).
  - `npm run typecheck` passa (o código que ainda usa `token` é ajustado nas tasks seguintes; se o typecheck quebrar aqui, T1 e T4 fecham juntas e isso fica anotado).

## T2 — Módulos `rateLimit` e `recaptcha`

- **Entrega:** `src/lib/rateLimit.ts` (tabela de limites por ação, `consumeAttempt`/`resetAttempts` ou equivalente, chave `ação:e-mail` e `ação:ip:<ip>`, limpeza oportunista); `src/lib/recaptcha.ts` (`verifyRecaptcha(token, expectedAction, request)` com limiar de `RECAPTCHA_MIN_SCORE`); `tests/unit/lib/rateLimit.test.ts`; `tests/unit/lib/recaptcha.test.ts`; `.env.example` com `RECAPTCHA_MIN_SCORE`.
- **Objetivo:** concentrar em dois módulos testáveis a contagem compartilhada e a verificação do reCAPTCHA, para as rotas só chamarem.
- **Pronto quando:**
  - `npx vitest run tests/unit/lib/rateLimit.test.ts` passa com os casos: 5 tentativas passam e a 6ª bloqueia com `retryAfter` > 0; janela vencida recomeça em 1; e-mails distintos independentes; contador de IP bloqueia trocando o e-mail; e-mail com maiúsculas/espaços na mesma chave; limites de cada ação conforme R1; `reset` zera só a chave do e-mail; limpeza das linhas > 24 h é chamada e sua falha não propaga (CA1, CA2).
  - `npx vitest run tests/unit/lib/recaptcha.test.ts` passa com: score 0,49 recusa e 0,5 aceita (padrão); `RECAPTCHA_MIN_SCORE` 0,7 recusa 0,6; `"abc"`, `"-1"`, `"2"` e vazio valem 0,5; sem `score` recusa; `action` errada recusa; hostname diferente recusa e ausente aceita; segredo ausente → `{ status: 500, error: "Configuração do reCAPTCHA ausente." }` com log; erro de rede e corpo não JSON → `503` (CA3, CA4).
  - `npm run lint && npm run typecheck` passam.

## T3 — Limite e reCAPTCHA nas rotas

- **Entrega:** `src/app/api/login/route.ts` (sem o `Map` em memória; usa `rateLimit` e `recaptcha`), `src/app/api/register/route.ts`, `src/app/api/auth/forgot-password/route.ts`; `tests/api/login.test.ts`, `tests/api/register.test.ts`, `tests/api/forgot-password.test.ts` atualizados (os casos "comportamento atual" de score e de `403` sem segredo passam a afirmar o comportamento novo).
- **Objetivo:** aplicar R1–R8 nas três rotas, na ordem: validação do corpo → limite → reCAPTCHA → regra da rota.
- **Pronto quando:**
  - `npx vitest run tests/api/login.test.ts` passa com: `429` com mensagem e `Retry-After` sem chamar `fetch` nem `comparePassword`; sucesso zera só o contador do e-mail; `400` sem token não consome tentativa; score baixo `403`; segredo ausente `500` (CA4, CA5).
  - `npx vitest run tests/api/register.test.ts` passa com: sem token `400`; score baixo e `action` errada `403` sem `user.create`; limite estourado `429` sem `user.create`; segredo ausente `500`; caminho feliz `201` com 18 categorias (CA4, CA6).
  - `npx vitest run tests/api/forgot-password.test.ts` passa com: sem token `400`; score baixo `403` sem `sendPasswordResetEmail`; limite `429` sem `createPasswordResetToken`; respostas idênticas para e-mail cadastrado e não cadastrado; segredo ausente `500` (CA4, CA7).
  - `npm run lint && npm run typecheck` passam.

## T4 — Token por hash, consumo atômico e revogação na troca de senha

- **Entrega:** `src/lib/tokens.ts` (gera o token, grava `tokenHash`, valida e consome pelo hash com `updateMany` condicional); `src/app/api/auth/reset-password/route.ts` (limite de tentativas; consumo, troca do hash e `sessionVersion: { increment: 1 }` na mesma transação); `tests/unit/lib/tokens.test.ts`, `tests/api/reset-password.test.ts` atualizados.
- **Objetivo:** o banco nunca guarda o token legível, e o mesmo link não troca a senha duas vezes nem em paralelo; trocar a senha derruba as sessões.
- **Pronto quando:**
  - `npx vitest run tests/unit/lib/tokens.test.ts` passa com: `create` recebe `tokenHash` de 64 hex igual ao SHA-256 do token devolvido e nenhum campo `token`; validação busca por `tokenHash`; consumo chama `updateMany` com `tokenHash`, `usedAt: null` e `expiresAt: { gt: agora }`, devolvendo `false` quando `count` é 0 (CA8).
  - `npx vitest run tests/api/reset-password.test.ts` passa com: `count` 0 → `400 "Link inválido ou expirado."` sem `user.update`; sucesso faz consumo, troca do hash e incremento de `sessionVersion` dentro do mesmo `$transaction`; falha do incremento ou do consumo → `500` sem trocar a senha; 6º pedido do mesmo e-mail em 15 min → `429` (CA8, CA9).
  - `npm run lint && npm run typecheck` passam.

## T5 — Versão da sessão, proxy e "sair de todos"

- **Entrega:** `src/lib/session.ts` (`createSessionToken` recebe `sessionVersion` e grava `v`; `verifySessionToken` aceita ausência como 0 e recusa `v` inválido); `src/lib/auth.ts` (seleciona `sessionVersion` e compara); `src/app/api/login/route.ts` (passa a versão ao criar o token); `src/proxy.ts` (conferência de versão só em `/login`); `src/app/api/auth/logout-all/route.ts`; `tests/unit/lib/session.test.ts`, `tests/unit/lib/auth.test.ts`, `tests/unit/proxy.test.ts`, novo `tests/api/logout-all.test.ts`.
- **Objetivo:** permitir revogar todas as sessões de um usuário sem tabela de sessões, e sem laço entre `/login` e `/` quando o cookie foi revogado.
- **Pronto quando:**
  - `npx vitest run tests/unit/lib/session.test.ts tests/unit/lib/auth.test.ts` passa com: token com `v`; token sem `v` aceito como 0; `v` `"1"`, `-1` e `1.5` recusados; `getAuthenticatedUser` devolve `null` para versão diferente e o usuário para versão igual; token sem `v` com versão 1 → `null` (CA10, CA11).
  - `npx vitest run tests/api/login.test.ts` confirma que o cookie emitido traz `v` igual ao `sessionVersion` do usuário (CA10).
  - `npx vitest run tests/api/logout-all.test.ts` passa com: `401` sem sessão e sem chamada ao banco; `200` incrementa `sessionVersion` do usuário da sessão e expira o cookie; falha do banco `500` (CA12).
  - `npx vitest run tests/unit/proxy.test.ts` passa com: `/login` com versão revogada não redireciona e expira o cookie; com versão em dia redireciona para `/`; visitante sem cookie continua indo para `/login` nas rotas protegidas; `matcher` inalterado (CA13).
  - `npm run lint && npm run typecheck` passam.

## T6 — Telas

- **Entrega:** `src/app/login/page.tsx` (cadastro com `executeRecaptcha("register")`; aviso "Protegido por reCAPTCHA." nos dois modos); `src/app/forgot-password/page.tsx` (provider, token `forgot_password`, aviso); `src/app/settings/page.tsx` e `styles.ts` (só a seção "Sessão": botão "Sair de todos os aparelhos" + `ConfirmDialog`); `src/services/auth.ts` ou função equivalente que lança `ApiError` no `logout-all`; `tests/ui/pages/auth.test.tsx`, `tests/ui/pages/settings.test.tsx`.
- **Objetivo:** as telas enviam o que as rotas passaram a exigir e a pessoa tem como derrubar as outras sessões.
- **Pronto quando:**
  - `npx vitest run tests/ui/pages/auth.test.tsx` passa com: cadastro chama `executeRecaptcha("register")` e envia `recaptchaToken`; reCAPTCHA não carregado no cadastro e em "Recuperar senha" mostra o aviso sem chamar a API; "Recuperar senha" envia token de `forgot_password`; `429` mostra "Muitas tentativas. Tente novamente em alguns minutos." nas duas telas; "Protegido por reCAPTCHA." aparece em Entrar, Criar conta e Recuperar senha (CA14). O caso antigo "cadastro … (sem reCAPTCHA)" é reescrito.
  - `npx vitest run tests/ui/pages/settings.test.tsx` passa com: "Sair de todos os aparelhos" abre a confirmação; confirmar chama `POST /api/auth/logout-all` e navega para `/login`; falha mostra a mensagem em `role="alert"`, mantém a confirmação e não navega; "Cancelar" não chama a API (CA15).
  - `npm run lint && npm run typecheck` passam.

## T7 — E2E

- **Entrega:** `tests/e2e/support/db.ts` (criar usuário modelo por SQL com hash bcrypt de `E2E_PASSWORD` e as categorias padrão; ler/expirar tokens por `tokenHash`; inserir token de redefinição conhecido; ler e inserir linhas de `auth_attempts`; consultar `relrowsecurity`), `tests/e2e/support/fixtures.ts` (`registerAccount` sem `POST /api/register`), `tests/e2e/global-setup.ts` (usuário modelo sem a API de cadastro), `tests/e2e/01-auth.spec.ts` (cadastro e "esqueci a senha" pela tela com a API interceptada; casos novos), `tests/ajuda/capturas.ts` (conta de demonstração sem `POST /api/register`).
- **Objetivo:** provar com servidor e Postgres reais a revogação, o limite compartilhado, o hash do token e o RLS, sem atalho no código de produção.
- **Pronto quando:**
  - `npx playwright test tests/e2e/01-auth.spec.ts` passa, incluindo os testes novos:
    - "Sair de todos os aparelhos derruba a sessão do outro navegador e /login abre sem laço" (CA16);
    - "redefinir a senha derruba a sessão aberta; link reutilizado e chamadas simultâneas dão um único 200" (CA17);
    - "limite de login é compartilhado: 8 pedidos simultâneos, 3 recebem 429; linha antiga de auth_attempts é limpa" (CA18);
    - "banco criado pelas migrations: RLS em auth_attempts, tokenHash no lugar de token, sessionVersion 0" (CA19).
  - `grep -rnE "RECAPTCHA_(BYPASS|DISABLED|SKIP)|E2E" src` não encontra desvio de reCAPTCHA (CA20).
  - `npm run test:e2e` passa inteiro (todas as fixtures continuam criando contas).

## T8 — Aplicar a migration na produção (requer aprovação do usuário)

- **Entrega:** registro em `downhill.md` do pedido de aprovação, da aprovação, da saída de `npx prisma migrate deploy` contra a produção e das consultas somente leitura.
- **Objetivo:** levar o schema da produção ao estado do K7 no momento do deploy do código (o código antigo grava `token`; entre a migration e o deploy o "esqueci a senha" antigo falharia, então os dois passos são feitos em sequência, combinados com o usuário).
- **Pronto quando:**
  - O usuário aprovou explicitamente, nesta sessão, a execução de `npx prisma migrate deploy` na produção.
  - Depois da aplicação, somente leitura: `npx prisma migrate status` em dia; `select relrowsecurity from pg_class where relname in ('auth_attempts','password_reset_tokens')` → `true`; `select count(*) from password_reset_tokens where "tokenHash" is null` → 0; coluna `token` inexistente em `information_schema.columns`; `select count(*) from users where "sessionVersion" <> 0` → 0 (VM1).

## T9 — Documentação e verificação completa

- **Entrega:** `docs/API.md` (§1 anti-bot, §2 `RECAPTCHA_MIN_SCORE`, §3 `auth_attempts` e `sessionVersion`, §4 limite compartilhado e revogação, §5.1 com `recaptchaToken` em cadastro e "esqueci a senha", `429`, `500` sem segredo, `POST /api/auth/logout-all`, §6 a migration); `docs/FUNCIONALIDADES.md` §0 (Configurações: "Sair de todos os aparelhos"; Login: reCAPTCHA no cadastro e na recuperação); `docs/TESTES.md` ("Login e reCAPTCHA": contas do E2E por SQL, cadastro e recuperação interceptados, contagem de testes atualizada); `docs/MELHORIAS.md` (P2–P5, P12 e os itens de Baixa resolvidos marcados como aplicados); `.env.example`; guia `/ajuda` (parte "Sair"/sessão: menção a "Sair de todos os aparelhos") e capturas regravadas se a tela de Configurações aparecer no guia.
- **Objetivo:** deixar a documentação igual ao comportamento e provar a spec inteira.
- **Pronto quando:**
  - `npm run lint && npm run typecheck && npm test` passam.
  - `npm run test:e2e` passa.
  - `npx vite-node tests/ajuda/capturas.ts` roda sem erro (cria a conta de demonstração sem a API de cadastro) e as capturas alteradas estão no commit.
  - `grep -n "comentado" docs/API.md` não fala mais do corte por score.

## Fatos verificados

| Fato | Onde |
|---|---|
| VERIFICADO — Payload da sessão é `{ userId, email, exp }`; `verifySessionToken` recusa `exp` não numérico; assinatura com `crypto.subtle` | `src/lib/session.ts:7-11`, `:111-144` |
| VERIFICADO — `getAuthenticatedUser` só confirma que o usuário existe (`findUnique` por id), sem versão | `src/lib/auth.ts:5-19` |
| VERIFICADO — Proxy confere só a assinatura; `/login` com sessão redireciona para `/`; `matcher` com caminhos exatos | `src/proxy.ts:5-44` |
| VERIFICADO — Proxy roda no runtime Node.js por padrão no Next 16 e não aceita `runtime` | `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:217-219` |
| VERIFICADO — Limite do login em `Map` do processo, 5 tentativas / 15 min, chave `email:ip` com `x-forwarded-for` | `src/app/api/login/route.ts:11-40` |
| VERIFICADO — Corte por score comentado; `action !== "login"` e hostname diferentes reprovam | `src/app/api/login/route.ts:88-98` |
| VERIFICADO — Segredo ausente devolve `403` (sem `status`); rede/JSON inválido `503` | `src/app/api/login/route.ts:50-52`, `:77-84`, `:142` |
| VERIFICADO — Limite checado antes do reCAPTCHA; sem token responde `400` antes de contar; sucesso apaga a chave | `src/app/api/login/route.ts:121-144`, `:161` |
| VERIFICADO — Cadastro e "esqueci a senha" sem reCAPTCHA nem limite | `src/app/api/register/route.ts:10-96`, `src/app/api/auth/forgot-password/route.ts:7-57` |
| VERIFICADO — Token de redefinição = `crypto.randomUUID()` gravado em texto; validação por `findUnique({ token })` e consumo por `update` (não condicional) | `src/lib/tokens.ts:6-50`, `prisma/schema.prisma:97-110` |
| VERIFICADO — Redefinir valida e depois troca senha + marca token numa transação, mas a validação fica fora dela (janela de corrida) | `src/app/api/auth/reset-password/route.ts:34-51` |
| VERIFICADO — Logout só expira o cookie | `src/app/api/logout/route.ts:7-17` |
| VERIFICADO — Configurações tem a seção "Sessão" com "Sair da conta" que ignora falha da API | `src/app/settings/page.tsx:114-118`, `:176-182` |
| VERIFICADO — Tela de login: só o login chama `executeRecaptcha("login")`; cadastro faz `fetch("/api/register")` sem token; aviso "Login protegido por reCAPTCHA." nos dois modos | `src/app/login/page.tsx:88-92`, `:109-120`, `:216` |
| VERIFICADO — "Recuperar senha" não tem provider de reCAPTCHA e mostra `data.error` da API | `src/app/forgot-password/page.tsx:22-56` |
| VERIFICADO — Testes de API simulam prisma e `fetch` (Google) com `vi`; segredo de teste em `tests/setup/node.ts` | `tests/api/login.test.ts:1-60`, `tests/setup/node.ts:3` |
| VERIFICADO — E2E: o navegador recebe um stub do `api.js` do Google; o login pela tela é testado com `/api/login` interceptada; a API real com token falso responde `403` ou `500` | `tests/e2e/support/fixtures.ts:35-43`, `:111-119`; `tests/e2e/01-auth.spec.ts:168-268` |
| VERIFICADO — E2E cadastra pela API **sem token**: `registerAccount`, usuário modelo do `global-setup` e o teste de cadastro pela tela; `tests/ajuda/capturas.ts` também | `tests/e2e/support/fixtures.ts:56-76`, `tests/e2e/global-setup.ts:38-50`, `tests/e2e/01-auth.spec.ts:72-98`, `tests/ajuda/capturas.ts:73` |
| VERIFICADO — E2E lê o token puro do banco para montar o link (`select token`) e expira por `token` | `tests/e2e/support/db.ts:35-56`; `tests/e2e/01-auth.spec.ts:288-362` |
| VERIFICADO — O token de sessão do E2E é gerado sem `v` (vale como 0 pelo K7) | `tests/e2e/support/session.ts:12-27` |
| VERIFICADO — O E2E aplica o schema com `prisma migrate deploy` (fallback `db push`) | `tests/e2e/support/postgres.ts:73-88` |
| VERIFICADO — Migration de RLS como modelo (`ENABLE ROW LEVEL SECURITY` + revogação condicional para `anon`/`authenticated`) | `prisma/migrations/20261017000000_enable_rls/migration.sql` |
| VERIFICADO — `docs/TESTES.md` afirma "Nenhum atalho foi adicionado ao código de produção para os testes." | `docs/TESTES.md:81` |
| NÃO VERIFICADO — Prisma Client funciona dentro do `proxy.ts` (bundling do runtime Node do proxy, `pg.Pool`) | incógnita (a) |
| NÃO VERIFICADO — `sha256()` do Postgres existe na versão do Supabase e do `embedded-postgres` (PG ≥ 11) | incógnita (d) |
| NÃO VERIFICADO — Na Vercel, o primeiro valor de `x-forwarded-for` (ou `x-real-ip`) é definido pela plataforma e não pelo cliente | incógnita (f) |
| NÃO VERIFICADO — Se o Postgres do E2E (`.e2e-pg`) é recriado a cada execução ou reaproveitado (contadores de uma execução afetariam a seguinte) | incógnita (e) |

## Incógnitas iniciais para o uphill

- **(a) Versão da sessão no proxy.** O proxy roda em Node.js (doc verificada), mas importar `@/lib/prisma` nele (pool `pg`, adaptador) precisa de prova: build e `next dev`. Proposta da spec: consultar o banco **só** em `/login` (rara), para quebrar o laço; nas páginas protegidas a versão é conferida pelas APIs (401 → spec 001 leva ao login). Plano B se o proxy não puder usar o Prisma: a tela `/login` deixa de ser redirecionada pelo proxy quando há cookie e ela mesma consulta `GET /api/me` para decidir. Medir o custo de uma consulta por navegação caso se cogite conferir em todas as páginas.
- **(b) Limpeza de `auth_attempts` sem cron.** Opções: `DELETE ... WHERE "windowStart" < now() - interval '24 hours'` na mesma ida ao banco do incremento, a cada N requisições, ou com probabilidade. Decidir com o volume real (dezenas de linhas/dia) e garantir que falha da limpeza não afete a resposta.
- **(c) reCAPTCHA no cadastro e no "esqueci a senha" nos testes.** API: `fetch` simulado (já é o padrão). E2E: sem atalho em produção — contas criadas por SQL (hash bcrypt de `E2E_PASSWORD` + categorias padrão), telas de cadastro e recuperação com a API interceptada, e a API real testada só nos caminhos que não dependem do Google (400, 429 antes do reCAPTCHA, redefinir). Confirmar de onde vêm as 18 categorias padrão no SQL sem duplicar a lista (extrair a lista do `register/route.ts` para um módulo importável pelo `global-setup`?). Score baixo só é testável nos testes de API.
- **(d) Tokens de redefinição já emitidos.** Proposta: a migration calcula `encode(sha256(convert_to(token, 'UTF8')), 'hex')` e o Node usa `createHash("sha256").update(token, "utf8").digest("hex")`; provar igualdade num experimento. Alternativa se `sha256()` não existir: marcar todos os tokens não usados como usados (links duram 1 h) e avisar no deploy.
- **(e) Contadores e o E2E.** Todas as requisições do E2E saem de `127.0.0.1`: confirmar que os contadores de IP (30 login, 10 cadastro, 10 recuperação por hora) não estouram numa execução completa com `retries`, e se `.e2e-pg` persiste entre execuções (se persistir, limpar `auth_attempts` no `global-setup`).
- **(f) Origem do IP.** Confirmar na doc da Vercel qual cabeçalho é confiável; IP ausente vira `unknown` e conta junto (aceitável, pois o e-mail é a chave principal).
- **(g) Atomicidade do incremento.** `INSERT ... ON CONFLICT ("key") DO UPDATE SET count = CASE WHEN janela vencida THEN 1 ELSE count + 1 END ... RETURNING` via `$queryRaw`, ou `upsert` do Prisma (que pode não ser atômico): provar com 8 requisições simultâneas no Postgres local.
- **(h) `Retry-After`.** Calcular a partir de `windowStart` + janela do contador que estourou; se os dois estouram, o maior.
- **(i) Corrida de 30 dias.** O cookie continua com 30 dias; confirmar que incrementar `sessionVersion` não afeta o login seguinte (o novo token já sai com a versão nova) e que o `E2E` de clone de usuário (`cloneTemplateUser`) herda `sessionVersion` 0 pelo padrão da coluna.

## Questões para o orquestrador

> **Decididas no portão do topo (18/10/2026).** As decisões estão em [`../README.md`](../README.md#portão-do-topo--decisões-18102026) e já constam em [`../contratos.md`](../contratos.md); o texto abaixo fica como histórico.
1. **Chave do limite em "redefinir senha" (K7).** O K7 diz que a chave é `ação:e-mail normalizado`, mas `POST /api/auth/reset-password` não recebe e-mail. Proposta: usar o e-mail do dono do token quando o token existe (`reset_password:<e-mail>`) e, para token inexistente, só o contador de IP (`reset_password:ip:<ip>`). O token tem 122 bits aleatórios, então adivinhação não é o risco; o contador só limita abuso. Pede uma linha a mais no K7.
2. **Rota de "Sair de todos os aparelhos".** O K7 não nomeia a rota. Proposta: `POST /api/auth/logout-all` (dentro de `src/app/api/auth`, pasta já atribuída à 002 na onda 1). Registrar no K7.
3. **`tests/e2e/support/*` na onda 1.** A regra diz que, em onda com várias specs, cada uma só acrescenta helpers. A 002 precisa **alterar** `getResetTokens` e `expireResetToken` (`db.ts`, leem a coluna `token`, que deixa de existir), `registerAccount` (`fixtures.ts`) e o `warmUp` do `global-setup.ts` (ambos chamam `POST /api/register` sem reCAPTCHA). Proposta: a 002 é dona dessas quatro funções nesta onda; a 001 não as altera.
4. **`src/app/settings/page.tsx` na onda 1.** A 001 toca "páginas autenticadas" e a 002 acrescenta o botão na seção "Sessão" da mesma página. Proposta: a 002 altera só o bloco `LedgerSection title="Sessão"` e o `styles.ts` correspondente; quem descer depois faz o rebase. Alternativa: a 002 desce depois da 001 dentro da onda.
5. **`tests/ajuda/capturas.ts`.** Fica fora de `tests/e2e/support`, mas cadastra pela API. A 002 precisa ajustá-lo (conta de demonstração por SQL); registrar que a 002 é dona dele na onda 1.
