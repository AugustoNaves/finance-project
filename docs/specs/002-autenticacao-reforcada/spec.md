# SPEC 002 — Autenticação reforçada

| | |
|---|---|
| Depende de | 001 (onda 2, em paralelo com 007 e 010) |
| Entrega | `prisma/schema.prisma` e uma migration nova; `src/lib/session.ts`, `src/lib/auth.ts`, `src/lib/tokens.ts`, `src/proxy.ts`; novos `src/lib/rateLimit.ts` e `src/lib/recaptcha.ts`; rotas `src/app/api/{login,register,logout,auth/forgot-password,auth/reset-password}` e a nova `src/app/api/auth/logout-all`; telas `src/app/login`, `src/app/forgot-password`, `src/app/settings` (só a seção "Sessão"); testes em `tests/unit`, `tests/api`, `tests/ui/pages`, `tests/e2e/01-auth.spec.ts` e `tests/e2e/support` |
| Docs de base | [`visao-geral.md`](../visao-geral.md), [`contratos.md`](../contratos.md) (K7, dono), [`fatos-verificados.md`](../fatos-verificados.md), [`../../API.md`](../../API.md) §2, §4, §5.1 e §6, [`../../TESTES.md`](../../TESTES.md) ("Login e reCAPTCHA"), [`../../MELHORIAS.md`](../../MELHORIAS.md) P2–P5, P12 e §2 Baixa |

## Objetivo

Fechar as brechas de autenticação que hoje só existem no papel: o limite de tentativas passa a valer entre instâncias da Vercel (tabela compartilhada), o reCAPTCHA passa a cortar por score e a proteger também o cadastro e o "esqueci a senha", a pessoa consegue derrubar todas as sessões abertas (e a troca de senha faz isso sozinha), e o link de redefinição deixa de ficar legível no banco e não pode ser usado duas vezes nem em requisições simultâneas. Para o usuário final: uma conta roubada ou um celular perdido deixam de significar acesso por 30 dias, e ninguém usa o app para disparar e-mails ou criar contas em massa.

## Requisitos

| ID | Requisito |
|---|---|
| R1 | Login, cadastro, "esqueci a senha" e "redefinir senha" contam tentativas na tabela compartilhada `auth_attempts` (K7), com a chave principal `ação:e-mail normalizado` e um segundo contador `ação:ip:<ip>`; o IP nunca é a única chave quando há e-mail. Limites (janela fixa a partir da primeira tentativa): login 5 por e-mail e 30 por IP em 15 min; cadastro 3 por e-mail e 10 por IP em 1 h; "esqueci a senha" 3 por e-mail e 10 por IP em 1 h; redefinir 5 por e-mail do dono do token e 20 por IP em 15 min. Os valores ficam numa única tabela de constantes em `src/lib/rateLimit.ts`. |
| R2 | Estourado qualquer um dos contadores, a rota responde `429 { error: "Muitas tentativas. Tente novamente em alguns minutos." }` com o cabeçalho `Retry-After` (segundos até o fim da janela) e **não** consulta o Google, não roda bcrypt, não envia e-mail nem altera senha. Só contam requisições que passaram da validação do corpo (`400` não consome tentativa). |
| R3 | O incremento é atômico no banco: N requisições simultâneas com a mesma chave produzem exatamente `N` no contador e só as que ficam dentro do limite passam. Janela vencida recomeça em 1. Login bem-sucedido zera o contador do e-mail (não o do IP). |
| R4 | Linhas de `auth_attempts` com janela iniciada há mais de 24 h são apagadas pela própria aplicação, sem cron (limpeza oportunista durante as requisições de autenticação). |
| R5 | A verificação do reCAPTCHA fica num só módulo (`src/lib/recaptcha.ts`) usado por login (`action` `login`), cadastro (`register`) e "esqueci a senha" (`forgot_password`). Exige `success`, `action` igual à esperada, `hostname` igual ao host da requisição quando presente e **score ≥ limiar**. Reprovação → `403 { error: "Acesso bloqueado. Atividade suspeita detectada." }`. |
| R6 | O limiar vem de `RECAPTCHA_MIN_SCORE` (número entre 0 e 1); ausente, vazio, não numérico ou fora do intervalo vale `0.5`. Resposta do Google sem `score` é reprovada. |
| R7 | Cadastro e "esqueci a senha" exigem `recaptchaToken` no corpo: ausente ou não texto → `400 { error: "Token do reCAPTCHA ausente" }` (mesma mensagem do login). |
| R8 | `RECAPTCHA_SECRET_KEY` ausente é erro de configuração: as três rotas respondem `500 { error: "Configuração do reCAPTCHA ausente." }` e registram no log (hoje o login responde `403`). Falha de rede ou resposta não JSON do Google continua `503`. |
| R9 | A tela de cadastro gera o token com `executeRecaptcha("register")` e a tela "esqueci a senha" (agora dentro de um `GoogleReCaptchaProvider`) com `executeRecaptcha("forgot_password")`; reCAPTCHA não carregado mostra "reCAPTCHA ainda não carregou. Tente novamente." sem chamar a API, como no login. O aviso "Protegido por reCAPTCHA." aparece em Entrar, Criar conta e Recuperar senha. |
| R10 | `users.sessionVersion Int @default(0)` (K7). O token de sessão ganha o campo `v` com a versão do usuário no login; token sem `v` vale como `v = 0`; `v` presente que não seja inteiro ≥ 0 invalida o token. |
| R11 | `getAuthenticatedUser` recusa (devolve `null`, e as APIs respondem `401`) token cujo `v` difere de `users.sessionVersion`. |
| R12 | Redefinir a senha incrementa `sessionVersion` na mesma transação que troca o hash e consome o token: toda sessão aberta antes deixa de valer. |
| R13 | `POST /api/auth/logout-all` (com sessão) incrementa `sessionVersion`, expira o cookie desta resposta e responde `200 { success: true }`; sem sessão válida, `401`. |
| R14 | Em Configurações, seção "Sessão", o botão "Sair de todos os aparelhos" abre a confirmação (`ConfirmDialog`, título "Sair de todos os aparelhos?", botão "Sair de todos"); confirmado e com sucesso, recarrega em `/login`; falha mostra a mensagem da API na confirmação, que continua aberta. "Sair da conta" continua como hoje. |
| R15 | Sessão revogada não prende o navegador em laço: em `/login`, o proxy só redireciona para `/` se a sessão também passar na conferência de versão; caso contrário deixa a tela de login abrir e expira o cookie. |
| R16 | `password_reset_tokens` guarda `tokenHash` (SHA-256 hex do token do link) e não o token (K7). O link do e-mail continua levando o token puro; a busca é sempre pelo hash. |
| R17 | O consumo do token é atômico: `updateMany` com `tokenHash`, `usedAt: null` e `expiresAt > agora`; só quem obtém `count === 1` troca a senha. Duas requisições simultâneas com o mesmo token: exatamente uma recebe `200`, a outra `400 { error: "Link inválido ou expirado." }`. |
| R18 | Uma migration cria `users.sessionVersion`, a tabela `auth_attempts` (`key` chave primária, `windowStart`, `count`) com `ENABLE ROW LEVEL SECURITY`, e converte `password_reset_tokens`: preenche `tokenHash` a partir dos tokens existentes (links ainda válidos continuam funcionando), cria índice único em `tokenHash` e remove a coluna `token`. |
| R19 | A migration só é aplicada na produção com aprovação explícita do usuário, seguida de verificação somente leitura. |
| R20 | Nenhum atalho para testes no código de produção (regra de `docs/TESTES.md`): a suíte E2E e o script de capturas do guia deixam de depender de `POST /api/register` sem reCAPTCHA, criando contas por SQL no Postgres local e interceptando no navegador as chamadas que exigiriam o Google. |

## Fora de escopo

- Paginação e qualquer mudança em rotas de dados (P13): fora do ciclo.
- Tratamento do `401` no cliente (levar para `/login` quando uma API responde `401`) e estados de carga: spec [001](../001-carga-erros-sessao/spec.md) (K8). Esta spec só garante que a API responde `401` e que `/login` abre.
- Conferir a versão da sessão no proxy para **todas** as páginas protegidas: as páginas continuam conferindo só a assinatura; a versão é conferida nas APIs e em `/login` (ver incógnita (a) em `tasks.md`).
- Proxy casar rotas por prefixo (P14), confirmação de senha no cadastro, link de volta no "redefinir", temporizador de redirecionamento, senhas acima de 72 bytes, troca de `bcryptjs` (fora do ciclo pela regra de dependências): itens de MELHORIAS que não estão nesta spec.
- Lista de sessões por aparelho, "sair só deste outro aparelho", 2FA, confirmação de e-mail no cadastro, bloqueio permanente de conta.
- reCAPTCHA na tela de redefinir senha (o token de 1 h já é o fator; ela só ganha limite de tentativas).
- Limite de lotes de importação por hora (MELHORIAS I5), embora reaproveitasse `auth_attempts`.
- Troca de senha estando logado (não existe tela para isso).

## Critérios de aceite

| ID | Critério | Requisitos cobertos | Verificado por |
|---|---|---|---|
| CA1 | Dado o módulo de limite com o banco simulado, quando a mesma chave recebe a 6ª tentativa de login em 15 min, então é bloqueada com `retryAfter` > 0; janela vencida recomeça em 1; e-mails diferentes têm contadores separados; o contador de IP bloqueia mesmo trocando o e-mail; e-mail com maiúsculas/espaços cai na mesma chave. | R1, R3 | T2 (`tests/unit/lib/rateLimit.test.ts`) |
| CA2 | Dado o módulo de limite, quando roda uma consulta de contagem, então dispara a limpeza das linhas com janela de mais de 24 h; falha da limpeza não derruba a requisição. | R4 | T2 (`tests/unit/lib/rateLimit.test.ts`) |
| CA3 | Dado o Google simulado, quando o score é 0,49 com limiar padrão, então `403`; 0,5 passa; com `RECAPTCHA_MIN_SCORE=0.7`, 0,6 é recusado; com `"abc"`, `"-1"` ou `"2"` vale 0,5; resposta sem `score` é recusada; `action` diferente da esperada é recusada. | R5, R6 | T2 (`tests/unit/lib/recaptcha.test.ts`) |
| CA4 | Dado `RECAPTCHA_SECRET_KEY` vazia, quando login, cadastro ou "esqueci a senha" recebem um pedido válido, então respondem `500 { error: "Configuração do reCAPTCHA ausente." }` e registram no log; erro de rede do Google responde `503`. | R8 | T2 (`tests/unit/lib/recaptcha.test.ts`), T3 (`tests/api/login.test.ts`, `register.test.ts`, `forgot-password.test.ts`) |
| CA5 | Dado o login, quando o limite estoura, então `429` com a mensagem e `Retry-After`, sem chamar o Google nem `comparePassword`; login certo zera só o contador do e-mail; pedido sem token (`400`) não consome tentativa. | R1, R2, R3 | T3 (`tests/api/login.test.ts`) |
| CA6 | Dado o cadastro, quando falta `recaptchaToken`, então `400`; com score baixo ou `action` errada, `403` e nenhum usuário criado; na 4ª tentativa do mesmo e-mail em 1 h, `429` sem criar usuário; caminho feliz continua `201` com 18 categorias. | R1, R2, R5, R7 | T3 (`tests/api/register.test.ts`) |
| CA7 | Dado o "esqueci a senha", quando falta o token, então `400`; com score baixo, `403` e nenhum e-mail enviado; na 4ª tentativa do mesmo e-mail, `429` sem gerar token nem enviar e-mail; e-mail cadastrado e não cadastrado continuam com respostas idênticas. | R1, R2, R5, R7 | T3 (`tests/api/forgot-password.test.ts`) |
| CA8 | Dado um token de redefinição, quando ele é criado, então o banco recebe só `tokenHash` (64 caracteres hex, igual ao SHA-256 do token devolvido) e a validação busca pelo hash; o consumo usa `updateMany` com `usedAt: null` e `expiresAt` futuro; `count` 0 responde `400 "Link inválido ou expirado."` sem trocar a senha. | R16, R17 | T4 (`tests/unit/lib/tokens.test.ts`, `tests/api/reset-password.test.ts`) |
| CA9 | Dada a redefinição bem-sucedida, então a troca do hash, o consumo do token e o incremento de `sessionVersion` acontecem na mesma transação; falha em qualquer um responde `500` sem trocar a senha; o 6º pedido do mesmo e-mail em 15 min responde `429`. | R1, R12 | T4 (`tests/api/reset-password.test.ts`) |
| CA10 | Dado o módulo de sessão, então o token emitido no login carrega `v` igual a `sessionVersion`; token antigo sem `v` é aceito como 0; `v` igual a `"1"`, `-1` ou `1.5` invalida o token. | R10 | T5 (`tests/unit/lib/session.test.ts`, `tests/api/login.test.ts`) |
| CA11 | Dado `getAuthenticatedUser`, quando o `v` do token difere de `users.sessionVersion`, então devolve `null`; igual, devolve o usuário; token sem `v` com versão 1 no banco, `null`. | R11 | T5 (`tests/unit/lib/auth.test.ts`) |
| CA12 | Dado `POST /api/auth/logout-all`, sem sessão responde `401` sem tocar no banco; com sessão incrementa `sessionVersion` do usuário da sessão (nunca de outro), expira o cookie e responde `200`; falha do banco responde `500`. | R13 | T5 (`tests/api/logout-all.test.ts`) |
| CA13 | Dado o proxy, quando `/login` recebe cookie com assinatura válida e versão revogada, então não redireciona e expira o cookie; com versão em dia, redireciona para `/`; as rotas protegidas continuam redirecionando visitante sem cookie. | R15 | T5 (`tests/unit/proxy.test.ts`) |
| CA14 | Dada a tela de login no modo "Criar conta", quando envia, então chama `executeRecaptcha("register")` e manda `recaptchaToken`; reCAPTCHA não carregado mostra o aviso e não chama a API; `429` mostra "Muitas tentativas…". Dada "Recuperar senha", envia o token de `forgot_password`, com os mesmos casos de erro. "Protegido por reCAPTCHA." aparece nas três telas. | R2, R9 | T6 (`tests/ui/pages/auth.test.tsx`) |
| CA15 | Dada Configurações, quando a pessoa toca "Sair de todos os aparelhos" e confirma, então chama `POST /api/auth/logout-all` e navega para `/login`; quando a API falha, a mensagem aparece em `role="alert"` dentro da confirmação, que continua aberta, e não navega; "Cancelar" não chama a API. | R14 | T6 (`tests/ui/pages/settings.test.tsx`) |
| CA16 | Dado um usuário logado em dois navegadores (contextos A e B), quando A usa "Sair de todos os aparelhos", então A termina em `/login`, `GET /api/me` em B responde `401` e B abrindo `/login` vê a tela de login (sem laço) com o cookie removido. | R11, R13, R14, R15 | T7 (`tests/e2e/01-auth.spec.ts`) |
| CA17 | Dado um usuário logado no contexto A, quando a senha é redefinida pela tela `/reset-password` com um link válido, então `GET /api/me` em A responde `401`; reutilizar o link responde "Link inválido ou expirado."; duas chamadas simultâneas à API com o mesmo token dão exatamente um `200`. | R12, R17 | T7 (`tests/e2e/01-auth.spec.ts`) |
| CA18 | Dado o Postgres local do E2E, quando 8 pedidos de login simultâneos com o mesmo e-mail e token falso chegam ao servidor real, então exatamente 3 recebem `429` e `auth_attempts` tem `count = 8` para `login:<e-mail>`; uma linha com janela de 2 dias atrás some depois de um pedido de autenticação. | R1, R2, R3, R4 | T7 (`tests/e2e/01-auth.spec.ts`) |
| CA19 | Dado o banco criado do zero pelas migrations no E2E, então `auth_attempts` e `password_reset_tokens` têm `relrowsecurity = true`, `password_reset_tokens` não tem a coluna `token`, `users.sessionVersion` existe com padrão 0, e um "esqueci a senha" pela API grava `tokenHash` com 64 caracteres hex. | R16, R18 | T1 (`npx prisma migrate deploy` em banco vazio), T7 (`tests/e2e/01-auth.spec.ts`) |
| CA20 | A suíte E2E inteira e o script de capturas rodam sem `POST /api/register` sem token e sem nenhum desvio do reCAPTCHA no código de `src/` (`grep` por variáveis de desvio em `src/` vazio). | R20 | T7 (`npm run test:e2e`), T9 |
| CA21 | `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e` passam com a spec inteira aplicada. | todos | T9 |

## Validação manual

| ID | O que conferir | Quem | Requisitos |
|---|---|---|---|
| VM1 | Na produção, depois de aplicada a migration (T8, com aprovação): `prisma migrate status` em dia; consulta somente leitura confirma `auth_attempts` com RLS, `password_reset_tokens.tokenHash` preenchido e sem `token`, `users."sessionVersion"` = 0 em todas as linhas. | Usuário aprova; agente roda as consultas de leitura | R18, R19 |
| VM2 | No app publicado, com a chave real do reCAPTCHA: criar conta, entrar, pedir redefinição e receber o e-mail; o link funciona e derruba a sessão aberta no celular. | Usuário | R9, R12, R16 |
| VM3 | Logar no celular e no computador; "Sair de todos os aparelhos" no computador; no celular, a próxima ação leva ao login (depende da 001 para o redirecionamento automático). | Usuário | R13, R14 |
