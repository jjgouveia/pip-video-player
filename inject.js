/**
 * PiP Button — MAIN world (document_start, todos os frames).
 *
 * Roda no contexto da página, antes dos scripts do player, para:
 *   1. capturar shadow roots (inclusive fechados) via patch de attachShadow;
 *   2. neutralizar o atributo disablePictureInPicture (Netflix, Disney+ etc.);
 *   3. descobrir vídeos, desenhar o botão flutuante e alternar o PiP;
 *   4. conversar com o content script isolado por CustomEvents.
 */
(() => {
  "use strict";

  if (window.__pipButtonMain) return;
  window.__pipButtonMain = true;

  const IS_TOP = window.top === window;
  const MIN_WIDTH = 160;
  const MIN_HEIGHT = 120;
  const BTN_SIZE = 36;
  const BTN_MARGIN = 10;
  const ATTR = "disablepictureinpicture";

  const PIP_SUPPORTED =
    "pictureInPictureEnabled" in document &&
    document.pictureInPictureEnabled &&
    "requestPictureInPicture" in HTMLVideoElement.prototype;

  if (!PIP_SUPPORTED) return;

  let settings = { floatButton: true, forceBlockers: true };

  /* ------------------------------------------------------------------ */
  /* 1. Shadow roots — inclusive fechados                                */
  /* ------------------------------------------------------------------ */

  const knownRoots = [];
  const originalAttachShadow = Element.prototype.attachShadow;

  Element.prototype.attachShadow = function attachShadow(init) {
    const root = originalAttachShadow.call(this, init);
    try {
      knownRoots.push(new WeakRef(root));
      if (knownRoots.length > 600) knownRoots.splice(0, knownRoots.length - 600);
    } catch {
      knownRoots.push(root);
    }
    return root;
  };

  function liveRoots() {
    const out = [];
    for (const entry of knownRoots) {
      const root =
        typeof WeakRef !== "undefined" && entry instanceof WeakRef
          ? entry.deref()
          : entry;
      if (root) out.push(root);
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* 2. Neutralizar disablePictureInPicture                              */
  /* ------------------------------------------------------------------ */

  const originalDescriptor = Object.getOwnPropertyDescriptor(
    HTMLVideoElement.prototype,
    "disablePictureInPicture"
  );
  const originalSetAttribute = Element.prototype.setAttribute;
  const originalToggleAttribute = Element.prototype.toggleAttribute;

  const isBlockedAttribute = (name) => String(name).toLowerCase() === ATTR;

  function enableBlockers() {
    try {
      Object.defineProperty(HTMLVideoElement.prototype, "disablePictureInPicture", {
        configurable: true,
        enumerable: true,
        get() {
          return false;
        },
        set() {},
      });
    } catch {
      /* mantém o comportamento nativo se não for possível */
    }
    Element.prototype.setAttribute = function setAttribute(name, value) {
      if (isBlockedAttribute(name) && this instanceof HTMLVideoElement) return;
      return originalSetAttribute.call(this, name, value);
    };
    Element.prototype.toggleAttribute = function toggleAttribute(name, force) {
      if (isBlockedAttribute(name) && this instanceof HTMLVideoElement) return false;
      return originalToggleAttribute.call(this, name, force);
    };
  }

  function disableBlockers() {
    try {
      if (originalDescriptor) {
        Object.defineProperty(
          HTMLVideoElement.prototype,
          "disablePictureInPicture",
          originalDescriptor
        );
      }
    } catch {
      /* noop */
    }
    Element.prototype.setAttribute = originalSetAttribute;
    Element.prototype.toggleAttribute = originalToggleAttribute;
  }

  enableBlockers();

  /* ------------------------------------------------------------------ */
  /* 3. Registro de vídeos                                               */
  /* ------------------------------------------------------------------ */

  let videoCache = [];

  function stripBlock(video) {
    if (!settings.forceBlockers) return;
    if (video.hasAttribute(ATTR)) video.removeAttribute(ATTR);
  }

  function collectInto(root, out) {
    try {
      for (const video of root.querySelectorAll("video")) {
        out.add(video);
        stripBlock(video);
      }
      for (const element of root.querySelectorAll("*")) {
        if (element.shadowRoot) collectInto(element.shadowRoot, out);
      }
    } catch {
      /* root morto ou inacessível */
    }
  }

  function refreshVideoCache() {
    const out = new Set();
    collectInto(document, out);
    for (const root of liveRoots()) collectInto(root, out);
    videoCache = [...out];
  }

  function isEligible(video) {
    if (!(video instanceof HTMLVideoElement)) return false;
    if (!video.isConnected) return false;
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
  function scheduleRefresh() {
    if (cacheTimer) return;
    cacheTimer = setTimeout(() => {
      cacheTimer = 0;
      refreshVideoCache();
    }, 300);
  }

  function startObservers() {
    refreshVideoCache();
    setInterval(refreshVideoCache, 1500);
    try {
      new MutationObserver(scheduleRefresh).observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    } catch {
      /* documentElement ainda ausente */
    }
  }

  if (document.documentElement) {
    startObservers();
  } else {
    document.addEventListener("DOMContentLoaded", startObservers, { once: true });
  }

  /* ------------------------------------------------------------------ */
  /* 4. Toggle de PiP                                                    */
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
      stripBlock(video);
      await video.requestPictureInPicture();
      return true;
    } catch (error) {
      console.debug(
        "[PiP Button] não foi possível alternar o PiP:",
        error?.message ?? error
      );
      return false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* 5. Botão flutuante (shadow DOM fechado)                             */
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
    button:hover { background: rgba(30, 36, 50, 0.85); }
    button.is-active {
      color: #7cb7ff;
      border-color: rgba(124, 183, 255, 0.8);
    }
    button:active { transform: scale(0.92); }
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
    if (!settings.floatButton) return;
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
      if (event.target === host) return;
      if (!settings.floatButton) return;

      const video = videoAtPoint(event.clientX, event.clientY);
      if (video) {
        clearTimeout(hideTimer);
        hoveredVideo = video;
        showButton(video);
      } else if (hoveredVideo) {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(hideButton, 150);
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
  /* 6. Ponte com o content script isolado                               */
  /* ------------------------------------------------------------------ */

  function emit(type, detail) {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  }

  window.addEventListener("pipbtn:toggle", (event) => {
    const { scope = "top", requestId = "" } = event.detail || {};
    const belongsHere = scope === "sub" ? !IS_TOP : IS_TOP;
    if (!belongsHere) return;

    const active = document.pictureInPictureElement;
    const video = active instanceof HTMLVideoElement ? active : findBestVideo();

    emit("pipbtn:result", { requestId, found: Boolean(video), activated: false });
    if (!video) return;

    togglePip(video).then((ok) => {
      if (ok) emit("pipbtn:activated", { requestId });
    });
  });

  window.addEventListener("pipbtn:status", (event) => {
    const { requestId = "" } = event.detail || {};
    const active = document.pictureInPictureElement;
    const video = active instanceof HTMLVideoElement ? active : findBestVideo();
    emit("pipbtn:status-result", {
      requestId,
      found: Boolean(video),
      active: Boolean(active),
    });
  });

  window.addEventListener("pipbtn:settings", (event) => {
    const next = event.detail || {};
    const wasForce = settings.forceBlockers;
    settings = { ...settings, ...next };

    if (settings.forceBlockers && !wasForce) enableBlockers();
    if (!settings.forceBlockers && wasForce) disableBlockers();

    if (!settings.floatButton) hideButton();
  });
})();
