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

export async function createProxyHandler(req: FastifyRequest<{ Body: CreateProxyDTO }>, reply: FastifyReply) {
  const { name, host, port, username, password, type } = req.body;
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
