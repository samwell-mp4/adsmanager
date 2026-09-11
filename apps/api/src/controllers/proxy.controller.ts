import { FastifyReply, FastifyRequest } from 'fastify';
import { proxyRepository } from '../repositories/proxy.repository.js';
import { proxyTesterService } from '../services/proxy-tester.service.js';
import { CreateProxyDTO, UpdateProxyDTO } from '../types/index.js';

export async function listProxiesHandler(_req: FastifyRequest, reply: FastifyReply) {
  const proxies = await proxyRepository.findAll();
  return reply.send({ success: true, data: proxies });
}

export async function getProxyHandler(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  const proxy = await proxyRepository.findById(id);
  if (!proxy) {
    return reply.status(404).send({
      success: false,
      error: { code: 'PROXY_NOT_FOUND', message: `Proxy com ID ${id} não encontrado.` },
    });
  }
  return reply.send({ success: true, data: proxy });
}

export function parseProxyString(raw: string) {
  let cleaned = raw.trim();
  let type: 'http' | 'https' | 'socks4' | 'socks5' = 'http';

  // Check scheme
  if (cleaned.startsWith('socks5://')) {
    type = 'socks5';
    cleaned = cleaned.replace('socks5://', '');
  } else if (cleaned.startsWith('socks4://')) {
    type = 'socks4';
    cleaned = cleaned.replace('socks4://', '');
  } else if (cleaned.startsWith('https://')) {
    type = 'https';
    cleaned = cleaned.replace('https://', '');
  } else if (cleaned.startsWith('http://')) {
    type = 'http';
    cleaned = cleaned.replace('http://', '');
  }

  let host = '';
  let port = 80;
  let username: string | undefined = undefined;
  let password: string | undefined = undefined;

  // Format: user:pass@host:port
  if (cleaned.includes('@')) {
    const [authPart, hostPart] = cleaned.split('@');
    const [u, p] = authPart.split(':');
    const [h, prt] = hostPart.split(':');
    username = u;
    password = p;
    host = h;
    port = parseInt(prt || '80', 10);
  } else if (cleaned.includes(':')) {
    const parts = cleaned.split(':');
    if (parts.length === 4) {
      // Format: host:port:user:pass
      host = parts[0];
      port = parseInt(parts[1], 10);
      username = parts[2];
      password = parts[3];
    } else if (parts.length === 2) {
      // Format: host:port
      host = parts[0];
      port = parseInt(parts[1], 10);
    } else if (parts.length >= 5) {
      host = parts[0];
      port = parseInt(parts[1], 10);
      username = parts[2];
      password = parts.slice(3).join(':');
    }
  }

  let country: string | undefined = undefined;
  let state: string | undefined = undefined;

  const fullText = (raw + ' ' + (username || '')).toLowerCase();
  if (fullText.includes('country-br') || fullText.includes('-br-') || fullText.includes('.br')) {
    country = 'BR';
  } else if (fullText.includes('country-us') || fullText.includes('-us-')) {
    country = 'US';
  }

  if (fullText.includes('saopaulo') || fullText.includes('sao-paulo') || fullText.includes('sp')) {
    state = 'SP';
  }

  let suggestedName = host ? `${host}:${port}` : 'Novo Proxy';
  if (country) suggestedName = `${country} - ${host}:${port}`;
  if (state) suggestedName = `${country} (${state}) - ${host}:${port}`;

  return {
    name: suggestedName,
    host,
    port: Number(port) || 80,
    username,
    password,
    type,
    country,
    state,
  };
}

export async function parseProxyHandler(req: FastifyRequest<{ Body: { raw: string } }>, reply: FastifyReply) {
  const { raw } = req.body || {};
  if (!raw) {
    return reply.status(400).send({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'String do proxy é obrigatória.' },
    });
  }

  const parsed = parseProxyString(raw);
  return reply.send({ success: true, data: parsed });
}

export async function createProxyHandler(req: FastifyRequest<{ Body: CreateProxyDTO & { raw?: string; test_now?: boolean } }>, reply: FastifyReply) {
  let { name, host, port, username, password, type, raw, test_now } = req.body;

  if (raw && (!host || !port)) {
    const parsed = parseProxyString(raw);
    name = name || parsed.name;
    host = parsed.host;
    port = parsed.port;
    username = parsed.username;
    password = parsed.password;
    type = type || parsed.type;
  }

  if (!name || !host || !port) {
    return reply.status(400).send({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Nome, Host e Porta são obrigatórios.' },
    });
  }

  const proxy = await proxyRepository.create({
    name,
    host,
    port: Number(port),
    username,
    password,
    type: type || 'http',
  });

  if (test_now) {
    try {
      const testResult = await proxyTesterService.testProxy(proxy);
      await proxyRepository.updateTestResult(proxy.id, {
        status: testResult.success ? 'active' : 'error',
        latency_ms: testResult.latency_ms,
        last_ip: testResult.ip,
      });
      proxy.status = testResult.success ? 'active' : 'error';
      proxy.latency_ms = testResult.latency_ms ?? null;
      proxy.last_ip = testResult.ip ?? null;
    } catch {
      // Non-blocking test
    }
  }

  return reply.status(201).send({ success: true, data: proxy });
}

export async function updateProxyHandler(
  req: FastifyRequest<{ Params: { id: string }; Body: UpdateProxyDTO }>,
  reply: FastifyReply
) {
  const id = parseInt(req.params.id, 10);
  const existing = await proxyRepository.findById(id);
  if (!existing) {
    return reply.status(404).send({
      success: false,
      error: { code: 'PROXY_NOT_FOUND', message: `Proxy com ID ${id} não encontrado.` },
    });
  }

  const updated = await proxyRepository.update(id, req.body);
  return reply.send({ success: true, data: updated });
}

export async function deleteProxyHandler(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  const deleted = await proxyRepository.delete(id);
  if (!deleted) {
    return reply.status(404).send({
      success: false,
      error: { code: 'PROXY_NOT_FOUND', message: `Proxy com ID ${id} não encontrado.` },
    });
  }
  return reply.send({ success: true, message: 'Proxy excluído com sucesso.' });
}

export async function testProxyHandler(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const id = parseInt(req.params.id, 10);
  const proxy = await proxyRepository.findById(id);
  if (!proxy) {
    return reply.status(404).send({
      success: false,
      error: { code: 'PROXY_NOT_FOUND', message: `Proxy com ID ${id} não encontrado.` },
    });
  }

  const testResult = await proxyTesterService.testProxy(proxy);
  await proxyRepository.updateTestResult(id, {
    status: testResult.success ? 'active' : 'error',
    latency_ms: testResult.latency_ms,
    last_ip: testResult.ip,
  });

  return reply.send(testResult);
}
