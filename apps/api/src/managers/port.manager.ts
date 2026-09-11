import net from 'net';
import { config } from '../config/index.js';

export class PortManager {
  private allocatedPorts: Set<number> = new Set();

  /**
   * Checks if a port is actually free on host
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    if (this.allocatedPorts.has(port)) return false;

    return new Promise((resolve) => {
      const server = net.createServer();
      server.unref();

      server.on('error', () => {
        resolve(false);
      });

      server.listen(port, '0.0.0.0', () => {
        server.close(() => {
          resolve(true);
        });
      });
    });
  }

  /**
   * Finds an available port in a given range
   */
  private async findFreePortInRange(start: number, end: number): Promise<number> {
    for (let port = start; port <= end; port++) {
      if (await this.isPortAvailable(port)) {
        this.allocatedPorts.add(port);
        return port;
      }
    }
    throw new Error(`[PortManager] No available ports in range ${start}-${end}`);
  }

  /**
   * Allocates dedicated ports for noVNC, VNC and CDP
   */
  async allocatePortsForProfile(): Promise<{ novncPort: number; vncPort: number; cdpPort: number }> {
    const novncPort = await this.findFreePortInRange(config.ports.novnc.start, config.ports.novnc.end);
    const vncPort = await this.findFreePortInRange(config.ports.vnc.start, config.ports.vnc.end);
    const cdpPort = await this.findFreePortInRange(config.ports.cdp.start, config.ports.cdp.end);

    return { novncPort, vncPort, cdpPort };
  }

  /**
   * Releases allocated ports
   */
  releasePorts(ports: (number | null | undefined)[]): void {
    for (const port of ports) {
      if (typeof port === 'number') {
        this.allocatedPorts.delete(port);
      }
    }
  }
}

export const portManager = new PortManager();
