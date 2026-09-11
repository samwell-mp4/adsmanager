import Docker from 'dockerode';
import fs from 'fs';
import { config } from '../config/index.js';
import { BrowserProfile, BrowserProxy, ProfileStatus } from '../types/index.js';

export class DockerManager {
  private docker: Docker;

  constructor() {
    this.docker = new Docker({ socketPath: config.dockerSocket });
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
   * Creates and starts a container for a browser profile
   */
  async createProfileContainer(
    profile: BrowserProfile,
    proxy: BrowserProxy | null,
    ports: { novncPort: number; vncPort: number; cdpPort: number }
  ): Promise<string> {
    const containerName = `browser-profile-${profile.uuid}`;

    // Ensure host data directory exists
    if (!fs.existsSync(profile.chrome_data_path)) {
      fs.mkdirSync(profile.chrome_data_path, { recursive: true });
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

    console.log(`[DockerManager] Creating container ${containerName} using image ${config.browserImage}...`);

    const container = await this.docker.createContainer({
      Image: config.browserImage,
      name: containerName,
      Env: env,
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
        ShmSize: 2 * 1024 * 1024 * 1024, // 2GB /dev/shm for Chrome
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
