
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

  badge.innerHTML = `
    <span style="width: 9px; height: 9px; border-radius: 50%; background: #10b981; display: inline-block; box-shadow: 0 0 10px #10b981; animation: pulse 2s infinite;"></span>
    <span style="font-weight: 700; color: #f8fafc; letter-spacing: -0.2px;">⚡ Sincronizar CRM</span>
    <span id="crm-floater-count" style="background: #1e293b; color: #94a3b8; padding: 2px 7px; border-radius: 10px; font-size: 11px;">(Pronto)</span>
  `;

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

  const timePartMatch = str.match(/(?:·|-|\s|^)(\d+)\s*(s|seg|min|m|h|hora|horas|d|dia|dias|sem|semana|semanas|mês|mes|meses|a|ano|anos)(?:\b|$)/i);
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

  const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
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
      const match = href.match(/\/messages\/t\/(\d+)/);
      if (!match) continue;

      const threadId = match[1];
      if (seenIds.has(threadId)) continue;
      seenIds.add(threadId);

      // 1. Extração do Nome do Cliente e do Produto
      const rawAriaLabel = (link.getAttribute('aria-label') || '').trim();
      let customerName = 'Cliente Facebook';
      let productTitle = null;

      if (rawAriaLabel) {
        const clean = rawAriaLabel.replace(/^(?:Conversa de grupo|Group conversation|Conversa com|Conversa|Chat)\s*:?\s*/i, '').trim();
        
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
      const avatarSvgImage = link.querySelector('image[*|href], image[xlink\\:href]');
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
          .filter(t => t.length > 0 && !t.includes('Mensagem não lida') && !t.match(/^\d+\s*(min|sem|d|h|s)$/i));
        if (spans.length > 0) {
          lastMessage = spans[spans.length - 1];
        }
      }

      if (!rawTimeStr) {
        const timeMatch = (link.textContent || '').match(/(?:·|-|\s)(\d+\s*(?:s|seg|min|m|h|d|sem|w|mês|mes|ano))\b/i);
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
  const matchCurrent = currentUrl.match(/\/messages\/t\/(\d+)/);
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
      const priceMatch = allText.match(/R\$\s?[\d.,]+/);
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

// 4. Parser do Instagram Direct (instagram.com/direct/inbox/ e /direct/t/*)
function scrapeInstagram() {
  const conversations = [];
  const seenIds = new Set();

  // Links da lista lateral de conversas do Direct
  const threadLinks = Array.from(document.querySelectorAll('a[href*="/direct/t/"]'));

  for (let i = 0; i < threadLinks.length; i++) {
    const link = threadLinks[i];
    try {
      const href = link.getAttribute('href') || '';
      const match = href.match(/\/direct\/t\/([^/?#]+)/);
      if (!match) continue;

      const threadId = match[1];
      if (seenIds.has(threadId)) continue;
      seenIds.add(threadId);

      // Nome do perfil / Usuário
      let customerName = 'Usuário Instagram';
      const spans = Array.from(link.querySelectorAll('span')).map(s => s.textContent.trim()).filter(Boolean);
      if (spans.length > 0) {
        // Geralmente o primeiro span com texto não numérico é o nome
        const nameCandidate = spans.find(s => !s.match(/^\d+\s*(m|h|d|sem|s)$/i) && !s.toLowerCase().includes('ativo'));
        if (nameCandidate) customerName = nameCandidate;
      }

      // Avatar
      const img = link.querySelector('img');
      const customerAvatar = img ? img.src : null;

      // Última mensagem e tempo relativo
      let lastMessage = '';
      let rawTimeStr = '';

      for (const text of spans) {
        if (text.match(/(?:·|-|\s|^)(\d+)\s*(s|seg|min|m|h|hora|horas|d|dia|dias|sem|semana|semanas|mês|mes|meses|a|ano|anos)(?:\b|$)/i)) {
          rawTimeStr = text;
        } else if (text !== customerName && text.length > 1 && !text.toLowerCase().includes('ativo')) {
          lastMessage = text;
        }
      }

      const calculatedTime = parseFacebookRelativeTime(rawTimeStr, i);

      // Verificar se há ponto azul / não lida
      const isUnread = Boolean(
        link.querySelector('[aria-label*="não lida"], [aria-label*="unread"]') ||
        link.innerHTML.includes('background-color: rgb(0, 149, 246)') ||
        link.innerHTML.includes('rgb(0, 149, 246)')
      );

      conversations.push({
        external_id: threadId,
        customer_name: customerName,
        customer_avatar: customerAvatar,
        last_message: lastMessage,
        last_message_at: calculatedTime,
        unread: isUnread,
        messages: []
      });
    } catch (e) {
      console.warn('[CRM Content] Erro ao analisar conversa do Instagram:', e);
    }
  }

  // Se estiver com um chat específico aberto no Direct (/direct/t/:threadId)
  const currentUrl = location.href;
  const matchCurrent = currentUrl.match(/\/direct\/t\/([^/?#]+)/);
  const activeThreadId = matchCurrent ? matchCurrent[1] : null;

  if (activeThreadId) {
    let activeConv = conversations.find(c => c.external_id === activeThreadId);

    // Pegar nome do cabeçalho da conversa se disponível
    const headerTitleEl = document.querySelector('div[role="main"] h2, div[role="main"] h1, div[role="main"] header span');
    const headerName = headerTitleEl ? headerTitleEl.textContent.trim() : null;

    if (!activeConv) {
      activeConv = {
        external_id: activeThreadId,
        customer_name: headerName || 'Usuário Instagram',
        customer_avatar: null,
        last_message: '',
        last_message_at: new Date().toISOString(),
        messages: []
      };
      conversations.push(activeConv);
    } else if (headerName && activeConv.customer_name === 'Usuário Instagram') {
      activeConv.customer_name = headerName;
    }

    // Extrair mensagens da tela do chat ativo
    try {
      const msgElements = Array.from(document.querySelectorAll('div[role="main"] div[dir="auto"], div[role="main"] span[dir="auto"]'));
      const parsedMessages = [];

      for (const el of msgElements) {
        const text = el.textContent.trim();
        if (!text || text.length === 0) continue;

        // Ignorar textos de cabeçalho / botões comuns do Instagram
        const lower = text.toLowerCase();
        if (
          lower === 'detalhes' ||
          lower === 'informações' ||
          lower.includes('chamada de vídeo') ||
          lower.includes('chamada de áudio') ||
          lower.includes('ativo há') ||
          lower.includes('ativo(a) agora')
        ) {
          continue;
        }

        let isMe = false;
        const rect = el.getBoundingClientRect();
        // Mensagens enviadas pelo usuário ficam alinhadas à direita da tela de chat
        if (rect.right > window.innerWidth * 0.58) {
          isMe = true;
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
    } catch (e) {
      console.warn('[CRM Content] Erro ao extrair mensagens do chat do Instagram:', e);
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
      conversations = scrapeInstagram();
      platform = 'instagram';
    } else if (host.includes('olx.com.br')) {
      conversations = scrapeOlx();
      platform = 'olx';
    }

    if (conversations && conversations.length > 0) {
      console.log(`[CRM Content] Encontradas ${conversations.length} conversas no ${platform}. Enviando ao CRM...`);
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
