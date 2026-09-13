
const defaultAdsManagerUrl = 'https://adsmanager-adsmanagerapp.ahzgvk.easypanel.host';
const defaultN8nWebhookUrl = 'https://plug-sales-dispatch-app-n8n-2.hx8235.easypanel.host/webhook/adsmanager';

let currentProfileId = 1;
let currentProfileUuid = "default";
let currentApiUrl = defaultAdsManagerUrl;
let currentN8nUrl = defaultN8nWebhookUrl;

function sanitizeApiUrl(raw) {
  if (!raw) return defaultAdsManagerUrl;
  let u = raw.trim().replace(/\/+$/, '');
  u = u.replace(/\/api\/crm\/webhook\/?$/i, '');
  u = u.replace(/\/api\/crm\/conversations\/?$/i, '');
  u = u.replace(/\/api\/crm\/?$/i, '');
  u = u.replace(/\/crm\/?$/i, '');
  u = u.replace(/\/api\/?$/i, '');
  u = u.replace(/\/+$/, '');
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
    if (changes.profileId) currentProfileId = changes.profileId.newValue || 1;
    if (changes.profileUuid) currentProfileUuid = changes.profileUuid.newValue || 'default';
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
