/**
 * PiP Button — content script.
 *
 * Responsabilidades:
 *   1. Mostrar um botão flutuante quando o cursor passa sobre um vídeo.
 *   2. Alternar o Picture-in-Picture ao clicar no botão.
 *   3. Executar o mesmo toggle quando a toolbar ou o Alt+P pedirem.
 *
 * Roda em todos os frames para cobrir players dentro de iframes.
 */
(() => {
  "use strict";

  if (window.__pipButtonInjected) return;
  window.__pipButtonInjected = true;

  const IS_TOP_FRAME = window.top === window;
  const MIN_WIDTH = 160; // ignora vídeos decorativos minúsculos
  const MIN_HEIGHT = 120;
  const BTN_SIZE = 36;
  const BTN_MARGIN = 10;

  const PIP_SUPPORTED =
    "pictureInPictureEnabled" in document &&
    document.pictureInPictureEnabled &&
    "requestPictureInPicture" in HTMLVideoElement.prototype;

  if (!PIP_SUPPORTED) return;

  /* ------------------------------------------------------------------ */
  /* Descoberta de vídeos (inclui shadow DOM)                            */
  /* ------------------------------------------------------------------ */

  let videoCache = [];

  function* collectVideos(root) {
    for (const video of root.querySelectorAll("video")) yield video;
    for (const element of root.querySelectorAll("*")) {
      if (element.shadowRoot) yield* collectVideos(element.shadowRoot);
    }
  }

  function refreshVideoCache() {
    videoCache = [...collectVideos(document)];
  }

  function isEligible(video) {
    if (!(video instanceof HTMLVideoElement)) return false;
    const rect = video.getBoundingClientRect();
    if (rect.width < MIN_WIDTH || rect.height < MIN_HEIGHT) return false;
    const style = getComputedStyle(video);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (Number.parseFloat(style.opacity || "1") === 0) return false;
    return true;
  }

  function isPlaying(video) {
    return !video.paused && !video.ended && video.readyState >= 3;
  }

  function score(video) {
    const rect = video.getBoundingClientRect();
    const area = rect.width * rect.height;
    return isPlaying(video) ? area * 1.5 : area;
  }

  function findBestVideo() {
    let best = null;
    let bestScore = -1;
    for (const video of videoCache) {
      if (!isEligible(video)) continue;
      const s = score(video);
      if (s > bestScore) {
        best = video;
        bestScore = s;
      }
    }
    return best;
  }

  // Hit-test geométrico: funciona mesmo com controles sobrepostos ao vídeo.
  function videoAtPoint(x, y) {
    let best = null;
    let bestScore = -1;
    for (const video of videoCache) {
      if (!isEligible(video)) continue;
      const rect = video.getBoundingClientRect();
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        continue;
      }
      const s = score(video);
      if (s > bestScore) {
        best = video;
        bestScore = s;
      }
    }
    return best;
  }

  let cacheTimer = 0;
  function scheduleCacheRefresh() {
    if (cacheTimer) return;
    cacheTimer = setTimeout(() => {
      cacheTimer = 0;
      refreshVideoCache();
    }, 400);
  }

  new MutationObserver(scheduleCacheRefresh).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  setInterval(refreshVideoCache, 2000);
  refreshVideoCache();

  /* ------------------------------------------------------------------ */
  /* Toggle de PiP                                                       */
  /* ------------------------------------------------------------------ */

  async function togglePip(video) {
    try {
      const active = document.pictureInPictureElement;
      if (active === video) {
        await document.exitPictureInPicture();
        return true;
      }
      if (active instanceof HTMLVideoElement) {
        await document.exitPictureInPicture();
      }
      // Alguns players se desativam via atributo; forçamos a entrada.
      video.removeAttribute("disablepictureinpicture");
      video.disablePictureInPicture = false;
      await video.requestPictureInPicture();
      return true;
    } catch (error) {
      console.warn(
        "[PiP Button] Não foi possível alternar o Picture-in-Picture:",
        error?.message ?? error
      );
      return false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Botão flutuante (shadow DOM)                                        */
  /* ------------------------------------------------------------------ */

  let hoveredVideo = null;
  let hideTimer = 0;

  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = `
    button {
      position: absolute;
      width: ${BTN_SIZE}px;
      height: ${BTN_SIZE}px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 10px;
      background: rgba(15, 18, 25, 0.72);
      color: #fff;
      cursor: pointer;
      opacity: 0;
      visibility: hidden;
      transform: scale(0.9);
      transition: opacity 0.12s ease, transform 0.12s ease;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
      outline: none;
      pointer-events: auto;
    }
    button.is-visible {
      opacity: 1;
      visibility: visible;
      transform: none;
    }
    button:hover {
      background: rgba(30, 36, 50, 0.85);
    }
    button.is-active {
      color: #7cb7ff;
      border-color: rgba(124, 183, 255, 0.8);
    }
    button:active {
      transform: scale(0.92);
    }
  `;

  const button = document.createElement("button");
  button.type = "button";
  button.innerHTML =
    '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' +
    '<rect x="3" y="4.75" width="18" height="14.5" rx="2.75" fill="none" stroke="currentColor" stroke-width="2"></rect>' +
    '<rect x="12.5" y="11.25" width="7.25" height="5.25" rx="1.25" fill="currentColor"></rect>' +
    "</svg>";

  shadow.append(style, button);

  function showButton(video) {
    if (document.fullscreenElement) {
      hideButton();
      return;
    }
    const rect = video.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      hideButton();
      return;
    }

    const left = Math.max(
      BTN_MARGIN,
      Math.min(
        window.innerWidth - BTN_SIZE - BTN_MARGIN,
        rect.right - BTN_SIZE - BTN_MARGIN
      )
    );
    const top = Math.max(
      BTN_MARGIN,
      Math.min(
        window.innerHeight - BTN_SIZE - BTN_MARGIN,
        rect.top + BTN_MARGIN
      )
    );
    button.style.left = `${left}px`;
    button.style.top = `${top}px`;

    const active = document.pictureInPictureElement === video;
    button.classList.toggle("is-active", active);
    button.title = active
      ? "Sair do Picture-in-Picture (Alt+P)"
      : "Abrir Picture-in-Picture (Alt+P)";
    button.setAttribute("aria-label", button.title);

    button.classList.add("is-visible");
  }

  function hideButton() {
    hoveredVideo = null;
    button.classList.remove("is-visible");
  }

  document.addEventListener(
    "mousemove",
    (event) => {
      if (event.target === host) return; // cursor sobre o próprio botão

      const video = videoAtPoint(event.clientX, event.clientY);
      if (video) {
        clearTimeout(hideTimer);
        hoveredVideo = video;
        showButton(video);
      } else if (hoveredVideo) {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(hideButton, 150); // tolerância contra flicker
      }
    },
    true
  );

  const refreshPosition = () => {
    if (!hoveredVideo) return;
    if (isEligible(hoveredVideo)) {
      if (button.classList.contains("is-visible")) showButton(hoveredVideo);
    } else {
      hideButton();
    }
  };

  window.addEventListener("scroll", refreshPosition, {
    capture: true,
    passive: true,
  });
  window.addEventListener("resize", refreshPosition);
  setInterval(refreshPosition, 400);
  document.addEventListener("fullscreenchange", hideButton);
  document.documentElement.addEventListener("mouseleave", hideButton);

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const video = hoveredVideo || findBestVideo();
    if (!video) return;
    hoveredVideo = video;
    togglePip(video).then(() => showButton(video));
  });

  document.addEventListener("enterpictureinpicture", (event) => {
    if (event.target === hoveredVideo) showButton(hoveredVideo);
  });

  document.addEventListener("leavepictureinpicture", () => {
    if (hoveredVideo) showButton(hoveredVideo);
  });

  /* ------------------------------------------------------------------ */
  /* Mensagens da toolbar / atalho                                       */
  /* ------------------------------------------------------------------ */

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "pip-toggle") return;

    // scope "top" → só o frame principal; scope "sub" → só os iframes.
    const belongsHere =
      message.scope === "sub" ? !IS_TOP_FRAME : IS_TOP_FRAME;
    if (!belongsHere) return;

    const active = document.pictureInPictureElement;
    const video = active instanceof HTMLVideoElement ? active : findBestVideo();

    if (message.scope === "top") sendResponse({ found: Boolean(video) });

    if (video) {
      togglePip(video).then((ok) => {
        if (ok) {
          chrome.runtime
            .sendMessage({ type: "pip-activated" })
            .catch?.(() => {});
        }
      });
    }
  });
})();
