import { FastifyRequest, FastifyReply } from 'fastify';
import { fsService } from '../services/fs.service.js';

export async function listDirectoryHandler(
  req: FastifyRequest<{ Querystring: { path?: string } }>,
  reply: FastifyReply
) {
  try {
    const targetPath = req.query.path || '';
    const items = fsService.listDirectory(targetPath);
    return reply.send({ success: true, data: items });
  } catch (err: any) {
    return reply.status(400).send({ success: false, error: err.message });
  }
}

export async function readFileHandler(
  req: FastifyRequest<{ Querystring: { path: string } }>,
  reply: FastifyReply
) {
  try {
    const targetPath = req.query.path;
    if (!targetPath) throw new Error('Path is required');
    const content = fsService.readFile(targetPath);
    return reply.send({ success: true, data: content });
  } catch (err: any) {
    return reply.status(400).send({ success: false, error: err.message });
  }
}

export async function writeFileHandler(
  req: FastifyRequest<{ Body: { path: string; content: string } }>,
  reply: FastifyReply
) {
  try {
    const { path: targetPath, content } = req.body || {};
    if (!targetPath) throw new Error('Path is required');
    fsService.writeFile(targetPath, content || '');
    return reply.send({ success: true });
  } catch (err: any) {
    return reply.status(400).send({ success: false, error: err.message });
  }
}

export async function uploadFileHandler(
  req: FastifyRequest<{ Body: { path: string; fileBase64: string } }>,
  reply: FastifyReply
) {
  try {
    const { path: targetPath, fileBase64 } = req.body || {};
    if (!targetPath || !fileBase64) throw new Error('Path and fileBase64 are required');
    fsService.uploadFile(targetPath, fileBase64);
    return reply.send({ success: true });
  } catch (err: any) {
    return reply.status(400).send({ success: false, error: err.message });
  }
}

export async function deleteItemHandler(
  req: FastifyRequest<{ Body: { path: string } }>,
  reply: FastifyReply
) {
  try {
    const { path: targetPath } = req.body || {};
    if (!targetPath) throw new Error('Path is required');
    fsService.deleteItem(targetPath);
    return reply.send({ success: true });
  } catch (err: any) {
    return reply.status(400).send({ success: false, error: err.message });
  }
}

export async function createDirectoryHandler(
  req: FastifyRequest<{ Body: { path: string } }>,
  reply: FastifyReply
) {
  try {
    const { path: targetPath } = req.body || {};
    if (!targetPath) throw new Error('Path is required');
    fsService.createDirectory(targetPath);
    return reply.send({ success: true });
  } catch (err: any) {
    return reply.status(400).send({ success: false, error: err.message });
  }
}
