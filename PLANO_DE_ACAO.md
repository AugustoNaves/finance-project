# Plano de Ação - Próximas Etapas

Este plano mantém apenas o que ainda não foi implementado. As etapas antigas de layout, dashboard, transações, categorias, orçamentos, relatórios, configurações, gráficos e ajustes visuais já foram concluídas e removidas deste documento para reduzir ruído.

## 1. Autenticação Real Com Usuários

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

## 2. Itens Futuros Após Autenticação

- Recuperação de senha por email.
- Verificação de email.
- Troca de senha em configurações.
- Login social.
- Sessões persistidas em banco para revogação por dispositivo.
