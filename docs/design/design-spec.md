# Design spec — Finance-app, direção "Caderneta"

Aprovações: estrutura (A), direção Caderneta (B) e protótipo (C) em 17/10/2026. Nome: **Finance-app**.

## Princípios

1. **O mês primeiro.** A pergunta diária é "como está meu mês?"; a sobra do mês abre o app.
2. **Livro-razão, não painel.** Linhas pautadas separam itens; nada de cards com sombra, brilho ou gradiente. Superfície elevada só para o que flutua (folhas e diálogos).
3. **Tinta com significado.** Verde = ação e o que está em ordem; vermelho = dinheiro que saiu ou orçamento estourado; âmbar = atenção. Fora disso, tinta neutra.
4. **Números são o conteúdo.** Valores em Literata com algarismos tabulares, alinhados à direita. Totais ganham o sublinhado duplo contábil.
5. **Um toque para registrar.** "+ Registrar" sempre ao alcance (barra inferior no celular, topo da coluna no desktop).

## Tokens (`src/styles/global.ts`, variáveis CSS em `:root`)

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--paper` | `#eef2ea` | `#121815` | fundo da página |
| `--sheet` | `#f8faf5` | `#18201c` | folhas, diálogos, campos |
| `--ink` | `#1f2b26` | `#e3ebe4` | texto principal |
| `--ink-soft` | `#536259` | `#9bada2` | texto de apoio (≥ 4.5:1 sobre `--paper`) |
| `--rule` | `#d3dccf` | `#26332c` | pauta entre linhas |
| `--rule-strong` | `#b4c2b4` | `#3a4b41` | cabeçalho de seção, bordas de campo |
| `--green` | `#2f5d50` | `#8cc7ad` | ação primária, positivo, foco |
| `--green-wash` | `#dfe9e0` | `#1f2e27` | hover, item ativo |
| `--on-green` | `#f8faf5` | `#0f1a15` | texto sobre `--green` |
| `--red` | `#a8382c` | `#f08a7c` | saídas, erro, estourado |
| `--red-wash` | `#f6dcd7` | `#3a1f1b` | fundo de erro |
| `--amber` | `#8a5600` | `#e8b86a` | atenção (≥ 80% do orçamento) |
| `--amber-wash` | `#f6e8cc` | `#33281a` | lembretes |
| `--scrim` | `rgba(23,33,28,.42)` | `rgba(0,0,0,.55)` | fundo de folha/diálogo |

Cores de categoria (do banco) aparecem só como um ponto de 8px ao lado do nome; nunca como fundo.

Tema: segue `prefers-color-scheme`. `color-scheme` acompanha (campos nativos e barras de rolagem).

### Tipografia

- `--font-ui`: Public Sans (400/500/600) — interface e texto.
- `--font-figures`: Literata (500) — valores, título do mês, nome do app. Sempre `font-variant-numeric: tabular-nums`.
- Escala: 11 (rótulo de seção, caixa alta, `letter-spacing .08em`) · 12.5 (metadados) · 14 · 15 (corpo) · 17 (título de folha) · 20/26 (título de página, Literata) · 40–56 (valor-herói, `clamp`).

### Espaço, forma e movimento

- Grade de 4px; linhas de lista com altura mínima de 56px (alvo de toque ≥ 44px).
- Raios: 10px em botões e campos, 999px em chips, 20px no topo das folhas, 16px em diálogos no desktop. Sem sombras.
- Movimento: folha sobe 24px em 220ms (`ease-out`); desligado com `prefers-reduced-motion`.

## Layout e navegação

- **Celular (< 960px):** conteúdo em coluna única com margem de 20px; barra inferior fixa com Mês · Lançamentos · (+) · Planejar · Mais, respeitando `safe-area-inset-bottom`. "Mais" abre folha com Importar fatura, Categorias e regras, Investimentos, Relatórios, Configurações e Sair.
- **Desktop (≥ 960px):** coluna à esquerda de 248px com o nome, "+ Registrar" e dois grupos ("Dia a dia", "Organizar"); conteúdo até 1080px. O Mês usa duas colunas a partir de 1180px.
- Título de página: Literata 20/26px, sem "eyebrow" nem subtítulo longo. Ação principal da página ao lado do título no desktop e abaixo dele no celular.

## Componentes

| Componente | Regra |
|---|---|
| Linha de lançamento | Descrição (500) + "Categoria · data" (`--ink-soft`) à esquerda; valor com sinal à direita (`−` vermelho, `+` tinta). A linha inteira é o botão de editar. |
| Cabeçalho de dia | Data por extenso curta + subtotal do dia; pauta forte abaixo. |
| Seção | Rótulo em caixa alta + link de ação à direita; pauta forte abaixo. |
| Medidor (orçamento/meta) | Barra de 4px sem raio; verde < 80%, âmbar 80–100%, vermelho > 100%; `role="progressbar"`. |
| Folha / Diálogo (`CustomModal`) | Folha inferior no celular, diálogo central no desktop; `role="dialog"`, título visível, Esc e "Fechar" fecham. |
| Formulário de lançamento | Tipo segmentado (Gasto · Receita · Investimento), valor grande com sublinhado duplo, categorias em chips ordenadas por uso, data (hoje), forma de pagamento, observação opcional. |
| Botões | Primário verde cheio (um por tela); secundário só texto/contorno; destrutivo em vermelho, sempre com confirmação. |
| Lembrete | Faixa âmbar suave com texto e ação. Usado para fatura não importada. |
| Erro | `FormError`: texto vermelho sobre `--red-wash`, `role="alert"`. |
| Vazio | Frase-convite + ação ("Registrar o primeiro"). |
| Gráficos (recharts) | Tinta neutra; saídas em vermelho, entradas em verde; grade em `--rule`; sem degradês. |

## Acessibilidade

- Contraste AA em ambos os temas; foco visível (`outline 2px var(--green)`).
- Navegação com `aria-current="page"`; ícones decorativos com `aria-hidden`.
- Alvos de toque ≥ 44px; folhas fecham com Esc; foco vai para o primeiro campo.
- Valores nunca dependem só da cor: sempre têm sinal (`−`/`+`).

## Regras contra regressão

- Não usar cards com sombra, gradientes, brilhos ou bordas laterais coloridas.
- Não usar mais de um botão primário por tela.
- Não usar cor de categoria como fundo.
- Não reintroduzir totais de todo o histórico como destaque do Início.
- Números monetários sempre em `--font-figures` com algarismos tabulares.

## PWA

- `src/app/manifest.ts`: nome "Finance-app", `display: standalone`, `start_url: "/"`, `theme_color`/`background_color` = `--paper` claro; ícones gerados (F em Literata, tinta verde sobre papel), incluindo maskable.
- `viewport.themeColor` com variantes claro/escuro.
- Service worker (`public/sw.js`): cacheia só assets estáticos e `/offline`; nunca `/api/*` nem páginas com dados.

## Em aberto

- Ícones próprios por categoria (hoje só ponto colorido).
