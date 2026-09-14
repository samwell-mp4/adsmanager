import { FastifyInstance } from 'fastify';
import {
  listDirectoryHandler,
  readFileHandler,
  writeFileHandler,
  uploadFileHandler,
  deleteItemHandler,
  createDirectoryHandler,
} from '../controllers/fs.controller.js';

export default async function (fastify: FastifyInstance) {
  fastify.get('/api/fs/list', listDirectoryHandler);
  fastify.get('/api/fs/read', readFileHandler);
  fastify.post('/api/fs/write', writeFileHandler);
  fastify.post('/api/fs/upload', uploadFileHandler);
  fastify.post('/api/fs/delete', deleteItemHandler);
  fastify.post('/api/fs/mkdir', createDirectoryHandler);
}
