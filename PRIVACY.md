# Política de privacidade — PiP Button

**Última atualização:** 30 de outubro de 2026

O PiP Button **não coleta, não transmite e não armazena dados pessoais nem de navegação**.

## O que a extensão faz

A extensão localiza elementos `<video>` na página para exibir um botão flutuante que ativa o modo Picture-in-Picture. O acesso ao DOM serve exclusivamente para:

1. encontrar os vídeos elegíveis na página (inclusive em shadow DOM e iframes);
2. desenhar o botão sobre o vídeo;
3. remover o atributo `disablePictureInPicture` quando o usuário pede para forçar o PiP em players que o bloqueiam;
4. chamar a API nativa do navegador (`requestPictureInPicture` / `exitPictureInPicture`).

Nenhum conteúdo de página, URL, histórico ou dado do usuário é lido com finalidade de coleta, copiado ou enviado.

## Preferências locais

A extensão guarda **apenas duas preferências** em `chrome.storage.local`: se o botão flutuante está ligado e se o modo "forçar em players que bloqueiam" está ativo. Essas preferências nunca saem do navegador e não identificam o usuário.

## O que a extensão NÃO faz

- ❌ Sem analytics, telemetria, pixels ou eventos de uso
- ❌ Sem rastreamento de navegação
- ❌ Sem requisições de rede externas (não há `fetch` / `XMLHttpRequest` no código)
- ❌ Sem dependências ou bibliotecas de terceiros
- ❌ Sem código remoto
- ❌ Sem cookies ou `localStorage`
- ❌ Sem permissões sensíveis (`tabs`, `webNavigation`, `scripting` etc.)
- ❌ Sem contorno de DRM: o PiP continua sendo o nativo do navegador

## Dados de terceiros

A extensão não vende, não compartilha e não transfere dados a terceiros — simplesmente porque nenhum dado é coletado.

## Alterações nesta política

Mudanças nesta política serão publicadas neste arquivo, com atualização da data acima.

## Contato

Dúvidas ou solicitações: abra uma issue em
https://github.com/jjgouveia/pip-video-player/issues
