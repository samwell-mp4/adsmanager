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
}

export const automationService = new AutomationService();
