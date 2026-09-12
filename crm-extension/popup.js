
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

  const defaultApiUrl = 'https://adsmanager-adsmanagerapp.ahzgvk.easypanel.host';
  const defaultN8nUrl = 'https://plug-sales-dispatch-app-n8n-2.hx8235.easypanel.host/webhook/adsmanager';

  chrome.storage.local.get(['apiUrl', 'n8nWebhookUrl', 'profileId', 'lastSyncAt', 'lastSyncCount'], (res) => {
    let url = res.apiUrl || "https://adsmanager-adsmanagerapp.ahzgvk.easypanel.host" || defaultApiUrl;
    if (!url || url.includes('172.17.') || url.includes('localhost')) {
      url = defaultApiUrl;
    }
    apiUrlInput.value = url;
    n8nWebhookInput.value = res.n8nWebhookUrl || defaultN8nUrl;
    profileIdInput.value = res.profileId || 1;

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

  // 1. Salvar configurações
  saveBtn.addEventListener('click', () => {
    let apiUrl = apiUrlInput.value.trim().replace(/\/+$/, '').replace(/\/crm\/?$/i, '').replace(/\/api\/?$/i, '');
    if (!apiUrl || apiUrl.includes('172.17.') || apiUrl.includes('localhost')) {
      apiUrl = defaultApiUrl;
      apiUrlInput.value = apiUrl;
    }
    const n8nWebhookUrl = n8nWebhookInput.value.trim() || defaultN8nUrl;
    const profileId = parseInt(profileIdInput.value, 10) || 1;

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
      profile_id: parseInt(profileIdInput.value, 10) || 1,
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
    let apiUrl = apiUrlInput.value.trim().replace(/\/+$/, '').replace(/\/crm\/?$/i, '').replace(/\/api\/?$/i, '') || defaultApiUrl;
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
