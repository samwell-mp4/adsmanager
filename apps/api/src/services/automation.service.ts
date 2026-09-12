import { dockerManager } from '../managers/docker.manager.js';

export interface PageInfo {
  id?: string;
  title: string;
  url: string;
}

export class AutomationService {
  /**
   * Helper to lazily load playwright-core so server never crashes on startup
   */
  async getChromium() {
    try {
      const pw = await import('playwright-core');
      return pw.chromium;
    } catch (e: any) {
      throw new Error(`Playwright indisponível neste ambiente: ${e.message}`);
    }
  }

  /**
   * Connects to Chromium via CDP and lists all open pages
   */
  async listPages(cdpPort: number): Promise<PageInfo[]> {
    const chromium = await this.getChromium();
    const endpoint = await dockerManager.getCdpTargetForPort(cdpPort);
    console.log(`[AutomationService] Connecting over CDP to ${endpoint}...`);

    const browser = await chromium.connectOverCDP(endpoint);
    try {
      const contexts = browser.contexts();
      const pagesInfo: PageInfo[] = [];

      for (const context of contexts) {
        const pages = context.pages();
        for (const page of pages) {
          pagesInfo.push({
            title: await page.title(),
            url: page.url(),
          });
        }
      }

      return pagesInfo;
    } finally {
      await browser.close(); // Disconnects CDP client; doesn't close remote browser
    }
  }

  /**
   * Connects via CDP and navigates the active page to a target URL
   */
  async navigate(cdpPort: number, targetUrl: string): Promise<{ success: boolean; finalUrl: string; title: string }> {
    const chromium = await this.getChromium();
    const endpoint = await dockerManager.getCdpTargetForPort(cdpPort);
    console.log(`[AutomationService] Navigating browser via CDP ${endpoint} to: ${targetUrl}`);

    const browser = await chromium.connectOverCDP(endpoint);
    try {
      const contexts = browser.contexts();
      let targetPage = contexts[0]?.pages()[0];

      if (!targetPage) {
        const context = contexts[0] || (await browser.newContext());
        targetPage = await context.newPage();
      }

      await targetPage.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      return {
        success: true,
        finalUrl: targetPage.url(),
        title: await targetPage.title(),
      };
    } finally {
      await browser.close();
    }
  }

  /**
   * Retrieves all cookies from active browser contexts or disk backup
   */
  async getCookies(cdpPort?: number, profileDataDir?: string): Promise<any[]> {
    if (cdpPort) {
      try {
        const chromium = await this.getChromium();
        const endpoint = await dockerManager.getCdpTargetForPort(cdpPort);
        const browser = await chromium.connectOverCDP(endpoint);
        try {
          const context = browser.contexts()[0];
          if (context) {
            const cookies = await context.cookies();
            return cookies;
          }
        } finally {
          await browser.close();
        }
      } catch (e: any) {
        console.warn(`[AutomationService] Could not fetch cookies via CDP: ${e.message}`);
      }
    }

    // Fallback to disk cookies.json
    if (profileDataDir) {
      const fs = await import('fs');
      const path = await import('path');
      const cookieFile = path.join(profileDataDir, 'cookies.json');
      if (fs.existsSync(cookieFile)) {
        try {
          return JSON.parse(fs.readFileSync(cookieFile, 'utf-8'));
        } catch {
          return [];
        }
      }
    }

    return [];
  }

  /**
   * Normalizes cookies from any format (JSON array, J2Team object, Cookie string header, Netscape file)
   */
  normalizeCookies(input: any): any[] {
    let list: any[] = [];
    if (Array.isArray(input)) {
      list = input;
    } else if (input && typeof input === 'object') {
      if (Array.isArray(input.cookies)) {
        list = input.cookies;
      } else if (Array.isArray(input.data)) {
        list = input.data;
      }
    } else if (typeof input === 'string') {
      const trimmed = input.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          return this.normalizeCookies(parsed);
        } catch {}
      }

      // Check if Netscape format (starts with # or has tabs)
      if (trimmed.includes('\t')) {
        const lines = trimmed.split('\n');
        for (const line of lines) {
          const l = line.trim();
          if (!l || l.startsWith('#')) continue;
          const parts = l.split('\t');
          if (parts.length >= 7) {
            list.push({
              domain: parts[0],
              path: parts[2],
              secure: parts[3].toLowerCase() === 'true',
              expirationDate: parseInt(parts[4], 10),
              name: parts[5],
              value: parts[6],
            });
          }
        }
      } else if (trimmed.includes('=')) {
        // Cookie header string: c_user=1000...; xs=abc...; datr=xyz
        const pairs = trimmed.split(';');
        for (const pair of pairs) {
          const eqIdx = pair.indexOf('=');
          if (eqIdx > 0) {
            const k = pair.substring(0, eqIdx).trim();
            const v = pair.substring(eqIdx + 1).trim();
            if (k) {
              list.push({
                name: k,
                value: v,
                domain: '.facebook.com',
                path: '/',
                secure: true,
                sameSite: 'None',
              });
            }
          }
        }
      }
    }

    // Sanitize and format each cookie for CDP and Playwright
    return list
      .map((c: any) => {
        let domain = String(c.domain || '').trim();
        if (!domain) {
          domain = '.facebook.com';
        }
        if (!domain.startsWith('.') && !c.hostOnly) {
          domain = '.' + domain;
        }

        let path = String(c.path || '/').trim();
        if (!path.startsWith('/')) path = '/' + path;

        const rawSameSite = String(c.sameSite || '').toLowerCase();
        let sSite: 'Strict' | 'Lax' | 'None' = 'Lax';
        if (rawSameSite === 'no_restriction' || rawSameSite === 'none') {
          sSite = 'None';
        } else if (rawSameSite === 'strict') {
          sSite = 'Strict';
        }

        let expires = c.expirationDate || c.expires;
        if (typeof expires === 'number' && expires > 1e11) {
          expires = Math.floor(expires / 1000);
        }
        if (typeof expires !== 'number' || isNaN(expires) || expires <= 0) {
          expires = Math.floor(Date.now() / 1000) + 31536000;
        }

        const cleanDomain = domain.replace(/^\./, '');
        const cookieUrl = `https://${cleanDomain}${path}`;

        return {
          name: String(c.name || '').trim(),
          value: String(c.value || ''),
          url: cookieUrl,
          domain: domain,
          path: path,
          expires: typeof expires === 'number' ? Math.floor(expires) : undefined,
          httpOnly: Boolean(c.httpOnly),
          secure: sSite === 'None' ? true : Boolean(c.secure),
          sameSite: sSite,
        };
      })
      .filter((c) => c.name);
  }

  /**
   * Injects cookies into active browser and saves to disk backup
   */
  async setCookies(cdpPort?: number, rawCookies: any = [], profileDataDir?: string): Promise<{ success: boolean; count: number }> {
    const cookies = this.normalizeCookies(rawCookies);

    // 1. Save to disk if dir provided
    if (profileDataDir) {
      const fs = await import('fs');
      const path = await import('path');
      if (!fs.existsSync(profileDataDir)) {
        fs.mkdirSync(profileDataDir, { recursive: true });
      }
      fs.writeFileSync(path.join(profileDataDir, 'cookies.json'), JSON.stringify(cookies, null, 2), 'utf-8');
    }

    // 2. Inject via CDP if running
    if (cdpPort && cookies.length > 0) {
      try {
        const chromium = await this.getChromium();
        const endpoint = await dockerManager.getCdpTargetForPort(cdpPort);
        const browser = await chromium.connectOverCDP(endpoint);
        try {
          const context = browser.contexts()[0];
          if (context) {
            // First: Playwright native context.addCookies
            try {
              await context.addCookies(cookies as any);
              console.log(`[AutomationService] Injected ${cookies.length} cookies via context.addCookies`);
            } catch (playwrightErr: any) {
              console.warn(`[AutomationService] context.addCookies warning: ${playwrightErr.message}`);
            }

            // Second: CDP Network.setCookies for native browser session
            const page = context.pages()[0] || (await context.newPage());
            try {
              const cdpSession = await context.newCDPSession(page);
              await cdpSession.send('Network.setCookies', { cookies });
              console.log(`[AutomationService] Injected ${cookies.length} cookies via CDP Network.setCookies`);
            } catch (cdpErr: any) {
              console.warn(`[AutomationService] Network.setCookies warning: ${cdpErr.message}`);
            }

            // Third: If page is on facebook or about:blank, navigate or reload so user sees logged in state
            try {
              const currentUrl = page.url();
              if (currentUrl.includes('facebook.com')) {
                console.log(`[AutomationService] Reloading active Facebook page: ${currentUrl}`);
                await page.reload({ timeout: 5000 }).catch(() => {});
              } else if (currentUrl === 'about:blank') {
                console.log(`[AutomationService] Navigating active page to https://www.facebook.com`);
                await page.goto('https://www.facebook.com', { timeout: 8000 }).catch(() => {});
              }
            } catch {}
          }
        } finally {
          await browser.close();
        }
      } catch (e: any) {
        console.warn(`[AutomationService] Could not inject cookies via CDP: ${e.message}`);
      }
    }

    return { success: true, count: cookies.length };
  }

  /**
   * Clears cookies from active browser and deletes cookies.json
   */
  async clearCookies(cdpPort?: number, profileDataDir?: string): Promise<{ success: boolean }> {
    if (profileDataDir) {
      const fs = await import('fs');
      const path = await import('path');
      const cookieFile = path.join(profileDataDir, 'cookies.json');
      if (fs.existsSync(cookieFile)) {
        fs.unlinkSync(cookieFile);
      }
    }

    if (cdpPort) {
      try {
        const chromium = await this.getChromium();
        const endpoint = await dockerManager.getCdpTargetForPort(cdpPort);
        const browser = await chromium.connectOverCDP(endpoint);
        try {
          const context = browser.contexts()[0];
          if (context) {
            await context.clearCookies();
          }
        } finally {
          await browser.close();
        }
      } catch (e: any) {
        console.warn(`[AutomationService] Could not clear cookies via CDP: ${e.message}`);
      }
    }

    return { success: true };
  }

  /**
   * Clears browser cache & storage
   */
  async clearCache(cdpPort: number): Promise<{ success: boolean }> {
    try {
      const chromium = await this.getChromium();
      const endpoint = await dockerManager.getCdpTargetForPort(cdpPort);
      const browser = await chromium.connectOverCDP(endpoint);
      try {
        const context = browser.contexts()[0];
        if (context) {
          const page = context.pages()[0] || (await context.newPage());
          const client = await context.newCDPSession(page);
          await client.send('Network.clearBrowserCache');
          await client.send('Network.clearBrowserCookies');
        }
      } finally {
        await browser.close();
      }
      return { success: true };
    } catch (e: any) {
      throw new Error(`Falha ao limpar cache: ${e.message}`);
    }
  }
}

export const automationService = new AutomationService();
