/**
 * PiP Button — service worker.
 *
 * O clique na toolbar e o atalho Alt+P não têm acesso ao DOM, então
 * conversam com o content script:
 *   1. pergunta ao frame principal (scope "top");
 *   2. se não houver vídeo lá, repassa para os iframes (scope "sub");
 *   3. um "ping" de confirmação evita mostrar aviso em falso.
 */

const PENDING_CONFIRMATIONS = new Set();

function flashBadge(tabId, text) {
  chrome.action.setBadgeBackgroundColor({ tabId, color: "#b45309" }, () => {
    chrome.action.setBadgeText({ tabId, text }, () => {
      setTimeout(() => chrome.action.setBadgeText({ tabId, text: "" }, () => {}), 1500);
    });
  });
}

async function togglePip(tab) {
  if (!tab || typeof tab.id !== "number") return;

  let topReply = null;
  try {
    topReply = await chrome.tabs.sendMessage(
      tab.id,
      { type: "pip-toggle", scope: "top" },
      { frameId: 0 }
    );
  } catch {
    // Sem content script (chrome://, Web Store, PDF viewer, etc.)
    flashBadge(tab.id, "×");
    return;
  }

  if (topReply && topReply.found) return;

  // Nenhum vídeo no frame principal: tenta os iframes.
  PENDING_CONFIRMATIONS.add(tab.id);
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "pip-toggle", scope: "sub" });
  } catch {
    // Nenhum frame respondeu; o timeout abaixo decide o aviso.
  }

  setTimeout(() => {
    if (PENDING_CONFIRMATIONS.delete(tab.id)) flashBadge(tab.id, "?");
  }, 500);
}

chrome.action.onClicked.addListener(togglePip);

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "toggle-pip") togglePip(tab);
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (
    message?.type === "pip-activated" &&
    typeof sender.tab?.id === "number"
  ) {
    PENDING_CONFIRMATIONS.delete(sender.tab.id);
  }
});
