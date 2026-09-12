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

    // Clean up old reserved __crm_collector folder if present
    const oldCrmExtDir = path.join(targetDir, '__crm_collector');
    if (fs.existsSync(oldCrmExtDir)) {
      try { fs.rmSync(oldCrmExtDir, { recursive: true, force: true }); } catch {}
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

    return reply.send({
      success: true,
      message: 'Extensão Oficial Ads Manager CRM instalada com sucesso neste perfil e salva em /tmp!',
      data: {
        id: 'adsmanager_crm',
        name: 'Ads Manager CRM Collector (Oficial)',
        version: '1.2.1',
        isOfficial: true,
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
