import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatAmount } from '../utils/numberUtils';
import { LayoutDashboard, List, CalendarCheck } from 'lucide-react';

export const RecordsPage = ({ entries, setEntries, dailyReports, setDailyReports, userRole }) => {
  const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'shifts'

  return (
    <div className="space-y-6">
      {/* View Switcher - Only for Super Admin or for more control */}
      <div className="flex justify-center mb-10">
        <div className="bg-white p-2 rounded-3xl shadow-soft border border-slate-100 inline-flex gap-2">
          <button 
            onClick={() => setViewMode('daily')}
            className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black transition-all ${viewMode === 'daily' ? 'bg-[#064e3b] text-white' : 'text-slate-400'}`}
          >
            <CalendarCheck size={18} />
            <span>تقارير الأيام مجمعة</span>
          </button>
          <button 
            onClick={() => setViewMode('shifts')}
            className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black transition-all ${viewMode === 'shifts' ? 'bg-[#064e3b] text-white' : 'text-slate-400'}`}
          >
            <List size={18} />
            <span>سجل الوردات المنفصلة</span>
          </button>
        </div>
      </div>

      <motion.div 
        key={viewMode}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[40px] shadow-premium border border-white overflow-hidden"
      >
         <div className="overflow-x-auto">
           <table className="w-full text-right border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                 {viewMode === 'daily' ? (
                   <tr>
                      <th className="p-8 text-xs font-black text-slate-400 uppercase tracking-widest">تاريخ اليوم المجمع</th>
                      <th className="p-8 text-xs font-black text-slate-400 uppercase tracking-widest">عدد الوردات</th>
                      <th className="p-8 text-xs font-black text-slate-400 uppercase tracking-widest">إجمالي المبيعات</th>
                      <th className="p-8 text-xs font-black text-slate-400 uppercase tracking-widest">إجمالي الخوارج</th>
                      <th className="p-8 text-xs font-black text-slate-400 uppercase tracking-widest">صافي اليوم</th>
                      {userRole === 'super' && <th className="p-8 text-center text-xs font-black text-slate-400 uppercase tracking-widest">إدارة</th>}
                   </tr>
                 ) : (
                   <tr>
                      <th className="p-8 text-xs font-black text-slate-400 uppercase tracking-widest">التاريخ / الشيفت / المستخدم</th>
                      <th className="p-8 text-xs font-black text-slate-400 uppercase tracking-widest">المبيعات</th>
                      <th className="p-8 text-xs font-black text-slate-400 uppercase tracking-widest">الخوارج</th>
                      <th className="p-8 text-xs font-black text-slate-400 uppercase tracking-widest">الصافي</th>
                      <th className="p-8 text-center text-xs font-black text-slate-400 uppercase tracking-widest">إدارة</th>
                   </tr>
                 )}
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {viewMode === 'daily' ? (
                   <>
                     {dailyReports.map((report, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                         <td className="p-8">
                            <div className="font-black text-xl text-slate-800">{report.date}</div>
                            <div className="text-sm text-emerald-600 font-bold">بواسطة: {report.finalizedBy}</div>
                         </td>
                         <td className="p-8">
                            <span className="px-4 py-1 bg-amber-50 text-amber-700 rounded-lg font-black">{report.shiftCount} ورديات</span>
                         </td>
                         <td className="p-8 text-emerald-600 font-black text-2xl">+{formatAmount(report.sales)}</td>
                         <td className="p-8 text-amber-600 font-bold text-xl">-{formatAmount(report.expenses)}</td>
                         <td className="p-8">
                            <span className="px-6 py-2 bg-emerald-50 text-emerald-700 rounded-full font-black text-xl">
                               {formatAmount(report.net)}
                            </span>
                         </td>
                         {userRole === 'super' && (
                           <td className="p-8 text-center">
                              <button onClick={() => setDailyReports(dailyReports.filter((_, i) => i !== idx))} className="p-4 text-slate-400 hover:text-red-500 transition-all font-bold">حذف</button>
                           </td>
                         )}
                      </tr>
                     ))}
                     {dailyReports.length === 0 && (
                       <tr>
                         <td colSpan="6" className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest">لا توجد تقارير يومية مجمعة بعد</td>
                       </tr>
                     )}
                   </>
                 ) : (
                   <>
                     {entries.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                         <td className="p-8">
                            <div className="font-black text-lg text-slate-600">{entry.date}</div>
                            <div className="text-sm text-amber-600 font-bold">{entry.shift} | {entry.user}</div>
                         </td>
                         <td className="p-8 text-emerald-600 font-black text-2xl">+{formatAmount(entry.sales)}</td>
                         <td className="p-8 text-amber-600 font-bold text-xl">-{formatAmount(entry.expenses.reduce((s,e)=>s+Number(e.amount || 0),0))}</td>
                         <td className="p-8 text-center">
                            <span className="px-6 py-2 bg-orange-50 text-[#d97706] rounded-full font-black text-xl">
                               {formatAmount(entry.sales - entry.expenses.reduce((s,e)=>s+Number(e.amount || 0),0))}
                            </span>
                         </td>
                         <td className="p-8 text-center">
                            <button onClick={() => setEntries(entries.filter((_, i) => i !== idx))} className="p-4 text-slate-400 hover:text-red-500 transition-all font-bold">حذف</button>
                         </td>
                      </tr>
                     ))}
                     {entries.length === 0 && (
                       <tr>
                         <td colSpan="5" className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest">لا توجد سجلات بعد</td>
                       </tr>
                     )}
                   </>
                 )}
              </tbody>
           </table>
         </div>
      </motion.div>
    </div>
  );
};
