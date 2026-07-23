# Plano de Ação - Próximas Etapas

Este plano mantém o histórico resumido do que foi concluído e os próximos ajustes priorizados. As etapas antigas de layout, dashboard, transações, categorias, orçamentos, relatórios, configurações e gráficos já foram concluídas.

## 1. Autenticação Real Com Usuários - Concluída

Objetivo: substituir o login atual baseado em `EMAIL_ACESSO` e `SENHA_ACESSO` do `.env` por autenticação real com usuários no banco, dados isolados por usuário e reCAPTCHA v3 ativo em produção.

### 1.1. Modelagem De Usuário E Dados Existentes

- Criar model `User` no Prisma com `id`, `name`, `email`, `passwordHash`, `createdAt` e `updatedAt`.
- Definir `email` como único.
- Adicionar `userId` em `Transaction`, `Category` e `Budget`.
- Criar relações Prisma entre `User` e `Transaction`, `Category`, `Budget`.
- Criar migration controlada.
- Criar um usuário inicial e vincular todos os dados existentes a ele para não perder informações.
- Não apagar dados antigos sem aprovação explícita.

Critério de conclusão:

- Prisma Client gera sem erro.
- Migration representa corretamente `User` e `userId`.
- Dados existentes têm plano seguro de vínculo com usuário inicial.

### 1.2. Hash De Senha

- Adicionar biblioteca de hash de senha com aprovação. Recomendação inicial: `bcryptjs`.
- Criar helper em `src/lib/auth.ts` ou `src/lib/password.ts` para gerar hash e comparar senha.
- Salvar apenas `passwordHash` no banco.
- Nunca retornar `passwordHash` em APIs.

Critério de conclusão:

- Senha nunca é persistida em texto puro.
- Login consegue comparar senha digitada com hash salvo.

### 1.3. Cadastro De Usuário

- Criar modo cadastro na tela de login ou rota dedicada futura.
- Campos mínimos: nome, email e senha.
- Validar nome obrigatório, email válido e senha mínima.
- Impedir email duplicado.
- Criar `POST /api/register`.
- Criar usuário no banco com `passwordHash`.
- Decidir comportamento após cadastro: redirecionar para login com sucesso ou logar automaticamente.

Critério de conclusão:

- Usuário novo consegue se cadastrar.
- Email duplicado retorna erro claro.
- UI mostra mensagens no formulário, sem `alert`.

### 1.4. Login Real Com Email E Senha

- Alterar `POST /api/login` para buscar usuário pelo email no banco.
- Comparar senha digitada com `passwordHash`.
- Remover validação por `EMAIL_ACESSO` e `SENHA_ACESSO`.
- Retornar erro genérico para credenciais inválidas.
- Criar cookie de sessão com vínculo ao usuário autenticado.

Critério de conclusão:

- Login funciona com usuário real do banco.
- Credenciais inválidas não autenticam.
- Warning antigo de `googleData` deve desaparecer após ativação real do reCAPTCHA.

### 1.5. Sessão, Cookie E Proxy

- Trocar cookie atual `auth_token=autorizado` por sessão real.
- Assinar token de sessão com segredo do servidor, preferencialmente usando APIs nativas de crypto para evitar dependência extra.
- Cookie deve ser `httpOnly`, `secure` em produção, `sameSite`, `path: "/"` e expiração definida.
- Atualizar `src/proxy.ts` para validar sessão real, não apenas existência do cookie.
- Atualizar logout para limpar o cookie da sessão real.
- Criar `GET /api/me` para retornar dados seguros do usuário logado.
- Mostrar nome/email real em `/settings`.

Critério de conclusão:

- Usuário sem sessão é redirecionado para `/login`.
- Usuário com sessão válida acessa o app.
- Cookie inválido ou expirado não autentica.
- Logout remove sessão corretamente.

### 1.6. Isolamento De Dados Por Usuário

- Atualizar APIs de transações, categorias e orçamentos para sempre usar o `userId` do usuário logado.
- Toda leitura deve filtrar por `userId`.
- Toda criação deve salvar `userId` automaticamente no servidor.
- Todo update/delete deve garantir propriedade do registro.
- Não confiar em `userId` vindo do client.
- Relatórios e exportações devem usar apenas dados já filtrados do usuário logado.

Critério de conclusão:

- Usuário A não vê, edita ou apaga dados do usuário B.
- APIs não aceitam manipulação de `userId` pelo client.

### 1.7. reCAPTCHA v3 Ativo No Login

- Manter `react-google-recaptcha-v3` apenas no login.
- Exigir `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` no client.
- Exigir `RECAPTCHA_SECRET_KEY` no servidor.
- Executar reCAPTCHA com action `login`.
- Validar no servidor: `success`, `score`, `action` e `hostname`.
- Usar threshold inicial `0.5`.
- Ajustar para `0.7` apenas se houver necessidade real.
- Mostrar erro amigável quando o reCAPTCHA bloquear.

Critério de conclusão:

- Login em produção usa score real do Google.
- Token inválido ou score baixo bloqueia login.
- Erro aparece no formulário, sem `alert`.

### 1.8. Proteção Contra Abuso

- Adicionar limite básico de tentativas por email/IP no login.
- Começar simples, com armazenamento em memória se for suficiente para o deploy inicial.
- Documentar limitação: memória reseta em restart e pode não funcionar perfeitamente em múltiplas instâncias.
- Evolução futura: persistir tentativas em banco ou serviço externo.

Critério de conclusão:

- Muitas tentativas seguidas retornam erro temporário.
- Mensagem não revela detalhes sensíveis.

### 1.9. Ajustes De UI E UX Do Login

- Remover `alert` e mostrar mensagens no formulário.
- Adicionar estado de carregamento no botão.
- Desabilitar envio enquanto login/cadastro estiver em andamento.
- Diferenciar mensagens de erro: credenciais inválidas, reCAPTCHA, erro interno.
- Adicionar alternância entre login e cadastro.
- Manter visual dark/glass atual.
- Manter responsividade mobile.

Critério de conclusão:

- Login e cadastro têm feedback visual claro.
- Não há alertas nativos para erros comuns.

### 1.10. Validação Final

- Criar usuário novo.
- Fazer login com usuário real.
- Fazer logout.
- Tentar acessar rota protegida sem sessão.
- Criar transação, categoria e orçamento com usuário A.
- Criar usuário B e confirmar que ele não vê dados do usuário A.
- Testar reCAPTCHA em produção ou ambiente com domínio autorizado.
- Rodar `npm run lint`.
- Rodar `npm run build`.

Status:

- Implementado model `User` no Prisma.
- Implementado vínculo `userId` em `Transaction`, `Category` e `Budget`.
- Migration aplicada com preservação dos dados existentes.
- Dados antigos vinculados ao usuário inicial.
- Login passou a validar email e senha no banco.
- Senha passou a ser salva apenas como hash com `bcryptjs`.
- Criado cadastro em `/api/register`.
- Criado `/api/me` para retornar dados seguros da sessão.
- Cookie antigo `auth_token=autorizado` foi substituído por `session_token` assinado.
- `src/proxy.ts` valida sessão real, assinatura e expiração.
- Logout limpa o cookie de sessão real.
- APIs financeiras filtram dados pelo usuário autenticado.
- reCAPTCHA v3 foi ativado no login com validação de `success`, `score`, `action` e `hostname`.
- Login e cadastro mostram mensagens no formulário, sem `alert`.
- `/settings` mostra nome e email da conta logada.
- `npm run lint` e `npm run build` passaram.

Pendências operacionais antes de produção:

- Garantir `SESSION_SECRET` forte no ambiente da Vercel.
- Garantir `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` e `RECAPTCHA_SECRET_KEY` atualizadas na Vercel.
- Garantir domínio da Vercel/domínio final autorizado no Google reCAPTCHA.
- Fazer validação manual final com usuário A e usuário B para confirmar isolamento completo.

## 2. Ajustes Visuais E Tema

Objetivo: refinar a identidade visual removendo elementos que não combinaram com o produto e adicionar alternância entre tema escuro e claro.

### 2.1. Fonte Dos Títulos - Concluída

- Remover a fonte `Syne` dos títulos e elementos de destaque.
- Usar `DM Sans` também para títulos, mantendo consistência com o restante da interface.
- Ajustar pesos, espaçamentos e `letter-spacing` dos títulos para evitar aparência exagerada.
- Remover o import e a variável `--font-syne` se não houver mais uso.

Critério de conclusão:

- Títulos ficam visualmente mais limpos e alinhados ao estilo do app.
- Não há referências desnecessárias a `--font-syne`.
- Layout continua responsivo em desktop e mobile.

Status:

- Fonte `Syne` removida do layout.
- Projeto passou a usar apenas `DM Sans`.
- Referências a `--font-syne` substituídas por `--font-dm-sans`.
- Títulos principais ficaram com peso e espaçamento menos agressivos.
- `npm run lint` e `npm run build` passaram.

### 2.2. Remover Background Quadriculado - Concluída

- Remover o grid/quadriculado do `AppShell`.
- Remover o grid/quadriculado da tela de login.
- Manter fundos com gradientes/radiais suaves, sem textura quadriculada.
- Verificar contraste e legibilidade após a remoção.

Critério de conclusão:

- Nenhuma tela principal exibe background quadriculado.
- Visual permanece consistente no tema escuro.
- Login e app interno mantêm profundidade visual sem ruído.

Status:

- Grid visual removido do `AppShell`.
- Grid visual removido da tela de login.
- Gradientes/radiais suaves foram preservados.
- `npm run lint` e `npm run build` passaram.

### 2.3. Alternância Entre Tema Claro E Escuro - Pendente

- Criar controle global de tema.
- Manter tema escuro como padrão inicial.
- Adicionar botão na navegação para alternar entre claro e escuro.
- Persistir preferência em `localStorage`.
- Aplicar o tema via atributo global, por exemplo `data-theme`.
- Migrar cores principais para CSS variables: fundo, superfícies, texto, texto secundário, bordas e elementos de destaque.
- Adaptar navegação, cards, tabelas/listas, formulários, modais e login para respeitarem o tema.
- Evitar mudanças grandes de estrutura; priorizar substituição de cores fixas por variáveis.

Critério de conclusão:

- Botão alterna corretamente entre tema claro e escuro.
- Preferência persiste ao recarregar a página.
- App mantém contraste adequado nos dois temas.
- Login, dashboard, transações, categorias, orçamentos, relatórios e configurações continuam usáveis nos dois temas.

### 2.4. Validação Final Dos Ajustes Visuais

- Testar desktop e mobile.
- Testar reload com tema claro e escuro.
- Testar navegação entre páginas mantendo o tema escolhido.
- Rodar `npm run lint`.
- Rodar `npm run build`.

## 3. Itens Futuros Após Autenticação

- Recuperação de senha por email.
- Verificação de email.
- Troca de senha em configurações.
- Login social.
- Sessões persistidas em banco para revogação por dispositivo.
