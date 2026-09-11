import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config/index.js';
import { pool, testDbConnection } from './db/index.js';
import { runMigrations } from './db/migrate.js';
import { healthRoutes } from './routes/health.routes.js';
import { proxyRoutes } from './routes/proxy.routes.js';
import { profileRoutes } from './routes/profile.routes.js';

import path from 'path';
import { fileURLToPath } from 'url';
import fastifyStatic from '@fastify/static';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Global error handler
fastify.setErrorHandler((error, _request, reply) => {
  fastify.log.error(error);
  return reply.status(error.statusCode || 500).send({
    success: false,
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Ocorreu um erro interno no servidor.',
    },
  });
});

// Handle SPA routing (React Router fallback)
fastify.setNotFoundHandler((request, reply) => {
  if (request.raw.url && request.raw.url.startsWith('/api')) {
    return reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method}:${request.url} not found`,
      },
    });
  }
  return (reply as any).sendFile('index.html');
});

import fs from 'fs';

async function start() {
  try {
    const staticPath = path.join(__dirname, '../../web/dist');
    console.log('[API] Serving static files from:', staticPath);
    console.log('[API] Does static directory exist?', fs.existsSync(staticPath));
    if (fs.existsSync(staticPath)) {
      console.log('[API] Files in static directory:', fs.readdirSync(staticPath));
    }

    // Serve static files from React frontend
    await fastify.register(fastifyStatic, {
      root: staticPath,
      prefix: '/',
    });

    // Explicit root route
    fastify.get('/', (request, reply) => {
      return (reply as any).sendFile('index.html');
    });

    // Enable CORS for web frontend
    await fastify.register(cors, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });

    // Register routes
    await fastify.register(healthRoutes);
    await fastify.register(proxyRoutes);
    await fastify.register(profileRoutes);

    console.log('[API] Checking database connection...');
    const isDbConnected = await testDbConnection();
    if (isDbConnected) {
      console.log('[API] Database connection established. Running migrations...');
      try {
        await runMigrations();
      } catch (migErr: any) {
        console.error('[API] Migration notice:', migErr.message);
      }
    } else {
      console.warn('[API] Warning: Database is not reachable at startup. API starting with degraded health.');
    }

    await fastify.listen({ port: config.port, host: config.host });
    console.log(`[API] Remote Browser Manager API running at http://${config.host}:${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async () => {
  console.log('[API] Shutting down gracefully...');
  await fastify.close();
  await pool.end();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
