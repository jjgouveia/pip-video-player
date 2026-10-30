# PiP Button

Extensão de Chrome (Manifest V3) com uma única responsabilidade: **ativar o modo Picture-in-Picture em qualquer player de vídeo** — com botão flutuante sobre o vídeo, ícone na toolbar e atalho de teclado.

## O que ela faz

- **Botão flutuante**: ao passar o mouse sobre qualquer `<video>` elegível, aparece um botão no canto do player. Clique → entra no PiP; clique de novo → sai.
- **Toolbar do Chrome**: clique no ícone da extensão em qualquer aba. Se não houver vídeo no frame principal, ela procura nos iframes.
- **Alt+P**: alterna o PiP na aba atual (pode ser trocado em `chrome://extensions/shortcuts`).
- **Força o PiP**: remove o atributo `disablePictureInPicture` que alguns players usam para bloquear o recurso.
- **Shadow DOM**: o botão vive num shadow root fechado — o CSS do site não o afeta e ele não vaza estilo.
- **Detecção robusta**: vídeos dentro de shadow DOM de web components também são encontrados.

## Como instalar (modo desenvolvedor)

1. Abra `chrome://extensions`.
2. Ative o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** e selecione a pasta `pip-video-player`.
4. Fixe o ícone na toolbar (opcional).

## Como usar

| Ação | Resultado |
| --- | --- |
| Passar o mouse sobre o vídeo e clicar no botão | Entra/sai do PiP |
| Clicar no ícone da extensão | PiP no vídeo principal da aba |
| `Alt+P` | Mesmo efeito do ícone |

Se nenhum vídeo for encontrado, o ícone exibe um selo `?` por 1,5 s. Em páginas internas (`chrome://`, Web Store), exibe `×`.

## Como funciona (resumo técnico)

- `content.js` roda em todos os frames (`all_frames: true`), coleta vídeos (inclusive em shadow DOM) e faz hit-test geométrico do cursor — por isso funciona mesmo quando controles ficam sobrepostos ao player.
- Ao clicar, chama `video.requestPictureInPicture()` / `document.exitPictureInPicture()` direto na API nativa.
- `background.js` recebe o clique da toolbar/atalho, pergunta ao frame principal (`scope: "top"`). Se não houver vídeo lá, repassa aos iframes (`scope: "sub"`); um "ping" de confirmação evita aviso falso.
- **Zero permissões sensíveis**: sem `tabs`, sem `webNavigation`, sem coleta de dados. Content script declarativo em `<all_urls>`.

## Limitações

- **DRM/Widevine**: alguns players com conteúdo protegido recusam `requestPictureInPicture` (limitação do navegador, não da extensão).
- **Iframes com `Permissions-Policy`**: se o site embutido não permitir `picture-in-picture`, a chamada vinda de dentro do iframe falha. O botão flutuante sobre o vídeo do iframe continua funcionando quando o iframe permite.
- **Shadow DOM fechado** de alguns players não é acessível.
- Páginas internas do Chrome (`chrome://...`) não permitem content scripts.
- Para sites `file://`, ative **Permitir acesso a URLs de arquivo** nos detalhes da extensão.

## Customização

Constantes no topo de `content.js`:

```js
const MIN_WIDTH = 160;   // tamanho mínimo de vídeo (evita lixo decorativo)
const MIN_HEIGHT = 120;
const BTN_SIZE = 36;     // tamanho do botão flutuante
const BTN_MARGIN = 10;   // distância das bordas
```

Atalho: `chrome://extensions/shortcuts`. Ícones: substitua `icons/icon{16,32,48,128}.png`.

## Estrutura

```
pip-video-player/
├── manifest.json     # MV3, zero permissões
├── background.js     # toolbar + atalho + relay top→subframes
├── content.js        # botão flutuante + toggle de PiP
└── icons/            # ícones da extensão
```

## Checklist de teste

- [ ] YouTube: hover no player → botão aparece → clique → PiP abre (YouTube bloqueia via atributo e a extensão força).
- [ ] Página com iframe (ex.: embed do YouTube em um blog): clique no ícone da toolbar → PiP abre dentro do iframe.
- [ ] Vídeo com controles sobrepostos → botão aparece mesmo assim.
- [ ] `Alt+P` em aba com vídeo → alterna.
- [ ] `Alt+P` em aba sem vídeo → selo `?` no ícone.
