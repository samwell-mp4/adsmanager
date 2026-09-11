import { FastifyInstance } from 'fastify';
import {
  createProfileHandler,
  deleteProfileHandler,
  getProfileCdpHandler,
  getProfileEventsHandler,
  getProfileHandler,
  getProfileLogsHandler,
  getProfilePagesHandler,
  getProfileStatusHandler,
  getProfileVncHandler,
  listProfilesHandler,
  navigateProfileHandler,
  restartProfileHandler,
  startProfileHandler,
  stopProfileHandler,
  updateProfileHandler,
  updateProfileProxyHandler,
  getProfileCookiesHandler,
  setProfileCookiesHandler,
  clearProfileCookiesHandler,
  clearProfileCacheHandler,
} from '../controllers/profile.controller.js';

export async function profileRoutes(fastify: FastifyInstance) {
  // Profiles CRUD
  fastify.get('/api/profiles', listProfilesHandler);
  fastify.get('/api/profiles/:id', getProfileHandler);
  fastify.post('/api/profiles', createProfileHandler);
  fastify.patch('/api/profiles/:id', updateProfileHandler);
  fastify.delete('/api/profiles/:id', deleteProfileHandler);

  // Runtime Controls
  fastify.post('/api/profiles/:id/start', startProfileHandler);
  fastify.post('/api/profiles/:id/stop', stopProfileHandler);
  fastify.post('/api/profiles/:id/restart', restartProfileHandler);
  fastify.put('/api/profiles/:id/proxy', updateProfileProxyHandler);
  fastify.get('/api/profiles/:id/status', getProfileStatusHandler);

  // Remote Access & Automation
  fastify.get('/api/profiles/:id/vnc', getProfileVncHandler);
  fastify.get('/api/profiles/:id/cdp', getProfileCdpHandler);
  fastify.get('/api/profiles/:id/events', getProfileEventsHandler);
  fastify.get('/api/profiles/:id/logs', getProfileLogsHandler);
  fastify.get('/api/profiles/:id/pages', getProfilePagesHandler);
  fastify.post('/api/profiles/:id/navigate', navigateProfileHandler);

  // Cookies & Cache Management
  fastify.get('/api/profiles/:id/cookies', getProfileCookiesHandler);
  fastify.post('/api/profiles/:id/cookies', setProfileCookiesHandler);
  fastify.delete('/api/profiles/:id/cookies', clearProfileCookiesHandler);
  fastify.post('/api/profiles/:id/clear-cache', clearProfileCacheHandler);
}
