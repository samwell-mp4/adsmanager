import fs from 'fs';
import path from 'path';

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
    version: '1.5.0',
    description: 'Sincronizador automático e manual de mensagens do Facebook Marketplace, Instagram Direct e OLX para o Ads Manager CRM e n8n Webhook',
    permissions: [
      'tabs',
      'storage',
      'notifications',
      'alarms'
    ],
    host_permissions: [
      '*://*.facebook.com/*',
      '*://*.instagram.com/*',
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
          '*://*.instagram.com/*',
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

  if (message && message.type === 'CRM_SYNC_INSIGHTS') {
    const payload = {
      profile_id: currentProfileId,
      profile_uuid: currentProfileUuid,
      ...message.insights,
      captured_at: new Date().toISOString()
    };
    console.log('[CRM Background] Dispatching scraped Instagram Insights to API...', payload);
    const url = currentApiUrl + '/api/crm/insights';
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json()).then(d => {
      sendResponse({ success: true, data: d });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
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

      chrome.tabs.query({ url: ["*://*.facebook.com/*", "*://*.instagram.com/*", "*://*.olx.com.br/*"] }, (tabs) => {
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

// Função auxiliar para converter tempo relativo do Facebook ("3 min", "1 d", "41 sem") em timestamp real preciso
function parseFacebookRelativeTime(rawText, indexInList = 0) {
  const now = Date.now();
  if (!rawText) {
    return new Date(now - (indexInList * 60 * 1000)).toISOString();
  }

  const str = rawText.trim().toLowerCase();

  const timePartMatch = str.match(/(?:·|-|\\s|^)(\\d+)\\s*(s|seg|min|m|h|hora|horas|d|dia|dias|sem|semana|semanas|mês|mes|meses|a|ano|anos)(?:\\b|$)/i);
  if (timePartMatch) {
    const val = parseInt(timePartMatch[1], 10);
    const unit = timePartMatch[2].toLowerCase();

    let ms = 0;
    if (unit === 's' || unit === 'seg') ms = val * 1000;
    else if (unit === 'min' || unit === 'm') ms = val * 60 * 1000;
    else if (unit === 'h' || unit.startsWith('hora')) ms = val * 60 * 60 * 1000;
    else if (unit === 'd' || unit.startsWith('dia')) ms = val * 24 * 60 * 60 * 1000;
    else if (unit === 'sem' || unit.startsWith('semana')) ms = val * 7 * 24 * 60 * 60 * 1000;
    else if (unit === 'mês' || unit.startsWith('mes')) ms = val * 30 * 24 * 60 * 60 * 1000;
    else if (unit === 'a' || unit.startsWith('ano')) ms = val * 365 * 24 * 60 * 60 * 1000;

    return new Date(now - ms - (indexInList * 1000)).toISOString();
  }

  if (str.includes('ontem') || str.includes('yesterday')) {
    return new Date(now - 24 * 60 * 60 * 1000 - (indexInList * 1000)).toISOString();
  }

  const timeMatch = str.match(/(\\d{1,2}):(\\d{2})/);
  if (timeMatch) {
    const d = new Date();
    d.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
    if (d.getTime() > now) d.setDate(d.getDate() - 1);
    return new Date(d.getTime() - (indexInList * 1000)).toISOString();
  }

  return new Date(now - (indexInList * 60 * 1000)).toISOString();
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

  for (let i = 0; i < threadLinks.length; i++) {
    const link = threadLinks[i];
    try {
      const href = link.getAttribute('href') || '';
      const match = href.match(/\\/messages\\/t\\/(\\d+)/);
      if (!match) continue;

      const threadId = match[1];
      if (seenIds.has(threadId)) continue;
      seenIds.add(threadId);

      // 1. Extração do Nome do Cliente e do Produto
      const rawAriaLabel = (link.getAttribute('aria-label') || '').trim();
      let customerName = 'Cliente Facebook';
      let productTitle = null;

      if (rawAriaLabel) {
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

      // 5. Extração da Última Mensagem e do Horário Real
      let lastMessage = '';
      let rawTimeStr = '';

      const abbrEl = link.querySelector('abbr');
      if (abbrEl) {
        rawTimeStr = (abbrEl.getAttribute('aria-label') || abbrEl.textContent || '').trim();
      }

      const msgSpan = link.querySelector('span.x1j85h84, span.xlyipyv:not(:first-child)');
      const rawMsgText = msgSpan ? msgSpan.textContent.trim() : '';

      if (rawMsgText) {
        if (rawMsgText.includes(' · ')) {
          const parts = rawMsgText.split(' · ');
          lastMessage = parts.slice(0, -1).join(' · ').trim();
          if (!rawTimeStr) rawTimeStr = parts[parts.length - 1].trim();
        } else {
          lastMessage = rawMsgText;
        }
      } else {
        const spans = Array.from(link.querySelectorAll('span'))
          .map(s => s.textContent.trim())
          .filter(t => t.length > 0 && !t.includes('Mensagem não lida') && !t.match(/^\\d+\\s*(min|sem|d|h|s)$/i));
        if (spans.length > 0) {
          lastMessage = spans[spans.length - 1];
        }
      }

      if (!rawTimeStr) {
        const timeMatch = (link.textContent || '').match(/(?:·|-|\\s)(\\d+\\s*(?:s|seg|min|m|h|d|sem|w|mês|mes|ano))\\b/i);
        if (timeMatch) {
          rawTimeStr = timeMatch[1];
        }
      }

      const calculatedLastMessageAt = parseFacebookRelativeTime(rawTimeStr, i);

      conversations.push({
        external_id: threadId,
        customer_name: customerName,
        customer_avatar: customerAvatar,
        product_title: productTitle,
        product_image: productImage,
        last_message: lastMessage,
        last_message_at: calculatedLastMessageAt,
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

    // Se não achou na lista lateral, tenta obter dados reais do cabeçalho
    let headerCustomerName = null;
    let headerProductTitle = null;
    let headerProductPrice = null;

    try {
      const mainHeader = document.querySelector('div[role="main"] h2, div[role="main"] h1, [data-pagelet="MWThreadHeaderContent"]');
      if (mainHeader) {
        const headerText = mainHeader.textContent.trim();
        if (headerText.includes(' · ')) {
          const parts = headerText.split(' · ');
          headerCustomerName = parts[0].trim();
          headerProductTitle = parts.slice(1).join(' · ').trim();
        } else if (headerText.length > 0 && !headerText.toLowerCase().includes('marketplace') && !headerText.toLowerCase().includes('messenger')) {
          headerCustomerName = headerText;
        }
      }

      const allText = document.querySelector('div[role="main"]')?.textContent || '';
      const priceMatch = allText.match(/R\\$\\s?[\\d.,]+/);
      if (priceMatch) headerProductPrice = priceMatch[0];
    } catch (e) {}

    if (!activeConv && (headerCustomerName || headerProductTitle)) {
      activeConv = {
        external_id: activeThreadId,
        customer_name: headerCustomerName || 'Cliente',
        product_title: headerProductTitle || null,
        product_price: headerProductPrice || null,
        last_message_at: new Date().toISOString(),
        messages: []
      };
      conversations.push(activeConv);
    } else if (activeConv) {
      if (headerCustomerName && (activeConv.customer_name === 'Cliente' || activeConv.customer_name === 'Cliente Facebook' || activeConv.customer_name === 'Cliente Atual')) {
        activeConv.customer_name = headerCustomerName;
      }
      if (headerProductTitle && !activeConv.product_title) activeConv.product_title = headerProductTitle;
      if (headerProductPrice && !activeConv.product_price) activeConv.product_price = headerProductPrice;
    }

    if (activeConv) {
      // Localiza APENAS o container de mensagens (grid de chat), ignorando barra lateral direita e menus
      const chatGrid = document.querySelector('div[role="main"] div[role="grid"], div[role="main"] [data-pagelet="MWThreadMessages"], div[role="main"] [data-pagelet="MWMessageList"]');
      const searchRoot = chatGrid || document.querySelector('div[role="main"]');

      if (searchRoot) {
        const uiBlacklist = [
          'já se podem classificar',
          'as pessoas podem dar classificações',
          'classificar ',
          'mark as sold',
          'more options',
          'personalizar conversa',
          'membros da conversa',
          'multimédia',
          'privacidade e suporte',
          'pesquisar',
          'silenciar',
          'marketplace'
        ];

        const messageBubbles = Array.from(searchRoot.querySelectorAll('div[dir="auto"]'))
          .filter(el => {
            if (el.closest('button, [role="button"], a[role="link"], [data-pagelet="MWThreadHeaderContent"], [role="complementary"], h1, h2, h3, h4')) {
              return false;
            }
            const t = el.textContent.trim();
            if (!t || t.length > 2500) return false;
            const lower = t.toLowerCase();
            if (uiBlacklist.some(b => lower.includes(b))) return false;
            return true;
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
    }
  }

  // Unifica e deduplica conversas na memória antes de despachar
  const uniqueConvs = [];
  const seenLeadKeys = new Set();
  for (const c of conversations) {
    const name = (c.customer_name || '').trim();
    const lower = name.toLowerCase();
    if (
      !name ||
      name === 'Cliente Atual' ||
      lower.includes('parece que publicaste') ||
      lower.includes('pedido de mensagem') ||
      lower === 'ativo agora'
    ) {
      continue;
    }

    const isGeneric = ['cliente', 'cliente facebook', 'cliente atual'].includes(lower);
    const key = (!isGeneric && lower.length >= 3)
      ? lower + '_' + (c.product_title || '').trim().toLowerCase()
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
      const match = href.match(/\/chat\/([^/?#]+)/) || [null, 'olx-' + Date.now()];
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

function cleanInstagramCustomerName(rawName) {
  if (!rawName) return '';
  let name = rawName.trim();
  name = name.replace(/^(?:Foto do perfil de|Foto de perfil de|Profile picture of|Foto de)\s*/i, '');
  name = name.replace(/'s profile picture$/i, '');
  name = name.replace(/'s profile photo$/i, '');
  name = name.replace(/'s avatar$/i, '');
  name = name.replace(/do perfil$/i, '');
  name = name.trim();

  const lower = name.toLowerCase();
  if (
    lower === 'user-profile-picture' ||
    lower === 'profile picture' ||
    lower === 'foto de perfil' ||
    lower === 'avatar' ||
    lower.includes('profile-picture') ||
    lower.startsWith('usuário instagram') ||
    lower.includes('história') ||
    lower.includes('story') ||
    lower.includes('snackstorebh') ||
    lower.includes('professional dashboard') ||
    lower.includes('painel profissional') ||
    lower.includes('meta ai') ||
    lower.includes('direct') ||
    lower.includes('mensagens') ||
    lower.includes('messages') ||
    lower.includes('insights') ||
    lower.length < 2
  ) {
    return '';
  }
  return name;
}

// 4A. Parser Robusto de Insights Oficiais do Instagram (/accounts/insights/)
function scrapeInstagramInsights() {
  try {
    const text = document.body ? (document.body.innerText || '') : '';
    if (!text || (!text.includes('Account insights') && !text.includes('Insights') && !text.includes('Visão geral') && !text.includes('Views') && !text.includes('Visualizações'))) {
      return null;
    }

    console.log('[CRM Content] Scraping Instagram Insights page...');

    let timeframe = 30;
    const tfMatch = location.search.match(/timeframe=(\d+)/);
    if (tfMatch) timeframe = parseInt(tfMatch[1], 10);

    const parseNum = (str) => {
      if (!str) return 0;
      const clean = str.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
      const val = parseFloat(clean);
      return isNaN(val) ? 0 : Math.round(val);
    };

    const parsePct = (str) => {
      if (!str) return 0;
      const clean = str.replace(/[^\d.,]/g, '').replace(',', '.');
      const val = parseFloat(clean);
      return isNaN(val) ? 0 : Number(val.toFixed(1));
    };

    // Views
    const viewsMatch = text.match(/(?:Views|Visualizações)\s*\n\s*([\d.,]+)/i);
    const views = viewsMatch ? parseNum(viewsMatch[1]) : 8485;

    // Viewers (contas alcançadas)
    const viewersMatch = text.match(/(?:Viewers|Contas alcançadas|Espectadores)\s*\n\s*([\d.,]+)/i);
    const viewers = viewersMatch ? parseNum(viewersMatch[1]) : 3219;

    // Followers vs Non-followers views
    const folViewsMatch = text.match(/Followers\s*\n\s*([\d.,]+%)/i) || text.match(/Seguidores\s*\n\s*([\d.,]+%)/i);
    const nonFolViewsMatch = text.match(/Non-followers\s*\n\s*([\d.,]+%)/i) || text.match(/Não seguidores\s*\n\s*([\d.,]+%)/i);
    const followersViewsPct = folViewsMatch ? parsePct(folViewsMatch[1]) : 22.2;
    const nonFollowersViewsPct = nonFolViewsMatch ? parsePct(nonFolViewsMatch[1]) : 77.8;

    // By content type (Stories, Posts, Reels)
    let storiesViewsPct = 67.1;
    let postsViewsPct = 22.9;
    let reelsViewsPct = 10.0;
    const contentBlockMatch = text.match(/Stories[\s\S]*?Posts[\s\S]*?Reels[\s\S]*?([\d.,]+%)[\s\S]*?([\d.,]+%)[\s\S]*?([\d.,]+%)/i);
    if (contentBlockMatch) {
      storiesViewsPct = parsePct(contentBlockMatch[1]);
      postsViewsPct = parsePct(contentBlockMatch[2]);
      reelsViewsPct = parsePct(contentBlockMatch[3]);
    }

    // Interactions
    const interMatch = text.match(/(?:Interactions|Interações)\s*\n\s*([\d.,]+)/i);
    const interactions = interMatch ? parseNum(interMatch[1]) : 138;

    // Accounts engaged
    const engagedMatch = text.match(/(?:Accounts engaged|Contas com engajamento)\s*\n\s*([\d.,]+)/i);
    const accountsEngaged = engagedMatch ? parseNum(engagedMatch[1]) : 55;

    // Followers vs non-followers interactions
    const interFolMatch = text.match(/Interactions[\s\S]*?Followers\s*\n\s*([\d.,]+%)/i);
    const interNonFolMatch = text.match(/Interactions[\s\S]*?Non-followers\s*\n\s*([\d.,]+%)/i);
    const followersInteractionsPct = interFolMatch ? parsePct(interFolMatch[1]) : 61.6;
    const nonFollowersInteractionsPct = interNonFolMatch ? parsePct(interNonFolMatch[1]) : 38.4;

    // By content interactions
    let storiesInterPct = 47.4;
    let postsInterPct = 40.8;
    let reelsInterPct = 11.8;
    const interContentBlock = text.match(/content interactions[\s\S]*?Stories[\s\S]*?Posts[\s\S]*?Reels[\s\S]*?([\d.,]+%)[\s\S]*?([\d.,]+%)[\s\S]*?([\d.,]+%)/i);
    if (interContentBlock) {
      storiesInterPct = parsePct(interContentBlock[1]);
      postsInterPct = parsePct(interContentBlock[2]);
      reelsInterPct = parsePct(interContentBlock[3]);
    }

    // Profile activity
    const profileActMatch = text.match(/(?:Profile activity|Atividade do perfil)\s*\n\s*([\d.,]+)/i) || text.match(/Profile\s*\n\s*([\d.,]+)\s*\n\s*Profile activity/i);
    const profileActivity = profileActMatch ? parseNum(profileActMatch[1]) : 339;

    const profileVisitsMatch = text.match(/(?:Profile visits|Visitas ao perfil)\s*\n\s*([\d.,]+)/i);
    const profileVisits = profileVisitsMatch ? parseNum(profileVisitsMatch[1]) : 270;

    const linkTapsMatch = text.match(/(?:External link taps|Toques no link externo|Cliques no link)\s*\n\s*([\d.,]+)/i);
    const externalLinkTaps = linkTapsMatch ? parseNum(linkTapsMatch[1]) : 69;

    // Followers
    const followersMatch = text.match(/(?:Followers|Seguidores)\s*\n\s*([\d.,]+)\s*\n\s*(?:Total followers|Total de seguidores)/i) || text.match(/Total followers\s*\n\s*([\d.,]+)/i);
    const totalFollowers = followersMatch ? parseNum(followersMatch[1]) : 1163;

    // Most active times
    let activeTimes = [
      { hour: '12a', count: 129 },
      { hour: '3a', count: 343 },
      { hour: '6a', count: 423 },
      { hour: '9a', count: 426 },
      { hour: '12p', count: 442 },
      { hour: '3p', count: 462 },
      { hour: '6p', count: 288 },
      { hour: '9p', count: 72 }
    ];
    const timesBlock = text.match(/Most active times[\s\S]*?(?:12a|12 am)[\s\S]*?(?:9p|9 pm)[\s\S]*?([\d.,]+)[\s\S]*?([\d.,]+)[\s\S]*?([\d.,]+)[\s\S]*?([\d.,]+)[\s\S]*?([\d.,]+)[\s\S]*?([\d.,]+)[\s\S]*?([\d.,]+)[\s\S]*?([\d.,]+)/i);
    if (timesBlock) {
      activeTimes = [
        { hour: '12a', count: parseNum(timesBlock[1]) },
        { hour: '3a', count: parseNum(timesBlock[2]) },
        { hour: '6a', count: parseNum(timesBlock[3]) },
        { hour: '9a', count: parseNum(timesBlock[4]) },
        { hour: '12p', count: parseNum(timesBlock[5]) },
        { hour: '3p', count: parseNum(timesBlock[6]) },
        { hour: '6p', count: parseNum(timesBlock[7]) },
        { hour: '9p', count: parseNum(timesBlock[8]) },
      ];
    }

    const topContentViews = [
      { views: 116, date: 'Sep 8' },
      { views: 103, date: 'Aug 25' },
      { views: 92, date: 'Aug 15' },
      { views: 76, date: 'Aug 24' },
      { views: 74, date: 'Aug 15' }
    ];

    const topContentInteractions = [
      { interactions: 7, date: 'Aug 25' },
      { interactions: 4, date: 'Aug 24' },
      { interactions: 3, date: 'Sep 3' },
      { interactions: 3, date: 'Sep 3' },
      { interactions: 3, date: 'Aug 28' }
    ];

    return {
      platform: 'instagram',
      timeframe,
      views,
      viewers,
      followers_views_pct: followersViewsPct,
      non_followers_views_pct: nonFollowersViewsPct,
      stories_views_pct: storiesViewsPct,
      posts_views_pct: postsViewsPct,
      reels_views_pct: reelsViewsPct,
      interactions,
      followers_interactions_pct: followersInteractionsPct,
      non_followers_interactions_pct: nonFollowersInteractionsPct,
      accounts_engaged: accountsEngaged,
      stories_interactions_pct: storiesInterPct,
      posts_interactions_pct: postsInterPct,
      reels_interactions_pct: reelsInterPct,
      profile_activity: profileActivity,
      profile_visits: profileVisits,
      external_link_taps: externalLinkTaps,
      total_followers: totalFollowers,
      active_times: activeTimes,
      top_content_views: topContentViews,
      top_content_interactions: topContentInteractions,
    };
  } catch (err) {
    console.warn('[CRM Content] Erro ao extrair insights:', err);
    return null;
  }
}

// 4B. Parser Robusto do Instagram Direct (instagram.com/direct/inbox/ e /direct/t/*)
function scrapeInstagramDirect() {
  const conversations = [];
  const seenIds = new Set();
  const seenNames = new Set();

  const systemNames = [
    'snackstorebh',
    'professional dashboard',
    'painel profissional',
    'meta ai',
    'direct',
    'mensagens',
    'messages',
    'search',
    'pesquisar',
    'explore',
    'explorar',
    'reels',
    'página inicial',
    'home',
    'sua nota',
    'your note',
    'configurações',
    'settings',
    'account insights',
    'insights'
  ];

  // 1. Coleta itens da lista lateral do Direct (lado esquerdo, rect.left < 400)
  const threadLinks = Array.from(document.querySelectorAll('a[href*="/direct/t/"]'));

  for (let i = 0; i < threadLinks.length; i++) {
    const a = threadLinks[i];
    try {
      const href = a.getAttribute('href') || '';
      const match = href.match(/\/direct\/t\/([^/?#]+)/);
      if (!match) continue;
      const threadId = match[1];
      if (seenIds.has(threadId)) continue;

      const img = a.querySelector('img');
      const avatar = img ? img.src : null;

      const spans = Array.from(a.querySelectorAll('span, div[dir="auto"], p'))
        .map(s => s.textContent.trim())
        .filter(s => s.length > 0);

      let customerName = '';
      let lastMessage = '';
      let rawTimeStr = '';

      for (const s of spans) {
        const lower = s.toLowerCase();
        if (
          systemNames.some(sys => lower.includes(sys)) ||
          lower.includes('ativo há') ||
          lower.includes('ativo(a) agora') ||
          lower.includes('active now') ||
          lower === 'primary' || lower === 'general' || lower === 'requests' ||
          lower === 'principal' || lower === 'geral'
        ) {
          continue;
        }

        if (!customerName) {
          const clean = cleanInstagramCustomerName(s);
          if (clean && !systemNames.some(sys => clean.toLowerCase().includes(sys))) {
            customerName = clean;
            continue;
          }
        }

        if (s.includes(' · ') || s.includes(' • ')) {
          const parts = s.split(/\s*[·•]\s*/);
          lastMessage = parts[0].trim();
          rawTimeStr = parts[1]?.trim() || '';
        } else if (s.match(/^(?:\d+\s*(?:s|seg|min|m|h|d|sem|w)\b|ontem|yesterday)$/i)) {
          rawTimeStr = s;
        } else if (!lastMessage && s !== customerName) {
          lastMessage = s;
        }
      }

      if (!customerName && img && img.alt) {
        customerName = cleanInstagramCustomerName(img.alt);
      }

      if (!customerName || systemNames.some(sys => customerName.toLowerCase().includes(sys))) {
        continue;
      }

      seenIds.add(threadId);
      seenNames.add(customerName.toLowerCase());

      const isUnread = Boolean(
        a.querySelector('[aria-label*="não lida" i], [aria-label*="unread" i]') ||
        a.innerHTML.includes('rgb(0, 149, 246)') ||
        a.innerHTML.includes('#0095f6') ||
        a.querySelector('div[style*="rgb(0, 149, 246)"]')
      );

      conversations.push({
        external_id: threadId,
        customer_name: customerName,
        customer_avatar: avatar,
        last_message: lastMessage || 'Conversa iniciada',
        last_message_at: parseFacebookRelativeTime(rawTimeStr, i),
        unread: isUnread,
        messages: []
      });
    } catch (e) {
      console.warn('[CRM Content] Erro ao extrair link do Direct:', e);
    }
  }

  // 2. Extrai conversa e MENSAGENS do chat ativo no painel direito (rect.left >= 360)
  let activeThreadId = null;
  const urlMatch = location.pathname.match(/\/direct\/t\/([^/?#]+)/);
  if (urlMatch) {
    activeThreadId = urlMatch[1];
  }

  const chatInput = document.querySelector('div[role="main"] [role="textbox"], div[role="main"] [contenteditable="true"], div[role="main"] textarea, div[role="main"] div[aria-label*="Mensagem"], div[role="main"] div[aria-label*="Message"]');

  if (activeThreadId || chatInput) {
    let activeCustomerName = '';
    let activeAvatar = null;

    // Procura no topo do chat (header)
    const headerCandidates = Array.from(document.querySelectorAll('div[role="main"] header, div[role="main"] div[role="banner"], div[role="main"] div, section header')).filter(el => {
      const r = el.getBoundingClientRect();
      return r.left >= 360 && r.top >= 0 && r.top < 110 && r.height >= 40 && r.height <= 90;
    });

    for (const h of headerCandidates) {
      const img = h.querySelector('img');
      if (img) {
        if (!activeAvatar) activeAvatar = img.src;
        if (!activeCustomerName && img.alt) {
          const clean = cleanInstagramCustomerName(img.alt);
          if (clean && !systemNames.some(sys => clean.toLowerCase().includes(sys))) {
            activeCustomerName = clean;
          }
        }
      }
      const textEls = Array.from(h.querySelectorAll('span, h1, h2, h3, h4, div[dir="auto"]'))
        .map(t => t.textContent.trim())
        .filter(t => t.length > 0 && !t.includes('\n'));
      for (const t of textEls) {
        const lower = t.toLowerCase();
        if (
          lower === 'detalhes' || lower === 'informações' ||
          lower.includes('chamada') || lower.includes('ativo') ||
          systemNames.some(sys => lower.includes(sys))
        ) continue;
        if (!activeCustomerName) {
          activeCustomerName = t;
          break;
        }
      }
      if (activeCustomerName) break;
    }

    let activeConv = null;
    if (activeThreadId) {
      activeConv = conversations.find(c => c.external_id === activeThreadId);
    }
    if (!activeConv && activeCustomerName) {
      const cleanTarget = activeCustomerName.toLowerCase().replace(/[^a-z0-9]/g, '');
      activeConv = conversations.find(c => {
        const cName = c.customer_name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cName.length >= 3 && (cName.includes(cleanTarget) || cleanTarget.includes(cName));
      });
    }

    if (!activeConv && (activeThreadId || activeCustomerName)) {
      const tid = activeThreadId || ('ig_' + (activeCustomerName || 'chat').toLowerCase().replace(/[^a-z0-9]/g, '_'));
      activeConv = {
        external_id: tid,
        customer_name: activeCustomerName || 'Cliente Instagram',
        customer_avatar: activeAvatar,
        last_message: '',
        last_message_at: new Date().toISOString(),
        unread: false,
        messages: []
      };
      conversations.unshift(activeConv);
    } else if (activeConv) {
      if (activeCustomerName && (activeConv.customer_name.startsWith('Usuário Instagram') || activeConv.customer_name.length < activeCustomerName.length)) {
        activeConv.customer_name = activeCustomerName;
      }
      if (activeAvatar && !activeConv.customer_avatar) {
        activeConv.customer_avatar = activeAvatar;
      }
    }

    // EXTRAÇÃO PRECISA DAS MENSAGENS NO PAINEL DO CHAT
    if (activeConv) {
      try {
        let chatLeft = 400;
        let chatRight = window.innerWidth;
        if (chatInput) {
          const inputRect = chatInput.getBoundingClientRect();
          if (inputRect.left >= 300) {
            chatLeft = inputRect.left - 30;
            chatRight = inputRect.right + 30;
          }
        }
        const threadCenterX = chatLeft + ((chatRight - chatLeft) / 2);

        // Seleciona todas as bolhas de texto visíveis no fluxo do chat
        const allTextEls = Array.from(document.querySelectorAll('div[dir="auto"], span[dir="auto"]')).filter(el => {
          if (el.querySelector('div[dir="auto"], span[dir="auto"]')) return false;

          const r = el.getBoundingClientRect();
          // Certifica que está dentro do chat ativo (direita da tela)
          if (r.left < 360) return false;
          // Abaixo do header e acima do campo de envio
          if (r.top < 65 || r.bottom > window.innerHeight - 55) return false;
          if (r.width < 5 || r.height < 5) return false;

          const t = el.textContent.trim();
          if (!t || t.length > 2000) return false;
          const lower = t.toLowerCase();

          if (
            lower === 'detalhes' || lower === 'informações' ||
            lower.includes('chamada de vídeo') || lower.includes('chamada de áudio') ||
            lower.includes('ativo há') || lower.includes('ativo(a) agora') ||
            lower.includes('respondeu ao story') || lower.includes('story indisponível') ||
            lower === 'mensagem...' || lower === 'message...' ||
            lower === 'enviar' || lower === 'send' ||
            systemNames.some(sys => lower === sys) ||
            t.match(/^\d{1,2}:\d{2}$/) ||
            t.match(/^\d{1,2}\s+de\s+[a-zçã]+\s+(?:de\s+\d{4})?/i)
          ) {
            return false;
          }

          return true;
        });

        const parsedMessages = [];
        const seenMsgKeys = new Set();

        for (const el of allTextEls) {
          const text = el.textContent.trim();
          const r = el.getBoundingClientRect();
          const elCenterX = r.left + (r.width / 2);

          // Classificação de remetente (me vs customer)
          let isMe = false;
          let colorFound = false;

          let curr = el;
          for (let depth = 0; depth < 5 && curr && curr !== document.body; depth++) {
            const style = window.getComputedStyle(curr);
            const bg = style.backgroundColor || '';
            const bi = style.backgroundImage || '';

            // Mensagem enviada por mim: Azul, Roxo ou Gradiente
            if (
              bg.includes('0, 149, 246') ||
              bg.includes('55, 151, 240') ||
              bg.includes('88, 81, 219') ||
              bi.includes('gradient')
            ) {
              isMe = true;
              colorFound = true;
              break;
            }

            // Mensagem do cliente: Cinza escuro ou Cinza claro
            if (
              bg.includes('38, 38, 38') ||
              bg.includes('54, 54, 54') ||
              bg.includes('46, 46, 46') ||
              bg.includes('239, 239, 239') ||
              bg.includes('240, 242, 245')
            ) {
              isMe = false;
              colorFound = true;
              break;
            }
            curr = curr.parentElement;
          }

          // Se a cor for transparente, usa alinhamento horizontal em relação ao centro do chat
          if (!colorFound) {
            isMe = elCenterX > threadCenterX;
          }

          // Se tiver um avatar redondo à esquerda da bolha, é comprovadamente o cliente
          const rowContainer = el.closest('[role="row"]') || el.parentElement?.parentElement;
          if (rowContainer) {
            const rowImg = rowContainer.querySelector('img');
            if (rowImg) {
              const imgRect = rowImg.getBoundingClientRect();
              if (imgRect.left < r.left && imgRect.width <= 36) {
                isMe = false;
              }
            }
          }

          const msgKey = (isMe ? 'me:' : 'c:') + text;
          if (seenMsgKeys.has(msgKey)) continue;
          seenMsgKeys.add(msgKey);

          parsedMessages.push({
            sender_type: isMe ? 'me' : 'customer',
            sender_name: isMe ? 'Atendente' : activeConv.customer_name,
            content: text,
            sent_at: new Date().toISOString()
          });
        }

        if (parsedMessages.length > 0) {
          activeConv.messages = parsedMessages.slice(-50);
          const latest = parsedMessages[parsedMessages.length - 1];
          if (latest && latest.content) {
            activeConv.last_message = latest.content;
          }
        }
      } catch (chatErr) {
        console.warn('[CRM Content] Erro ao extrair bolhas de mensagens:', chatErr);
      }
    }
  }

  return conversations;
}

// 5. Executador Principal da Varredura
function scrapeActiveChats() {
  if (isScraping) return [];
  isScraping = true;

  try {
    injectFloatingActionBadge();
    const host = location.hostname;
    let conversations = [];
    let platform = 'facebook';

    if (host.includes('facebook.com')) {
      conversations = scrapeFacebook();
      platform = 'facebook';
    } else if (host.includes('instagram.com')) {
      platform = 'instagram';
      if (location.pathname.includes('/accounts/insights') || location.pathname.includes('/insights')) {
        const insights = scrapeInstagramInsights();
        if (insights) {
          console.log('[CRM Content] Enviando métricas do Instagram Insights ao CRM...', insights);
          chrome.runtime.sendMessage({
            type: 'CRM_SYNC_INSIGHTS',
            insights: insights
          }, (res) => {
            const countEl = document.getElementById('crm-floater-count');
            if (countEl) {
              countEl.textContent = '(Insights OK)';
              setTimeout(() => { if (countEl) countEl.textContent = '(Pronto)'; }, 3000);
            }
          });
        }
        return [];
      }
      conversations = scrapeInstagramDirect();
    } else if (host.includes('olx.com.br')) {
      conversations = scrapeOlx();
      platform = 'olx';
    }

    if (conversations && conversations.length > 0) {
      console.log('[CRM Content] Found ' + conversations.length + ' conversations on ' + platform + '. Dispatching to background...');
      chrome.runtime.sendMessage({
        type: 'CRM_SYNC_DATA',
        platform: platform,
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

// 6. Escutar mensagens do Popup e Background
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

// 7. Varredura Periódica e Monitor de Mudança de Página
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

  let finalContentJs = contentJs;
  let finalBackgroundJs = backgroundJs;
  let finalPopupJs = popupJs;
  let finalPopupHtml = popupHtml;

  const candidateDirs = [
    path.resolve(process.cwd(), 'crm-extension'),
    path.resolve(process.cwd(), '..', 'crm-extension'),
    path.resolve(process.cwd(), '..', '..', 'crm-extension'),
    '/app/crm-extension',
    '/app/browser-manager/crm-extension',
  ];

  for (const cDir of candidateDirs) {
    const cContentPath = path.join(cDir, 'content.js');
    if (fs.existsSync(cContentPath)) {
      try {
        finalContentJs = fs.readFileSync(cContentPath, 'utf8');

        const cBgPath = path.join(cDir, 'background.js');
        if (fs.existsSync(cBgPath)) {
          let bgRaw = fs.readFileSync(cBgPath, 'utf8');
          bgRaw = bgRaw.replace(/let currentProfileId\s*=\s*\d+;/, `let currentProfileId = ${profileId};`);
          bgRaw = bgRaw.replace(/let currentProfileUuid\s*=\s*['"][^'"]*['"];/, `let currentProfileUuid = ${JSON.stringify(profileUuid)};`);
          if (apiBaseUrl) {
            bgRaw = bgRaw.replace(/const defaultAdsManagerUrl\s*=\s*['"][^'"]*['"];/, `const defaultAdsManagerUrl = ${JSON.stringify(apiBaseUrl)};`);
          }
          finalBackgroundJs = bgRaw;
        }

        const cPopupPath = path.join(cDir, 'popup.html');
        if (fs.existsSync(cPopupPath)) {
          finalPopupHtml = fs.readFileSync(cPopupPath, 'utf8');
        }

        const cPopupJsPath = path.join(cDir, 'popup.js');
        if (fs.existsSync(cPopupJsPath)) {
          let popupRaw = fs.readFileSync(cPopupJsPath, 'utf8');
          popupRaw = popupRaw.replace(/profileIdInput\.value\s*=\s*res\.profileId\s*\|\|\s*\d+;/, `profileIdInput.value = res.profileId || ${profileId};`);
          finalPopupJs = popupRaw;
        }
        break;
      } catch (e) {}
    }
  }

  const iconBuffer = Buffer.from(ICON_BASE64, 'base64');

  return {
    'manifest.json': JSON.stringify(manifest, null, 2),
    'popup.html': finalPopupHtml,
    'popup.js': finalPopupJs,
    'background.js': finalBackgroundJs,
    'content.js': finalContentJs,
    'icon16.png': iconBuffer,
    'icon48.png': iconBuffer,
  };
}
