/* popup.js — status do vídeo + configurações + ação principal */

const DEFAULTS = { floatButton: true, forceBlockers: true };

const dot = document.getElementById("dot");
const statusTitle = document.getElementById("status-title");
const statusDetail = document.getElementById("status-detail");
const actionBtn = document.getElementById("action");
const floatToggle = document.getElementById("float-toggle");
const forceToggle = document.getElementById("force-toggle");

let currentTab = null;
let status = { supported: false, found: false, active: false };

function render() {
  actionBtn.disabled = false;

  if (!status.supported) {
    dot.className = "dot dot-off";
    statusTitle.textContent = "Página não suportada";
    statusDetail.textContent = "Abra uma página com vídeo (http/https).";
    actionBtn.textContent = "Nenhum vídeo para ativar";
    actionBtn.disabled = true;
    return;
  }

  if (status.active) {
    dot.className = "dot dot-on";
    statusTitle.textContent = "PiP ativo";
    statusDetail.textContent = "O vídeo está na janela flutuante.";
    actionBtn.textContent = "Sair do Picture-in-Picture";
    return;
  }

  if (status.found) {
    dot.className = "dot dot-on";
    statusTitle.textContent = "Vídeo detectado";
    statusDetail.textContent = "Pronto para entrar em PiP.";
    actionBtn.textContent = "Ativar Picture-in-Picture";
    return;
  }

  dot.className = "dot dot-warn";
  statusTitle.textContent = "Nenhum vídeo na página";
  statusDetail.textContent = "Ao ativar, os iframes também são procurados.";
  actionBtn.textContent = "Procurar vídeo e ativar";
}

async function queryStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab || null;
  status = { supported: false, found: false, active: false };

  if (!currentTab || typeof currentTab.id !== "number") return;

  try {
    const reply = await chrome.tabs.sendMessage(
      currentTab.id,
      { type: "pip-status" },
      { frameId: 0 }
    );
    if (reply) {
      status = {
        supported: true,
        found: Boolean(reply.found),
        active: Boolean(reply.active),
      };
    }
  } catch {
    // content script ausente (extensão recém-instalada ou página restrita)
  }
}

async function init() {
  try {
    const settings = await chrome.storage.local.get(DEFAULTS);
    floatToggle.checked = settings.floatButton !== false;
    forceToggle.checked = settings.forceBlockers !== false;
  } catch {
    /* mantém padrões */
  }

  await queryStatus();
  render();
}

floatToggle.addEventListener("change", () => {
  chrome.storage.local.set({ floatButton: floatToggle.checked });
});

forceToggle.addEventListener("change", () => {
  chrome.storage.local.set({ forceBlockers: forceToggle.checked });
});

actionBtn.addEventListener("click", async () => {
  const tab = currentTab;
  if (!tab || typeof tab.id !== "number") return;

  actionBtn.disabled = true;

  let reply = null;
  try {
    reply = await chrome.tabs.sendMessage(
      tab.id,
      { type: "pip-toggle", scope: "top" },
      { frameId: 0 }
    );
  } catch {
    reply = null;
  }

  if (!reply || !reply.found) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "pip-toggle", scope: "sub" });
    } catch {
      /* nenhum iframe respondeu */
    }
  }

  setTimeout(async () => {
    await queryStatus();
    render();
  }, 450);
});

init();
