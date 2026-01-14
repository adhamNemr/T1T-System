import React from 'react';
import { UserPlus, PlusCircle } from 'lucide-react';

export const NotebookForm = ({ newDebtorName, setNewName, onAdd }) => {
  return (
    <div className="bg-white p-8 rounded-[40px] shadow-premium border border-white w-full max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase mr-4">إسم العميل الجديد</label>
          <div className="relative">
            <UserPlus size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={newDebtorName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAdd()}
              placeholder="ادخل الاسم بالكامل واضغط Enter"
              className="w-full pr-12 pl-6 py-4 bg-slate-50 border-2 border-slate-100 focus:border-[#064e3b] focus:bg-white rounded-2xl outline-none font-bold text-[#064e3b] text-lg transition-all shadow-inner"
            />
          </div>
        </div>
        <button onClick={onAdd} className="px-10 py-4 bg-[#064e3b] text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-lg hover:translate-y-[-2px] hover:shadow-xl active:scale-95 flex items-center gap-3">
           <PlusCircle size={20} />
           <span>فتح حساب جديد</span>
        </button>
      </div>
    </div>
  );
};
