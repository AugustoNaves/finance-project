# Melhorias — aplicadas e pendentes

Resultado do mapeamento de 12/10/2026 (leitura do código, exploração do app publicado e escrita dos testes). O detalhamento de cada achado de frontend, com arquivo e linha, está na seção 5 de [FUNCIONALIDADES.md](FUNCIONALIDADES.md); aqui fica a visão priorizada.

Tudo abaixo está na branch `docs-testes-melhorias`, **sem commit e sem deploy**. O app publicado (`finance-project-henna.vercel.app`) continua com o comportamento antigo até a branch ser publicada.

## 1. Aplicadas nesta branch

### 1.1 Erros que afetavam os números ou os dados

| # | Problema | Como aparecia | Correção |
|---|---|---|---|
| A1 | **Datas deslocadas pelo fuso** | Ao vivo: transação lançada com data 13/10 apareceu como 12/10; prazo de meta 31/12 apareceu como 30/12; filtro "De/Até" 13/10 não encontrava a transação. | Datas tratadas como data sem horário (meia-noite UTC) em um único lugar: `src/utils/dates.ts`. `formatDate` formata em UTC; filtros comparam `AAAA-MM-DD`. |
| A2 | **"Mês" calculado de duas formas** | Transação do dia 1º contava no mês anterior no Dashboard e em Categorias, e no mês certo em Relatórios e Orçamentos. | `isSameMonth` e todas as telas usam os mesmos helpers de mês. |
| A3 | **"Hoje" em UTC** | Após as 21h (horário de Brasília) o formulário sugeria a data de amanhã; no último dia do mês, Planejamento e Relatórios abriam no mês seguinte. | `getLocalDateKey` / `getLocalMonthKey`. |
| A4 | **Editar transação trocava a data para hoje** | Corrigir a descrição de um lançamento de agosto o movia para o dia atual, sem aviso. | O formulário de edição recebe a data original (`TransactionList`). |
| A5 | **Falhas silenciosas** | Ao vivo: orçamento duplicado devolvia erro 500, o modal continuava aberto, os campos eram limpos e nenhuma mensagem aparecia. Em transações, o modal fechava como se tivesse salvo. | Serviços lançam `ApiError` com a mensagem da API; os quatro formulários e o diálogo de exclusão exibem o erro (`FormError`), mantêm os valores e só fecham no sucesso. |
| A6 | **API respondia 500 para entrada inválida** | Transação sem valor, meta com valor negativo, JSON malformado, orçamento ou categoria duplicados: tudo virava "erro interno". | Validação central (`src/lib/validators.ts`): `400` com mensagem específica; duplicidade -> `409`. |
| A7 | **Métricas de categoria ignoravam o tipo** | As três categorias "Outros" (receita, despesa, investimento) mostravam os mesmos números. | Comparação por nome **e** tipo. |
| A8 | **"+ Novo Aporte" abria como Saída** | Um aporte salvo sem trocar o tipo virava despesa e sumia da tela de Investimentos. | Modal "Novo Aporte" já abre com tipo Investimento. |
| A9 | **Campo Valor aceitava zero e negativo** | Valor negativo invertia o sinal (uma "Saída" positiva). | `min="0.01"` e `step="0.01"`; a API também rejeita zero. |
| A10 | **Média diária do mês em curso** | Dividia pelo total de dias do mês, subestimando o gasto diário. | No mês atual divide pelos dias decorridos. |
| A11 | **Orçamento único entre TODOS os usuários** | Achado pelo E2E: em um banco criado pelas migrations, se o usuário A tinha orçamento de "Alimentação" em 10/2026, o usuário B recebia erro ao criar o dele. A migration de multiusuário tentou remover o índice antigo com `DROP CONSTRAINT`, que não remove índices. | Nova migration `20261012000000_drop_legacy_budget_index` (`DROP INDEX IF EXISTS`). **Precisa ser aplicada em produção** com `npx prisma migrate deploy`. |

### 1.2 Segurança e robustez do backend

| # | Antes | Agora |
|---|---|---|
| B1 | Assinatura da sessão comparada com `!==` (tempo variável). | `crypto.subtle.verify`; rejeita token sem `exp` numérico (antes, um token assinado sem `exp` nunca expirava). |
| B2 | "Esqueci a senha" respondia `500` só para e-mails cadastrados quando o envio falhava (permitia descobrir contas). O SDK do Resend devolve `{ error }` sem lançar, então falhas de envio passavam despercebidas. | Resposta genérica `200` sempre; falha vai para o log; `sendPasswordResetEmail` lança em caso de erro. |
| B3 | Um novo pedido de redefinição não invalidava os links anteriores. | Tokens antigos não usados são marcados como usados. |
| B4 | Cadastro criava usuário e categorias em duas operações; redefinição trocava a senha e marcava o token em duas operações. | Cada fluxo em uma transação de banco. |
| B5 | Login com e-mail inexistente respondia mais rápido (não rodava o bcrypt). | Compara contra um hash fictício; e-mail normalizado antes do limite de tentativas. |
| B6 | Falha de rede ao consultar o Google derrubava o login com `500`. | `503` com mensagem própria. |
| B7 | Prisma registrava todas as queries em produção. | Só erros em produção. |

### 1.3 Usabilidade e acessibilidade

- Modais fecham com `Esc` (só o do topo, quando há um sobre o outro), têm `role="dialog"`, `aria-modal` e rótulo; botão de fechar com nome acessível.
- Mensagens de erro e sucesso de login, cadastro, "esqueci a senha" e redefinição são anunciadas por leitores de tela (`role="alert"` para erro, `role="status"` para sucesso).
- Link ativo da navegação com `aria-current="page"`; tipo selecionado no formulário de transação com `aria-pressed`; barra de progresso com `role="progressbar"`.
- Botões de envio ficam desabilitados durante a requisição (evita duplicar lançamentos com duplo clique).
- Confirmação de exclusão de transação cita a descrição do item.
- "+ Novo orçamento" abre no mês que está sendo visualizado.
- Ícone de categoria pode ser removido na edição.
- "Meta mais próxima" ignora metas já concluídas.
- Títulos deixaram de sair como "Outubro De 2026".
- Ids duplicados entre filtros e formulário de transação removidos.
- Redefinir senha sem token na URL explica o problema e oferece link para pedir um novo (antes só desabilitava o botão).

### 1.4 Projeto

- **Testes automatizados** (não existiam): ver [TESTES.md](TESTES.md).
- Dependências sem uso removidas: `google`, `recaptcha`, `v3`, `@types/styled-components`.
- `.env.example` criado. Sem `DIRECT_URL` o `npm install` falha, e isso não estava documentado.
- `README.md` e `AGENTS.md` reescritos: descreviam login por variável de ambiente, um único model, Server Actions e "sem framework de testes".
- Fuso fixado nos testes (`America/Sao_Paulo`) para que os erros de data sejam reproduzíveis em qualquer máquina e no CI.

## 2. Pendentes, por prioridade

### Alta

| # | Item | Por quê | Sugestão |
|---|---|---|---|
| P1 | **Categoria referenciada por nome** em transações e orçamentos. | Renomear zera as métricas da categoria e o gasto do orçamento; excluir deixa lançamentos órfãos. A API não verifica se a categoria existe. | Migrar para `categoryId` (FK). Paliativo: ao renomear, atualizar transações e orçamentos na mesma transação de banco, e bloquear exclusão de categoria em uso. |
| P2 | **Limite de tentativas de login em memória.** | Na Vercel cada instância tem seu próprio contador, que some a cada cold start; a chave usa `x-forwarded-for`, controlável pelo cliente. Na prática não protege. | Contador em armazenamento compartilhado (Upstash/Redis ou tabela no Postgres). |
| P3 | **Corte por `score` do reCAPTCHA desativado.** | Qualquer score passa; o reCAPTCHA v3 só bloqueia se houver limiar. | Definir limiar (0,5 é o ponto de partida usual) e monitorar. |
| P4 | **Cadastro e "esqueci a senha" sem proteção.** | Sem reCAPTCHA nem limite: permite criação em massa de contas e disparo repetido de e-mails para terceiros. | Mesma proteção do login. |
| P5 | **Sessão sem revogação.** | Token de 30 dias sem estado: logout só apaga o cookie local e trocar a senha não derruba sessões abertas em outros aparelhos. | Campo `sessionVersion` em `User` incluído no token e conferido em `getAuthenticatedUser`. |

### Média

| # | Item | Sugestão |
|---|---|---|
| P6 | Valores monetários em `Float`. Somas acumulam erro de ponto flutuante. | `Decimal(12,2)` no Prisma ou inteiros em centavos. |
| P7 | Regra do saldo: investimento é subtraído do saldo e da taxa de economia, mas os textos dizem "receitas e despesas". | Decidir a regra e alinhar cálculo e textos. |
| P8 | Receita/despesa separadas pelo sinal em `calculateSummary` e pelo tipo no resto do app; a API não confere sinal x tipo. | Classificar sempre pelo tipo; validar o sinal na API. |
| P9 | Cards do topo do Dashboard são de todo o histórico, ao lado de um "Resumo do mês", sem rótulo de período. | Rotular como "acumulado" ou trocar para o mês. |
| P10 | Sessão expirada mostra telas vazias em vez de levar ao login (um `401` vira lista vazia). | Tratar `401` nos serviços e redirecionar. |
| P11 | Sem estado de carregamento: as telas mostram zeros e "nenhum registro" enquanto os dados chegam. | Flag `loading` no contexto e nas páginas. |
| P12 | Tokens de redefinição gravados em texto puro; duas requisições simultâneas com o mesmo token podem passar. | Gravar hash do token; `updateMany` condicional em `usedAt: null`. |
| P13 | `GET /api/transactions` devolve tudo, sem paginação nem filtro de período. | Paginação ou filtro por intervalo. |
| P14 | Proxy protege só caminhos exatos; uma futura `/transactions/123` ficaria aberta. | Casar por prefixo. |
| P15 | "Evolução do saldo" e "Linha do saldo" mostram o resultado de cada mês, não o saldo acumulado. | Renomear para "Resultado mensal" ou acumular. |
| P16 | Foco não fica preso no modal nem volta ao botão de origem ao fechar; o drawer mobile continua alcançável por teclado quando fechado e não fecha com `Esc`. | Focus trap e `inert`. |
| P17 | Falha ao **carregar** dados é indistinguível de "sem dados": transações, categorias, orçamentos e metas só registram o erro no console. As funções `fetch*` chamam `response.json()` antes de checar o status. | Estado de erro nas páginas e checagem de `response.ok` antes do `json()`. |
| P18 | Metas: percentual passa de 100% no card ("125%") enquanto a barra para em 100%; não existe estado "concluída"; o contador "meta(s) em andamento" inclui as concluídas. | Estado de meta concluída e contador separado. |
| P19 | Busca de transações só considera a descrição e diferencia acentos ("salario" não encontra "Salário"). | Normalizar acentos; buscar também em categoria e observação. |

### Baixa

- Dados continuam em memória após o logout e o provider busca transações também nas telas públicas (gera `401` no console do login).
- Configurações: `/api/me` e logout sem tratamento de erro (e-mail fica em "Carregando..."; logout redireciona mesmo se a API falhar); itens estáticos apresentados como preferências. Não há "Sair" na navegação, só em Configurações.
- Nome de categoria ou de meta só com espaços passa pelo `required` do navegador (a API rejeita e a mensagem aparece).
- Formulário de orçamento sem categorias de despesa fica com o select vazio, sem orientar a criar uma categoria.
- "Despesas" e "Maior despesa" aparecem com sinal negativo, enquanto investimentos aparecem em valor absoluto.
- Lista de Investimentos usa o título fixo "Transações" e a mensagem de vazio cita filtros que a tela não tem.
- Cadastro sem confirmação de senha.
- Exportação: JSON inclui campos internos (`userId`); CSV sem BOM e sem neutralizar células iniciadas por `=`, `+`, `-`, `@`.
- Redefinir senha: falta link de volta para o login; o temporizador de redirecionamento não é cancelado ao sair da tela.
- "Protegido por reCAPTCHA" aparece no cadastro, que não usa reCAPTCHA.
- Textos: Relatórios diz "sem gráficos externos" e usa recharts; Investimentos promete "patrimônio" e só soma aportes; eixos no formato `R$ 0.5k`.
- Limiares do orçamento: exatamente 100% já aparece como "Limite ultrapassado".
- Categoria: o tipo aparece duas vezes no card; "ícone simples" só exibe as duas primeiras letras, embora o placeholder sugira nomes de ícone.
- Transações com a mesma data não têm critério de desempate e mudam de ordem entre carregamentos.
- Forma de pagamento e observação não aparecem em nenhuma listagem.
- Código sem uso: componentes `Dashboard`, `Header`, `TransactionTable`, `src/app/budgets/styles.ts`.
- `package-lock.json` e `yarn.lock` coexistem; manter só um.
- Sem pipeline de CI: o workflow sugerido está em [TESTES.md](TESTES.md#ci).
- Senhas acima de 72 bytes são truncadas pelo bcrypt sem aviso.
- `bcryptjs` (JavaScript puro, custo 12) ocupa a thread por 0,7–0,9 s a cada cadastro, login ou redefinição; sob carga concorrente o E2E mediu respostas de 5–15 s. Avaliar `bcrypt` nativo ou `argon2`.
- O proxy valida só a assinatura do cookie: uma sessão de usuário excluído ainda renderiza a casca do app (as APIs respondem `401`).
- "Esqueci a senha" informa que o link será enviado mesmo quando o envio falha (necessário para não revelar contas); monitorar os erros de envio no log.
- `RECAPTCHA_SECRET_KEY` ausente responde `403`; é erro de configuração (`500`).

## 3. Importação de fatura por PDF

Implementada na branch `feat/importacao-fatura-pdf` conforme a [spec](specs/SPEC-importacao-fatura-pdf.md), que lista o que foi feito e o que ficou de fora (seção 0).

**Antes de publicar:** aplicar a migration `20261013000000_add_invoice_import` em produção (`npx prisma migrate deploy`). O deploy da Vercel não roda migrations. A migration não altera `transactions`; sem ela, o resto do app continua funcionando e só a tela de importação responde erro.

Pendências da funcionalidade:

| # | Item | Sugestão |
|---|---|---|
| I1 | **Nenhuma fatura real foi testada** — só PDFs sintéticos. | Testar com a fatura de cada banco usado e criar adaptadores específicos onde o genérico errar. |
| I2 | Faturas com duas colunas de data e seções de parcelas futuras confundem o parser genérico. | Adaptador por emissor; a conferência de total já acusa o problema. |
| I3 | Não dá para criar categoria dentro do preview. | Reaproveitar o `CategoryForm` em modal. |
| I4 | Regras de categorização não têm tela (só API). | Lista com exclusão em Configurações. |
| I5 | Sem limite de lotes por hora. | Depende do item P2 (armazenamento compartilhado). |
| I6 | Tabela do preview rola na horizontal no celular. | Layout em cartões, como em `TransactionList`. |
| I7 | Automatizar `prisma migrate deploy` no build. | `"build": "prisma migrate deploy && next build"`, depois de confirmar que `DIRECT_URL` existe na Vercel. |

## 4. Redesign "Caderneta" e PWA (17/10/2026)

Aplicado: nova interface (ver `docs/design/` e a seção 0 de `docs/FUNCIONALIDADES.md`), logout na navegação com recarga para `/login` (resolve o item 24 de FUNCIONALIDADES §5), perfil mostra "Indisponível" quando `/api/me` falha, erro visível quando categorias/orçamentos/metas não carregam, e PWA instalável (`docs/PWA.md`).

Pendentes:

- **Média:** `fetchImportBatches` (`src/services/imports.ts`) devolve `[]` quando a API responde com erro; o estado de erro do histórico em Importar só aparece em falha de rede, e o lembrete de fatura do Mês pode aparecer indevidamente. Fazer o serviço lançar `ApiError`.
- **Baixa:** Relatórios e Planejar usam `<input type="month">` invisível sob o rótulo do mês; no Safari de desktop e Firefox antigo ele vira texto. As setas funcionam; um seletor próprio resolveria.
- **Baixa:** ícones próprios por categoria (hoje só o ponto de cor).

## 5. Banco de produção sincronizado (17/10/2026)

- A migration `20260812192858_add_credit_cards`, que existia só na produção, foi versionada (arquivo SQL equivalente + model `CreditCard` em `schema.prisma`). O checksum no histórico da produção foi atualizado para o do arquivo versionado; `prisma migrate status` está em dia. Pendente: a funcionalidade de cartões (API e telas) ainda não existe no código.
- RLS ligado em todas as tabelas e permissões de `anon`/`authenticated` removidas (migration `20261017000000_enable_rls`), aplicado na produção.

