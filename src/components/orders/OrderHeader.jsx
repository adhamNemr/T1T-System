import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { formatAmount } from '../../utils/numberUtils';

export const OrderHeader = ({ totalValue }) => {
  return (
    <div className="bg-[#064e3b] p-10 rounded-[40px] shadow-2xl border border-white/10 text-white flex flex-col md:flex-row justify-between items-center gap-6">
      <div className="flex items-center gap-6">
         <div className="p-5 bg-white/10 rounded-3xl backdrop-blur-md">
            <ShoppingCart size={40} className="text-amber-400" />
         </div>
         <div>
            <h2 className="text-3xl font-black mb-1">سجل الطلبيات</h2>
            <p className="opacity-70 font-bold text-lg">إجمالي المصروفات على الطلبيات الكبرى</p>
         </div>
      </div>
      <div className="text-right">
         <div className="text-5xl font-black text-amber-400">{formatAmount(totalValue)}</div>
         <div className="text-sm font-bold opacity-50 uppercase tracking-widest mt-1">Total Orders Value</div>
      </div>
    </div>
  );
};
