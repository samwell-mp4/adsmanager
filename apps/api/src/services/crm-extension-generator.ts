export interface CrmExtensionOptions {
  profileId?: number;
  profileUuid?: string;
  apiBaseUrl?: string;
}

// 16x16 / 48x48 icon PNG buffer (blue message badge)
const ICON_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA8SURBVDhPY/wPBAxUAIyMjP8hxBgYGECiGKSZkRhVjAwG0VcwCgYugF13Y2NjeLgxFgOQ5Ue3Gz4wMAAA81oP6X7uXkIAAAAASUVORK5CYII=';

export function generateCrmExtensionFiles(options: CrmExtensionOptions = {}): Record<string, string | Buffer> {
  const profileId = options.profileId || 1;
  const profileUuid = options.profileUuid || 'default';
  const apiBaseUrl = options.apiBaseUrl || '';

  const manifest = {
    manifest_version: 3,
    name: 'Ads Manager CRM Collector',
    version: '1.3.0',
    description: 'Sincronizador automático de mensagens do Facebook Marketplace e OLX para o Ads Manager CRM',
    permissions: [
      'tabs',
      'storage',
      'notifications',
      'alarms'
    ],
    host_permissions: [
      '*://*.facebook.com/*',
      '*://*.olx.com.br/*',
      '<all_urls>'
    ],
    icons: {
      '16': 'icon16.png',
      '48': 'icon48.png',
      '128': 'icon48.png'
    },
    action: {
      default_title: 'Ads Manager CRM Collector',
      default_popup: 'popup.html',
      default_icon: 'icon48.png'
    },
    content_scripts: [
      {
        matches: [
          '*://*.facebook.com/*',
          '*://*.olx.com.br/*'
        ],
        js: ['content.js'],
        run_at: 'document_idle',
        all_frames: false
      }
    ],
    background: {
      service_worker: 'background.js'
    }
  };

  const popupHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ads Manager CRM</title>
  <style>
    body {
      width: 320px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      margin: 0;
      padding: 16px;
      box-sizing: border-box;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 12px;
      border-bottom: 1px solid #1e293b;
      margin-bottom: 14px;
    }
    .icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    .title {
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }
    .subtitle {
      font-size: 11px;
      color: #94a3b8;
      margin: 0;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 6px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 12px;
      width: 100%;
      box-sizing: border-box;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #34d399;
      box-shadow: 0 0 6px #34d399;
    }
    .field {
      margin-bottom: 10px;
    }
    .label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: #cbd5e1;
      margin-bottom: 4px;
    }
    input {
      width: 100%;
      background: #020617;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 8px 10px;
      color: #f8fafc;
      font-size: 11px;
      box-sizing: border-box;
    }
    input:focus {
      outline: none;
      border-color: #3b82f6;
    }
    button {
      width: 100%;
      background: #2563eb;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 8px;
      transition: background 0.2s;
    }
    button:hover {
      background: #1d4ed8;
    }
    .footer {
      margin-top: 14px;
      font-size: 10px;
      color: #64748b;
      text-align: center;
    }
    .status-msg {
      font-size: 11px;
      margin-top: 8px;
      text-align: center;
      min-height: 16px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="icon">💬</div>
    <div>
      <h1 class="title">Ads Manager CRM</h1>
      <p class="subtitle">Agente Coletor de Mensagens</p>
    </div>
  </div>

  <div class="badge">
    <span class="badge-dot"></span>
    <span id="statusText">Monitorando Facebook & OLX</span>
  </div>

  <div class="field">
    <label class="label">URL da API / Servidor:</label>
    <input type="text" id="apiUrlInput" placeholder="http://meu-servidor:3001">
  </div>

  <div class="field">
    <label class="label">ID do Perfil de Navegador:</label>
    <input type="number" id="profileIdInput" value="${profileId}">
  </div>

  <button id="saveBtn">💾 Salvar Configurações</button>
  <button id="testBtn" style="background: #0284c7; margin-top: 6px;">🔌 Testar Conexão com Servidor</button>
  <button id="syncNowBtn" style="background: #334155; margin-top: 6px;">🔄 Forçar Varredura Agora</button>

  <div class="status-msg" id="msgArea"></div>

  <div class="footer">
    Ads Manager Multi-login Pro • v1.3.0
  </div>

  <script src="popup.js"></script>
</body>
</html>`;

  const popupJs = `
document.addEventListener('DOMContentLoaded', async () => {
  const apiUrlInput = document.getElementById('apiUrlInput');
  const profileIdInput = document.getElementById('profileIdInput');
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const syncNowBtn = document.getElementById('syncNowBtn');
  const msgArea = document.getElementById('msgArea');

  const defaultPublicUrl = 'https://adsmanager-adsmanagerapp.ahzgvk.easypanel.host';
  const configuredUrl = ${JSON.stringify(apiBaseUrl)} || defaultPublicUrl;

  chrome.storage.local.get(['apiUrl', 'profileId'], (res) => {
    let url = res.apiUrl || configuredUrl;
    // Auto-fix any internal 172.17.x or localhost URLs to public URL
    if (!url || url.includes('172.17.') || url.includes('172.18.') || url.includes('localhost')) {
      url = defaultPublicUrl;
      chrome.storage.local.set({ apiUrl: url });
    }
    apiUrlInput.value = url;
    profileIdInput.value = res.profileId || ${profileId};
  });

  saveBtn.addEventListener('click', () => {
    let apiUrl = apiUrlInput.value.trim().replace(/\\/+$/, '').replace(/\\/crm\\/?$/i, '').replace(/\\/api\\/?$/i, '');
    if (!apiUrl || apiUrl.includes('172.17.') || apiUrl.includes('172.18.') || apiUrl.includes('localhost')) {
      apiUrl = defaultPublicUrl;
      apiUrlInput.value = apiUrl;
    }
    const profileId = parseInt(profileIdInput.value, 10) || ${profileId};

    chrome.storage.local.set({ apiUrl, profileId }, () => {
      msgArea.style.color = '#34d399';
      msgArea.textContent = 'Configurações salvas com sucesso!';
      setTimeout(() => msgArea.textContent = '', 3000);
    });
  });

  testBtn.addEventListener('click', async () => {
    let apiUrl = apiUrlInput.value.trim().replace(/\\/+$/, '').replace(/\\/crm\\/?$/i, '').replace(/\\/api\\/?$/i, '') || defaultPublicUrl;
    msgArea.style.color = '#38bdf8';
    msgArea.textContent = 'Testando conexão com o servidor...';

    try {
      const res = await fetch(apiUrl + '/api/crm/outgoing?profile_id=' + (profileIdInput.value || 1));
      if (res.ok) {
        msgArea.style.color = '#34d399';
        msgArea.textContent = '✅ Conexão OK! Servidor respondendo.';
      } else {
        msgArea.style.color = '#f87171';
        msgArea.textContent = '❌ Servidor respondeu com erro ' + res.status;
      }
    } catch (err) {
      msgArea.style.color = '#f87171';
      msgArea.textContent = '❌ Erro de rede: ' + err.message;
    }
    setTimeout(() => msgArea.textContent = '', 4000);
  });

  syncNowBtn.addEventListener('click', () => {
    msgArea.style.color = '#38bdf8';
    msgArea.textContent = 'Disparando varredura no Facebook/OLX...';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TRIGGER_SCRAPE_NOW' }, (response) => {
          if (response && response.success) {
            msgArea.style.color = '#34d399';
            msgArea.textContent = 'Varredura realizada com sucesso!';
          } else {
            msgArea.style.color = '#f87171';
            msgArea.textContent = 'Abra uma aba do Facebook ou OLX.';
          }
          setTimeout(() => msgArea.textContent = '', 4000);
        });
      }
    });
  });
});
`;

  const backgroundJs = `
const defaultPublicUrl = 'https://adsmanager-adsmanagerapp.ahzgvk.easypanel.host';
let currentProfileId = ${profileId};
let currentProfileUuid = ${JSON.stringify(profileUuid)};
let currentApiUrl = (${JSON.stringify(apiBaseUrl)} || defaultPublicUrl).replace(/\\/crm\\/?$/i, '').replace(/\\/api\\/?$/i, '');

if (!currentApiUrl || currentApiUrl.includes('172.17.') || currentApiUrl.includes('172.18.') || currentApiUrl.includes('localhost')) {
  currentApiUrl = defaultPublicUrl;
}

chrome.storage.local.get(['apiUrl', 'profileId', 'profileUuid'], (res) => {
  let stored = (res.apiUrl || '').replace(/\\/crm\\/?$/i, '').replace(/\\/api\\/?$/i, '');
  if (stored && !stored.includes('172.17.') && !stored.includes('172.18.') && !stored.includes('localhost')) {
    currentApiUrl = stored;
  } else {
    currentApiUrl = defaultPublicUrl;
    chrome.storage.local.set({ apiUrl: defaultPublicUrl });
  }
  if (res.profileId) currentProfileId = res.profileId;
  if (res.profileUuid) currentProfileUuid = res.profileUuid;
});

console.log('[CRM Background] Service initialized. Profile #' + currentProfileId + ' Target: ' + currentApiUrl);

// Send HTTP requests with automatic fallback to public server URL
async function sendWithFallback(endpoint, options = {}) {
  const candidates = [
    currentApiUrl,
    defaultPublicUrl
  ].filter(u => u && !u.includes('172.17.') && !u.includes('172.18.') && !u.includes('localhost'));

  const uniqueCandidates = Array.from(new Set(candidates));
  let lastErr = null;

  for (const rawBase of uniqueCandidates) {
    try {
      const base = rawBase.replace(/\\/+$/, '').replace(/\\/crm\\/?$/i, '').replace(/\\/api\\/?$/i, '');
      const fullUrl = base + endpoint;
      const res = await fetch(fullUrl, options);
      if (res.ok) {
        if (currentApiUrl !== base) {
          currentApiUrl = base;
          chrome.storage.local.set({ apiUrl: base });
        }
        return await res.json();
      }
    } catch (e) {
      lastErr = e;
      console.warn('[CRM Background] Attempt failed for ' + rawBase + ':', e.message);
    }
  }

  throw lastErr || new Error('Todas as URLs de conexão falharam');
}

// Listen to scraped chat data from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'CRM_SYNC_DATA') {
    const payload = {
      profile_id: currentProfileId,
      profile_uuid: currentProfileUuid,
      platform: message.platform || 'facebook',
      conversations: message.conversations || []
    };

    console.log('[CRM Background] Dispatching ' + (payload.conversations ? payload.conversations.length : 0) + ' conversations to webhook...');

    sendWithFallback('/api/crm/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(data => {
      console.log('[CRM Background] Webhook sync SUCCESS:', data);
      sendResponse({ success: true, data });
    })
    .catch(err => {
      console.warn('[CRM Background] Webhook sync FAILED:', err.message);
      sendResponse({ success: false, error: err.message });
    });

    return true;
  }
});

// Poll outgoing replies queue from dashboard
async function pollOutgoingQueue() {
  try {
    const json = await sendWithFallback('/api/crm/outgoing?profile_id=' + currentProfileId);
    const pendingReplies = json ? (json.data || []) : [];

    if (pendingReplies.length > 0) {
      console.log('[CRM Background] ' + pendingReplies.length + ' replies pending dispatch.');

      chrome.tabs.query({ url: ["*://*.facebook.com/*", "*://*.olx.com.br/*"] }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        const targetTab = tabs[0];

        for (const reply of pendingReplies) {
          chrome.tabs.sendMessage(targetTab.id, {
            type: 'EXECUTE_SEND_REPLY',
            replyId: reply.id,
            externalId: reply.external_id,
            text: reply.message_text
          }, (response) => {
            if (response && response.success) {
              console.log('[CRM Background] Reply #' + reply.id + ' dispatched.');
              sendWithFallback('/api/crm/outgoing/' + reply.id + '/sent', { method: 'POST' }).catch(() => {});
            }
          });
        }
      });
    }
  } catch (err) {}
}

setInterval(pollOutgoingQueue, 4000);

try {
  chrome.alarms.create('crm_poll_alarm', { periodInMinutes: 0.1 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'crm_poll_alarm') {
      pollOutgoingQueue();
    }
  });
} catch (e) {}
`;

  const contentJs = `
console.log('[CRM Content] Ads Manager CRM Collector injected on: ' + location.href);

let isSyncing = false;

// 1. Floating visual badge so user easily sees the extension is active on Facebook / OLX
function injectFloatingStatusBadge() {
  if (document.getElementById('adsmanager-crm-badge')) return;

  const badge = document.createElement('div');
  badge.id = 'adsmanager-crm-badge';
  badge.style.cssText = [
    'position: fixed',
    'bottom: 20px',
    'right: 20px',
    'z-index: 999999',
    'background: #0f172a',
    'color: #ffffff',
    'border: 1.5px solid #3b82f6',
    'border-radius: 30px',
    'padding: 7px 14px',
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'font-size: 12px',
    'display: flex',
    'align-items: center',
    'gap: 8px',
    'box-shadow: 0 8px 24px rgba(0,0,0,0.5)',
    'cursor: pointer',
    'user-select: none',
    'transition: all 0.2s ease'
  ].join(';');

  badge.innerHTML = \`
    <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block; box-shadow: 0 0 8px #10b981;"></span>
    <span style="font-weight: 700; color: #f8fafc;">Ads Manager CRM</span>
    <span id="crm-badge-status" style="color: #94a3b8; font-size: 11px;">(Ativo)</span>
  \`;

  badge.title = 'Clique para forçar varredura de mensagens agora!';
  badge.addEventListener('click', () => {
    const statusEl = document.getElementById('crm-badge-status');
    if (statusEl) statusEl.textContent = '(Varrendo...)';
    scrapeActiveChats();
    setTimeout(() => {
      if (statusEl) statusEl.textContent = '(Sincronizado!)';
      setTimeout(() => {
        if (statusEl) statusEl.textContent = '(Ativo)';
      }, 2500);
    }, 1200);
  });

  if (document.body) {
    document.body.appendChild(badge);
  }
}

// 2. Intercept History pushState/replaceState to detect SPA route changes
(function() {
  const pushState = history.pushState;
  const replaceState = history.replaceState;
  history.pushState = function() {
    pushState.apply(history, arguments);
    setTimeout(scrapeActiveChats, 1500);
  };
  history.replaceState = function() {
    replaceState.apply(history, arguments);
    setTimeout(scrapeActiveChats, 1500);
  };
  window.addEventListener('popstate', () => {
    setTimeout(scrapeActiveChats, 1500);
  });
})();

// 3. Main Scrape Orchestrator
function scrapeActiveChats() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    injectFloatingStatusBadge();
    const host = location.hostname;

    if (host.includes('facebook.com')) {
      scrapeFacebook();
    } else if (host.includes('olx.com.br')) {
      scrapeOlx();
    }
  } catch (err) {
    console.warn('[CRM Content] Scrape error:', err);
  } finally {
    isSyncing = false;
  }
}

function scrapeFacebook() {
  const currentUrl = location.href;
  const hasChatElements = currentUrl.includes('/messages') || 
                          currentUrl.includes('/marketplace') || 
                          document.querySelector('a[href*="/messages/t/"]') || 
                          document.querySelector('[role="textbox"]');

  if (!hasChatElements) return;

  const currentThreadMatch = currentUrl.match(/\\/messages\\/t\\/(\\d+)/);
  const activeThreadId = currentThreadMatch ? currentThreadMatch[1] : null;

  const conversations = [];
  const seenIds = new Set();

  // 1. Scrape conversation list from sidebar
  const conversationLinks = Array.from(document.querySelectorAll('a[href*="/messages/t/"]'));

  for (const link of conversationLinks) {
    try {
      const href = link.getAttribute('href') || '';
      const match = href.match(/\\/messages\\/t\\/(\\d+)/);
      if (!match) continue;
      const threadId = match[1];
      if (seenIds.has(threadId)) continue;
      seenIds.add(threadId);

      const textElements = Array.from(link.querySelectorAll('span, div[dir="auto"]'))
        .map(el => el.textContent.trim())
        .filter(t => t.length > 0 && 
                     !t.includes('Marketplace') && 
                     !t.includes('Facebook') && 
                     !t.match(/^\\d+\\s*(min|sem|d|h|s)$/i));

      const customerName = textElements[0] || 'Cliente Facebook';
      const productOrSnippet = textElements[1] || '';
      const lastMsg = textElements[textElements.length - 1] || '';

      const imgEl = link.querySelector('img');
      const avatar = imgEl ? imgEl.src : null;

      conversations.push({
        external_id: threadId,
        customer_name: customerName,
        customer_avatar: avatar,
        product_title: productOrSnippet.length > 3 ? productOrSnippet : null,
        last_message: lastMsg,
        last_message_at: new Date().toISOString(),
        unread: Boolean(link.querySelector('[aria-label*="não lida"], [aria-label*="unread"]')),
        messages: []
      });
    } catch (itemErr) {}
  }

  // 2. If viewing an active conversation, scrape the message bubbles
  if (activeThreadId) {
    let activeConv = conversations.find(c => c.external_id === activeThreadId);
    if (!activeConv) {
      activeConv = {
        external_id: activeThreadId,
        customer_name: 'Cliente Atual',
        messages: []
      };
      conversations.push(activeConv);
    }

    const headerEl = document.querySelector('h2, [role="main"] h1, div[role="main"] span[dir="auto"]');
    if (headerEl) {
      const fullHeader = headerEl.textContent.trim();
      if (fullHeader.includes(' - ')) {
        const parts = fullHeader.split(' - ');
        activeConv.customer_name = parts[0].trim();
        activeConv.product_title = parts.slice(1).join(' - ').trim();
      } else if (!activeConv.product_title && fullHeader.length > 3 && fullHeader.length < 150) {
        activeConv.product_title = fullHeader;
      }
    }

    // Also look for Marketplace item details bar
    const priceEl = document.querySelector('[role="main"] span');
    if (priceEl && !activeConv.product_price) {
      const pText = priceEl.textContent.trim();
      if (pText.startsWith('R$')) activeConv.product_price = pText;
    }

    // Scrape message rows
    const messageRows = Array.from(document.querySelectorAll('[role="row"], div[dir="auto"]'))
      .filter(el => {
        const t = el.textContent.trim();
        return t.length > 0 && 
               t.length < 2500 && 
               !t.includes('Marketplace') && 
               !el.closest('a[href*="/messages/t/"]');
      });

    const parsedMessages = [];
    const seenMsg = new Set();

    for (const el of messageRows) {
      const text = el.textContent.trim();
      if (seenMsg.has(text) || text.length === 0) continue;
      // Skip action buttons or marketplace notices
      if (text === 'Mark as sold' || text === 'More options' || text.startsWith('Classificar ') || text.startsWith('Já se podem classificar')) {
        continue;
      }
      seenMsg.add(text);

      let isMe = false;
      
      // Check aria-labels first
      const rowContainer = el.closest('[role="row"]') || el.parentElement;
      const ariaLabel = (rowContainer?.getAttribute('aria-label') || el.getAttribute('aria-label') || '').toLowerCase();
      if (ariaLabel.includes('você enviou') || ariaLabel.includes('you sent') || ariaLabel.includes('sua mensagem')) {
        isMe = true;
      } else {
        // Fallback to bubble background color
        let p = el;
        for (let i = 0; i < 5 && p; i++) {
          const style = window.getComputedStyle(p);
          const bg = style.backgroundColor || '';
          if (bg.includes('0, 132, 255') || bg.includes('10, 128, 236') || bg.includes('0, 100, 224') || bg.includes('37, 99, 235') || bg.includes('147, 51, 234') || bg.includes('168, 85, 247') || bg.includes('112, 0, 255')) {
            isMe = true;
            break;
          }
          p = p.parentElement;
        }
        // Fallback to right alignment
        if (!isMe && rowContainer) {
          const rect = rowContainer.getBoundingClientRect();
          if (rect.right > window.innerWidth * 0.60) {
            isMe = true;
          }
        }
      }

      parsedMessages.push({
        sender_type: isMe ? 'me' : 'customer',
        content: text,
        sent_at: new Date().toISOString()
      });
    }

    activeConv.messages = parsedMessages.slice(-30);
    if (activeConv.messages.length > 0) {
      activeConv.last_message = activeConv.messages[activeConv.messages.length - 1].content;
    }
  }

  if (conversations.length > 0) {
    console.log('[CRM Content] Dispatching ' + conversations.length + ' conversations to background...');
    chrome.runtime.sendMessage({
      type: 'CRM_SYNC_DATA',
      platform: 'facebook',
      conversations: conversations
    }, (res) => {
      const statusEl = document.getElementById('crm-badge-status');
      if (statusEl && res && res.success) {
        statusEl.textContent = '(Sincronizado!)';
        setTimeout(() => { if (statusEl) statusEl.textContent = '(Ativo)'; }, 2500);
      }
    });
  }
}

function scrapeOlx() {
  const isChat = location.href.includes('/chat') || location.href.includes('/mensagens');
  if (!isChat) return;

  const convItems = Array.from(document.querySelectorAll('[data-ds-component="DS-ChatListItem"], a[href*="/chat/"]'));
  const conversations = [];

  for (const item of convItems) {
    try {
      const nameEl = item.querySelector('h3, h4, span[font-weight="bold"]');
      const customerName = nameEl ? nameEl.textContent.trim() : 'Comprador OLX';
      const lastMsgEl = item.querySelector('p, span[color="neutral"]');
      const lastMsg = lastMsgEl ? lastMsgEl.textContent.trim() : '';

      const href = item.getAttribute('href') || location.href;
      const match = href.match(/\\/chat\\/([^/?#]+)/) || [null, 'olx-' + Date.now()];
      const externalId = match[1];

      conversations.push({
        external_id: externalId,
        customer_name: customerName,
        last_message: lastMsg,
        last_message_at: new Date().toISOString(),
        messages: []
      });
    } catch {}
  }

  if (conversations.length > 0) {
    chrome.runtime.sendMessage({
      type: 'CRM_SYNC_DATA',
      platform: 'olx',
      conversations: conversations
    });
  }
}

// 4. Remote reply execution handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'TRIGGER_SCRAPE_NOW') {
    scrapeActiveChats();
    sendResponse({ success: true });
    return;
  }

  if (request && request.type === 'EXECUTE_SEND_REPLY') {
    const textToSend = request.text;
    console.log('[CRM Content] Executing reply: ' + textToSend);

    try {
      const inputSelector = '[role="textbox"], [contenteditable="true"], div[aria-label="Mensagem"], div[aria-label="Message"], textarea';
      const input = document.querySelector(inputSelector);

      if (input) {
        input.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, textToSend);
        input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));

        setTimeout(() => {
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
          input.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
          input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));

          const sendBtn = document.querySelector('div[aria-label="Pressione Enter para enviar"], div[aria-label="Press Enter to send"], svg[aria-label="Pressione Enter para enviar"]');
          if (sendBtn) {
            (sendBtn.closest('div[role="button"]') || sendBtn).click();
          }

          sendResponse({ success: true });
        }, 150);

        return true;
      } else {
        sendResponse({ success: false, error: 'Campo de texto não encontrado' });
      }
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  }
});

// 5. Periodic scraping
setInterval(scrapeActiveChats, 10000);
setTimeout(scrapeActiveChats, 2000);

let debounceTimer = null;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(scrapeActiveChats, 3000);
});

if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
  injectFloatingStatusBadge();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true });
    injectFloatingStatusBadge();
  });
}
`;

  const iconBuffer = Buffer.from(ICON_BASE64, 'base64');

  return {
    'manifest.json': JSON.stringify(manifest, null, 2),
    'popup.html': popupHtml,
    'popup.js': popupJs,
    'background.js': backgroundJs,
    'content.js': contentJs,
    'icon16.png': iconBuffer,
    'icon48.png': iconBuffer,
  };
}
