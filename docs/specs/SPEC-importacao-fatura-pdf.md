# SPEC — Importação de fatura por PDF

| | |
|---|---|
| Status | **Implementada (MVP)** em 12/10/2026 — ver seção 0 |
| Data | 12/10/2026 |
| Origem | Pedido do usuário: "uma seção capaz de verificar uma fatura vindo pelo PDF e registrar os devidos pagamentos, com um preview para o usuário verificar se está tudo correto e se as contas vão para as categorias certas" |
| Telas afetadas | Nova tela `/import`; Transações; Categorias; navegação |

## 0. Situação da implementação

Implementado na branch `feat/importacao-fatura-pdf`. As decisões em aberto foram resolvidas pelas recomendações desta spec: fatura de cartão detalhada por compra (P1, P2), PDF não armazenado (P3), extração determinística no navegador (P4), parcelas 2+ no mês da fatura.

| Item da spec | Situação |
|---|---|
| Upload, leitura no navegador (`pdfjs-dist`), limite de 10 MB e 50 páginas, PDF com senha | Feito |
| Parser genérico por heurística (datas `dd/mm`, `dd/mm/aaaa`, `dd MMM`; valores; parcelas; estornos; encargos; pagamento da fatura) e detecção do emissor | Feito |
| Preview editável: incluir, data, descrição, valor, tipo, categoria; selos de origem da sugestão e de duplicata | Feito |
| Conferência de total com aceite explícito da diferença | Feito |
| Sugestão de categoria: regra do usuário -> histórico -> palavras-chave | Feito |
| "Aplicar às outras linhas do estabelecimento" e "Lembrar para as próximas faturas" | Feito |
| Regra de data das parcelas e opção "Lançar tudo no mês da fatura" | Feito |
| Duplicidade: mesmo arquivo (hash), mesmo lançamento, fatura lançada como valor único (substituição) | Feito |
| Gravação atômica, histórico de importações e "Desfazer importação" | Feito |
| Testes unitários, de API, de UI e E2E com PDF sintético | Feito |
| Criar categoria dentro do preview (5.2) | **Não feito** — a tela aponta para Categorias |
| Adaptadores específicos por emissor (9) | **Não feito** — só o genérico; nenhum PDF real foi testado |
| Tela para listar/excluir regras de categorização | **Não feito** — a API existe (`/api/category-rules`) |
| Limite de 10 lotes/hora (10) | **Não feito** |
| Layout em cartões no mobile (5.3) | **Não feito** — a tabela rola na horizontal |
| OCR e fallback por LLM | Fora de escopo |

Diferenças em relação ao desenho original:

- **Modelo de dados (seção 7):** a tabela `transactions` **não** foi alterada. O vínculo transação-lote fica em `import_batch_items`, e a impressão digital é calculada na hora, sem coluna. Motivo: o deploy na Vercel não roda migrations; se a coluna nova fosse exigida, todas as telas quebrariam até a migration ser aplicada. Assim, sem a migration só a tela de importação falha.
- **Normalização de estabelecimento (6.2):** remove acentos, prefixo de adquirente, sufixo de parcela e o país no final (`BR`/`BRA`). Cidade e UF são mantidas, porque não há como separá-las do nome com segurança.
- **Palavras-chave:** casam no início de palavra (`POSTO` não casa com `IMPOSTO`).

Limitações conhecidas do parser genérico:

- Faturas com **duas colunas de data** (compra e lançamento) podem ter a segunda data lida como parcela.
- Seções de **parcelas futuras** ("próximas faturas") são lidas como lançamentos normais; a conferência de total acusa a diferença.
- Só foi validado com PDFs sintéticos. O primeiro teste com uma fatura real deve ser acompanhado.

## 1. Problema

Hoje cada despesa é digitada manualmente em "Nova Transação". Na conta real usada no mapeamento, a fatura do cartão aparece como **um único lançamento** ("Fatura — Cartão — R$ 558,09"), o que esconde para onde o dinheiro foi: o relatório mostra 71% das despesas em "Cartão" e os orçamentos por categoria ficam inúteis para tudo que passa pelo cartão.

## 2. Objetivo

Permitir que o usuário envie o PDF de uma fatura, veja **antes de gravar** todos os lançamentos extraídos já com categoria sugerida, corrija o que for preciso e confirme. Ao confirmar, cada lançamento vira uma transação normal do sistema.

### Fora de escopo (v1)

- PDFs escaneados (imagem) — exigem OCR. A v1 detecta o caso e avisa.
- Extratos bancários em OFX/CSV (o pipeline de preview pode ser reaproveitado numa v2).
- Leitura automática de e-mail ou de pastas.
- Pagar a fatura (o sistema só registra; não movimenta dinheiro).

## 3. Premissas adotadas (confirmar)

Itens que interpretei a partir do pedido. Estão marcados porque mudam o desenho.

| # | Premissa | Alternativa |
|---|---|---|
| P1 | "Fatura" = **fatura de cartão de crédito** com vários lançamentos. Contas de lançamento único (luz, internet, boleto) entram como caso simples: 1 linha no preview. | Tratar só boletos de pagamento único. |
| P2 | "Registrar os devidos pagamentos" = criar **uma transação de despesa por compra** da fatura. | Criar apenas um lançamento com o total da fatura. |
| P3 | O PDF **não é armazenado**; guarda-se apenas hash, nome e metadados do lote. | Guardar o arquivo (exige storage e política de retenção). |
| P4 | Extração determinística (texto do PDF + regras), sem IA na v1. | Extração por LLM (ver seção 9). |

## 4. Fluxo do usuário

1. **Enviar** — em `/import`, o usuário arrasta ou seleciona um PDF (até 10 MB). Se o PDF tiver senha (comum: dígitos do CPF), um campo de senha aparece; a senha é usada só para abrir o arquivo e nunca é enviada nem gravada.
2. **Extrair** — o sistema lê o texto, identifica emissor, mês de referência, vencimento, total da fatura e a lista de lançamentos.
3. **Revisar (preview)** — tabela editável com todos os lançamentos (seção 5).
4. **Confirmar** — botão "Registrar N transações (R$ X)". Gravação atômica: ou entram todas, ou nenhuma.
5. **Resultado** — resumo do lote com link para as transações filtradas e opção **Desfazer importação**.

## 5. Preview — requisitos

### 5.1 Cabeçalho da fatura

Emissor detectado, mês de referência, vencimento, total impresso na fatura, quantidade de lançamentos lidos.

**Conferência de total (obrigatória):** soma dos lançamentos incluídos x total impresso na fatura. Se a diferença for diferente de zero, mostrar o valor da diferença em destaque e exigir confirmação explícita ("Registrar mesmo com diferença de R$ X"). É o principal mecanismo para o usuário saber que o PDF foi lido por inteiro.

### 5.2 Linhas

| Coluna | Comportamento |
|---|---|
| Incluir | Checkbox. Desmarcado = não grava. |
| Data | Editável. Ver regra de data na seção 6.3. |
| Descrição | Editável. Valor original do PDF fica visível em tooltip/linha secundária. |
| Parcela | Somente leitura ("3/10") quando detectada. |
| Valor | Editável, sempre exibido positivo; o sinal é derivado do tipo. |
| Tipo | Despesa (padrão) ou Receita (estornos/créditos). |
| Categoria | Select com as categorias do usuário do tipo correspondente + "Nova categoria" (reaproveita o `CategoryForm` inline que já existe no `TransactionForm`). |
| Origem da sugestão | Selo: "regra sua", "histórico", "palavra-chave" ou "sem sugestão". |
| Avisos | "Possível duplicata", "Sem categoria", "Valor ilegível". |

### 5.3 Ações

- Selecionar/desmarcar todos; filtro "só pendências" (linhas com aviso).
- Ao trocar a categoria de uma linha: oferecer **"Aplicar a todas as N linhas de <estabelecimento>"** e **"Lembrar para as próximas faturas"** (cria regra, seção 6.2).
- Confirmar fica bloqueado enquanto houver linha incluída sem categoria ou com valor inválido.
- No mobile a tabela vira cartões, como já acontece em `TransactionList`.

## 6. Regras de negócio

### 6.1 Linhas especiais

| Linha no PDF | Tratamento padrão |
|---|---|
| "Pagamento recebido", "Pagamento de fatura" | **Não incluir** (é a quitação da fatura anterior, não um gasto). |
| Estorno / crédito | Incluir como Receita na mesma categoria da compra original quando identificável; senão "Outros". |
| IOF, juros, multa, anuidade | Incluir como Despesa; sugestão de categoria "Contas" (ou regra do usuário). |
| Compra internacional | Usar o valor já convertido em BRL; cotação e moeda original vão para a observação. |
| Saldo anterior / total / subtotais | Ignorar (não são lançamentos). |

### 6.2 Sugestão de categoria (ordem de prioridade)

1. **Regra do usuário** — padrão de estabelecimento normalizado -> categoria (criada em "Lembrar para as próximas").
2. **Histórico** — categoria mais usada pelo usuário em transações com a mesma descrição normalizada.
3. **Palavras-chave padrão** — dicionário inicial (ex.: UBER/99 -> Transporte; IFOOD/RESTAURANTE -> Alimentação; FARMACIA/DROGA -> Saúde; NETFLIX/SPOTIFY -> Lazer), aplicado só se a categoria existir para o usuário.
4. **Sem sugestão** — linha fica marcada e bloqueia a confirmação até o usuário escolher.

Normalização de estabelecimento: maiúsculas, sem acentos, sem sufixos de parcela ("03/10"), sem prefixos de adquirente ("PAG*", "MP*", "IFD*"), sem cidade/UF no final.

### 6.3 Data do lançamento

Compras parceladas aparecem na fatura com a data da compra original, que pode ser de meses atrás. Gravar com essa data jogaria a despesa para um mês já fechado.

- Compra à vista ou parcela 1: **data da compra**.
- Parcela 2 em diante: **mês de referência da fatura**, mantendo o dia da compra (ou o último dia do mês, se o dia não existir).
- Opção global no preview: "Lançar tudo no mês da fatura" (para quem controla por mês de pagamento).

Datas devem ser tratadas como **data local sem horário**. O sistema atual tem um bug de fuso (ver `docs/MELHORIAS.md`, item de data) que precisa estar corrigido antes desta feature, senão todo lançamento importado aparece um dia antes.

### 6.4 Duplicidade

- **Mesmo arquivo:** hash SHA-256 do PDF já existe em um lote do usuário -> aviso "Esta fatura já foi importada em dd/mm/aaaa" com opções Cancelar / Ver lote / Importar mesmo assim.
- **Mesmo lançamento:** impressão digital = usuário + data + descrição normalizada + valor + parcela. Linhas que batem com transação existente vêm **desmarcadas** com aviso "Possível duplicata" e link para a transação.
- **Fatura lançada como total:** se existir transação de despesa no mês com valor igual ao total da fatura (tolerância de R$ 0,01) — o padrão atual do usuário ("Fatura — Cartão") — o preview pergunta: "Você já registrou esta fatura como um lançamento único. Substituir pelo detalhamento?" Sem isso o gasto seria contado duas vezes.

### 6.5 Campos gravados em cada transação

`description` (revisada), `amount` (negativo para despesa, positivo para receita — convenção atual), `category` (nome), `type`, `date`, `paymentMethod = "Cartão de crédito"`, `notes = "Importado da fatura <emissor> <mm/aaaa>"` + parcela + dados de câmbio quando houver, `importBatchId`.

## 7. Modelo de dados (proposta)

```prisma
model ImportBatch {
  id             String        @id @default(uuid())
  fileName       String
  fileHash       String
  issuer         String?
  referenceMonth String        // "YYYY-MM"
  dueDate        DateTime?
  statedTotal    Float?
  importedTotal  Float
  itemCount      Int
  createdAt      DateTime      @default(now())
  userId         String
  user           User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions   Transaction[]

  @@index([userId])
  @@index([userId, fileHash])
  @@map("import_batches")
}

model CategoryRule {
  id        String   @id @default(uuid())
  pattern   String   // estabelecimento normalizado
  category  String
  type      String
  createdAt DateTime @default(now())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, pattern])
  @@map("category_rules")
}
```

`Transaction` ganha `importBatchId String?` (relação opcional, `onDelete: SetNull`) e `fingerprint String?` com índice `[userId, fingerprint]`.

## 8. API (proposta)

Todas exigem sessão e filtram por `userId`, como as rotas atuais.

| Método | Rota | Função |
|---|---|---|
| POST | `/api/imports/preview` | Recebe os lançamentos extraídos (JSON) + `fileHash`; devolve cada linha com categoria sugerida, origem da sugestão e flags de duplicidade; informa se o arquivo já foi importado. |
| POST | `/api/imports` | Confirma: cria `ImportBatch` + transações em um único `prisma.$transaction`. Limite de 500 linhas. Valida cada linha com as mesmas regras de `POST /api/transactions`. 400 lista as linhas inválidas por índice. |
| GET | `/api/imports` | Histórico de lotes do usuário. |
| DELETE | `/api/imports/[id]` | Desfaz: apaga as transações do lote e o lote. |
| GET/POST/DELETE | `/api/category-rules` | Regras de categorização do usuário. |

A extração do PDF acontece **no navegador** (seção 9), então o arquivo não trafega; o servidor recebe só os lançamentos já estruturados.

## 9. Extração do PDF — decisão técnica

| Opção | Prós | Contras |
|---|---|---|
| **A. `pdfjs-dist` no cliente + adaptadores por emissor** (recomendada para v1) | PDF nunca sai do navegador (privacidade, sem custo de servidor, sem limite de body da Vercel); determinístico e testável com fixtures. | Um adaptador por layout de banco; layout muda de tempos em tempos. |
| B. Parser no servidor (`unpdf`/`pdf-parse`) | Mesma lógica, sem peso no bundle. | Arquivo trafega e passa pela função serverless (limite ~4,5 MB de body na Vercel). |
| C. LLM (API da Claude com suporte a PDF) | Funciona com qualquer emissor e até PDF escaneado; já sugere categoria. | Custo por fatura, dado financeiro sai para terceiro (exige consentimento explícito), resposta não determinística — a conferência de total (5.1) vira obrigatória. |

Recomendação: **A na v1**, com um adaptador genérico por heurística (linha = `dd/mm` + descrição + valor `1.234,56`) e adaptadores específicos para os emissores que o usuário realmente usa; **C como fallback opcional** em fase posterior, quando A não reconhecer o layout.

Observação: o `AGENTS.md` proíbe bibliotecas novas sem ordem explícita. Esta feature **precisa** de uma (`pdfjs-dist`); a aprovação desta spec conta como essa ordem.

Estrutura sugerida:

```
src/features/invoice-import/
  extract/pdfText.ts          // pdfjs -> linhas de texto por página
  extract/adapters/*.ts       // nubank.ts, itau.ts, generic.ts ... -> ParsedInvoice
  normalize.ts                // normalização de estabelecimento + fingerprint
  categorize.ts               // regras -> histórico -> palavras-chave
src/app/import/page.tsx
src/components/ImportPreviewTable/
```

## 10. Segurança e privacidade

- Aceitar só `application/pdf`, até 10 MB e 50 páginas; validar no cliente e revalidar contagem/tamanho do JSON no servidor.
- Nunca logar descrição, valor ou conteúdo do PDF (hoje o `console.error` das rotas loga o erro inteiro — manter assim, sem o payload).
- Número do cartão: descartar na extração; no máximo os 4 últimos dígitos na observação.
- Senha do PDF fica só em memória no navegador.
- Rate limit em `/api/imports` (ex.: 10 lotes/hora por usuário).

## 11. Critérios de aceite

1. **Dado** um PDF de fatura suportado, **quando** envio, **então** vejo emissor, mês, vencimento, total e todos os lançamentos, e a soma das linhas incluídas bate com o total impresso.
2. **Dado** o preview, **quando** altero a categoria de uma linha e marco "aplicar a todas de <estabelecimento>", **então** todas as linhas daquele estabelecimento mudam.
3. **Dado** que marquei "lembrar", **quando** importo a fatura do mês seguinte, **então** as linhas daquele estabelecimento já vêm com a categoria e o selo "regra sua".
4. **Dado** uma linha sem categoria incluída, **então** o botão de confirmar fica desabilitado e indica quantas pendências faltam.
5. **Dado** que confirmo, **então** as transações aparecem em Transações, entram no Dashboard, Relatórios e Orçamentos do mês correto, e nada é gravado se qualquer linha falhar.
6. **Dado** que reenvio o mesmo PDF, **então** sou avisado antes de qualquer gravação.
7. **Dado** uma transação existente igual a uma linha, **então** a linha vem desmarcada como possível duplicata.
8. **Dado** que já lancei a fatura como valor único, **então** o sistema oferece substituir pelo detalhamento e, se aceito, o total de despesas do mês não muda.
9. **Dado** um lote importado, **quando** clico em Desfazer, **então** todas as transações do lote somem e os totais voltam ao valor anterior.
10. **Dado** um PDF escaneado, com senha errada ou de layout desconhecido, **então** recebo uma mensagem específica para cada caso e nada é gravado.
11. Linhas "Pagamento recebido" nunca vêm marcadas por padrão.
12. Usuário B não enxerga nem desfaz lotes do usuário A (404).

## 12. Plano de testes

| Camada | O que cobrir |
|---|---|
| Unitário (Vitest) | Adaptadores com fixtures de texto por emissor (PDFs sintéticos, sem dados reais); normalização; fingerprint; regra de data de parcelas; ordem de prioridade da categorização; conferência de total. |
| API (Vitest) | `/api/imports` atômico (falha em 1 linha = 0 gravadas); limite de 500; isolamento por usuário; duplicidade de arquivo; undo. |
| UI (Testing Library) | Tabela de preview: edição, aplicar a todos, bloqueio por pendência, diferença de total. |
| E2E (Playwright) | Upload de PDF sintético -> preview -> confirmar -> conferir Dashboard/Relatórios -> desfazer. |

## 13. Fases sugeridas

1. **Fundação** — corrigir o bug de data/fuso; `POST /api/transactions` em lote com validação; modelo `ImportBatch`.
2. **MVP** — upload + adaptador genérico + 1 emissor real + preview + confirmar + desfazer + duplicidade de arquivo.
3. **Categorização inteligente** — regras do usuário, histórico, "aplicar a todos".
4. **Refino** — substituição da fatura lançada como total, mais emissores, parcelas, histórico de lotes em Configurações.
5. **Opcional** — fallback por LLM e OCR.

## 14. Perguntas em aberto

1. Quais emissores/bancos priorizar? (define os adaptadores da fase 2)
2. P1/P2 estão corretas — é fatura de cartão detalhada por compra?
3. Data das parcelas: mês da fatura (proposto) ou data da compra original?
4. Categoria "Cartão" continua existindo depois que as faturas passam a ser detalhadas?
5. LLM é aceitável como fallback (envio do conteúdo da fatura a um provedor externo)?
