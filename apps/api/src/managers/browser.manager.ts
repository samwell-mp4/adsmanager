import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { dockerManager } from './docker.manager.js';
import { portManager } from './port.manager.js';
import { profileRepository } from '../repositories/profile.repository.js';
import { proxyRepository } from '../repositories/proxy.repository.js';
import { eventRepository } from '../repositories/event.repository.js';
import { automationService } from '../services/automation.service.js';
import { BrowserProfile, CreateProfileDTO, ProfileStatus, UpdateProfileDTO } from '../types/index.js';

export class BrowserManager {
  /**
   * Creates a new profile in PostgreSQL without starting it
   */
  async createProfile(data: CreateProfileDTO): Promise<BrowserProfile> {
    const uuid = uuidv4();
    const chromeDataPath = path.join(config.profilesDataDir, uuid);

    const profile = await profileRepository.create({
      uuid,
      name: data.name,
      description: data.description,
      group_name: data.group_name || 'Default',
      chrome_data_path: chromeDataPath,
      screen_width: data.screen_width || 1920,
      screen_height: data.screen_height || 1080,
      locale: data.locale || 'pt-BR',
      timezone: data.timezone || 'America/Sao_Paulo',
      proxy_id: data.proxy_id || null,
    });

    await eventRepository.create(profile.id, 'profile.created', `Perfil "${profile.name}" criado com sucesso.`);
    return profile;
  }

  /**
   * Starts a profile container
   */
  async startProfile(profileId: number): Promise<BrowserProfile> {
    const profile = await profileRepository.findById(profileId);
    if (!profile) {
      throw new Error(`Profile with ID ${profileId} not found`);
    }

    // Check if already running
    const currentStatus = await this.getStatus(profileId);
    if (currentStatus === 'running') {
      return profile;
    }

    await profileRepository.updateRuntimeState(profileId, 'starting');
    await eventRepository.create(profileId, 'profile.starting', `Iniciando container para o perfil "${profile.name}"...`);

    let proxy = null;
    if (profile.proxy_id) {
      proxy = await proxyRepository.findById(profile.proxy_id);
    }

    try {
      // 1. Allocate ports
      const ports = await portManager.allocatePortsForProfile();

      // 2. Create and start Docker container
      const containerName = await dockerManager.createProfileContainer(profile, proxy, ports);

      // 3. Update database with runtime ports and running state
      await profileRepository.updateRuntimeState(profileId, 'running', containerName, {
        novnc: ports.novncPort,
        vnc: ports.vncPort,
        cdp: ports.cdpPort,
      });

      await eventRepository.create(profileId, 'profile.started', `Perfil iniciado. noVNC: :${ports.novncPort}, CDP: :${ports.cdpPort}`, {
        containerName,
        ports,
      });

      // Auto-inject saved cookies if cookies.json exists in profile directory
      setTimeout(async () => {
        try {
          const cookieFile = path.join(profile.chrome_data_path, 'cookies.json');
          if (fs.existsSync(cookieFile)) {
            const raw = fs.readFileSync(cookieFile, 'utf-8');
            const savedCookies = JSON.parse(raw);
            if (Array.isArray(savedCookies) && savedCookies.length > 0) {
              await automationService.setCookies(ports.cdpPort, savedCookies, profile.chrome_data_path);
              console.log(`[BrowserManager] Auto-restored ${savedCookies.length} cookies on profile #${profileId} startup.`);
            }
          }
        } catch (cookieErr: any) {
          console.warn(`[BrowserManager] Notice auto-injecting cookies: ${cookieErr.message}`);
        }
      }, 2500);

      const updated = await profileRepository.findById(profileId);
      return updated!;
    } catch (err: any) {
      await profileRepository.updateRuntimeState(profileId, 'error');
      await eventRepository.create(profileId, 'profile.error', `Falha ao iniciar perfil: ${err.message}`);
      throw err;
    }
  }

  /**
   * Stops a profile container gracefully preserving user profile data
   */
  async stopProfile(profileId: number): Promise<BrowserProfile> {
    const profile = await profileRepository.findById(profileId);
    if (!profile) {
      throw new Error(`Profile with ID ${profileId} not found`);
    }

    await profileRepository.updateRuntimeState(profileId, 'stopping');
    await eventRepository.create(profileId, 'profile.stopping', `Parando perfil "${profile.name}"...`);

    try {
      const containerName = profile.container_name || `browser-profile-${profile.uuid}`;
      await dockerManager.stopContainer(containerName, 10);
      await dockerManager.removeContainer(containerName);

      // Release ports
      portManager.releasePorts([profile.novnc_port, profile.vnc_port, profile.cdp_port]);

      await profileRepository.updateRuntimeState(profileId, 'stopped', null, {
        novnc: null,
        vnc: null,
        cdp: null,
      });

      await eventRepository.create(profileId, 'profile.stopped', `Perfil parado com sucesso. Volume persistente preservado.`);
      const updated = await profileRepository.findById(profileId);
      return updated!;
    } catch (err: any) {
      await profileRepository.updateRuntimeState(profileId, 'error');
      await eventRepository.create(profileId, 'profile.error', `Erro ao parar perfil: ${err.message}`);
      throw err;
    }
  }

  /**
   * Restarts a profile
   */
  async restartProfile(profileId: number): Promise<BrowserProfile> {
    await eventRepository.create(profileId, 'profile.restart', 'Reinicialização do perfil solicitada.');
    await this.stopProfile(profileId);
    return await this.startProfile(profileId);
  }

  /**
   * Updates proxy associated with a profile and restarts if running
   */
  async changeProxy(profileId: number, proxyId: number | null): Promise<BrowserProfile> {
    const profile = await profileRepository.findById(profileId);
    if (!profile) {
      throw new Error(`Profile with ID ${profileId} not found`);
    }

    await profileRepository.updateProxy(profileId, proxyId);
    await eventRepository.create(profileId, 'proxy.changed', `Proxy alterado para ID ${proxyId || 'nenhum'}.`);

    const isRunning = (await this.getStatus(profileId)) === 'running';
    if (isRunning) {
      return await this.restartProfile(profileId);
    }

    return (await profileRepository.findById(profileId))!;
  }

  /**
   * Deletes a profile, stopping container if active
   */
  async deleteProfile(profileId: number): Promise<void> {
    const profile = await profileRepository.findById(profileId);
    if (!profile) {
      throw new Error(`Profile with ID ${profileId} not found`);
    }

    if (profile.container_name) {
      await dockerManager.stopContainer(profile.container_name, 5);
      await dockerManager.removeContainer(profile.container_name);
    }
    portManager.releasePorts([profile.novnc_port, profile.vnc_port, profile.cdp_port]);
    await profileRepository.delete(profileId);
  }

  /**
   * Returns real container status
   */
  async getStatus(profileId: number): Promise<ProfileStatus> {
    const profile = await profileRepository.findById(profileId);
    if (!profile) return 'stopped';

    if (!profile.container_name) {
      if (profile.status !== 'stopped') {
        await profileRepository.updateRuntimeState(profileId, 'stopped');
      }
      return 'stopped';
    }

    const realStatus = await dockerManager.getContainerStatus(profile.container_name);
    if (realStatus !== profile.status) {
      await profileRepository.updateRuntimeState(profileId, realStatus);
    }
    return realStatus;
  }

  /**
   * Returns noVNC access URL
   */
  async getVncUrl(profileId: number): Promise<{ url: string; port: number | null }> {
    const profile = await profileRepository.findById(profileId);
    if (!profile || !profile.novnc_port) {
      throw new Error('Profile is not running or noVNC port is not assigned');
    }

    const host = process.env.PUBLIC_HOST || 'localhost';
    const url = `http://${host}:${profile.novnc_port}/vnc.html?autoconnect=true&resize=scale`;
    return { url, port: profile.novnc_port };
  }

  /**
   * Returns CDP debugging endpoint
   */
  async getCdpUrl(profileId: number): Promise<{ endpoint: string; port: number | null }> {
    const profile = await profileRepository.findById(profileId);
    if (!profile || !profile.cdp_port) {
      throw new Error('Profile is not running or CDP port is not assigned');
    }

    return {
      endpoint: `http://127.0.0.1:${profile.cdp_port}`,
      port: profile.cdp_port,
    };
  }

  /**
   * Lists pages of active browser via CDP
   */
  async listPages(profileId: number) {
    const profile = await profileRepository.findById(profileId);
    if (!profile || !profile.cdp_port) {
      throw new Error('Profile is not running. Start the profile before querying pages.');
    }
    return await automationService.listPages(profile.cdp_port);
  }

  /**
   * Navigates active browser via CDP
   */
  async navigate(profileId: number, targetUrl: string) {
    const profile = await profileRepository.findById(profileId);
    if (!profile || !profile.cdp_port) {
      throw new Error('Profile is not running. Start the profile before issuing navigation.');
    }
    return await automationService.navigate(profile.cdp_port, targetUrl);
  }
}

export const browserManager = new BrowserManager();
