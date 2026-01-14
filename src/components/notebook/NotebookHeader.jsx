import React from 'react';
import { Book } from 'lucide-react';
import { formatAmount } from '../../utils/numberUtils';

export const NotebookHeader = ({ totalDebt }) => {
  return (
    <div className="bg-[#064e3b] p-10 rounded-[40px] shadow-2xl text-white flex justify-between items-center w-full max-w-4xl mx-auto border-b-4 border-amber-500">
      <div className="flex items-center gap-6">
         <div className="p-5 bg-white/10 rounded-3xl backdrop-blur-md shadow-lg">
            <Book size={40} className="text-amber-400" />
         </div>
         <div>
            <h2 className="text-3xl font-black mb-1">الدفتر (الآجل)</h2>
            <p className="text-emerald-100 font-bold text-lg opacity-80">متابعة حسابات العملاء المجمعة</p>
         </div>
      </div>
      <div className="text-right">
         <div className="text-5xl font-black text-amber-400 drop-shadow-sm monospaced-numbers">
           {formatAmount(totalDebt)}
         </div>
         <div className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em] mt-2">Total Debts Outstanding</div>
      </div>
    </div>
  );
};
