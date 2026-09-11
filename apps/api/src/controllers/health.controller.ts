import { FastifyReply, FastifyRequest } from 'fastify';
import { testDbConnection } from '../db/index.js';
import { dockerManager } from '../managers/docker.manager.js';

export async function healthHandler(_req: FastifyRequest, reply: FastifyReply) {
  const checkWithTimeout = async (fn: () => Promise<boolean>, timeoutMs = 2000) => {
    try {
      return await Promise.race([
        fn(),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
      ]);
    } catch {
      return false;
    }
  };

  const [dbOk, dockerOk] = await Promise.all([
    checkWithTimeout(() => testDbConnection()),
    checkWithTimeout(() => dockerManager.ping()),
  ]);

  const allOk = dbOk && dockerOk;
  // Always return HTTP 200 so Traefik/Easypanel never marks the service as dead (502 Bad Gateway)
  return reply.status(200).send({
    status: allOk ? 'ok' : 'degraded',
    database: dbOk,
    docker: dockerOk,
    timestamp: new Date().toISOString(),
  });
}
