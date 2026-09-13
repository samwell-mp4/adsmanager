import { FastifyInstance } from 'fastify';
import {
  listTransactionsHandler,
  createTransactionHandler,
  deleteTransactionHandler,
  getFinancialSummaryHandler
} from '../controllers/finance.controller.js';

export async function financeRoutes(fastify: FastifyInstance) {
  fastify.get('/transactions', listTransactionsHandler);
  fastify.post('/transactions', createTransactionHandler);
  fastify.delete('/transactions/:id', deleteTransactionHandler);
  fastify.get('/summary', getFinancialSummaryHandler);

  // Alias para quando acessado via /api/finance/...
  fastify.get('/api/finance/transactions', listTransactionsHandler);
  fastify.post('/api/finance/transactions', createTransactionHandler);
  fastify.delete('/api/finance/transactions/:id', deleteTransactionHandler);
  fastify.get('/api/finance/summary', getFinancialSummaryHandler);
}
