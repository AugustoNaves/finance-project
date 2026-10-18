# Revisão visual e funcional — Finance App "Caderneta" (17/10/2026)

Comparação da implementação com a direção e o protótipo aprovados (`visual-directions.md`, `design-spec.md`).

## Como foi verificado

- **Telas reais**: build de produção (`next build && next start`) com uma conta de teste e dados de exemplo (21 lançamentos em 3 meses, 3 orçamentos, 2 metas). Screenshots de página inteira de todas as rotas (login, Mês, Lançamentos, Importar, Categorias, Investimentos, Planejar, Relatórios, Configurações) em **desktop 1440px e celular 390px**, **claro e escuro**. Os subagentes de cada tela fizeram o mesmo durante a implementação, incluindo estados (erro de cadastro, link de redefinição sem token, passo de conferência da importação com um PDF de exemplo, edição de categoria, nova meta).
- **Rolagem horizontal**: `scrollWidth` = largura da janela a 390px em todas as rotas (também coberto pelo E2E `09-responsive`).
- **Contraste** (WCAG, calculado a partir dos tokens): texto de apoio 5,7:1 (claro) e 7,6:1 (escuro); vermelho sobre papel 5,7:1 e 7,4:1; texto sobre o verde 7,1:1 e 9,2:1; âmbar sobre o lembrete 5,1:1 e 7,9:1; erro sobre fundo de erro 4,9:1 e 6,2:1. Todos ≥ 4,5:1 (AA).
- **PWA** no Chromium emulando Pixel 7: manifest sem erros, `getInstallabilityErrors` vazio, service worker ativo e controlando a página, cache com 0 entradas de `/api` e só `/offline` como página, navegação sem rede cai em "Sem conexão".
- **Funcional**: `npm run lint`, `npm run typecheck`, `npm test` (1.228 testes) e `npm run test:e2e` (135 testes).

## Fidelidade à direção

| Ponto da spec | Situação |
|---|---|
| Mês primeiro, sobra com sublinhado duplo, trio, acumulado discreto | ✔ Igual ao protótipo; no celular a sobra e o trio cabem na primeira tela. |
| Linhas pautadas, sem cards/sombra/gradiente | ✔ Em todas as telas. Superfície `--sheet` só em folhas, diálogos, painel de filtros e a "página de caderno" do login. |
| Valores em Literata, tabulares, sinal tipográfico, saídas em vermelho | ✔ Listas usam `−45,70`/`+1.800,00`; Relatórios e Investimentos usam moeda completa (`−R$ 3.542,70`) por serem totais. |
| Um primário por tela | ✔ Mês/Lançamentos/Planejar: só o "+" da barra (ou "+ Registrar" na coluna). Categorias, Investimentos, Importar e login têm o seu primário próprio. |
| Cor de categoria só como ponto | ✔ Rosca de Relatórios removida por esse motivo (virou "Gastos por categoria"). |
| Barra inferior / coluna lateral / folha "Mais" | ✔ Com Sair nos dois lugares. |
| Tema do sistema | ✔ Claro e escuro conferidos em todas as telas; `theme-color` acompanha. |

## Achados

### Bloqueadores
Nenhum em aberto. Corrigidos durante a revisão:
- Página offline do PWA mostrava a tela de erro do Next (o HTML de `/offline` era servido na URL original e os scripts dela não estavam em cache). Agora o worker redireciona para `/offline` e guarda na instalação os estáticos que ela usa; "Tentar de novo" volta ao início.
- A lista de Lançamentos estourava a largura a 390px (grade sem `minmax(0, 1fr)` com a fileira de chips).

### Importantes
Corrigidos:
- Indicador de desenvolvimento do Next cobria a aba "Mês" no celular (só em `next dev`) — desligado em `next.config.ts`.
- Nomes longos de meta/orçamento eram cortados com reticências no celular — agora quebram linha.
- Orçamento em exatamente 100% aparecia vermelho com o texto "Perto do limite" — vermelho só acima de 100%.

Em aberto (registrados em `docs/MELHORIAS.md` §4):
- Se `GET /api/imports` responder com erro, o serviço devolve lista vazia e o lembrete "fatura não importada" pode aparecer indevidamente.
- Seletor de mês de Relatórios/Planejar usa `<input type="month">` invisível; no Safari de desktop o campo vira texto (as setas funcionam).

### Polimento
- Em Categorias e Investimentos o botão primário ocupa a largura toda no celular; funciona, mas pesa mais que o resto da tela. Alternativa: link discreto no cabeçalho, como em Planejar.
- No login, o título do formulário ("Entrar") é um rótulo pequeno em caixa alta; a frase de valor é o maior texto. Intencional (marca primeiro), mas pode ser revisto.
- Cores das categorias padrão vêm do cadastro antigo (saturadas); só aparecem como pontos de 8px, mas uma migração para a paleta nova deixaria tudo mais coeso.
- Instalação real em aparelho (Android/iPhone) não foi feita nesta sessão — só a verificação de instalabilidade do Chromium e as metatags/telas de abertura do iOS.

## Antes e depois

Os screenshots antes/depois estão na descrição do PR.
