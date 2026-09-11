import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { BrowserProxy, ProxyTestResult } from '../types/index.js';

export class ProxyTesterService {
  /**
   * Tests proxy by making an HTTP request to an external IP echo service
   */
  async testProxy(proxy: BrowserProxy): Promise<ProxyTestResult> {
    const startTime = Date.now();

    try {
      let agent: any;
      const auth = proxy.username && proxy.password ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@` : '';

      if (proxy.type === 'socks5' || proxy.type === 'socks4') {
        const socksUrl = `${proxy.type}://${auth}${proxy.host}:${proxy.port}`;
        agent = new SocksProxyAgent(socksUrl);
      } else {
        const httpUrl = `http://${auth}${proxy.host}:${proxy.port}`;
        agent = new HttpsProxyAgent(httpUrl);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch('https://api.ipify.org?format=json', {
        // @ts-ignore - node fetch agent
        agent,
        signal: controller.signal,
        headers: {
          'User-Agent': 'BrowserManager-ProxyCheck/1.0',
        },
      });

      clearTimeout(timeout);
      const latency_ms = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();
      const detectedIp = data.ip || 'Unknown';

      return {
        success: true,
        ip: detectedIp,
        latency_ms,
        message: 'Proxy funcionando corretamente',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.name === 'AbortError' ? 'Timeout de conexão com o proxy (>10s)' : err.message,
        message: 'Falha na verificação do proxy',
      };
    }
  }
}

export const proxyTesterService = new ProxyTesterService();
