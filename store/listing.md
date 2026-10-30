# Chrome Web Store — material de submissão (v1.1.0)

Tudo pronto para copiar e colar no [Developer Dashboard](https://chrome.google.com/webstore/devconsole).
O único passo que exige você: conta de desenvolvedor (taxa única de US$ 5) e o envio final.

## Pacote

- Arquivo: `dist/pip-button-1.1.0.zip` (código puro, sem `.git`, sem README)
- Versão: `1.1.0`

## Ficha da loja

**Nome (máx. 75):**
```
PiP Button — Picture-in-Picture em qualquer player
```

**Descrição curta (máx. 132 caracteres):**
```
Picture-in-Picture em qualquer player — Netflix, Disney+, Prime, Max e Globoplay. Botão flutuante e Alt+P. Grátis, sem analytics.
```

**Descrição detalhada:**
```
Ative o modo Picture-in-Picture em QUALQUER player de vídeo, com um único clique — inclusive nos que tentam bloquear o recurso.

FUNCIONA ONDE OS OUTROS NÃO FUNCIONAM
• Netflix, Disney+, Prime Video, Max, Globoplay, YouTube, Vimeo, Twitch e qualquer vídeo na web.
• Neutraliza o bloqueio disablePictureInPicture usado por Netflix e Disney+.
• Encontra o vídeo mesmo quando o player o esconde em shadow DOM fechado.
• Funciona em vídeos dentro de iframes (embeds).
• Não contorna DRM: usa o Picture-in-Picture nativo do Chrome.

COMO USAR
• Passe o mouse sobre o vídeo e clique no botão flutuante — entra no PiP; clique de novo para sair.
• Ou clique no ícone da extensão: o popup mostra o status e ativa/sai do PiP.
• Atalho de teclado: Alt+P (trocável em chrome://extensions/shortcuts).

RECURSOS
• Botão flutuante discreto em shadow DOM fechado — não conflita com o CSS do site.
• Detecção automática de novos vídeos (SPA, feeds, lazy load).
• Configurações: desligar o botão flutuante ou o modo "forçar em players que bloqueiam".

GRÁTIS, SEM ANALYTICS, SEM DEPENDÊNCIAS
• Zero analytics, zero telemetria, zero rastreamento.
• Zero requisições de rede: tudo roda 100% local.
• Zero permissões sensíveis (sem tabs, webNavigation ou scripting).
• Zero bibliotecas de terceiros — JavaScript puro.
• Código aberto e auditável: github.com/jjgouveia/pip-video-player

PRIVACIDADE
A extensão não coleta, não transmite e não armazena nenhum dado. Guarda apenas 2 preferências locais (botão flutuante ligado/desligado e modo forçar ligado/desligado) no próprio navegador.

LIMITAÇÕES
• Vídeos com DRM continuam sujeitos às regras do navegador (sem contorno de proteção).
• Iframes cujo site embutido proíba picture-in-picture via Permissions-Policy.
• Players que desenham em <canvas> (sem elemento <video>) não são suportados.
```

**Categoria:** Produtividade (alternativa: Ferramentas)
**Idioma padrão:** Português (Brasil) — opcional adicionar English (copy abaixo)

## Ficha em inglês (opcional)

**Name:** `PiP Button — Picture-in-Picture on any player`

**Short description (≤132):**
```
Picture-in-Picture on any player — Netflix, Disney+, Prime, Max and Globoplay. Floating button and Alt+P. Free, no analytics.
```

**Detailed description:**
```
Turn on Picture-in-Picture for ANY video player with a single click — including players that try to block it.

WORKS WHERE OTHERS DON'T
• Netflix, Disney+, Prime Video, Max, Globoplay, YouTube, Vimeo, Twitch and any video on the web.
• Neutralizes the disablePictureInPicture blocker used by Netflix and Disney+.
• Finds the video even when the player hides it in a closed shadow DOM.
• Works with videos inside iframes (embeds).
• Does not bypass DRM: it uses Chrome's native Picture-in-Picture.

HOW TO USE
• Hover the video and click the floating button — enter PiP; click again to exit.
• Or click the extension icon: the popup shows status and toggles PiP.
• Keyboard shortcut: Alt+P (configurable at chrome://extensions/shortcuts).

FEATURES
• Discreet floating button in a closed shadow DOM — no CSS conflicts.
• Automatically detects new videos (SPAs, feeds, lazy load).
• Settings: disable the floating button or the "force on blocking players" mode.

FREE, NO ANALYTICS, NO DEPENDENCIES
• No analytics, no telemetry, no tracking.
• No network requests: everything runs 100% locally.
• No sensitive permissions (no tabs, webNavigation or scripting).
• No third-party libraries — plain JavaScript.
• Open source and auditable: github.com/jjgouveia/pip-video-player
```

## Aba "Privacy practices" (respostas exatas)

**Single purpose:**
```
Allow the user to watch any video in Picture-in-Picture mode with a single click, including on sites that block the feature.
```

**Justificativa das host permissions (`<all_urls>`):**
```
The extension declares a content script on <all_urls> solely to locate <video> elements on any page the user chooses to watch, draw a small floating button over them, and honor the user's request to use Picture-in-Picture. To make PiP available on sites that block it, the extension neutralizes the disablePictureInPicture attribute on the video element. Page content is never read, stored or transmitted. No user data leaves the browser.
```

**Justificativa da permissão `storage`:**
```
Used only to store two local preferences (floating button on/off, force mode on/off) in chrome.storage.local. No personal data, browsing data or video data is stored.
```

**Você usa código remoto?** → Não.

**A extensão coleta dados do usuário?** → Não (marcar "None" em todas as categorias; certificar que não vende/compartilha dados).

**Privacy policy URL:**
```
https://github.com/jjgouveia/pip-video-player/blob/main/PRIVACY.md
```

**Conteúdo adulto:** Não
**Visibilidade:** Público · Todas as regiões · Grátis

## Assets

| Item | Requisito | Arquivo |
| --- | --- | --- |
| Ícone da loja | 128×128 | `icons/icon128.png` |
| Screenshot 1 | 1280×800 | `store/assets/screenshot-1280x800.png` |
| Screenshot 2 | 1280×800 | `store/assets/screenshot2-1280x800.png` |
| Promo tile | 440×280 | `store/assets/promo-440x280.png` |

Screenshots capturados da extensão real rodando (Chrome for Testing 156 headless): botão flutuante sobre um player que tenta bloquear o PiP e popup real aberto via `chrome.action.openPopup()`. Vídeo de teste: `flower.mp4` (CC0, MDN).

## Checklist de envio

1. Criar conta em https://chrome.google.com/webstore/devconsole (taxa única US$ 5; verificação por cartão).
2. "New item" → upload de `dist/pip-button-1.1.0.zip`.
3. Preencher ficha (textos acima), assets e a aba Privacy practices.
4. Declaração DSA (EU): se não for atividade comercial, marcar **non-trader**.
5. Submit for review. Prazo típico: 1–3 dias úteis (pode variar).
6. Após aprovação, o link público fica disponível no dashboard.
