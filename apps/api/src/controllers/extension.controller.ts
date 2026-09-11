import { FastifyReply, FastifyRequest } from 'fastify';
import path from 'path';
import fs from 'fs';
import { profileRepository } from '../repositories/profile.repository.js';
import { ExtensionService } from '../services/extension.service.js';
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
