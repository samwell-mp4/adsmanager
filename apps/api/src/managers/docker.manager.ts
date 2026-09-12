import Docker from 'dockerode';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import { BrowserProfile, BrowserProxy, ProfileStatus } from '../types/index.js';

export class DockerManager {
  private docker: Docker;

  constructor() {
    this.docker = new Docker({ socketPath: config.dockerSocket });
  }

  getDocker(): Docker {
    return this.docker;
  }

  private cachedHostIp: string | null = null;
  private cachedNetworkName: string | null = null;

  /**
   * Discovers the network name of this API container
   */
  async getApiNetworkName(): Promise<string | null> {
    if (this.cachedNetworkName !== null) return this.cachedNetworkName;

    try {
      const os = await import('os');
      const selfContainer = this.docker.getContainer(os.hostname());
      const data = await selfContainer.inspect();
      const networks = Object.keys(data.NetworkSettings?.Networks || {});
      const customNet = networks.find((n) => n !== 'bridge' && n !== 'host' && n !== 'none');
      this.cachedNetworkName = customNet || networks[0] || null;
      console.log(`[DockerManager] Detected API container network: ${this.cachedNetworkName}`);
      return this.cachedNetworkName;
    } catch (e: any) {
      this.cachedNetworkName = null;
      return null;
    }
  }

  /**
   * Discovers the host IP to reach published container ports from inside this container
   */
  async getHostGatewayIp(): Promise<string> {
    if (this.cachedHostIp) return this.cachedHostIp;

    if (process.env.DOCKER_HOST_IP) {
      this.cachedHostIp = process.env.DOCKER_HOST_IP;
      return this.cachedHostIp;
    }

    try {
      const os = await import('os');
      const selfContainer = this.docker.getContainer(os.hostname());
      const data = await selfContainer.inspect();
      const networks = data.NetworkSettings?.Networks || {};
      for (const netName of Object.keys(networks)) {
        if (networks[netName]?.Gateway) {
          this.cachedHostIp = networks[netName].Gateway;
          console.log(`[DockerManager] Detected Docker host gateway IP: ${this.cachedHostIp} on network ${netName}`);
          return this.cachedHostIp;
        }
      }
      if (data.NetworkSettings?.Gateway) {
        this.cachedHostIp = data.NetworkSettings.Gateway;
        return this.cachedHostIp;
      }
    } catch (e: any) {
      // Not in Docker or inspect failed
    }

    this.cachedHostIp = process.platform === 'linux' ? '172.17.0.1' : '127.0.0.1';
    return this.cachedHostIp;
  }

  /**
   * Resolves target endpoint for a given noVNC port
   */
  async getTargetForPort(port: number): Promise<string> {
    try {
      const containers = await this.docker.listContainers();
      for (const c of containers) {
        const hasPort = c.Ports && c.Ports.some((p) => p.PublicPort === port);
        if (hasPort) {
          const networks = c.NetworkSettings?.Networks || {};
          const ip = Object.values(networks)[0]?.IPAddress;
          if (ip) {
            return `http://${ip}:6080`;
          }
          const name = c.Names[0]?.replace(/^\//, '');
          if (name) {
            return `http://${name}:6080`;
          }
        }
      }
    } catch (e: any) {
      console.warn('[DockerManager] Error finding target for port:', e.message);
    }

    const hostIp = await this.getHostGatewayIp();
    return `http://${hostIp}:${port}`;
  }

  /**
   * Resolves target endpoint for a given CDP port
   */
  async getCdpTargetForPort(port: number): Promise<string> {
    try {
      const containers = await this.docker.listContainers();
      for (const c of containers) {
        const hasPort = c.Ports && c.Ports.some((p) => p.PublicPort === port);
        if (hasPort) {
          const networks = c.NetworkSettings?.Networks || {};
          const ip = Object.values(networks)[0]?.IPAddress;
          if (ip) {
            return `http://${ip}:9222`;
          }
          const name = c.Names[0]?.replace(/^\//, '');
          if (name) {
            return `http://${name}:9222`;
          }
        }
      }
    } catch (e: any) {
      console.warn('[DockerManager] Error finding CDP target for port:', e.message);
    }

    const hostIp = await this.getHostGatewayIp();
    return `http://${hostIp}:${port}`;
  }

  /**
   * Health check for Docker engine
   */
  async ping(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch (err: any) {
      console.error('[DockerManager] Docker ping failed:', err.message);
      return false;
    }
  }

  /**
   * Ensures the browser-profile image exists, builds it if not
   */
  async ensureImageExists(): Promise<void> {
    try {
      const images = await this.docker.listImages();
      const hasImage = images.some(img => img.RepoTags && img.RepoTags.includes(config.browserImage));
      
      if (!hasImage) {
        console.log(`[DockerManager] Image ${config.browserImage} not found. Building from source...`);
        console.log(`[DockerManager] This may take a few minutes depending on your VPS speed.`);
        
        // Use dynamic import for tar-fs to avoid top-level require issues
        // @ts-ignore
        const tarFs = await import('tar-fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        let dockerDir = path.resolve(__dirname, '../../../../docker/browser');
        if (!fs.existsSync(dockerDir)) {
          dockerDir = path.resolve(process.cwd(), 'docker/browser');
        }
        if (!fs.existsSync(dockerDir)) {
          dockerDir = path.resolve(process.cwd(), '../../docker/browser');
        }
        
        const stream = await this.docker.buildImage(tarFs.default.pack(dockerDir), {
          t: config.browserImage
        });
        
        await new Promise((resolve, reject) => {
          this.docker.modem.followProgress(
            stream, 
            (err, res) => err ? reject(err) : resolve(res),
            (event) => {
              if (event.stream) process.stdout.write(event.stream);
            }
          );
        });
        console.log(`[DockerManager] Image ${config.browserImage} built successfully!`);
      } else {
        console.log(`[DockerManager] Image ${config.browserImage} is present.`);
      }
    } catch (err: any) {
      console.error(`[DockerManager] Failed to ensure image exists:`, err.message);
    }
  }

  /**
   * Creates and starts a container for a browser profile
   */
  async createProfileContainer(
    profile: BrowserProfile,
    proxy: BrowserProxy | null,
    ports: { novncPort: number; vncPort: number; cdpPort: number }
  ): Promise<string> {
    const containerName = `browser-profile-${profile.uuid}`;

    // Ensure host data directory and custom_extensions exist with full permissions
    try {
      if (!fs.existsSync(profile.chrome_data_path)) {
        fs.mkdirSync(profile.chrome_data_path, { recursive: true, mode: 0o777 });
      }
      const customExtDir = path.join(profile.chrome_data_path, 'custom_extensions');
      if (!fs.existsSync(customExtDir)) {
        fs.mkdirSync(customExtDir, { recursive: true, mode: 0o777 });
      }
      fs.chmodSync(profile.chrome_data_path, 0o777);
      fs.chmodSync(customExtDir, 0o777);

      // Auto-inject Chrome Proxy Authentication Extension for bulletproof credentials handling
      if (proxy && proxy.username && proxy.password) {
        try {
          const proxyExtDir = path.join(customExtDir, '__proxy_auth');
          if (!fs.existsSync(proxyExtDir)) {
            fs.mkdirSync(proxyExtDir, { recursive: true, mode: 0o777 });
          }
          const manifestJson = {
            version: '1.0.0',
            manifest_version: 2,
            name: 'Chrome Proxy Auth',
            permissions: ['proxy', 'webRequest', 'webRequestBlocking', '<all_urls>'],
            background: {
              scripts: ['background.js'],
            },
            minimum_chrome_version: '22.0.0',
          };
          fs.writeFileSync(path.join(proxyExtDir, 'manifest.json'), JSON.stringify(manifestJson, null, 2));
          const backgroundJs = `
chrome.webRequest.onAuthRequired.addListener(
  function(details) {
    return {
      authCredentials: {
        username: ${JSON.stringify(proxy.username)},
        password: ${JSON.stringify(proxy.password)}
      }
    };
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);
`;
          fs.writeFileSync(path.join(proxyExtDir, 'background.js'), backgroundJs);
          fs.chmodSync(proxyExtDir, 0o777);
          console.log(`[DockerManager] Injected native proxy auth extension for ${proxy.host}:${proxy.port}`);
        } catch (extErr: any) {
          console.warn('[DockerManager] Notice injecting proxy auth extension:', extErr.message);
        }
      } else {
        try {
          const proxyExtDir = path.join(customExtDir, '__proxy_auth');
          if (fs.existsSync(proxyExtDir)) {
            fs.rmSync(proxyExtDir, { recursive: true, force: true });
          }
        } catch {}
      }

      // Auto-inject Stealth Anti-Detection Extension to strip navigator.webdriver and match genuine browser
      try {
        const stealthExtDir = path.join(customExtDir, '__anti_detect');
        if (!fs.existsSync(stealthExtDir)) {
          fs.mkdirSync(stealthExtDir, { recursive: true, mode: 0o777 });
        }
        const stealthManifest = {
          version: '1.0.0',
          manifest_version: 2,
          name: 'Stealth Shield',
          content_scripts: [
            {
              matches: ['<all_urls>'],
              js: ['stealth.js'],
              run_at: 'document_start',
              all_frames: true,
            },
          ],
        };
        fs.writeFileSync(path.join(stealthExtDir, 'manifest.json'), JSON.stringify(stealthManifest, null, 2));
        const stealthJs = `
(function() {
  function injectStealth() {
    try {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });
      if (window.navigator && window.navigator.__proto__) {
        delete window.navigator.__proto__.webdriver;
      }
    } catch (e) {}

    try {
      if (!window.chrome) {
        window.chrome = {};
      }
      if (!window.chrome.runtime) {
        window.chrome.runtime = {
          PlatformOs: { MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux', OPENBSD: 'openbsd' },
          PlatformArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64' },
          PlatformNaclArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64' }
        };
      }
    } catch (e) {}

    try {
      const fakePlugins = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
      ];
      Object.defineProperty(navigator, 'plugins', {
        get: () => fakePlugins,
        configurable: true
      });
    } catch (e) {}

    try {
      Object.defineProperty(navigator, 'languages', {
        get: () => ['pt-BR', 'pt', 'en-US', 'en'],
        configurable: true
      });
    } catch (e) {}

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const origQuery = navigator.permissions.query;
        navigator.permissions.query = (parameters) => (
          parameters && parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            origQuery(parameters)
        );
      }
    } catch (e) {}
  }

  injectStealth();

  try {
    const s = document.createElement('script');
    s.textContent = '(' + injectStealth.toString() + ')();';
    (document.head || document.documentElement).appendChild(s);
    s.remove();
  } catch (e) {}
})();
`;
        fs.writeFileSync(path.join(stealthExtDir, 'stealth.js'), stealthJs);
        fs.chmodSync(stealthExtDir, 0o777);
      } catch (stealthErr: any) {
        console.warn('[DockerManager] Notice injecting stealth extension:', stealthErr.message);
      }

      // Auto-inject CRM Agent Extension to scrape Facebook Marketplace / OLX chats and dispatch replies
      try {
        const crmExtDir = path.join(customExtDir, '__crm_collector');
        if (!fs.existsSync(crmExtDir)) {
          fs.mkdirSync(crmExtDir, { recursive: true, mode: 0o777 });
        }

        const hostIp = await this.getHostGatewayIp();
        const apiBaseUrl = `http://${hostIp}:${config.port}`;

        const crmManifest = {
          version: '1.0.0',
          manifest_version: 2,
          name: 'Ads Manager CRM Collector',
          description: 'Synchronizes Facebook Marketplace and OLX chats into unified CRM dashboard',
          permissions: ['<all_urls>', 'tabs', 'storage'],
          content_scripts: [
            {
              matches: [
                '*://*.facebook.com/messages/*',
                '*://*.facebook.com/marketplace/*',
                '*://*.olx.com.br/*'
              ],
              js: ['content.js'],
              run_at: 'document_idle',
              all_frames: false,
            },
          ],
          background: {
            scripts: ['background.js'],
          },
        };

        const backgroundJs = `
const PROFILE_ID = ${profile.id};
const PROFILE_UUID = ${JSON.stringify(profile.uuid)};
const API_BASE_URL = ${JSON.stringify(apiBaseUrl)};

console.log('[CRM Background] Initialized for Profile #' + PROFILE_ID);

// Listen to scraped chat data from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'CRM_SYNC_DATA') {
    const payload = {
      profile_id: PROFILE_ID,
      profile_uuid: PROFILE_UUID,
      platform: message.platform || 'facebook',
      conversations: message.conversations || []
    };

    fetch(API_BASE_URL + '/api/crm/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(data => {
      sendResponse({ success: true, data });
    })
    .catch(err => {
      sendResponse({ success: false, error: err.message });
    });

    return true; // Keep channel open for async response
  }
});

// Poll outgoing replies queue from dashboard every 5 seconds
setInterval(async () => {
  try {
    const res = await fetch(API_BASE_URL + '/api/crm/outgoing?profile_id=' + PROFILE_ID);
    if (!res.ok) return;
    const json = await res.json();
    const pendingReplies = json.data || [];

    if (pendingReplies.length > 0) {
      console.log('[CRM Background] Found ' + pendingReplies.length + ' pending replies to dispatch.');

      // Find active tab matching Facebook
      chrome.tabs.query({ url: "*://*.facebook.com/*" }, (tabs) => {
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
              console.log('[CRM Background] Reply #' + reply.id + ' dispatched successfully. Notifying API...');
              fetch(API_BASE_URL + '/api/crm/outgoing/' + reply.id + '/sent', { method: 'POST' }).catch(() => {});
            }
          });
        }
      });
    }
  } catch (err) {
    // Polling notice
  }
}, 5000);
`;

        const contentJs = `
console.log('[CRM Content] Content script loaded on ' + location.href);

let isSyncing = false;

// Function to scrape conversations and messages from Facebook Messenger / Marketplace
function scrapeFacebookChats() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const currentUrl = location.href;
    const isMessages = currentUrl.includes('/messages');
    if (!isMessages) {
      isSyncing = false;
      return;
    }

    const currentThreadMatch = currentUrl.match(/\\/messages\\/t\\/(\\d+)/);
    const activeThreadId = currentThreadMatch ? currentThreadMatch[1] : null;

    const conversations = [];

    // 1. Scrape conversation list from sidebar
    const conversationLinks = Array.from(document.querySelectorAll('a[href*="/messages/t/"]'));
    const seenIds = new Set();

    for (const link of conversationLinks) {
      try {
        const href = link.getAttribute('href') || '';
        const match = href.match(/\\/messages\\/t\\/(\\d+)/);
        if (!match) continue;
        const threadId = match[1];
        if (seenIds.has(threadId)) continue;
        seenIds.add(threadId);

        // Find customer name and text inside link container
        const textElements = Array.from(link.querySelectorAll('span, div[dir="auto"]'))
          .map(el => el.textContent.trim())
          .filter(t => t.length > 0 && !t.includes('Marketplace') && !t.includes('min') && !t.includes('sem') && !t.includes('d'));

        const customerName = textElements[0] || 'Cliente Facebook';
        const productOrSnippet = textElements[1] || '';
        const lastMsg = textElements[textElements.length - 1] || '';

        // Avatar
        const imgEl = link.querySelector('img');
        const avatar = imgEl ? imgEl.src : null;

        conversations.push({
          external_id: threadId,
          customer_name: customerName,
          customer_avatar: avatar,
          product_title: productOrSnippet.length > 5 ? productOrSnippet : null,
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

      // Try scraping product title from header if on marketplace thread
      const headerText = document.querySelector('h2, [role="main"] h1, span[dir="auto"]');
      if (headerText && !activeConv.product_title) {
        activeConv.product_title = headerText.textContent.trim();
      }

      // Scrape message text elements
      const messageRows = Array.from(document.querySelectorAll('[role="row"], div[dir="auto"]'))
        .filter(el => {
          const t = el.textContent.trim();
          return t.length > 0 && t.length < 2000 && !t.includes('Marketplace') && !el.closest('a[href*="/messages/t/"]');
        });

      const parsedMessages = [];
      const seenMsg = new Set();

      for (const el of messageRows) {
        const text = el.textContent.trim();
        if (seenMsg.has(text) || text.length === 0) continue;
        seenMsg.add(text);

        // Determine if outgoing (blue/right) or incoming (grey/left)
        let isMe = false;
        let p = el;
        for (let i = 0; i < 5 && p; i++) {
          const style = window.getComputedStyle(p);
          const bg = style.backgroundColor;
          // Blue bubble (Facebook accent)
          if (bg.includes('0, 132, 255') || bg.includes('10, 128, 236') || bg.includes('0, 100, 224')) {
            isMe = true;
            break;
          }
          p = p.parentElement;
        }

        parsedMessages.push({
          sender_type: isMe ? 'me' : 'customer',
          content: text,
          sent_at: new Date().toISOString()
        });
      }

      // Take last 15 messages
      activeConv.messages = parsedMessages.slice(-15);
      if (activeConv.messages.length > 0) {
        activeConv.last_message = activeConv.messages[activeConv.messages.length - 1].content;
      }
    }

    if (conversations.length > 0) {
      chrome.runtime.sendMessage({
        type: 'CRM_SYNC_DATA',
        platform: 'facebook',
        conversations: conversations
      }, (res) => {
        // Sync response
      });
    }
  } catch (err) {
    console.warn('[CRM Content] Error scraping Facebook:', err);
  } finally {
    isSyncing = false;
  }
}

// Listen for reply execution from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
          // Press enter key
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
          input.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
          input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));

          // Also click send button if present
          const sendBtn = document.querySelector('div[aria-label="Pressione Enter para enviar"], div[aria-label="Press Enter to send"], svg[aria-label="Pressione Enter para enviar"]');
          if (sendBtn) {
            (sendBtn.closest('div[role="button"]') || sendBtn).click();
          }

          sendResponse({ success: true });
        }, 150);

        return true;
      } else {
        sendResponse({ success: false, error: 'Input element not found' });
      }
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  }
});

// Periodic scraping every 15 seconds
setInterval(scrapeFacebookChats, 15000);

// Initial scrape after page stabilizes
setTimeout(scrapeFacebookChats, 3000);

// Also scrape on user interaction or DOM changes (debounced)
let debounceTimer = null;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(scrapeFacebookChats, 4000);
});

observer.observe(document.body, { childList: true, subtree: true });
`;

        fs.writeFileSync(path.join(crmExtDir, 'manifest.json'), JSON.stringify(crmManifest, null, 2));
        fs.writeFileSync(path.join(crmExtDir, 'background.js'), backgroundJs);
        fs.writeFileSync(path.join(crmExtDir, 'content.js'), contentJs);
        fs.chmodSync(crmExtDir, 0o777);
        console.log(`[DockerManager] Injected CRM Collector extension for profile #${profile.id}`);
      } catch (crmErr: any) {
        console.warn('[DockerManager] Notice injecting CRM extension:', crmErr.message);
      }
    } catch (e: any) {
      console.warn('[DockerManager] Notice setting directory permissions:', e.message);
    }

    // Clean up existing dead container with the same name if exists
    await this.removeContainer(containerName);

    const env: string[] = [
      `SCREEN_WIDTH=${profile.screen_width || 1920}`,
      `SCREEN_HEIGHT=${profile.screen_height || 1080}`,
      `LOCALE=${profile.locale || 'pt-BR'}`,
      `TIMEZONE=${profile.timezone || 'America/Sao_Paulo'}`,
    ];

    if (proxy) {
      env.push(`PROXY_HOST=${proxy.host}`);
      env.push(`PROXY_PORT=${proxy.port}`);
      env.push(`PROXY_TYPE=${proxy.type || 'http'}`);
      if (proxy.username) {
        env.push(`PROXY_USER=${proxy.username}`);
      }
      if (proxy.password) {
        env.push(`PROXY_PASS=${proxy.password}`);
      }
    }

    const apiNetwork = await this.getApiNetworkName();
    const networkingConfig = apiNetwork
      ? {
          EndpointsConfig: {
            [apiNetwork]: {},
          },
        }
      : undefined;

    const container = await this.docker.createContainer({
      Image: config.browserImage,
      name: containerName,
      Env: env,
      NetworkingConfig: networkingConfig,
      ExposedPorts: {
        '6080/tcp': {},
        '5900/tcp': {},
        '9222/tcp': {},
      },
      HostConfig: {
        Binds: [
          `${profile.chrome_data_path}:/home/browser/profile`,
        ],
        PortBindings: {
          '6080/tcp': [{ HostPort: String(ports.novncPort), HostIp: '0.0.0.0' }],
          '5900/tcp': [{ HostPort: String(ports.vncPort), HostIp: '127.0.0.1' }],
          '9222/tcp': [{ HostPort: String(ports.cdpPort), HostIp: '0.0.0.0' }],
        },
        ShmSize: 1024 * 1024 * 1024, // 1GB /dev/shm for Chrome
        Memory: config.resources.memoryMb * 1024 * 1024,
        NanoCpus: Math.floor(config.resources.cpuLimit * 1e9),
        RestartPolicy: { Name: 'no' },
      },
    });

    await (container as any).start();
    console.log(`[DockerManager] Container ${containerName} started successfully.`);
    return containerName;
  }

  /**
   * Stops a profile container gracefully
   */
  async stopContainer(containerName: string, timeoutSeconds: number = 10): Promise<void> {
    try {
      const container = this.docker.getContainer(containerName);
      const data = await container.inspect();
      if (data.State.Running) {
        console.log(`[DockerManager] Stopping container ${containerName} with timeout ${timeoutSeconds}s...`);
        await container.stop({ t: timeoutSeconds });
      }
    } catch (err: any) {
      if (err.statusCode === 404) {
        console.log(`[DockerManager] Container ${containerName} does not exist, nothing to stop.`);
        return;
      }
      throw err;
    }
  }

  /**
   * Removes a container
   */
  async removeContainer(containerName: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerName);
      await container.remove({ force: true, v: false }); // v: false preserves external volumes!
      console.log(`[DockerManager] Container ${containerName} removed.`);
    } catch (err: any) {
      if (err.statusCode !== 404) {
        console.error(`[DockerManager] Error removing container ${containerName}:`, err.message);
      }
    }
  }

  /**
   * Inspects the real-time status of a container
   */
  async getContainerStatus(containerName: string | null): Promise<ProfileStatus> {
    if (!containerName) return 'stopped';

    try {
      const container = this.docker.getContainer(containerName);
      const data = await container.inspect();
      if (data.State.Running) {
        return 'running';
      }
      if (data.State.Restarting) {
        return 'starting';
      }
      if (data.State.Dead || data.State.OOMKilled || data.State.ExitCode !== 0) {
        return 'error';
      }
      return 'stopped';
    } catch (err: any) {
      if (err.statusCode === 404) {
        return 'stopped';
      }
      console.error(`[DockerManager] Error checking container status for ${containerName}:`, err.message);
      return 'error';
    }
  }

  /**
   * Retrieves container logs
   */
  async getContainerLogs(containerName: string, tail: number = 100): Promise<string> {
    try {
      const container = this.docker.getContainer(containerName);
      const logBuffer = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true,
      });
      return logBuffer.toString('utf-8');
    } catch (err: any) {
      return `Logs unavailable: ${err.message}`;
    }
  }
}

export const dockerManager = new DockerManager();
