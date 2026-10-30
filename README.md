# PiP Button

Extensão de Chrome (Manifest V3) com uma única responsabilidade: **ativar o modo Picture-in-Picture em qualquer player de vídeo** — botão flutuante, popup, ícone na toolbar e atalho `Alt+P`.

Funciona também nos players que tentam bloquear o recurso: **Netflix, Disney+, Prime Video, Max, Globoplay**, YouTube, Vimeo, Twitch e qualquer elemento `<video>` — inclusive dentro de iframes e de shadow DOM fechado.

**Download:** [release mais recente](https://github.com/jjgouveia/pip-video-player/releases/latest) · **Código:** [github.com/jjgouveia/pip-video-player](https://github.com/jjgouveia/pip-video-player)

## Privacidade e transparência

**Grátis, sem analytics, sem rastreamento e sem dependências.** A extensão não coleta, não transmite e não armazena dados pessoais — tudo roda 100% local.

| Item | Situação |
| --- | --- |
| Analytics / telemetria / pixels | ❌ nenhum |
| Rastreamento de navegação ou de vídeos | ❌ nenhum |
| Requisições de rede da extensão | ❌ nenhuma (não há `fetch`/`XMLHttpRequest` no código) |
| Dependências / bibliotecas de terceiros | ❌ nenhuma — JavaScript puro, sem npm, sem build |
| Código remoto | ❌ nenhum |
| Permissões sensíveis (`tabs`, `webNavigation`, `scripting`) | ❌ nenhuma |
| Armazenamento | apenas 2 preferências locais (`chrome.storage.local`) — nunca saem do navegador |
| Custo | ✅ grátis, sem versão paga ou "pro" |

Dá para auditar em minutos: `manifest.json`, `background.js`, `content.js`, `inject.js` e `popup.js`, sem `import`, sem pacotes e sem chamadas externas.

## O que ela faz

- **Botão flutuante**: ao passar o mouse sobre qualquer vídeo elegível, aparece um botão no canto do player. Clique → entra no PiP; clique de novo → sai.
- **Popup** (ícone da toolbar): mostra o status do vídeo da aba, botão de ativar/sair e as configurações.
- **`Alt+P`**: alterna o PiP na aba atual (trocável em `chrome://extensions/shortcuts`).
- **Força em players que bloqueiam**: neutraliza o atributo `disablePictureInPicture` desde o `document_start` — usado por Netflix, Disney+ e outros para esconder o recurso. O site não consegue reativar o bloqueio, mesmo tentando de novo a cada segundo.
- **Shadow DOM fechado**: intercepta `attachShadow` antes dos scripts do player, então encontra o `<video>` mesmo quando o player o esconde num shadow root fechado.
- **Iframes**: roda em todos os frames; a toolbar pergunta primeiro ao frame principal e depois aos iframes.
- **Isolamento visual**: o botão vive num shadow root fechado — o CSS do site não o afeta e ele não vaza estilo.

### O que ela NÃO faz

- Não contorna DRM (Widevine). Não precisa: o Chrome permite PiP de vídeo protegido; o bloqueio da Netflix/Disney+ é o atributo HTML, que a extensão neutraliza.
- Não funciona em players que renderizam em `<canvas>` (sem elemento `<video>`).
- Não roda em páginas internas do Chrome (`chrome://...`) nem na Web Store.

## Suporte a players

| Player | Suporte |
| --- | --- |
| Netflix | ✅ (remove/neutraliza o bloqueio da Netflix) |
| Disney+ | ✅ (idem) |
| Prime Video, Max, Globoplay | ✅ |
| YouTube | ✅ (inclui o atributo `disablePictureInPicture` do miniplayer) |
| Vimeo, Twitch, sites de notícia, blogs | ✅ |
| Vídeos em iframe | ✅ |
| Players com shadow DOM fechado | ✅ |
| Conteúdo DRM | ✅ PiP nativo do Chrome (sem quebrar proteção) |

## Como instalar (modo desenvolvedor)

1. Abra `chrome://extensions`.
2. Ative o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** e selecione a pasta `pip-video-player`.
4. Fixe o ícone na toolbar (opcional).

Requer Chrome 111+ (parâmetro `world: "MAIN"` em content scripts).

## Como usar

| Ação | Resultado |
| --- | --- |
| Passar o mouse sobre o vídeo e clicar no botão | Entra/sai do PiP |
| Clicar no ícone da extensão | Popup: status, ativar/sair e configurações |
| `Alt+P` | Mesmo efeito, sem abrir o popup |

Se nenhum vídeo for encontrado, o ícone exibe um selo `?` por 1,5 s. Em páginas internas (`chrome://`, Web Store), exibe `×`.

### Configurações (popup)

- **Botão flutuante sobre os vídeos** — liga/desliga o overlay.
- **Forçar em players que bloqueiam** — liga/desliga a neutralização do `disablePictureInPicture`. Alterações valem a partir do próximo carregamento da página.

## Como funciona (resumo técnico)

- `inject.js` roda em **MAIN world** no `document_start` (antes dos scripts do site): captura todo shadow root via patch de `attachShadow`, neutraliza `disablePictureInPicture` (getter/setter + `setAttribute`/`toggleAttribute`) e mantém um registro de vídeos com atualização por `MutationObserver` + varredura periódica.
- `content.js` (mundo isolado) faz a ponte: lê as preferências, responde à toolbar/atalho/popup e avisa o service worker — a comunicação com a página é por `CustomEvent`.
- `background.js` recebe `Alt+P`, pergunta ao frame principal (`scope: "top"`); se não houver vídeo lá, repassa aos iframes (`scope: "sub"`). Um "ping" de confirmação evita aviso falso.
- `popup.js` consulta o status via content script, alterna o PiP e grava as duas preferências.

## Limitações

- **DRM**: o PiP continua sendo o nativo do Chrome; a extensão não descriptografa nem contorna proteção.
- **`Permissions-Policy`** de iframes: se o site embutido proibir `picture-in-picture`, a chamada de dentro do iframe falha (o botão flutuante no vídeo do iframe ainda aparece quando o iframe permite).
- Players em `<canvas>` (sem `<video>`) não são suportados.
- Páginas `chrome://...` não permitem content scripts.
- Para sites `file://`, ative **Permitir acesso a URLs de arquivo** nos detalhes da extensão.

## Testes automatizados

Validado com Chrome for Testing 156 (headless) carregando a extensão de verdade:

| Cenário | Resultado |
| --- | --- |
| Vídeo simples | ✅ PiP ativado pelo botão flutuante |
| Vídeo com `disablePictureInPicture` re-sendo setado a cada 300 ms | ✅ atributo neutralizado, PiP ativado |
| Vídeo em shadow DOM fechado | ✅ descoberto e PiP ativado |

O script de teste fica fora do pacote (ambiente local).

## Estrutura

```
pip-video-player/
├── manifest.json     # MV3, sem permissões sensíveis
├── inject.js         # MAIN world: shadow roots, bloqueio, botão, toggle
├── content.js        # ponte isolada (settings, mensagens, ping)
├── background.js     # atalho + relay top→iframes
├── popup.html/css/js # status + configurações
├── icons/            # ícones da extensão
├── store/            # material de submissão da Chrome Web Store
└── PRIVACY.md        # política de privacidade
```

## Checklist de teste manual

- [ ] YouTube: hover no player → botão aparece → clique → PiP abre.
- [ ] Netflix: vídeo → botão aparece → PiP abre (bloqueio neutralizado).
- [ ] Disney+: idem.
- [ ] Prime Video / Max / Globoplay: idem.
- [ ] Iframe (embed do YouTube em um blog): popup/toolbar → PiP abre dentro do iframe.
- [ ] Vídeo com controles sobrepostos → botão aparece mesmo assim.
- [ ] Popup: status "Vídeo detectado", botão ativa/sai, toggles persistem.
- [ ] `Alt+P` em aba com vídeo → alterna. Sem vídeo → selo `?`.
