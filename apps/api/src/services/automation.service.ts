import { chromium } from 'playwright-core';

export interface PageInfo {
  id?: string;
  title: string;
  url: string;
}

export class AutomationService {
  /**
   * Connects to Chromium via CDP and lists all open pages
   */
  async listPages(cdpPort: number): Promise<PageInfo[]> {
    const endpoint = `http://127.0.0.1:${cdpPort}`;
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
    const endpoint = `http://127.0.0.1:${cdpPort}`;
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
