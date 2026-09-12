import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config/index.js';
import { pool, testDbConnection } from './db/index.js';
import { runMigrations } from './db/migrate.js';
import { healthRoutes } from './routes/health.routes.js';
import { proxyRoutes } from './routes/proxy.routes.js';
import { profileRoutes } from './routes/profile.routes.js';
import { extensionRoutes } from './routes/extension.routes.js';

import path from 'path';
import { fileURLToPath } from 'url';
import fastifyStatic from '@fastify/static';

import { dockerManager } from './managers/docker.manager.js';
import httpProxy from 'http-proxy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const proxy = httpProxy.createProxyServer({ ws: true });

const fastify = Fastify({
  bodyLimit: 52428800, // 50MB for extensions zip uploads
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

// Gracefully handle empty or whitespace JSON bodies without throwing 400 Bad Request
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  try {
    if (!body || (typeof body === 'string' && !body.trim())) {
      done(null, {});
      return;
    }
    const json = JSON.parse(body as string);
    done(null, json);
  } catch (err: any) {
    err.statusCode = 400;
    done(err, undefined);
  }
});

export let activePublicUrl: string = process.env.PUBLIC_URL || 'https://adsmanager-adsmanagerapp.ahzgvk.easypanel.host';

// Log every incoming request immediately so it is 100% visible in Easypanel logs
fastify.addHook('onRequest', async (request) => {
  const host = (request.headers['x-forwarded-host'] || request.headers.host) as string;
  const proto = (request.headers['x-forwarded-proto'] || 'https') as string;
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1') && !host.startsWith('172.')) {
    activePublicUrl = `${proto}://${host}`;
  }
  console.log(`[HTTP INCOMING] ${request.method} ${request.url} from ${request.ip} (host: ${host})`);
});

// Proxy VNC HTTP Traffic
const handleVncProxy = async (request: any, reply: any) => {
  const { port } = request.params as { port: string };
  const portNum = parseInt(port, 10);
  const target = await dockerManager.getTargetForPort(portNum);

  // Strip the /vnc/:port prefix before proxying
  request.raw.url = request.raw.url?.replace(`/vnc/${port}`, '') || '/';
  if (!request.raw.url.startsWith('/')) {
    request.raw.url = '/' + request.raw.url;
  }

  proxy.web(request.raw, reply.raw, { target }, (err) => {
    fastify.log.warn(`[VNC Proxy] Error proxying port ${port} to ${target}: ${err.message}`);
    if (!reply.raw.headersSent) {
      reply.status(502).send({ success: false, error: 'VNC Proxy Error: ' + err.message });
    }
  });

  return reply;
};

fastify.all('/vnc/:port', handleVncProxy);
fastify.all('/vnc/:port/*', handleVncProxy);

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

    // Enable CORS for web frontend
    await fastify.register(cors, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });

    // Serve static files from React frontend
    await fastify.register(fastifyStatic, {
      root: staticPath,
      prefix: '/',
    });

    // Explicit root route
    fastify.get('/', (request, reply) => {
      return (reply as any).sendFile('index.html');
    });

    fastify.get('/debug-files', (request, reply) => {
      try {
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

    // Register routes
    await fastify.register(healthRoutes);
    await fastify.register(proxyRoutes);
    await fastify.register(profileRoutes);
    await fastify.register(extensionRoutes);
    const { crmRoutes } = await import('./routes/crm.routes.js');
    await fastify.register(crmRoutes);

    // Save official CRM extension zip to /tmp for direct host/container access
    try {
      const { generateCrmExtensionFiles } = await import('./services/crm-extension-generator.js');
      const AdmZip = (await import('adm-zip')).default;
      const files = generateCrmExtensionFiles({ profileId: 1 });
      const zip = new AdmZip();
      for (const [filename, content] of Object.entries(files)) {
        if (Buffer.isBuffer(content)) {
          zip.addFile(filename, content);
        } else {
          zip.addFile(filename, Buffer.from(content, 'utf-8'));
        }
      }
      const zipBuffer = zip.toBuffer();
      const tmpTargets = ['/tmp/adsmanager-crm-extension.zip', '/tmp/extension.zip'];
      for (const targetPath of tmpTargets) {
        try {
          fs.writeFileSync(targetPath, zipBuffer);
          fs.chmodSync(targetPath, 0o777);
          console.log(`[API] Extension zip saved to ${targetPath}`);
        } catch {}
      }
    } catch (zipErr: any) {
      console.warn('[API] Notice saving extension to /tmp:', zipErr.message);
    }

    console.log('[API] Checking database connection...');
    const isDbConnected = await testDbConnection();
    if (isDbConnected) {
      console.log('[API] Database connection established. Running migrations...');
      try {
        await runMigrations();
      } catch (migErr: any) {
        console.error('[API] Migration notice:', migErr.message);
      }

      // Explicitly guarantee CRM tables and indexes exist
      try {
        const { crmRepository } = await import('./repositories/crm.repository.js');
        await crmRepository.ensureCrmTablesExist();
        console.log('[API] CRM omnichannel tables and indexes confirmed.');
      } catch (crmTableErr: any) {
        console.error('[API] Notice confirming CRM tables:', crmTableErr.message);
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

    // Dual-port listener: also listen on port 3000 (if primary is 3001) or 3001 (if primary is 3000)
    // so Easypanel / Traefik will ALWAYS connect regardless of whether 3000 or 3001 is mapped in domains!
    const altPort = config.port === 3000 ? 3001 : 3000;
    try {
      const httpModule = await import('http');
      const altServer = httpModule.default.createServer((req, res) => {
        fastify.server.emit('request', req, res);
      });
      altServer.on('upgrade', (req, socket, head) => {
        fastify.server.emit('upgrade', req, socket, head);
      });
      altServer.on('error', (err: any) => {
        console.log(`[API] Alternate listener on port ${altPort} notice:`, err.message);
      });
      altServer.listen(altPort, config.host, () => {
        console.log(`[API] Alternate listener active on http://${config.host}:${altPort}`);
      });
    } catch (e: any) {
      console.log(`[API] Alternate listener setup notice:`, e.message);
    }

    // Listen to upgrade events for websocket proxying (noVNC uses wss)
    fastify.server.on('upgrade', async (req, socket, head) => {
      try {
        const urlObj = new URL(req.url || '', 'http://localhost');
        const match = urlObj.pathname.match(/^\/vnc\/(\d+)(\/.*)?$/);
        if (match) {
          const port = parseInt(match[1], 10);
          const subPath = (match[2] || '/') + urlObj.search;
          req.url = subPath;
          const target = await dockerManager.getTargetForPort(port);
          proxy.ws(req, socket, head, { target }, (err) => {
            fastify.log.warn(`[VNC WS] Proxy error on port ${port} to ${target}: ${err.message}`);
            socket.destroy();
          });
          return;
        }
      } catch (err: any) {
        fastify.log.error(`[VNC WS Upgrade Error]: ${err.message}`);
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
