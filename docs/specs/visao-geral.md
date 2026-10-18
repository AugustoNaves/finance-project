# Visão geral — próximo ciclo de melhorias (out/2026)

Documento de base das specs 001–010. Leia antes de qualquer spec, junto com [`contratos.md`](contratos.md) e [`fatos-verificados.md`](fatos-verificados.md).

## Ponto de partida

Em 18/10/2026 o Finance App tem: redesign "Caderneta", PWA instalável, importação de fatura em PDF (Nubank, Itaú, Inter e genérico; lança no mês do vencimento), guia `/ajuda`, RLS ligado no Supabase e a tabela `credit_cards` versionada, mas **sem API nem tela**. A CI (`.github/workflows/ci.yml`) roda lint, typecheck e `npm test` a cada PR. O backlog anterior está em [`../MELHORIAS.md`](../MELHORIAS.md).

## Objetivo do ciclo

Deixar o app **confiável** (dados certos, segurança, nenhum erro silencioso) e **mais completo para o uso real**: controle de cartão de crédito por fatura, estornos, contas fixas que se repetem, e um primeiro uso guiado.

## As melhorias (uma spec cada)

| Spec | Melhoria | Por quê | Origem | Prioridade |
|---|---|---|---|---|
| [001](001-carga-erros-sessao/spec.md) | Carregamento, erros de leitura e sessão expirada | Hoje uma falha de leitura ou uma sessão expirada aparecem como "nenhum lançamento"; zeros piscam enquanto os dados chegam. A pessoa pode achar que perdeu os dados. | MELHORIAS P10, P11, P17 e §4 | Alta |
| [002](002-autenticacao-reforcada/spec.md) | Autenticação reforçada | O limite de tentativas de login fica em memória (não protege na Vercel), o score do reCAPTCHA é ignorado, cadastro e "esqueci a senha" não têm proteção, sessões não podem ser revogadas e o token de redefinição é gravado em texto puro. | MELHORIAS P2–P5, P12 | Alta |
| [003](003-categoria-por-id/spec.md) | Categoria por identificador | Lançamentos e orçamentos guardam o **nome** da categoria: renomear zera métricas e orçamentos, excluir deixa lançamentos órfãos. | MELHORIAS P1 | Alta |
| [004](004-valores-em-centavos/spec.md) | Valores em centavos e tipo obrigatório | `Float` acumula erro de arredondamento em somas; receita/despesa são inferidas pelo sinal em alguns lugares e pelo tipo em outros. | MELHORIAS P6, P8 | Média |
| [005](005-cartoes-e-faturas/spec.md) | Cartões de crédito e faturas | A pessoa quer ver o mês pela fatura que vai pagar. A tabela `credit_cards` já existe na produção sem uso. Etapa 2 combinada na sessão de 17/10. | Conversa de 17/10, tabela `credit_cards` | Alta |
| [006](006-estornos/spec.md) | Estornos abatem o gasto | Estorno entra como receita e infla o "Entrou"; deveria reduzir o gasto da categoria e do orçamento. | Conversa de 17/10 | Média |
| [007](007-primeiros-passos/spec.md) | Primeiros passos para conta nova | Conta nova vê um Mês vazio; uma lista curta ensina fazendo e liga ao guia `/ajuda`. | Conversa de 17/10 | Média |
| [008](008-lancamentos-recorrentes/spec.md) | Lançamentos recorrentes | Aluguel, salário e assinaturas se repetem todo mês e hoje são digitados à mão. | Uso frequente no celular | Média |
| [009](009-busca-e-ordem/spec.md) | Busca e ordem dos lançamentos | "salario" não encontra "Salário"; a busca ignora categoria e observação; lançamentos do mesmo dia trocam de ordem entre carregamentos. | MELHORIAS P19 e §2 Baixa | Baixa |
| [010](010-acessibilidade-folhas-mes/spec.md) | Acessibilidade das folhas e seletor de mês | O foco não fica preso nas folhas nem volta ao botão de origem; o seletor de mês nativo some no Safari de desktop. | MELHORIAS P16 e §4 | Média |

## Fora de escopo deste ciclo

| Item | Motivo |
|---|---|
| Paginação de `GET /api/transactions` e carga por período (P13) | O app ainda carrega tudo em memória e os cálculos (saldo acumulado, relatórios) dependem disso. Só vale com medição de volume real; vira spec própria quando houver. |
| Integração bancária automática (Open Finance, leitura de extrato da conta) | Exige contrato com instituição/agregador, custo e revisão de segurança. |
| Leitura de PDF digitalizado (OCR) e extração com IA | Previsto como fase posterior na spec de importação; fora deste ciclo. |
| Notificações push | Exige chaves VAPID, consentimento e backend de envio; nenhuma melhoria deste ciclo depende disso. |
| Modo offline com escrita (registrar sem internet e sincronizar) | Conflita com a regra do PWA de não guardar dados financeiros no aparelho. |
| Multimoeda | Público e dados são só em BRL. |
| Contas compartilhadas (casal/família) | Muda o modelo de posse dos dados (`userId`) em todo o app. |
| Novos adaptadores de banco | Entram sob demanda, quando aparecer fatura real que o genérico não lê (como foi o caso do Inter). |
| Troca de `bcryptjs` por biblioteca nativa | Regra do projeto: nenhuma dependência nova sem decisão explícita do usuário. |
| Ícones próprios por categoria | Cosmético; nenhum fluxo depende. |

## Restrições que valem para todas as specs

- Regras do [`AGENTS.md`](../../AGENTS.md): Next.js 16 (ler `node_modules/next/dist/docs/` antes de codar), React 19 com React Compiler, styled-components, páginas `"use client"`, **nenhuma dependência nova**, datas via `src/utils/dates.ts`, textos em português.
- Design "Caderneta" ([`../design/design-spec.md`](../design/design-spec.md)): tokens CSS, listas pautadas, um primário por tela.
- PWA ([`../PWA.md`](../PWA.md)): o service worker nunca intercepta `/api/*` nem guarda páginas com dados.
- Banco: toda migration que criar tabela inclui `ENABLE ROW LEVEL SECURITY` (ver [`../API.md`](../API.md)). Migrations são aplicadas na produção à mão (`prisma migrate deploy`), com aprovação do usuário.
- Toda spec fecha com `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e` passando.

## Glossário

| Termo | Significado |
|---|---|
| Lançamento | Uma `Transaction`. |
| Mês da fatura | Mês do vencimento da fatura; é quando o dinheiro sai da conta. |
| Fechamento | Dia do mês a partir do qual as compras do cartão vão para a fatura seguinte. |
| Estorno | Devolução de um valor gasto; abate o gasto da categoria em vez de contar como receita (spec 006). |
| Recorrência | Regra que gera o mesmo lançamento todo mês (spec 008). |
