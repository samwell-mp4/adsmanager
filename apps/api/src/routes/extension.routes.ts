import { FastifyInstance } from 'fastify';
import {
  uploadProfileExtensionHandler,
  listProfileExtensionsHandler,
  deleteProfileExtensionHandler,
  installOfficialExtensionHandler,
  downloadOfficialExtensionHandler,
  uploadGlobalExtensionHandler,
  listGlobalExtensionsHandler,
  deleteGlobalExtensionHandler,
} from '../controllers/extension.controller.js';

export async function extensionRoutes(fastify: FastifyInstance) {
  // Profile-specific custom extensions (support both /api prefix and root for full compatibility)
  const profileUploadUrls = ['/api/profiles/:id/extensions/upload', '/profiles/:id/extensions/upload'];
  const profileListUrls = ['/api/profiles/:id/extensions', '/profiles/:id/extensions'];
  const profileDeleteUrls = ['/api/profiles/:id/extensions/:extId', '/profiles/:id/extensions/:extId'];
  const profileInstallUrls = ['/api/profiles/:id/extensions/install-official', '/profiles/:id/extensions/install-official'];
  const profileDownloadUrls = ['/api/profiles/:id/extensions/official/download', '/profiles/:id/extensions/official/download'];

  for (const url of profileUploadUrls) fastify.post(url, uploadProfileExtensionHandler);
  for (const url of profileListUrls) fastify.get(url, listProfileExtensionsHandler);
  for (const url of profileDeleteUrls) fastify.delete(url, deleteProfileExtensionHandler);
  for (const url of profileInstallUrls) fastify.post(url, installOfficialExtensionHandler);
  for (const url of profileDownloadUrls) fastify.get(url, downloadOfficialExtensionHandler);

  // Global extensions catalog & direct download
  const globalDownloadUrls = ['/api/extensions/crm/download', '/extensions/crm/download'];
  for (const url of globalDownloadUrls) fastify.get(url, downloadOfficialExtensionHandler);

  // Global extensions catalog
  const globalUploadUrls = ['/api/extensions/upload', '/extensions/upload'];
  const globalListUrls = ['/api/extensions', '/extensions'];
  const globalDeleteUrls = ['/api/extensions/:extId', '/extensions/:extId'];

  for (const url of globalUploadUrls) fastify.post(url, uploadGlobalExtensionHandler);
  for (const url of globalListUrls) fastify.get(url, listGlobalExtensionsHandler);
  for (const url of globalDeleteUrls) fastify.delete(url, deleteGlobalExtensionHandler);
}
