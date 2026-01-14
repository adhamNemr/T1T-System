import React from 'react';
import { motion } from 'framer-motion';
import { HistoryBlock } from '../components/HistoryBlock';
import { formatAmount } from '../utils/numberUtils';
import { Calendar, Save, FileCheck, Clock } from 'lucide-react';

export const DashboardPage = ({ entries, userRole, onFinalizeDay }) => {
  const todayDate = new Date().toISOString().split('T')[0];
  const todayEntries = entries.filter(e => e.date === todayDate);
  const totalTodaySales = todayEntries.reduce((s, e) => s + Number(e.sales), 0);
  const totalTodayExp = todayEntries.reduce((s, e) => s + e.expenses.reduce((sx, ex) => sx + Number(ex.amount || 0), 0), 0);

  const allTimeSales = entries.reduce((s, e) => s + Number(e.sales), 0);
  const allTimeExp = entries.reduce((s, e) => s + e.expenses.reduce((sx, ex) => sx + Number(ex.amount || 0), 0), 0);

  const handleFinalizeMonth = () => {
    alert('سيتم إغلاق حسابات الشهر بالكامل وإصدار تقرير شهري... (قيد التنفيذ)');
  };

  return (
    <motion.div key="dashboard" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-8">
      
      {/* Super Admin Controls */}
      {userRole === 'super' && (
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-[#064e3b] p-8 rounded-[40px] shadow-xl border border-white/10 flex flex-col md:flex-row justify-between items-center gap-6"
        >
          <div className="text-right">
            <h3 className="text-2xl font-black text-white mb-1">لوحة تحكم السوبر أدمن</h3>
            <p className="text-emerald-200/60 font-medium">لديك الصلاحية لإنهاء حسابات اليوم والشهر</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button onClick={onFinalizeDay} className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-[#d97706] text-white rounded-2xl font-black hover:bg-amber-700 transition-all shadow-lg active:scale-95">
              <Save size={20} />
              <span>إنهاء اليوم</span>
            </button>
            <button onClick={handleFinalizeMonth} className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-white text-[#064e3b] rounded-2xl font-black hover:bg-emerald-50 transition-all shadow-lg active:scale-95">
              <Calendar size={20} />
              <span>إنهاء الشهر</span>
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-12 rounded-[40px] shadow-premium border border-white">
            <h3 className="text-3xl font-black text-[#064e3b] mb-10 flex items-center gap-3">
              <Clock className="text-amber-500" />
              <span>إجمالي اليوم الحالي ({todayDate})</span>
            </h3>
            <div className="space-y-6">
              <HistoryBlock label="مبيعات الـ 3 شيفتات" value={totalTodaySales} color="emerald" />
              <HistoryBlock label="مصروفات الـ 3 شيفتات" value={totalTodayExp} color="amber" />
              <div className="pt-6 mt-6 border-t border-slate-100 flex justify-between items-center">
                 <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">صافي اليوم (مجمع)</span>
                 <h2 className="text-4xl font-black text-[#d97706]">{formatAmount(totalTodaySales - totalTodayExp)} ج.م</h2>
              </div>
            </div>
        </div>
        
        <div className="bg-white p-12 rounded-[40px] shadow-premium border border-white">
            <h3 className="text-3xl font-black text-[#064e3b] mb-10 flex items-center gap-3">
              <FileCheck className="text-amber-500" />
              <span>التقرير العام للتراكمي</span>
            </h3>
            <div className="space-y-6">
              <HistoryBlock label="إجمالي المبيعات (تراكمي)" value={allTimeSales} color="emerald" />
              <HistoryBlock label="إجمالي المصروفات (تراكمي)" value={allTimeExp} color="amber" />
              <div className="pt-6 mt-6 border-t border-slate-100 flex justify-between items-center">
                 <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">صافي الربح التراكمي</span>
                 <h2 className="text-4xl font-black text-[#d97706]">{formatAmount(allTimeSales - allTimeExp)} ج.م</h2>
              </div>
            </div>
        </div>
      </div>
    </motion.div>
  );
};
