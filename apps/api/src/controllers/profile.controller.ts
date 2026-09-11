import { FastifyReply, FastifyRequest } from 'fastify';
import { browserManager } from '../managers/browser.manager.js';
import { dockerManager } from '../managers/docker.manager.js';
import { profileRepository } from '../repositories/profile.repository.js';
import { eventRepository } from '../repositories/event.repository.js';
import { CreateProfileDTO, UpdateProfileDTO } from '../types/index.js';

export async function listProfilesHandler(_req: FastifyRequest, reply: FastifyReply) {
  const profiles = await profileRepository.findAll();

  // Sync real-time container status
  const syncedProfiles = await Promise.all(
    profiles.map(async (p) => {
      const realStatus = await browserManager.getStatus(p.id);
      return { ...p, status: realStatus };
    })
  );

  return reply.send({ success: true, data: syncedProfiles });
}

export async function getProfileHandler(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  const profile = await profileRepository.findById(id);
  if (!profile) {
    return reply.status(404).send({
      success: false,
      error: { code: 'PROFILE_NOT_FOUND', message: `Perfil com ID ${id} não encontrado.` },
    });
  }

  const realStatus = await browserManager.getStatus(id);
  return reply.send({ success: true, data: { ...profile, status: realStatus } });
}

export async function createProfileHandler(req: FastifyRequest<{ Body: CreateProfileDTO }>, reply: FastifyReply) {
  const { name } = req.body;
  if (!name) {
    return reply.status(400).send({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'O nome do perfil é obrigatório.' },
    });
  }

  try {
    const profile = await browserManager.createProfile(req.body);
    return reply.status(201).send({ success: true, data: profile });
  } catch (err: any) {
    return reply.status(500).send({
      success: false,
      error: { code: 'CREATE_PROFILE_FAILED', message: err.message },
    });
  }
}

export async function updateProfileHandler(
  req: FastifyRequest<{ Params: { id: string }; Body: UpdateProfileDTO }>,
  reply: FastifyReply
) {
  const id = parseInt(req.params.id, 10);
  const existing = await profileRepository.findById(id);
  if (!existing) {
    return reply.status(404).send({
      success: false,
      error: { code: 'PROFILE_NOT_FOUND', message: `Perfil com ID ${id} não encontrado.` },
    });
  }

  const updated = await profileRepository.update(id, req.body);
  return reply.send({ success: true, data: updated });
}

export async function deleteProfileHandler(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  try {
    await browserManager.deleteProfile(id);
    return reply.send({ success: true, message: 'Perfil e container removidos com sucesso.' });
  } catch (err: any) {
    return reply.status(500).send({
      success: false,
      error: { code: 'DELETE_PROFILE_FAILED', message: err.message },
    });
  }
}

export async function startProfileHandler(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  try {
    const profile = await browserManager.startProfile(id);
    return reply.send({
      success: true,
      message: 'Navegador iniciado com sucesso.',
      data: profile,
    });
  } catch (err: any) {
    return reply.status(500).send({
      success: false,
      error: { code: 'START_PROFILE_FAILED', message: err.message },
    });
  }
}

export async function stopProfileHandler(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  try {
    const profile = await browserManager.stopProfile(id);
    return reply.send({
      success: true,
      message: 'Navegador parado com sucesso. Dados preservados.',
      data: profile,
    });
  } catch (err: any) {
    return reply.status(500).send({
      success: false,
      error: { code: 'STOP_PROFILE_FAILED', message: err.message },
    });
  }
}

export async function restartProfileHandler(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  try {
    const profile = await browserManager.restartProfile(id);
    return reply.send({
      success: true,
      message: 'Navegador reiniciado com sucesso.',
      data: profile,
    });
  } catch (err: any) {
    return reply.status(500).send({
      success: false,
      error: { code: 'RESTART_PROFILE_FAILED', message: err.message },
    });
  }
}

export async function updateProfileProxyHandler(
  req: FastifyRequest<{ Params: { id: string }; Body: { proxy_id: number | null } }>,
  reply: FastifyReply
) {
  const id = parseInt(req.params.id, 10);
  const { proxy_id } = req.body;

  try {
    const updated = await browserManager.changeProxy(id, proxy_id);
    return reply.send({
      success: true,
      message: 'Proxy atualizado. Sessão reiniciada mantendo cookies e armazenamento.',
      data: updated,
    });
  } catch (err: any) {
    return reply.status(500).send({
      success: false,
      error: { code: 'CHANGE_PROXY_FAILED', message: err.message },
    });
  }
}

export async function getProfileStatusHandler(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  const status = await browserManager.getStatus(id);
  return reply.send({ success: true, status });
}

export async function getProfileVncHandler(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  try {
    const vncInfo = await browserManager.getVncUrl(id);
    return reply.send({ success: true, data: vncInfo });
  } catch (err: any) {
    return reply.status(400).send({
      success: false,
      error: { code: 'VNC_UNAVAILABLE', message: err.message },
    });
  }
}

export async function getProfileCdpHandler(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  try {
    const cdpInfo = await browserManager.getCdpUrl(id);
    return reply.send({ success: true, data: cdpInfo });
  } catch (err: any) {
    return reply.status(400).send({
      success: false,
      error: { code: 'CDP_UNAVAILABLE', message: err.message },
    });
  }
}

export async function getProfileEventsHandler(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  const events = await eventRepository.findByProfileId(id);
  return reply.send({ success: true, data: events });
}

export async function getProfilePagesHandler(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  try {
    const pages = await browserManager.listPages(id);
    return reply.send({ success: true, data: pages });
  } catch (err: any) {
    return reply.status(500).send({
      success: false,
      error: { code: 'CDP_PAGES_FAILED', message: err.message },
    });
  }
}

export async function navigateProfileHandler(
  req: FastifyRequest<{ Params: { id: string }; Body: { url: string } }>,
  reply: FastifyReply
) {
  const id = parseInt(req.params.id, 10);
  const { url } = req.body;

  if (!url) {
    return reply.status(400).send({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'URL é obrigatória para navegação.' },
    });
  }

  try {
    const result = await browserManager.navigate(id, url);
    return reply.send({ success: true, data: result });
  } catch (err: any) {
    return reply.status(500).send({
      success: false,
      error: { code: 'NAVIGATION_FAILED', message: err.message },
    });
  }
}

export async function getProfileLogsHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const id = parseInt(req.params.id, 10);
  const profile = await profileRepository.findById(id);
  if (!profile || !profile.container_name) {
    return reply.status(404).send({ success: false, error: 'Perfil não possui container ativo ou recente' });
  }
  try {
    const logs = await dockerManager.getContainerLogs(profile.container_name, 200);
    return reply.send({ success: true, logs });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
}

export async function getProfileCookiesHandler(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  const profile = await profileRepository.findById(id);
  if (!profile) {
    return reply.status(404).send({ success: false, error: 'Perfil não encontrado' });
  }

  const { automationService } = await import('../services/automation.service.js');
  const cookies = await automationService.getCookies(profile.cdp_port || undefined, profile.chrome_data_path);
  return reply.send({ success: true, data: cookies });
}

export async function setProfileCookiesHandler(
  req: FastifyRequest<{ Params: { id: string }; Body: { cookies: any[] | string } }>,
  reply: FastifyReply
) {
  const id = parseInt(req.params.id, 10);
  const profile = await profileRepository.findById(id);
  if (!profile) {
    return reply.status(404).send({ success: false, error: 'Perfil não encontrado' });
  }

  const { automationService } = await import('../services/automation.service.js');
  const result = await automationService.setCookies(profile.cdp_port || undefined, req.body?.cookies, profile.chrome_data_path);
  return reply.send({ success: true, count: result.count, message: `${result.count} cookies aplicados com sucesso.` });
}

export async function clearProfileCookiesHandler(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  const profile = await profileRepository.findById(id);
  if (!profile) {
    return reply.status(404).send({ success: false, error: 'Perfil não encontrado' });
  }

  const { automationService } = await import('../services/automation.service.js');
  await automationService.clearCookies(profile.cdp_port || undefined, profile.chrome_data_path);
  return reply.send({ success: true, message: 'Cookies limpos com sucesso.' });
}

export async function clearProfileCacheHandler(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  const profile = await profileRepository.findById(id);
  if (!profile) {
    return reply.status(404).send({ success: false, error: 'Perfil não encontrado' });
  }

  if (!profile.cdp_port) {
    return reply.status(400).send({ success: false, error: 'Inicie o navegador para limpar o cache em tempo de execução via CDP.' });
  }

  const { automationService } = await import('../services/automation.service.js');
  await automationService.clearCache(profile.cdp_port);
  return reply.send({ success: true, message: 'Cache e storage limpos com sucesso.' });
}
