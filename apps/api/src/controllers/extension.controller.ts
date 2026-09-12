import { FastifyReply, FastifyRequest } from 'fastify';
import path from 'path';
import fs from 'fs';
import { profileRepository } from '../repositories/profile.repository.js';
import { ExtensionService } from '../services/extension.service.js';
import { generateCrmExtensionFiles } from '../services/crm-extension-generator.js';
import { config } from '../config/index.js';

interface UploadExtensionBody {
  filename: string;
  fileBase64: string;
}

export async function uploadProfileExtensionHandler(
  req: FastifyRequest<{ Params: { id: string }; Body: UploadExtensionBody }>,
  reply: FastifyReply
) {
  const id = parseInt(req.params.id, 10);
  const profile = await profileRepository.findById(id);
  if (!profile) {
    return reply.status(404).send({
      success: false,
      error: { code: 'PROFILE_NOT_FOUND', message: `Perfil com ID ${id} não encontrado.` },
    });
  }

  const { filename, fileBase64 } = req.body || {};
  if (!fileBase64) {
    return reply.status(400).send({
      success: false,
      error: { code: 'INVALID_FILE', message: 'Nenhum arquivo zip enviado em base64.' },
    });
  }

  try {
    const buffer = Buffer.from(fileBase64.replace(/^data:.*?;base64,/, ''), 'base64');
    const targetDir = path.join(profile.chrome_data_path, 'custom_extensions');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true, mode: 0o777 });
    }

    const meta = await ExtensionService.extractAndInstallExtension(targetDir, filename || 'extension.zip', buffer);
    if (profile.container_name) {
      try {
        await dockerManager.injectZipIntoContainer(profile.container_name, meta.id, buffer.toString('base64'));
        await dockerManager.restartChromeInContainer(profile.container_name);
      } catch {}
    }
    return reply.send({ success: true, data: meta });
  } catch (err: any) {
    return reply.status(400).send({
      success: false,
      error: { code: 'EXTENSION_INSTALL_FAILED', message: err.message },
    });
  }
}

export async function listProfileExtensionsHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const id = parseInt(req.params.id, 10);
  const profile = await profileRepository.findById(id);
  if (!profile) {
    return reply.status(404).send({
      success: false,
      error: { code: 'PROFILE_NOT_FOUND', message: `Perfil com ID ${id} não encontrado.` },
    });
  }

  const targetDir = path.join(profile.chrome_data_path, 'custom_extensions');
  const extensions = ExtensionService.listExtensions(targetDir);
  return reply.send({ success: true, data: extensions });
}

export async function deleteProfileExtensionHandler(
  req: FastifyRequest<{ Params: { id: string; extId: string } }>,
  reply: FastifyReply
) {
  const id = parseInt(req.params.id, 10);
  const { extId } = req.params;
  const profile = await profileRepository.findById(id);
  if (!profile) {
    return reply.status(404).send({
      success: false,
      error: { code: 'PROFILE_NOT_FOUND', message: `Perfil com ID ${id} não encontrado.` },
    });
  }

  const targetDir = path.join(profile.chrome_data_path, 'custom_extensions');
  const deleted = ExtensionService.deleteExtension(targetDir, extId);
  return reply.send({ success: true, data: { deleted } });
}

import { dockerManager } from '../managers/docker.manager.js';

export async function downloadOfficialExtensionHandler(
  req: FastifyRequest<{ Params: { id?: string } }>,
  reply: FastifyReply
) {
  let profile = null;
  if (req.params?.id) {
    const id = parseInt(req.params.id, 10);
    profile = await profileRepository.findById(id);
  }

  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3001';
  const apiBaseUrl = `${proto}://${host}`;

  const files = generateCrmExtensionFiles({
    profileId: profile?.id || 1,
    profileUuid: profile?.uuid || 'default',
    apiBaseUrl,
  });

  const AdmZip = (await import('adm-zip')).default;
  const zip = new AdmZip();

  for (const [filename, content] of Object.entries(files)) {
    if (Buffer.isBuffer(content)) {
      zip.addFile(filename, content);
    } else {
      zip.addFile(filename, Buffer.from(content, 'utf-8'));
    }
  }

  const buffer = zip.toBuffer();
  reply.header('Content-Type', 'application/zip');
  reply.header('Content-Disposition', 'attachment; filename="adsmanager-crm-extension.zip"');
  return reply.send(buffer);
}

export async function installOfficialExtensionHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const id = parseInt(req.params.id, 10);
  const profile = await profileRepository.findById(id);
  if (!profile) {
    return reply.status(404).send({
      success: false,
      error: { code: 'PROFILE_NOT_FOUND', message: `Perfil com ID ${id} não encontrado.` },
    });
  }

  try {
    const targetDir = path.join(profile.chrome_data_path, 'custom_extensions');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true, mode: 0o777 });
    }

    // Clean up old reserved folders
    for (const legacy of ['__crm_collector', '__proxy_auth', '__anti_detect']) {
      const oldDir = path.join(targetDir, legacy);
      if (fs.existsSync(oldDir)) {
        try { fs.rmSync(oldDir, { recursive: true, force: true }); } catch {}
      }
    }

    // Use adsmanager_crm (no leading underscore, fully compliant with Chromium)
    const crmExtDir = path.join(targetDir, 'adsmanager_crm');
    if (!fs.existsSync(crmExtDir)) {
      fs.mkdirSync(crmExtDir, { recursive: true, mode: 0o777 });
    }

    const proto = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3001';
    const apiBaseUrl = `${proto}://${host}`;

    const files = generateCrmExtensionFiles({
      profileId: profile.id,
      profileUuid: profile.uuid,
      apiBaseUrl,
    });

    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip();

    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(crmExtDir, filename);
      if (Buffer.isBuffer(content)) {
        fs.writeFileSync(filePath, content);
        zip.addFile(filename, content);
      } else {
        fs.writeFileSync(filePath, content, 'utf-8');
        zip.addFile(filename, Buffer.from(content, 'utf-8'));
      }
      try { fs.chmodSync(filePath, 0o777); } catch {}
    }

    try { fs.chmodSync(crmExtDir, 0o777); } catch {}

    // Save extension.zip to /tmp and profile directory
    const zipBuffer = zip.toBuffer();
    const saveLocations = [
      '/tmp/adsmanager-crm-extension.zip',
      '/tmp/extension.zip',
      path.join(profile.chrome_data_path, 'extension.zip'),
      path.join(profile.chrome_data_path, 'adsmanager-crm-extension.zip'),
    ];

    for (const loc of saveLocations) {
      try {
        fs.writeFileSync(loc, zipBuffer);
        fs.chmodSync(loc, 0o777);
      } catch {}
    }

    // Also mirror to Desktop/Downloads folders if accessible
    for (const sub of ['Desktop', 'Downloads']) {
      try {
        const subDir = path.join(profile.chrome_data_path, sub, 'adsmanager_crm');
        if (!fs.existsSync(subDir)) {
          fs.mkdirSync(subDir, { recursive: true, mode: 0o777 });
        }
        for (const [filename, content] of Object.entries(files)) {
          const filePath = path.join(subDir, filename);
          if (Buffer.isBuffer(content)) {
            fs.writeFileSync(filePath, content);
          } else {
            fs.writeFileSync(filePath, content, 'utf-8');
          }
          try { fs.chmodSync(filePath, 0o777); } catch {}
        }
      } catch {}
    }

    // If container is currently running, inject files directly into container and restart Chrome!
    let chromeRestarted = false;
    if (profile.container_name) {
      try {
        await dockerManager.injectOfficialCrmExtension(profile.container_name, profile.id, profile.uuid);
        chromeRestarted = await dockerManager.restartChromeInContainer(profile.container_name);
      } catch (injErr: any) {
        console.warn('[ExtensionController] Notice injecting into container:', injErr.message);
      }
    }

    return reply.send({
      success: true,
      message: chromeRestarted
        ? 'Extensão Oficial Ads Manager CRM instalada! O Chrome no VNC está sendo reiniciado agora com a extensão ativa.'
        : 'Extensão Oficial Ads Manager CRM instalada com sucesso neste perfil!',
      data: {
        id: 'adsmanager_crm',
        name: 'Ads Manager CRM Collector (Oficial)',
        version: '1.3.0',
        isOfficial: true,
        chromeRestarted,
      },
    });
  } catch (err: any) {
    return reply.status(500).send({
      success: false,
      error: { code: 'INSTALL_FAILED', message: err.message },
    });
  }
}


export async function uploadGlobalExtensionHandler(
  req: FastifyRequest<{ Body: UploadExtensionBody }>,
  reply: FastifyReply
) {
  const { filename, fileBase64 } = req.body || {};
  if (!fileBase64) {
    return reply.status(400).send({
      success: false,
      error: { code: 'INVALID_FILE', message: 'Nenhum arquivo zip enviado em base64.' },
    });
  }

  try {
    const buffer = Buffer.from(fileBase64.replace(/^data:.*?;base64,/, ''), 'base64');
    const targetDir = config.extensionsDataDir;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true, mode: 0o777 });
    }

    const meta = await ExtensionService.extractAndInstallExtension(targetDir, filename || 'extension.zip', buffer);
    return reply.send({ success: true, data: meta });
  } catch (err: any) {
    return reply.status(400).send({
      success: false,
      error: { code: 'EXTENSION_INSTALL_FAILED', message: err.message },
    });
  }
}

export async function listGlobalExtensionsHandler(_req: FastifyRequest, reply: FastifyReply) {
  const targetDir = config.extensionsDataDir;
  const extensions = ExtensionService.listExtensions(targetDir);
  return reply.send({ success: true, data: extensions });
}

export async function deleteGlobalExtensionHandler(
  req: FastifyRequest<{ Params: { extId: string } }>,
  reply: FastifyReply
) {
  const { extId } = req.params;
  const targetDir = config.extensionsDataDir;
  const deleted = ExtensionService.deleteExtension(targetDir, extId);
  return reply.send({ success: true, data: { deleted } });
}
