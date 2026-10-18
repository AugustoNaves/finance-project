# Specs — método de trabalho e quadro de status

Antes de qualquer spec, leia nesta ordem:

1. [`../../AGENTS.md`](../../AGENTS.md): regras do projeto.
2. [`visao-geral.md`](visao-geral.md): objetivo do ciclo, as 10 melhorias e o que fica **fora de escopo**.
3. [`contratos.md`](contratos.md): interfaces entre as specs e o dono de cada recurso compartilhado.
4. [`fatos-verificados.md`](fatos-verificados.md): o que foi conferido no código e no ambiente, e como.
5. A pasta da spec: `spec.md`, depois `tasks.md`.

> A spec anterior, [`SPEC-importacao-fatura-pdf.md`](SPEC-importacao-fatura-pdf.md), segue o formato antigo (documento único) e já está implementada.

## O método em uma página

O trabalho segue a ideia da colina: primeiro **sobe-se** (descobrir tudo o que falta saber), depois **desce-se** (executar o que já está decidido). Misturar as duas coisas é o que gera retrabalho e fuga de escopo.

```
            topo: zero perguntas abertas
               ╱‾‾‾‾‾‾‾‾╲
   UPHILL    ╱            ╲   DOWNHILL
 descobrir  ╱              ╲  executar e provar
───────────╱                ╲───────────
 spec → tasks → uphill.md  │  código + testes → downhill.md → docs finais
```

| Etapa | Arquivo | Pergunta que responde | Pode escrever código do produto? |
|---|---|---|---|
| 1. Spec | `spec.md` | **O quê** e **por quê**; o que fica de fora; como saber que está pronto | Não |
| 2. Tasks | `tasks.md` | Quais entregas pequenas e verificáveis **provam** a spec | Não |
| 3. Uphill | `uphill.md` | **Como exatamente** cada task será feita e testada, sem nenhuma dúvida restante | Só experimentos descartáveis fora do repositório |
| 4. Downhill | `downhill.md` | O que foi feito, com a saída dos testes como prova | Sim — e só o que o uphill documentou |

**Estado deste ciclo (18/10/2026):** etapas 1 e 2 prontas para as 10 specs. Cada `tasks.md` traz, no fim, uma lista de **incógnitas iniciais** para o uphill: as dúvidas que a escrita da spec levantou e que precisam de evidência antes do código.

### Regras do uphill

1. **Não sair do escopo.** O uphill detalha o que a spec já pede. Ideia nova vai para "Fora de escopo (anotado)" do `uphill.md`. O critério é: *esta linha é necessária para algum critério de aceite?*
2. **Resolver incógnitas com evidência.** Doc lida (para o Next 16: `node_modules/next/dist/docs/`), código inspecionado ou experimento em diretório temporário, nunca no repositório. O que não dá para verificar vira risco aceito, com plano B.
3. **Detalhar cada task:** arquivos, passo a passo, assinaturas, casos de erro e tabela de testes.
4. **Respeitar [`contratos.md`](contratos.md).** Mudança de contrato vai para "Questões para o orquestrador".
5. **Topo:** checklist do `uphill.md` todo marcado.

### Regras do downhill

1. Executar só o que está documentado, na ordem de `tasks.md`.
2. Faltou informação: volta a subir (atualiza o `uphill.md`) antes de codar.
3. Task só fecha com a saída dos comandos de "Pronto quando" registrada em `downhill.md`. Teste que falha tem a causa corrigida, nunca o teste afrouxado.
4. Cada caso de erro do uphill tem teste.
5. O que exige uma pessoa (celular na mão, fatura real) vai para [`validacao-manual.md`](validacao-manual.md).
6. **Migration na produção** (`prisma migrate deploy`) só com aprovação explícita do usuário, como nas specs anteriores.

## Arquivos de cada spec

```
docs/specs/NNN-nome/
  spec.md       requisitos (R), fora de escopo, critérios de aceite (CA)
  tasks.md      tasks (T) com dependências, "pronto quando" e incógnitas para o uphill
  uphill.md     levantamento completo, escrito na fase uphill
  downhill.md   registro de execução e provas, escrito na fase downhill
```

Modelos em branco: [`_modelos/`](_modelos/).

## Quadro de status

Legenda: ⬜ não iniciado · 📝 spec e tasks prontas · 🔼 uphill em andamento · ⛰️ no topo (pronto para descer) · 🔽 downhill em andamento · ✅ concluído

| Spec | Assunto | Depende de | Onda | R / CA / T | Status |
|---|---|---|---|---|---|
| [001](001-carga-erros-sessao/spec.md) | Carregamento, erros de leitura e sessão expirada | — | 1 | 12 / 13 / 9 | 📝 |
| [002](002-autenticacao-reforcada/spec.md) | Autenticação reforçada | 001 | 2 | 20 / 21 / 9 | 📝 |
| [007](007-primeiros-passos/spec.md) | Primeiros passos para conta nova | 001 | 2 | 10 / 9 / 5 | 📝 |
| [010](010-acessibilidade-folhas-mes/spec.md) | Acessibilidade das folhas e seletor de mês | — | 2 | 12 / 15 / 6 | 📝 |
| [004](004-valores-em-centavos/spec.md) | Valores em centavos e tipo obrigatório | — | 3 | 12 / 13 / 8 | 📝 |
| [003](003-categoria-por-id/spec.md) | Categoria por identificador | 004 | 4 | 12 / 15 / 8 | 📝 |
| [009](009-busca-e-ordem/spec.md) | Busca e ordem dos lançamentos | — | 5 | 8 / 10 / 5 | 📝 |
| [005](005-cartoes-e-faturas/spec.md) | Cartões de crédito e faturas | 003, 004 | 6 | 16 / 18 / 9 | 📝 |
| [006](006-estornos/spec.md) | Estornos abatem o gasto | 003, 004, 005 | 7 | 11 / 15 / 6 | 📝 |
| [008](008-lancamentos-recorrentes/spec.md) | Lançamentos recorrentes | 003, 004, 005 | 8 | 17 / 13 / 8 | 📝 |

Specs que pedem **aprovação do usuário** durante o downhill: 005 (estrutura e protótipo, antes da UI) e 008 (tela "Todo mês"). Também pedem aprovação, antes de rodar, as tasks que aplicam migration na produção: 002, 004, 003, 005 e 008.

## Ondas

Specs da mesma onda não tocam nos mesmos arquivos e podem descer em paralelo. A onda seguinte só começa depois que a anterior passou na verificação completa (`lint`, `typecheck`, `npm test`, `test:e2e`) rodada pelo orquestrador. A ordem foi refeita no portão do topo, para que duas specs da mesma onda não disputem `src/app/page.tsx`, `src/app/settings/page.tsx`, Planejar ou Investimentos.

| Onda | Specs | Pastas principais |
|---|---|---|
| 1 | 001 | `src/services`, `src/contexts`, páginas autenticadas, `src/components/LoadState` |
| 2 | 002, 007, 010 | 002: `src/lib/{session,auth}.ts`, `src/app/api/{login,register,logout,auth}`, Configurações, login, helpers E2E, migration. 007: `src/app/page.tsx`, `src/components/FirstSteps`, `src/features/first-steps`, guia `/ajuda`. 010: `CustomModal`, `PeriodFilter`, mês de Planejar, `src/components/MonthPicker` |
| 3 | 004 | schema e migration, `src/lib/money.ts`, validadores, rotas de API, `src/utils/finance.ts`, `tests/migrations/` |
| 4 | 003 | schema e migration, rotas de categorias/lançamentos/orçamentos/regras/importação, formulários |
| 5 | 009 | `src/utils/search.ts`, Lançamentos, `TransactionFilters`, ordem no Mês e em Investimentos |
| 6 | 005 | `src/features/credit-cards`, `/api/credit-cards`, `/cards`, Mês, importação, formulário, migration |
| 7 | 006 | `src/utils/finance.ts`, importação, formulário, Relatórios, Categorias, Planejar |
| 8 | 008 | `recurring_rules`, `/api/recurring`, Planejar ("Todo mês"), Mês, formulário, migration |

Donos dos recursos compartilhados: ver [`contratos.md`](contratos.md#recursos-compartilhados-e-donos-por-onda).

## Portão do topo — decisões (18/10/2026)

Questões que as specs levantaram ao serem escritas, e o que foi decidido. Os contratos já estão atualizados.

| Origem | Questão | Decisão |
|---|---|---|
| 001 | Serviço para `/api/me` | Criar `fetchProfile()` em `src/services/profile.ts` (K8). |
| 001 | `handleUnauthorized` também em escritas? | Sim: `401` em qualquer chamada por `src/services/*` (K8). |
| 001, 004, 005, 008, 010 | Numeração dos E2E novos colidia | Numeração por ordem de onda (contratos, recursos compartilhados). |
| 007 | `src/features/first-steps/` na onda | Incluído na onda 2. |
| 007, 002 | Guia `/ajuda` e capturas na mesma onda | 007 edita o guia; 002 só ajusta a criação de conta em `capturas.ts`. |
| 004 | Arquivos disputados na onda 2 | Ondas refeitas: a 004 desce sozinha na onda 3; a 009 vai para a 5. |
| 004 | Fixtures `t9`/`t10` sem tipo | A 004 pode alterar as fixtures (`t9` → `outcome`, `t10` → `income`). |
| 004 | Default de `goals.currentCents` | `@default(0)` (K1). |
| 009 | Nome da função de ordem | `compareTransactionsByDate(a, b, direction)` (K9). |
| 003 | K3 se contradizia (`NOT NULL` × `card_payment` sem categoria) | A 003 cria `NOT NULL`; a 005 torna anulável com `CHECK` (K3). |
| 003 | Teste de migration com dados antigos | Utilitário em `tests/migrations/`, criado pela 004 e reutilizado (contratos). |
| 003 | `CHECK` com a lista de tipos | Sem `CHECK` de lista; a validação fica na API, e a 006 não precisa de migration (K2). |
| 005 | Mês da fatura recalculado deslocava a importação duas vezes | Coluna `transactions.invoiceMonth`, congelada no servidor (K4). |
| 005 | `card_payment` no saldo | Fora da sobra do mês e do acumulado (K2). |
| 008 | Lançamento excluído voltava; meses sem abrir o app | `recurring_rules.lastGeneratedMonth` (K6). |
| 008 | `409` de categoria em uso sem recorrências | `usage.recurring` (K3). |
| 008 | Aprovação de design da tela "Todo mês" | Vira a primeira task do downhill da 008, como na 005. O uphill da 008 acrescenta essa task ao `tasks.md`. |
| 002 | Chave do limite em "redefinir senha" | `reset_password:<e-mail do dono do token>`; com token inexistente, só o contador de IP (K7). |
| 002 | Rota de "Sair de todos os aparelhos" | `POST /api/auth/logout-all` (K7). |
| 002 | Helpers E2E precisam mudar, não só acrescentar | Permitido à 002 na onda 2 (contratos). |
| 002 | 001 e 002 tocam Configurações na mesma onda | A 002 passou para a onda 2 e depende da 001. |
| 010 | E2E de mês usam `.fill("AAAA-MM")` | A 010 atualiza esses testes; a 004 só desce depois (onda 3). |
