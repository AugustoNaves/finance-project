# PWA — Finance-app instalável

O app pode ser instalado na tela inicial (Android/Chrome, desktop Chrome/Edge e iPhone via Safari) e abre em tela cheia, como app. Tudo usa as convenções nativas do Next.js 16 (ver `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`); nenhuma biblioteca foi adicionada.

## Peças

| Arquivo | Papel |
|---|---|
| `src/app/manifest.ts` | Gera `/manifest.webmanifest`: nome "Finance-app", `display: standalone`, `start_url: "/"`, `theme_color`/`background_color` = papel claro `#eef2ea`, ícones `any` e `maskable` (192 e 512), atalhos para Lançamentos e Importar fatura. |
| `public/icons/*.png` | Ícones do manifest. `icon-*` com cantos arredondados; `maskable-*` com fundo inteiro e o "F" dentro da zona segura. |
| `src/app/icon.png`, `src/app/apple-icon.png` | Favicon e ícone do iOS (convenções de arquivo do Next, geram as tags `<link>`). |
| `public/splash/*.png` | Telas de abertura do iOS (5 tamanhos de iPhone × claro/escuro), ligadas em `metadata.appleWebApp.startupImage` no `src/app/layout.tsx`. No Android a abertura é gerada pelo navegador a partir de `background_color`, ícone e nome — fica coerente com a do iOS. |
| `src/app/layout.tsx` | `viewport.themeColor` com variantes claro/escuro, `viewportFit: "cover"` (áreas seguras do iPhone) e `appleWebApp` (título, status bar e splash). |
| `public/sw.js` | Service worker (ver regras abaixo). |
| `src/components/ServiceWorkerRegister` | Registra `/sw.js` no navegador, **só em produção** (`next build && next start` ou Vercel), para não atrapalhar o recarregamento do `next dev`. |
| `src/app/offline/page.tsx` | Página exibida quando a navegação falha sem internet. |
| `next.config.ts` | Cabeçalhos de `/sw.js`: `Cache-Control: no-cache, no-store, must-revalidate`, `Content-Type` JS e CSP restrita. |

## Regras do service worker (dados financeiros)

- **Nunca** intercepta `/api/*` (nenhum método) nem requisições de outras origens (reCAPTCHA, fontes externas).
- **Nunca** guarda páginas com dados: toda navegação vai à rede; se a rede falhar, redireciona para `/offline` (servida do cache, com os estáticos que ela usa, guardados na instalação). "Tentar de novo" volta para o início.
- Guarda apenas arquivos estáticos de build (`/_next/static/*`, com hash no nome) e os ícones.
- O worker do pdf.js (`/pdf.worker.min.mjs`) não é interceptado e continua funcionando.
- Ao ativar uma nova versão (constante `VERSION` em `public/sw.js`), apaga os caches das versões anteriores.

Testes: `tests/unit/sw.test.ts` (regras acima) e `tests/unit/proxy.test.ts` (arquivos do PWA e `/offline` ficam fora do redirecionamento para `/login`).

## Autenticação

O proxy (`src/proxy.ts`) só atua nas rotas listadas no `matcher`. Manifest, ícones, splash, `sw.js` e `/offline` não estão nele, então ficam públicos — o navegador precisa buscá-los antes do login.

## Como testar a instalação

1. `npm run build && npm run start` (o service worker só registra em produção).
2. Abra `http://localhost:3000` no Chrome → DevTools → Application → Manifest (sem avisos) e Service Workers (ativo).
3. Em viewport de celular, o ícone de instalar aparece na barra de endereço; no Android real, menu ⋮ → Instalar app; no iPhone, Compartilhar → Adicionar à Tela de Início.
4. Offline: DevTools → Network → Offline e recarregue — aparece "Sem conexão".

## Atualizar ícones

Os PNGs foram gerados a partir do próprio app (fonte Literata carregada pelo `next/font`) com um script Playwright descartável. Para mudar: ajuste a arte, gere novamente os mesmos nomes de arquivo e incremente `VERSION` em `public/sw.js`.
