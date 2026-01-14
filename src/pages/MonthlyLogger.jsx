import React from 'react';
import { motion } from 'framer-motion';
import { formatAmount } from '../utils/numberUtils';
import { SummaryCard } from '../components/SummaryCard';

export const MonthlyLogger = React.memo(({ 
  viewMonth, 
  setViewMonth, 
  monthDays = [], 
  onExportDaily,
  onFinalizeMonth
}) => {
  
  // Calculate Grand Totals for the current view
  const totalSales = monthDays.reduce((acc, curr) => acc + Number(curr.sales || 0), 0);
  const totalExpenses = monthDays.reduce((acc, curr) => acc + Number(curr.expenses || 0), 0);
  const totalNet = monthDays.reduce((acc, curr) => acc + Number(curr.net || 0), 0);

  return (
    <motion.div 
      key="monthly-logger"
      initial={{ opacity: 0, y: 30 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -30 }} 
      className="flex flex-col items-center gap-10"
    >
      
      {/* 1. Summary Cards (Original Style) */}
      <div className="stat-cards-container">
        <SummaryCard 
          title="إجمالي مبيعات الشهر" 
          value={totalSales} 
          color="emerald" 
        />
        <SummaryCard 
          title="إجمالي خوارج الشهر" 
          value={totalExpenses} 
          color="amber" 
        />
        <SummaryCard 
          title="صافي ربح الشهر" 
          value={totalNet} 
          color="gold" 
          highlight 
        />
      </div>

      <section className="w-full max-w-4xl">
        <div className="expense-card">
          {/* 2. Header */}
          <header className="expense-header">
            <h3 className="text-4xl font-black text-white">
              مراجعة الأيام المقفلة في الشهر
            </h3>
          </header>
          
          {/* Smart Monthly Dropdown Selector */}
          <div className="flex justify-center mb-6 w-full max-w-4xl mx-auto">
             <div className="expense-input-row !p-2 !gap-4 flex items-center w-full">
               <div className="expense-input !flex-[0.5] !bg-[#064e3b] !text-white flex items-center justify-center !p-0 !border-none shadow-sm">
                 <span className="font-bold text-lg">شهر المراجعة</span>
               </div>
               
               <select 
                 value={viewMonth || ''}
                 onChange={(e) => setViewMonth && setViewMonth(e.target.value)}
                 className="expense-input !flex-[1.5] text-center font-black text-2xl h-full cursor-pointer hover:bg-white transition-colors appearance-none"
                 style={{ textAlignLast: 'center' }}
               >
                 {(() => {
                    const months = [];
                    const today = new Date();
                    // Generate last 12 months
                    for (let i = 0; i < 12; i++) {
                      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                      // Fix: Use local date parts to avoid timezone shifting back to previous month
                      const year = d.getFullYear();
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const value = `${year}-${month}`; // Correct YYYY-MM
                      const label = d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
                      months.push({ value, label });
                    }
                    return months.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ));
                 })()}
               </select>
             </div>
          </div>

          {/* 3. Monthly Days Table (Original Style) */}
          <div className="expense-table-container">
            <table className="expense-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>التاريخ</th>
                  <th className="text-center" style={{ width: '25%' }}>المبيعات</th>
                  <th className="text-center" style={{ width: '25%' }}>الخوارج</th>
                  <th className="text-center" style={{ width: '25%' }}>الصافي</th>
                </tr>
              </thead>
              <tbody>
                {monthDays && monthDays.length > 0 ? (
                  monthDays.map((day, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                      <td className="text-lg font-bold text-center ltr">{day.date}</td>
                      <td className="text-center">
                        <span className="text-xl font-bold text-emerald-700 monospaced-numbers">{formatAmount(day.sales)}</span>
                        <span className="currency-tag">ج.م</span>
                      </td>
                      <td className="text-center">
                        <span className="text-xl font-bold text-red-700 monospaced-numbers">{formatAmount(day.expenses)}</span>
                        <span className="currency-tag">ج.م</span>
                      </td>
                      <td className="text-center">
                        <span className="text-xl font-black text-slate-800 monospaced-numbers">{formatAmount(day.net)}</span>
                        <span className="currency-tag">ج.م</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-400 font-bold text-lg italic">
                       لا توجد سجلات لهذا الشهر
                    </td>
                  </tr>
                )}
                
                {/* Filler Rows to Maintain Height */}
                {Array.from({ length: Math.max(0, 5 - monthDays.length) }).map((_, i) => (
                  <tr key={`filler-${i}`} className="opacity-20 pointer-events-none">
                    <td className="text-transparent">—</td>
                    <td className="text-transparent">—</td>
                    <td className="text-transparent">—</td>
                    <td className="text-transparent">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. Action Buttons */}
      <section className="w-full max-w-4xl mb-32">
        <div className="action-buttons-row">
          <button 
            onClick={onFinalizeMonth}
            className="final-action-btn-primary bg-red-600 hover:bg-red-700 shadow-red-900/20"
          >
              إغلاق الشهر وترحيله للأرشيف
          </button>
          <button 
            onClick={onExportDaily}
            className="final-action-btn-secondary"
          >
              تصدير تقرير الشهر Excel
          </button>
        </div>
      </section>

    </motion.div>
  );
});

