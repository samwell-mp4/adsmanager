export interface CrmExtensionOptions {
  profileId?: number;
  profileUuid?: string;
  apiBaseUrl?: string;
  n8nWebhookUrl?: string;
}

// 16x16 / 48x48 icon PNG buffer (blue message badge)
const ICON_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA8SURBVDhPY/wPBAxUAIyMjP8hxBgYGECiGKSZkRhVjAwG0VcwCgYugF13Y2NjeLgxFgOQ5Ue3Gz4wMAAA81oP6X7uXkIAAAAASUVORK5CYII=';

export const DEFAULT_ADS_MANAGER_URL = 'https://adsmanager-adsmanagerapp.ahzgvk.easypanel.host';
export const DEFAULT_N8N_WEBHOOK_URL = 'https://plug-sales-dispatch-app-n8n-2.hx8235.easypanel.host/webhook/adsmanager';

export function generateCrmExtensionFiles(options: CrmExtensionOptions = {}): Record<string, string | Buffer> {
  const profileId = options.profileId || 1;
  const profileUuid = options.profileUuid || 'default';
  const apiBaseUrl = options.apiBaseUrl || DEFAULT_ADS_MANAGER_URL;
  const n8nWebhookUrl = options.n8nWebhookUrl || DEFAULT_N8N_WEBHOOK_URL;

  const manifest = {
    manifest_version: 3,
    name: 'Ads Manager CRM Collector Pro',
    version: '1.4.0',
    description: 'Sincronizador automático e manual de mensagens do Facebook Marketplace e OLX para o Ads Manager CRM e n8n Webhook',
    permissions: [
      'tabs',
      'storage',
      'notifications',
      'alarms'
    ],
    host_permissions: [
      '*://*.facebook.com/*',
      '*://*.olx.com.br/*',
      'https://*.easypanel.host/*',
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
  <title>Ads Manager CRM Collector</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      width: 350px;
      background: #090d16;
      color: #f1f5f9;
      padding: 16px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 12px;
      border-bottom: 1px solid #1e293b;
      margin-bottom: 12px;
    }
    .icon {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }
    .title {
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
    }
    .subtitle {
      font-size: 11px;
      color: #94a3b8;
    }
    .badge {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-radius: 8px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #34d399;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 14px;
    }
    .badge-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
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
      transition: border-color 0.2s;
    }
    input:focus {
      outline: none;
      border-color: #3b82f6;
    }
    .btn-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 12px;
    }
    button {
      width: 100%;
      border: none;
      border-radius: 8px;
      padding: 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
    }
    .btn-sync {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
    }
    .btn-sync:hover {
      background: linear-gradient(135deg, #1d4ed8, #1e40af);
      transform: translateY(-1px);
    }
    .btn-n8n {
      background: #ea580c;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);
    }
    .btn-n8n:hover {
      background: #c2410c;
    }
    .btn-secondary {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
    }
    .btn-secondary:hover {
      background: #334155;
      color: #ffffff;
    }
    .status-box {
      margin-top: 12px;
      padding: 8px 10px;
      border-radius: 6px;
      background: #020617;
      border: 1px solid #1e293b;
      font-size: 11px;
      min-height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: #94a3b8;
    }
    .footer {
      margin-top: 14px;
      font-size: 10px;
      color: #64748b;
      text-align: center;
      border-top: 1px solid #1e293b;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="icon">💬</div>
    <div>
      <h1 class="title">Ads Manager CRM</h1>
      <p class="subtitle">Agente Coletor de Mensagens & Webhook</p>
    </div>
  </div>

  <div class="badge">
    <div class="badge-left">
      <span class="badge-dot"></span>
      <span id="statusText">Monitor Ativo (Facebook / OLX)</span>
    </div>
    <span id="lastSyncTime" style="font-size: 10px; color: #94a3b8;">--:--</span>
  </div>

  <div class="field">
    <label class="label">🌐 Servidor Ads Manager:</label>
    <input type="text" id="apiUrlInput" placeholder="https://adsmanager-adsmanagerapp.ahzgvk.easypanel.host">
  </div>

  <div class="field">
    <label class="label">⚡ Webhook n8n Externo:</label>
    <input type="text" id="n8nWebhookInput" placeholder="${DEFAULT_N8N_WEBHOOK_URL}">
  </div>

  <div class="field">
    <label class="label">👤 ID do Perfil no Ads Manager:</label>
    <input type="number" id="profileIdInput" value="${profileId}">
  </div>

  <div class="btn-group">
    <button id="syncNowBtn" class="btn-sync">
      <span>⚡</span>
      <span>Sincronizar Agora (Gatilho Manual)</span>
    </button>
    <button id="testN8nBtn" class="btn-n8n">
      <span>📡</span>
      <span>Testar Disparo para Webhook n8n</span>
    </button>
    <div style="display: flex; gap: 6px;">
      <button id="testApiBtn" class="btn-secondary" style="flex: 1;">
        <span>🔌</span>
        <span>Testar Servidor</span>
      </button>
      <button id="saveBtn" class="btn-secondary" style="flex: 1;">
        <span>💾</span>
        <span>Salvar</span>
      </button>
    </div>
  </div>

  <div class="status-box" id="msgArea">
    Pronto para sincronizar mensagens.
  </div>

  <div class="footer">
    Ads Manager Multi-login Pro • v1.4.0
  </div>

  <script src="popup.js"></script>
</body>
</html>`;

  const popupJs = `
document.addEventListener('DOMContentLoaded', async () => {
  const apiUrlInput = document.getElementById('apiUrlInput');
  const n8nWebhookInput = document.getElementById('n8nWebhookInput');
  const profileIdInput = document.getElementById('profileIdInput');
  const syncNowBtn = document.getElementById('syncNowBtn');
  const testN8nBtn = document.getElementById('testN8nBtn');
  const testApiBtn = document.getElementById('testApiBtn');
  const saveBtn = document.getElementById('saveBtn');
  const msgArea = document.getElementById('msgArea');
  const lastSyncTime = document.getElementById('lastSyncTime');

  const defaultApiUrl = '${DEFAULT_ADS_MANAGER_URL}';
  const defaultN8nUrl = '${DEFAULT_N8N_WEBHOOK_URL}';

  chrome.storage.local.get(['apiUrl', 'n8nWebhookUrl', 'profileId', 'lastSyncAt', 'lastSyncCount'], (res) => {
    let url = res.apiUrl || ${JSON.stringify(apiBaseUrl)} || defaultApiUrl;
    if (!url || url.includes('172.17.') || url.includes('localhost')) {
      url = defaultApiUrl;
    }
    apiUrlInput.value = url;
    n8nWebhookInput.value = res.n8nWebhookUrl || defaultN8nUrl;
    profileIdInput.value = res.profileId || ${profileId};

    if (res.lastSyncAt) {
      const dt = new Date(res.lastSyncAt);
      lastSyncTime.textContent = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (res.lastSyncCount !== undefined) {
        msgArea.textContent = 'Último envio: ' + res.lastSyncCount + ' conversas às ' + dt.toLocaleTimeString();
      }
    }
  });

  function setStatus(text, color = '#38bdf8') {
    msgArea.style.color = color;
    msgArea.textContent = text;
  }

  function sanitizeApiUrl(raw) {
    if (!raw) return defaultApiUrl;
    let u = raw.trim().replace(/\\/+$/, '');
    u = u.replace(/\\/api\\/crm\\/webhook\\/?$/i, '');
    u = u.replace(/\\/api\\/crm\\/conversations\\/?$/i, '');
    u = u.replace(/\\/api\\/crm\\/?$/i, '');
    u = u.replace(/\\/crm\\/?$/i, '');
    u = u.replace(/\\/api\\/?$/i, '');
    u = u.replace(/\\/+$/, '');
    if (!u || u.includes('172.17.') || u.includes('localhost')) {
      u = defaultApiUrl;
    }
    return u;
  }

  // 1. Salvar configurações
  saveBtn.addEventListener('click', () => {
    const apiUrl = sanitizeApiUrl(apiUrlInput.value);
    apiUrlInput.value = apiUrl;
    const n8nWebhookUrl = n8nWebhookInput.value.trim() || defaultN8nUrl;
    const profileId = parseInt(profileIdInput.value, 10) || ${profileId};

    chrome.storage.local.set({ apiUrl, n8nWebhookUrl, profileId }, () => {
      setStatus('✅ Configurações salvas com sucesso!', '#34d399');
      setTimeout(() => setStatus('Pronto para sincronizar mensagens.', '#94a3b8'), 3000);
    });
  });

  // 2. Disparar Varredura Manual
  syncNowBtn.addEventListener('click', () => {
    setStatus('🔍 Varrendo mensagens na página do Facebook/OLX...', '#38bdf8');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        setStatus('❌ Nenhuma aba ativa encontrada.', '#f87171');
        return;
      }

      const activeTab = tabs[0];
      chrome.tabs.sendMessage(activeTab.id, { type: 'TRIGGER_SCRAPE_NOW' }, (response) => {
        if (chrome.runtime.lastError) {
          setStatus('⚠️ Abra o Facebook Messenger (/messages) ou OLX na aba ativa.', '#fbbf24');
          return;
        }

        if (response && response.success) {
          const count = response.count || 0;
          setStatus('✅ Sucesso! ' + count + ' conversas encontradas e despachadas para o CRM e n8n.', '#34d399');
          const now = new Date();
          lastSyncTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          chrome.storage.local.set({ lastSyncAt: now.toISOString(), lastSyncCount: count });
        } else {
          setStatus('⚠️ Nenhuma conversa localizada na tela atual.', '#fbbf24');
        }
      });
    });
  });

  // 3. Testar Webhook n8n
  testN8nBtn.addEventListener('click', async () => {
    const webhookUrl = n8nWebhookInput.value.trim() || defaultN8nUrl;
    setStatus('📡 Enviando teste para o n8n: ' + webhookUrl + '...', '#ea580c');

    const testPayload = {
      test: true,
      timestamp: new Date().toISOString(),
      source: 'Ads Manager Extension Manual Trigger',
      platform: 'facebook',
      profile_id: parseInt(profileIdInput.value, 10) || ${profileId},
      conversations: [
        {
          external_id: 'test_' + Date.now(),
          customer_name: 'Cliente Teste n8n',
          product_title: 'Perfume Brand Collection 25ml',
          last_message: 'Mensagem de teste manual da extensão!',
          last_message_at: new Date().toISOString(),
          unread: true
        }
      ]
    };

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      if (res.ok) {
        setStatus('✅ n8n recebeu com sucesso (HTTP ' + res.status + ')!', '#34d399');
      } else if (res.status === 404) {
        setStatus('⚠️ n8n respondeu 404 (Workflow inativo no editor do n8n). Ative o toggle no n8n!', '#fbbf24');
      } else {
        setStatus('❌ n8n respondeu com erro ' + res.status, '#f87171');
      }
    } catch (err) {
      setStatus('❌ Erro de rede ao conectar ao n8n: ' + err.message, '#f87171');
    }
  });

  // 4. Testar Conexão com Servidor CRM
  testApiBtn.addEventListener('click', async () => {
    const apiUrl = sanitizeApiUrl(apiUrlInput.value);
    apiUrlInput.value = apiUrl;
    setStatus('🔌 Testando servidor: ' + apiUrl + '...', '#38bdf8');

    try {
      // Hit /api/crm/init to also ensure tables exist!
      const res = await fetch(apiUrl + '/api/crm/init');
      if (res.ok) {
        setStatus('✅ Servidor Ads Manager Online e Banco Pronto!', '#34d399');
      } else {
        setStatus('❌ Servidor respondeu com código ' + res.status, '#f87171');
      }
    } catch (err) {
      setStatus('❌ Falha ao conectar ao servidor: ' + err.message, '#f87171');
    }
  });
});
`;

  const backgroundJs = `
const defaultAdsManagerUrl = '${DEFAULT_ADS_MANAGER_URL}';
const defaultN8nWebhookUrl = '${DEFAULT_N8N_WEBHOOK_URL}';

let currentProfileId = ${profileId};
let currentProfileUuid = ${JSON.stringify(profileUuid)};
let currentApiUrl = defaultAdsManagerUrl;
let currentN8nUrl = defaultN8nWebhookUrl;

function sanitizeApiUrl(raw) {
  if (!raw) return defaultAdsManagerUrl;
  let u = raw.trim().replace(/\\/+$/, '');
  u = u.replace(/\\/api\\/crm\\/webhook\\/?$/i, '');
  u = u.replace(/\\/api\\/crm\\/conversations\\/?$/i, '');
  u = u.replace(/\\/api\\/crm\\/?$/i, '');
  u = u.replace(/\\/crm\\/?$/i, '');
  u = u.replace(/\\/api\\/?$/i, '');
  u = u.replace(/\\/+$/, '');
  if (!u || u.includes('172.17.') || u.includes('localhost')) {
    u = defaultAdsManagerUrl;
  }
  return u;
}

// Load stored settings
chrome.storage.local.get(['apiUrl', 'n8nWebhookUrl', 'profileId', 'profileUuid'], (res) => {
  if (res.apiUrl) currentApiUrl = sanitizeApiUrl(res.apiUrl);
  if (res.n8nWebhookUrl) currentN8nUrl = res.n8nWebhookUrl;
  if (res.profileId) currentProfileId = res.profileId;
  if (res.profileUuid) currentProfileUuid = res.profileUuid;
  console.log('[CRM Background] Initialized. Target API:', currentApiUrl, '| n8n Webhook:', currentN8nUrl);
});

// React immediately to settings changed in popup
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.apiUrl) currentApiUrl = sanitizeApiUrl(changes.apiUrl.newValue);
    if (changes.n8nWebhookUrl) currentN8nUrl = changes.n8nWebhookUrl.newValue || defaultN8nWebhookUrl;
    if (changes.profileId) currentProfileId = changes.profileId.newValue || ${profileId};
    if (changes.profileUuid) currentProfileUuid = changes.profileUuid.newValue || ${JSON.stringify(profileUuid)};
    console.log('[CRM Background] Settings updated live. Target API:', currentApiUrl, '| n8n Webhook:', currentN8nUrl);
  }
});

// Forward to n8n webhook directly from extension
async function dispatchToN8n(payload) {
  const target = currentN8nUrl || defaultN8nWebhookUrl;
  try {
    console.log('[CRM Background] Forwarding to n8n:', target);
    const res = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('[CRM Background] n8n dispatch response status:', res.status);
    return res.ok;
  } catch (err) {
    console.warn('[CRM Background] n8n dispatch error:', err.message);
    return false;
  }
}

// Dispatch to Ads Manager API
async function dispatchToAdsManager(payload) {
  const url = currentApiUrl + '/api/crm/webhook';
  try {
    console.log('[CRM Background] Dispatching to Ads Manager API:', url);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    console.log('[CRM Background] Ads Manager response:', data);
    return { ok: res.ok, data };
  } catch (err) {
    console.warn('[CRM Background] Ads Manager API error:', err.message);
    return { ok: false, error: err.message };
  }
}

// Listen to scraped chat data from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'CRM_SYNC_DATA') {
    const payload = {
      profile_id: currentProfileId,
      profile_uuid: currentProfileUuid,
      platform: message.platform || 'facebook',
      conversations: message.conversations || [],
      captured_at: new Date().toISOString()
    };

    console.log('[CRM Background] Processing ' + payload.conversations.length + ' scraped conversations...');

    // Save timestamp & count
    chrome.storage.local.set({
      lastSyncAt: new Date().toISOString(),
      lastSyncCount: payload.conversations.length
    });

    // Send to both in parallel: Ads Manager CRM and n8n Webhook!
    Promise.allSettled([
      dispatchToAdsManager(payload),
      dispatchToN8n(payload)
    ]).then((results) => {
      const apiResult = results[0].status === 'fulfilled' ? results[0].value : null;
      const n8nResult = results[1].status === 'fulfilled' ? results[1].value : false;

      console.log('[CRM Background] Dispatch results:', { api: apiResult, n8n: n8nResult });
      sendResponse({
        success: true,
        count: payload.conversations.length,
        apiSuccess: apiResult?.ok,
        n8nSuccess: n8nResult
      });
    });

    return true; // Keep async response channel open
  }
});

// Poll outgoing replies queue from dashboard
async function pollOutgoingQueue() {
  try {
    const res = await fetch(currentApiUrl + '/api/crm/outgoing?profile_id=' + currentProfileId);
    if (!res.ok) return;
    const json = await res.json();
    const pendingReplies = json ? (json.data || []) : [];

    if (pendingReplies.length > 0) {
      console.log('[CRM Background] ' + pendingReplies.length + ' outgoing replies pending.');

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
              fetch(currentApiUrl + '/api/crm/outgoing/' + reply.id + '/sent', { method: 'POST' }).catch(() => {});
            }
          });
        }
      });
    }
  } catch (err) {}
}

setInterval(pollOutgoingQueue, 4000);
`;

  const contentJs = `
console.log('[CRM Content] Ads Manager CRM Collector Pro loaded on: ' + location.href);

let isScraping = false;

// 1. Injetar Botão Flutuante Elegante na Página com Gatilho Manual
function injectFloatingActionBadge() {
  if (document.getElementById('adsmanager-crm-floater')) return;

  const badge = document.createElement('div');
  badge.id = 'adsmanager-crm-floater';
  badge.style.cssText = [
    'position: fixed',
    'bottom: 24px',
    'right: 24px',
    'z-index: 2147483647',
    'background: rgba(15, 23, 42, 0.95)',
    'color: #ffffff',
    'border: 1.5px solid #3b82f6',
    'backdrop-filter: blur(12px)',
    'border-radius: 40px',
    'padding: 9px 16px',
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'font-size: 12px',
    'font-weight: 600',
    'display: flex',
    'align-items: center',
    'gap: 9px',
    'box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(59, 130, 246, 0.4)',
    'cursor: pointer',
    'user-select: none',
    'transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
  ].join(';');

  badge.innerHTML = \`
    <span style="width: 9px; height: 9px; border-radius: 50%; background: #10b981; display: inline-block; box-shadow: 0 0 10px #10b981; animation: pulse 2s infinite;"></span>
    <span style="font-weight: 700; color: #f8fafc; letter-spacing: -0.2px;">⚡ Sincronizar CRM</span>
    <span id="crm-floater-count" style="background: #1e293b; color: #94a3b8; padding: 2px 7px; border-radius: 10px; font-size: 11px;">(Pronto)</span>
  \`;

  badge.title = 'Clique para forçar varredura manual de conversas e enviar para o Ads Manager e n8n!';

  badge.addEventListener('mouseenter', () => {
    badge.style.transform = 'scale(1.04)';
    badge.style.borderColor = '#60a5fa';
  });

  badge.addEventListener('mouseleave', () => {
    badge.style.transform = 'scale(1)';
    badge.style.borderColor = '#3b82f6';
  });

  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerManualScrape('Clique no Botão Flutuante');
  });

  if (document.body) {
    document.body.appendChild(badge);
  }
}

// Toast de notificação na tela
function showCrmToast(message, isSuccess = true) {
  const existingToast = document.getElementById('adsmanager-crm-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.id = 'adsmanager-crm-toast';
  toast.style.cssText = [
    'position: fixed',
    'top: 24px',
    'right: 24px',
    'z-index: 2147483647',
    isSuccess ? 'background: #065f46' : 'background: #991b1b',
    'color: #ffffff',
    'padding: 12px 20px',
    'border-radius: 12px',
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'font-size: 13px',
    'font-weight: 600',
    'box-shadow: 0 12px 30px rgba(0,0,0,0.5)',
    'display: flex',
    'align-items: center',
    'gap: 10px',
    'animation: fadeIn 0.3s ease-out',
    'border: 1px solid rgba(255,255,255,0.2)'
  ].join(';');

  toast.innerHTML = (isSuccess ? '✅ ' : '❌ ') + message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// Gatilho Manual Acionado
function triggerManualScrape(origin = 'Gatilho Manual') {
  console.log('[CRM Content] Triggering scrape via:', origin);
  const countEl = document.getElementById('crm-floater-count');
  if (countEl) countEl.textContent = 'Varrendo...';

  const conversations = scrapeActiveChats();
  const count = conversations ? conversations.length : 0;

  if (countEl) {
    countEl.textContent = count + ' conv.';
    setTimeout(() => {
      if (countEl) countEl.textContent = '(Pronto)';
    }, 4000);
  }

  showCrmToast(count > 0 ? count + ' conversas sincronizadas com sucesso!' : 'Varredura concluída. Nenhuma conversa nova.', count > 0);
  return count;
}

// 2. Parser do Facebook Marketplace Messenger (Baseado exatamente no HTML real do Facebook)
function scrapeFacebook() {
  const conversations = [];
  const seenIds = new Set();

  // Procura os links de conversas na lista lateral do Messenger/Marketplace
  const rowSelectors = [
    'div[data-pagelet="MWThreadListThreadListRow"] a[href*="/messages/t/"]',
    'div[data-pagelet="MWThreadListContent"] a[href*="/messages/t/"]',
    'a[href*="/messages/t/"]'
  ];

  const threadLinks = Array.from(document.querySelectorAll(rowSelectors.join(',')));

  for (const link of threadLinks) {
    try {
      const href = link.getAttribute('href') || '';
      const match = href.match(/\\/messages\\/t\\/(\\d+)/);
      if (!match) continue;

      const threadId = match[1];
      if (seenIds.has(threadId)) continue;
      seenIds.add(threadId);

      // 1. Extração do Nome do Cliente e do Produto
      // No Facebook Marketplace, o link possui:
      // aria-label="Conversa de grupo: Vanusa · Perfumes Brandcollection 316 - Inspiração Scandal Gold - 25ml"
      const rawAriaLabel = (link.getAttribute('aria-label') || '').trim();
      let customerName = 'Cliente Facebook';
      let productTitle = null;

      if (rawAriaLabel) {
        // Remove prefixo "Conversa de grupo:", "Group conversation:", etc.
        const clean = rawAriaLabel.replace(/^(?:Conversa de grupo|Group conversation|Conversa com|Conversa|Chat)\\s*:?\\s*/i, '').trim();
        
        if (clean.includes(' · ')) {
          const parts = clean.split(' · ');
          customerName = parts[0]?.trim() || customerName;
          productTitle = parts.slice(1).join(' · ').trim() || null;
        } else if (clean.includes(' - ')) {
          const parts = clean.split(' - ');
          customerName = parts[0]?.trim() || customerName;
          productTitle = parts.slice(1).join(' - ').trim() || null;
        } else {
          customerName = clean;
        }
      }

      // Ignora avisos do sistema do Facebook e prompts automáticos
      const lowerName = customerName.toLowerCase();
      if (
        lowerName.includes('parece que publicaste') ||
        lowerName.includes('pedido de mensagem') ||
        lowerName === 'ativo agora'
      ) {
        continue;
      }

      // Se ainda não tiver nome ou título, busca nos elementos de texto visíveis
      if (customerName === 'Cliente Facebook' || !productTitle) {
        const titleSpan = link.querySelector('span.xlyipyv, span.x1lliihq');
        if (titleSpan) {
          const text = titleSpan.textContent.trim();
          if (text.includes(' · ')) {
            const parts = text.split(' · ');
            customerName = parts[0].trim();
            productTitle = parts.slice(1).join(' · ').trim();
          }
        }
      }

      // 2. Extração da Imagem do Anúncio/Produto
      const img = link.querySelector('img[src*="fbcdn.net"], img:not([src*="emoji.php"])');
      const productImage = img ? img.src : null;

      // 3. Extração do Avatar do Cliente (se presente nos nós de visualização)
      const avatarSvgImage = link.querySelector('image[*|href], image[xlink\\\\:href]');
      const customerAvatar = avatarSvgImage ? (avatarSvgImage.getAttribute('xlink:href') || avatarSvgImage.getAttribute('href')) : productImage;

      // 4. Detecção de Mensagem Não Lida
      const linkText = link.textContent || '';
      const isUnread = Boolean(
        linkText.includes('Mensagem não lida') || 
        link.querySelector('[aria-label*="não lida"], [aria-label*="unread"]') ||
        link.querySelector('div.x1ja2u2z.xzpqnlu')
      );

      // 5. Extração da Última Mensagem
      let lastMessage = '';
      const msgSpan = link.querySelector('span.x1j85h84, span.xlyipyv:not(:first-child)');
      if (msgSpan) {
        lastMessage = msgSpan.textContent.trim();
      } else {
        // Fallback: pega o último texto relevante
        const spans = Array.from(link.querySelectorAll('span'))
          .map(s => s.textContent.trim())
          .filter(t => t.length > 0 && !t.includes('Mensagem não lida') && !t.match(/^\\d+\\s*(min|sem|d|h|s)$/i));
        if (spans.length > 0) {
          lastMessage = spans[spans.length - 1];
        }
      }

      // 6. Horário Relativo
      const abbrEl = link.querySelector('abbr');
      const timeStr = abbrEl ? (abbrEl.getAttribute('aria-label') || abbrEl.textContent.trim()) : null;

      conversations.push({
        external_id: threadId,
        customer_name: customerName,
        customer_avatar: customerAvatar,
        product_title: productTitle,
        product_image: productImage,
        last_message: lastMessage,
        last_message_at: new Date().toISOString(),
        unread: isUnread,
        messages: []
      });
    } catch (e) {
      console.warn('[CRM Content] Error parsing thread link:', e);
    }
  }

  // 7. Se estiver com um chat específico aberto no painel principal, extrai as mensagens da tela
  const currentUrl = location.href;
  const matchCurrent = currentUrl.match(/\\/messages\\/t\\/(\\d+)/);
  const activeThreadId = matchCurrent ? matchCurrent[1] : null;

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

    // Extrair produto e nome do cliente do cabeçalho da conversa aberta se ainda não tiver
    try {
      const mainHeader = document.querySelector('div[role="main"] h2, div[role="main"] h1, [data-pagelet="MWThreadHeaderContent"]');
      if (mainHeader) {
        const headerText = mainHeader.textContent.trim();
        if (headerText.includes(' · ')) {
          const parts = headerText.split(' · ');
          if (activeConv.customer_name === 'Cliente Atual' || activeConv.customer_name === 'Cliente Facebook') {
            activeConv.customer_name = parts[0].trim();
          }
          if (!activeConv.product_title) {
            activeConv.product_title = parts.slice(1).join(' · ').trim();
          }
        }
      }

      const allText = document.querySelector('div[role="main"]')?.textContent || '';
      const priceMatch = allText.match(/R\\$\\s?[\\d.,]+/);
      if (priceMatch && !activeConv.product_price) {
        activeConv.product_price = priceMatch[0];
      }
    } catch (e) {}

    const messageBubbles = Array.from(document.querySelectorAll('div[dir="auto"], [role="row"] div[dir="auto"]'))
      .filter(el => {
        const t = el.textContent.trim();
        return t.length > 0 && t.length < 2500 && !el.closest('a[href*="/messages/t/"]');
      });

    const parsedMessages = [];
    const seenBubbles = new Set();

    for (const el of messageBubbles) {
      const text = el.textContent.trim();
      if (seenBubbles.has(text) || !text) continue;
      seenBubbles.add(text);

      let isMe = false;
      const rowContainer = el.closest('[role="row"]') || el.parentElement;
      const aria = (rowContainer?.getAttribute('aria-label') || el.getAttribute('aria-label') || '').toLowerCase();
      if (aria.includes('você enviou') || aria.includes('you sent') || aria.includes('tu:')) {
        isMe = true;
      } else {
        const rect = el.getBoundingClientRect();
        if (rect.right > window.innerWidth * 0.65) {
          isMe = true;
        }
      }

      parsedMessages.push({
        sender_type: isMe ? 'me' : 'customer',
        content: text,
        sent_at: new Date().toISOString()
      });
    }

    activeConv.messages = parsedMessages.slice(-30);
    if (activeConv.messages.length > 0 && !activeConv.last_message) {
      activeConv.last_message = activeConv.messages[activeConv.messages.length - 1].content;
    }
  }

  // Unifica e deduplica conversas na memória antes de despachar
  const uniqueConvs = [];
  const seenLeadKeys = new Set();
  for (const c of conversations) {
    if (c.customer_name === 'Cliente Atual' && (!c.messages || c.messages.length === 0)) {
      continue;
    }
    const normName = (c.customer_name || '').trim().toLowerCase();
    const isGeneric = ['cliente', 'cliente facebook', 'cliente atual', 'pedido de mensagem', 'ativo agora'].includes(normName);
    const key = (!isGeneric && normName.length >= 3)
      ? normName + '_' + (c.product_title || '').trim().toLowerCase()
      : c.external_id;

    if (!seenLeadKeys.has(key)) {
      seenLeadKeys.add(key);
      uniqueConvs.push(c);
    } else {
      const existing = uniqueConvs.find(item => {
        const itemNorm = (item.customer_name || '').trim().toLowerCase();
        const itemKey = (!isGeneric && itemNorm.length >= 3)
          ? itemNorm + '_' + (item.product_title || '').trim().toLowerCase()
          : item.external_id;
        return itemKey === key;
      });
      if (existing) {
        if (c.messages && c.messages.length > 0) {
          existing.messages = (existing.messages || []).concat(c.messages);
        }
        if (!existing.product_title && c.product_title) existing.product_title = c.product_title;
        if (!existing.product_price && c.product_price) existing.product_price = c.product_price;
      }
    }
  }

  return uniqueConvs;
}

// 3. Parser da OLX
function scrapeOlx() {
  const conversations = [];
  const convItems = Array.from(document.querySelectorAll('[data-ds-component="DS-ChatListItem"], a[href*="/chat/"]'));

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
    } catch (e) {}
  }

  return conversations;
}

// 4. Executador Principal da Varredura
function scrapeActiveChats() {
  if (isScraping) return [];
  isScraping = true;

  try {
    injectFloatingActionBadge();
    const host = location.hostname;
    let conversations = [];

    if (host.includes('facebook.com')) {
      conversations = scrapeFacebook();
    } else if (host.includes('olx.com.br')) {
      conversations = scrapeOlx();
    }

    if (conversations && conversations.length > 0) {
      console.log('[CRM Content] Found ' + conversations.length + ' conversations. Dispatching to background...');
      chrome.runtime.sendMessage({
        type: 'CRM_SYNC_DATA',
        platform: host.includes('facebook.com') ? 'facebook' : 'olx',
        conversations: conversations
      }, (res) => {
        const countEl = document.getElementById('crm-floater-count');
        if (countEl && res && res.success) {
          countEl.textContent = '(' + conversations.length + ' OK)';
          setTimeout(() => { if (countEl) countEl.textContent = '(Pronto)'; }, 3000);
        }
      });
    }

    return conversations;
  } catch (err) {
    console.error('[CRM Content] Scrape error:', err);
    return [];
  } finally {
    isScraping = false;
  }
}

// 5. Escutar mensagens do Popup e Background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'TRIGGER_SCRAPE_NOW') {
    const convs = scrapeActiveChats();
    sendResponse({ success: true, count: convs ? convs.length : 0 });
    return;
  }

  // Executar resposta remota pelo chat
  if (request && request.type === 'EXECUTE_SEND_REPLY') {
    const textToSend = request.text;
    console.log('[CRM Content] Executing reply:', textToSend);

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

// 6. Varredura Periódica e Monitor de Mudança de Página
setInterval(scrapeActiveChats, 8000);
setTimeout(scrapeActiveChats, 1500);

let debounceTimer = null;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(scrapeActiveChats, 2500);
});

if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
  injectFloatingActionBadge();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true });
    injectFloatingActionBadge();
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
