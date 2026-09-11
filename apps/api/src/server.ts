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

import { dockerManager } from './managers/docker.manager.js';
import httpProxy from 'http-proxy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const proxy = httpProxy.createProxyServer({ ws: true });

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

// Proxy VNC Traffic
fastify.all('/vnc/:port/*', async (request, reply) => {
  const { port } = request.params as { port: string };
  const target = `http://127.0.0.1:${port}`;
  
  // Strip the /vnc/:port prefix before proxying
  request.raw.url = request.raw.url?.replace(`/vnc/${port}`, '') || '/';
  
  proxy.web(request.raw, reply.raw, { target }, (err) => {
    reply.status(502).send({ success: false, error: 'VNC Proxy Error' });
  });
  
  return reply; // Fastify expects return for manual replies
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

    // Explicit root route
    fastify.get('/', (request, reply) => {
      return (reply as any).sendFile('index.html');
    });

    fastify.get('/debug-files', (request, reply) => {
      try {
        const staticPath = path.join(__dirname, '../../web/dist');
        const exists = fs.existsSync(staticPath);
        let files: string[] = [];
        if (exists) {
          files = fs.readdirSync(staticPath);
        }
        return { success: true, __dirname, staticPath, exists, files };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    });

    // Serve static files from React frontend
    await fastify.register(fastifyStatic, {
      root: staticPath,
      prefix: '/',
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

    // Check Docker and prepare image WITHOUT blocking startup
    console.log('[API] Checking Docker daemon connection...');
    const isDockerConnected = await dockerManager.ping();
    if (isDockerConnected) {
      console.log('[API] Docker connected. Ensuring browser image is built in background...');
      dockerManager.ensureImageExists().catch(err => {
        console.error('[API] Background image build failed:', err.message);
      });
    } else {
      console.warn('[API] Warning: Docker daemon is not reachable at startup. Profile creation will fail.');
    }

    await fastify.listen({ port: config.port, host: config.host });
    console.log(`[API] Remote Browser Manager API running at http://${config.host}:${config.port}`);

    // Listen to upgrade events for websocket proxying (noVNC uses wss)
    fastify.server.on('upgrade', (req, socket, head) => {
      if (req.url && req.url.startsWith('/vnc/')) {
        const port = req.url.split('/')[2];
        req.url = req.url.replace(`/vnc/${port}`, '') || '/';
        proxy.ws(req, socket, head, { target: `http://127.0.0.1:${port}` });
      }
    });

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
