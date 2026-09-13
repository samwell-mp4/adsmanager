import { FastifyRequest, FastifyReply } from 'fastify';
import { financeService } from '../services/finance.service.js';
import { CreateFinancialTransactionInput } from '../types/index.js';

export async function listTransactionsHandler(
  req: FastifyRequest<{
    Querystring: {
      type?: string;
      category?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
      search?: string;
      limit?: string;
      offset?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
    const result = await financeService.listTransactions({
      type: req.query.type,
      category: req.query.category,
      status: req.query.status,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      search: req.query.search,
      limit,
      offset,
    });
    return reply.send({ success: true, data: result.transactions, total: result.total });
  } catch (err: any) {
    return reply.status(500).send({ success: false, message: err.message });
  }
}

export async function createTransactionHandler(
  req: FastifyRequest<{ Body: CreateFinancialTransactionInput }>,
  reply: FastifyReply
) {
  try {
    const transaction = await financeService.createTransaction(req.body);
    return reply.status(201).send({ success: true, data: transaction });
  } catch (err: any) {
    return reply.status(400).send({ success: false, message: err.message });
  }
}

export async function deleteTransactionHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await financeService.deleteTransaction(id);
    return reply.send({ success: true, deleted });
  } catch (err: any) {
    return reply.status(500).send({ success: false, message: err.message });
  }
}

export async function getFinancialSummaryHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const summary = await financeService.getSummary();
    return reply.send({ success: true, data: summary });
  } catch (err: any) {
    return reply.status(500).send({ success: false, message: err.message });
  }
}
