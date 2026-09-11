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
  private async getChromium() {
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
   * Injects cookies into active browser and saves to disk backup
   */
  async setCookies(cdpPort?: number, cookies: any[] = [], profileDataDir?: string): Promise<{ success: boolean; count: number }> {
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
    if (cdpPort) {
      try {
        const chromium = await this.getChromium();
        const endpoint = await dockerManager.getCdpTargetForPort(cdpPort);
        const browser = await chromium.connectOverCDP(endpoint);
        try {
          const context = browser.contexts()[0];
          if (context && cookies.length > 0) {
            const page = context.pages()[0] || (await context.newPage());
            const cdpSession = await context.newCDPSession(page);

            const cdpCookies = cookies.map((c: any) => {
              let sSite: 'Strict' | 'Lax' | 'None' = 'Lax';
              const rawSameSite = String(c.sameSite || '').toLowerCase();
              if (rawSameSite === 'no_restriction' || rawSameSite === 'none') {
                sSite = 'None';
              } else if (rawSameSite === 'strict') {
                sSite = 'Strict';
              }

              let domain = String(c.domain || '').trim();
              if (domain && !domain.startsWith('.') && !c.hostOnly) {
                domain = '.' + domain;
              }

              let expires = c.expirationDate || c.expires;
              if (typeof expires === 'number' && expires > 1e11) {
                expires = Math.floor(expires / 1000);
              }

              return {
                name: String(c.name || '').trim(),
                value: String(c.value || ''),
                domain: domain || undefined,
                path: c.path || '/',
                expires: typeof expires === 'number' ? Math.floor(expires) : undefined,
                httpOnly: Boolean(c.httpOnly),
                secure: sSite === 'None' ? true : Boolean(c.secure),
                sameSite: sSite,
              };
            }).filter((c: any) => c.name && c.domain);

            try {
              await cdpSession.send('Network.setCookies', { cookies: cdpCookies });
              console.log(`[AutomationService] Injected ${cdpCookies.length} cookies via CDP Network.setCookies`);
            } catch (cdpErr: any) {
              console.warn(`[AutomationService] Network.setCookies failed, trying context.addCookies: ${cdpErr.message}`);
              await context.addCookies(cdpCookies as any);
            }
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
