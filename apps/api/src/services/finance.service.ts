import { crmRepository } from '../repositories/crm.repository.js';
import { CreateFinancialTransactionInput, CrmFinancialTransaction, FinancialSummary } from '../types/index.js';

export class FinanceService {
  async listTransactions(filter: {
    type?: string;
    category?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    return crmRepository.listFinancialTransactions(filter);
  }

  async createTransaction(data: CreateFinancialTransactionInput): Promise<CrmFinancialTransaction> {
    if (!data.description || !data.description.trim()) {
      throw new Error('A descrição do lançamento é obrigatória');
    }
    if (!data.amount || isNaN(Number(data.amount)) || Number(data.amount) <= 0) {
      throw new Error('O valor do lançamento deve ser maior que zero');
    }
    return crmRepository.createFinancialTransaction(data);
  }

  async deleteTransaction(id: number): Promise<boolean> {
    return crmRepository.deleteFinancialTransaction(id);
  }

  async getSummary(): Promise<FinancialSummary> {
    return crmRepository.getFinancialSummary();
  }
}

export const financeService = new FinanceService();
