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
        const dockerDir = path.join(__dirname, '../../../../docker/browser');
        
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
