import React from 'react';
import { formatAmount } from '../utils/numberUtils';

export const HistoryBlock = ({ label, value, color }) => {
  return (
    <div className="flex justify-between items-center p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
      <span className="text-slate-500 font-bold">{label}</span>
      <span className={`text-2xl font-black ${color === 'emerald' ? 'text-emerald-600' : 'text-amber-600'}`}>
        {formatAmount(value)} <span className="text-sm font-normal opacity-40 mr-1">ج.م</span>
      </span>
    </div>
  );
};
