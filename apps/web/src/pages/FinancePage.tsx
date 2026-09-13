import React from 'react';
import { FinanceView } from '../views/FinanceView.js';

export const FinancePage: React.FC = () => {
  return (
    <div className="h-full flex-1 overflow-hidden bg-slate-50 flex flex-col">
      <FinanceView />
    </div>
  );
};

export default FinancePage;
