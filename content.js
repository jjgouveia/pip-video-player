/**
 * PiP Button — content script (ISOLATED world).
 *
 * Ponte entre a extensão e o inject.js (MAIN world):
 *   - lê as preferências e repassa para a página;
 *   - responde aos comandos da toolbar/atalho e do popup;
 *   - avisa o service worker quando um PiP é ativado.
 */
(() => {
  "use strict";

  if (window.__pipButtonContent) return;
  window.__pipButtonContent = true;

  const DEFAULT_SETTINGS = { floatButton: true, forceBlockers: true };
  const TIMEOUT_MS = 1500;

  const pending = new Map();

  function ask(eventName, detail = {}) {
    return new Promise((resolve) => {
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const timer = setTimeout(() => {
        pending.delete(requestId);
        resolve(null);
      }, TIMEOUT_MS);
      pending.set(requestId, { resolve, timer });
      window.dispatchEvent(
        new CustomEvent(eventName, { detail: { ...detail, requestId } })
      );
    });
  }

  function settle(event) {
    const { requestId, ...rest } = event.detail || {};
    const entry = pending.get(requestId);
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.delete(requestId);
    entry.resolve(rest);
  }

  window.addEventListener("pipbtn:result", settle);
  window.addEventListener("pipbtn:status-result", settle);

  window.addEventListener("pipbtn:activated", () => {
    chrome.runtime.sendMessage({ type: "pip-activated" }).catch?.(() => {});
  });

  /* ---------------------------- preferências ---------------------------- */

  function pushSettings(settings) {
    window.dispatchEvent(
      new CustomEvent("pipbtn:settings", {
        detail: {
          floatButton: settings.floatButton !== false,
          forceBlockers: settings.forceBlockers !== false,
        },
      })
    );
  }

  chrome.storage.local
    .get(DEFAULT_SETTINGS)
    .then(pushSettings)
    .catch(() => pushSettings(DEFAULT_SETTINGS));

  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area !== "local") return;
    chrome.storage.local
      .get(DEFAULT_SETTINGS)
      .then(pushSettings)
      .catch(() => {});
  });

  /* ------------------------------ mensagens ----------------------------- */

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") return;

    if (message.type === "pip-toggle") {
      const scope = message.scope === "sub" ? "sub" : "top";
      const isTopFrame = window.top === window;
      if ((scope === "top") !== isTopFrame) return;

      ask("pipbtn:toggle", { scope }).then((reply) => {
        sendResponse({ found: Boolean(reply && reply.found) });
      });
      return true;
    }

    if (message.type === "pip-status") {
      // Só o frame principal responde ao popup; iframes são tentados na ação.
      if (window.top !== window) return;

      ask("pipbtn:status").then((reply) => {
        sendResponse(reply || { found: false, active: false });
      });
      return true;
    }
  });
})();
