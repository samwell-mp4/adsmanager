import { FastifyReply, FastifyRequest } from 'fastify';
import { testDbConnection } from '../db/index.js';
import { dockerManager } from '../managers/docker.manager.js';

export async function healthHandler(_req: FastifyRequest, reply: FastifyReply) {
  const [dbOk, dockerOk] = await Promise.all([
    testDbConnection(),
    dockerManager.ping(),
  ]);

  const allOk = dbOk && dockerOk;
  return reply.status(allOk ? 200 : 503).send({
    status: allOk ? 'ok' : 'degraded',
    database: dbOk,
    docker: dockerOk,
    timestamp: new Date().toISOString(),
  });
}
