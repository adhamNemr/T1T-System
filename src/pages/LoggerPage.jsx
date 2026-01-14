import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CornerDownLeft } from 'lucide-react';
import { SummaryCard } from '../components/SummaryCard';
import { formatAmount } from '../utils/numberUtils';

export const LoggerPage = React.memo(({ 
  currentEntry, 
  updateData, 
  salesInputRef, 
  expenseItemRef, 
  expenseAmountRef,
  newExpense,
  setNewExpense,
  saveExpense,
  editingId,
  startEdit,
  removeExpense,
  finalizeShift,
  exportToExcel,
  hasExported,
  toPosNum,
  userRole,
  todayTotalSales = 0,
  todayTotalExp = 0,
  todayAllExpenses = [],
  onFinalizeDay,
  onExportDaily,
  isAlreadyFinished,
  showToast,
  isMonthlyMode = false,
  expenseCategories = [],
  onDateChange,
  availableDates = [],
  viewMonth,
  setViewMonth,
  monthDays = []
}) => {
  const [customDetail, setCustomDetail] = React.useState('');
  
  const handleSave = () => {
    if (newExpense.item === 'أخرى' && customDetail) {
      saveExpense({ ...newExpense, item: `أخرى - ${customDetail}` });
      setCustomDetail('');
    } else {
      saveExpense();
    }
  };
  const isSuper = userRole === 'super';
  const isLocked = isMonthlyMode || (!isSuper && isAlreadyFinished);
  
  // 🧮 Logic Update: Total Sales = Cash In Hand + Total Expenses
  // We derive current total expenses from the entry being edited
  const currentExpenses = currentEntry.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  
  // For the Summary Cards, we use the values from currentEntry to ensure immediate reactivity
  const totalExp = currentExpenses;
  const totalSalesFromState = Number(currentEntry.sales) || 0;
  
  // Calculate Cash In Hand (The money the user actually sees in the drawer)
  const cashInHand = totalSalesFromState - totalExp;

  // In Monthly mode, we show Total Sales first. In Daily mode, we show Cash as the primary input.
  const card1Title = isMonthlyMode ? "إجمالي مبيعات الشهر" : "المبلغ (الكاش)";
  const card1Value = isMonthlyMode ? totalSalesFromState : cashInHand;
  
  const card3Title = isMonthlyMode ? "صافي الشهر" : "إجمالي المبيعات";
  const card3Value = isMonthlyMode ? (totalSalesFromState - totalExp) : totalSalesFromState;

  // 📝 Table Logic: Use aggregated breakdown for Monthly, but detailed list for Daily (to allow editing)
  // 📝 Table Logic: Order by Shift (Admin) and keep Daily Wage (fixed-daily) at top
  const baseExpenses = isMonthlyMode ? todayAllExpenses : currentEntry.expenses;
  const tableExpenses = [...baseExpenses].sort((a, b) => {
    // 1. Sort by Shift Name first (Admin Mode Only)
    if (a.shiftName && b.shiftName && a.shiftName !== b.shiftName) {
       const shiftOrder = { 'صباحي': 1, 'مسائي': 2, 'ليلي': 3, 'إدارة': 4 };
       return (shiftOrder[a.shiftName] || 9) - (shiftOrder[b.shiftName] || 9);
    }
    // 2. Within same shift, keep 'fixed-daily' at top
    // 2. Within same shift, keep 'fixed-daily' at top
    // 🛡️ Safety: Convert to String before checking startsWith to prevent crashes on numeric IDs
    const strA = String(a.id || '');
    const strB = String(b.id || '');
    
    if (strA === 'fixed-daily' || strA.startsWith('fixed-daily')) return -1;
    if (strB === 'fixed-daily' || strB.startsWith('fixed-daily')) return 1;
    return 0;
    return 0;
  });

  // Track shift changes to insert separators in Admin view
  let lastShift = null;

  // Handle click on the Finalize button when already finished
  const handleFinalizeClick = () => {
    if (isAlreadyFinished) {
      showToast('تنبيه', 'لقد قمت بإنهاء الوردية بالفعل لهذه الدورة', 'warning');
    } else {
      finalizeShift();
    }
  };

  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef(null);
  const customDetailRef = React.useRef(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectCategory = (cat) => {
    setNewExpense({ ...newExpense, item: cat });
    setShowDropdown(false);
    
    // If 'Other' is selected, wait for render and focus detail input
    if (cat === 'أخرى') {
      setTimeout(() => {
        customDetailRef.current?.focus();
      }, 100);
    } else {
      expenseAmountRef.current?.focus();
    }
  };

  // ⌨️ Keyboard Shortcut: Escape to cancel edit
  React.useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && editingId) {
        setNewExpense({ item: '', amount: '' });
        startEdit(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [editingId]);

  return (
    <motion.div 
      key="logger"
      initial={{ opacity: 0, y: 30 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -30 }} 
      className="flex flex-col items-center gap-10"
    >
      
      <div className="stat-cards-container">
        <SummaryCard 
          title={card1Title} 
          value={card1Value} 
          color="emerald"
          onChange={(val) => {
            // 🛡️ Fix: Ensure mathematical addition by wrapping in Number()
            // Prevents "10" + 50 = "1050" (String Concatenation Bug)
            const enteredCash = Number(toPosNum(val)) || 0;
            updateData({...currentEntry, sales: enteredCash + totalExp});
          }}
          inputRef={salesInputRef}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault(); // Prevents default behavior but doesn't move focus
            }
          }}
          editable={!isLocked}
        />
        <SummaryCard 
          title={isMonthlyMode ? "إجمالي خوارج الشهر" : "إجمالي الخوارج"} 
          value={totalExp} 
          color="amber" 
        />
        <SummaryCard 
          title={card3Title} 
          value={card3Value} 
          color="gold" 
          highlight 
        />
      </div>

      <section className="w-full max-w-4xl">
        <div className="expense-card">
          <header className="expense-header">
            <h3 className="text-4xl font-black text-white">
              {isMonthlyMode ? 'مراجعة الأيام المقفلة في الشهر' : isSuper ? 'مراجعة خوارج اليوم بالكامل' : 'إضافة بند خوارج'}
            </h3>
          </header>
          
          {/* Admin Date Selection (Months or Days) */}
          {isSuper && (
            <div className="flex justify-center mb-6 w-full max-w-4xl mx-auto">
               <div className="expense-input-row !p-2 !gap-4 flex items-center w-full">
                 <div className="expense-input !flex-[0.5] !bg-[#064e3b] !text-white flex items-center justify-center !p-0 !border-none shadow-sm">
                   <span className="font-bold text-lg">{isMonthlyMode ? 'شهر المراجعة' : 'تاريخ السجل'}</span>
                 </div>
                 
                 {isMonthlyMode ? (
                   // Month Picker
                   <input 
                     type="month"
                     value={viewMonth || ''}
                     onChange={(e) => setViewMonth && setViewMonth(e.target.value)}
                     className="expense-input !flex-[1.5] text-center font-black text-2xl h-full cursor-pointer hover:bg-white transition-colors"
                   />
                 ) : (
                   // Daily Dropdown Picker from Available Dates
                   <select 
                     value={currentEntry.date} 
                     onChange={(e) => onDateChange && onDateChange(e.target.value)}
                     className="expense-input !flex-[1.5] text-center font-black text-2xl h-full cursor-pointer hover:bg-white transition-colors appearance-none"
                     style={{ textAlignLast: 'center' }}
                   >
                      {availableDates && availableDates.map(date => (
                        <option key={date} value={date}>
                           {date} {date === new Date().toISOString().split('T')[0] ? '(النهاردة)' : ''}
                        </option>
                      ))}
                      {/* Safety fallback if availableDates is empty */}
                      {(!availableDates || availableDates.length === 0) && <option value={currentEntry.date}>{currentEntry.date}</option>}
                   </select>
                 )}
               </div>
            </div>
          )}
          
          {!isLocked ? (
            <div className="expense-input-row !p-6 !gap-6" style={{ position: 'relative', zIndex: 50 }} key={editingId ? 'editing' : 'adding'}>
              {/* Statement / Category Selection Container */}
              <motion.div 
                layout
                transition={{ 
                  layout: { duration: 0.65, ease: [0.34, 1.56, 0.64, 1] },
                  delay: editingId ? 0 : 0.25 
                }}
                ref={dropdownRef} 
                style={{ flex: editingId ? '0.5 1 0%' : '1 1 0%', position: 'relative', minWidth: 0, zIndex: 100 }}
              >
                <input 
                  ref={expenseItemRef}
                  type="text" 
                  readOnly 
                  placeholder="البند" 
                  value={editingId === 'fixed-daily' ? 'يوميات' : newExpense.item}
                  onClick={() => setShowDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setShowDropdown(true);
                  }}
                  className={`expense-input cursor-pointer caret-transparent w-full ${editingId ? 'bg-amber-50/50 border-amber-100 placeholder-amber-400' : ''}`} 
                />
                <AnimatePresence>
                  {showDropdown && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: 0, 
                        width: '100%',
                        maxHeight: '275px', 
                        overflowY: 'auto',
                        zIndex: 9999,
                        backgroundColor: '#f1fdf6',
                        boxShadow: '0 30px 60px -12px rgba(6, 78, 59, 0.3)',
                        border: '1px solid #d1fae5',
                        marginTop: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        padding: '25px',
                        borderRadius: '24px'
                      }}
                      className="no-scrollbar"
                    >
                      {expenseCategories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => selectCategory(cat)}
                          className="w-full text-right transition-all flex justify-between items-center group flex-shrink-0"
                          style={{
                            backgroundColor: 'white',
                            padding: '12px 20px',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#064e3b' }}>{cat}</span>
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 opacity-20 group-hover:opacity-100 transition-all scale-75 group-hover:scale-125" />
                        </button>
                      ))}
                    </motion.div>
                   )}
                </AnimatePresence>
              </motion.div>

              {/* Custom Detail Input for 'أخرى' */}
              {newExpense.item === 'أخرى' && (
                <motion.input 
                  initial={{ width: 0, opacity: 0, scale: 0.8 }}
                  animate={{ width: 'auto', opacity: 1, scale: 1 }}
                  exit={{ width: 0, opacity: 0, scale: 0.8 }}
                  key="custom-detail"
                  ref={customDetailRef}
                  layout
                  transition={{ duration: 0.4 }}
                  type="text" 
                  placeholder="اكتب التفاصيل هنا..." 
                  value={customDetail}
                  onChange={(e) => setCustomDetail(e.target.value)}
                  onKeyDown={(e) => {
                     if (e.key === 'Enter') expenseAmountRef.current?.focus();
                  }}
                  style={{ flex: '1 1 0%', minWidth: 0 }}
                  className="expense-input text-center bg-amber-50 border-amber-200 placeholder-amber-400 text-amber-900"
                />
              )}

              {/* Amount Input */}
              <motion.input 
                layout
                transition={{ 
                  layout: { duration: 0.65, ease: [0.34, 1.56, 0.64, 1] },
                  delay: editingId ? 0 : 0.25 
                }}
                ref={expenseAmountRef}
                type="text" 
                inputMode="decimal"
                placeholder="المبلغ" 
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: toPosNum(e.target.value)})}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveExpense();
                }}
                style={{ flex: editingId ? '0.5 1 0%' : '1 1 0%', minWidth: 0 }}
                className={`expense-input text-center ${editingId ? 'bg-amber-50/50 border-amber-100 placeholder-amber-400' : ''}`} 
              />

              {/* Cancel Button - Sync'ed Animation */}
              <AnimatePresence>
                {editingId && (
                  <motion.button
                    layout
                    initial={{ opacity: 0, scale: 0.8, width: 0, flex: '0 0 0%' }}
                    animate={{ opacity: 1, scale: 1, flex: '0.5 1 0%' }}
                    exit={{ opacity: 0, scale: 0.8, width: 0, flex: '0 0 0%', transition: { duration: 0.3, ease: "anticipate" } }}
                    transition={{ 
                      layout: { duration: 0.65, ease: [0.34, 1.56, 0.64, 1] },
                      opacity: { duration: 0.3 }
                    }}
                    onClick={() => {
                        setNewExpense({ item: '', amount: '' });
                        startEdit(null);
                    }}
                    className="final-action-btn-primary bg-amber-600"
                    style={{ minWidth: 0 }}
                  >
                    <X size={32} strokeWidth={2.5} />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Primary Action Button */}
              <motion.button 
                layout
                transition={{ 
                  layout: { duration: 0.65, ease: [0.34, 1.56, 0.64, 1] },
                  delay: editingId ? 0 : 0.25 
                }}
                onClick={handleSave} 
                style={{ flex: editingId ? '0.5 1 0%' : '0.5 1 0%', minWidth: 0 }}
                className={`final-action-btn-primary ${editingId ? 'bg-amber-600' : 'bg-[#064e3b]'}`}
              >
                {editingId ? <CornerDownLeft size={32} strokeWidth={2.5} /> : <CornerDownLeft size={32} strokeWidth={2.5} />}
              </motion.button>
            </div>
          ) : (
            <div className="p-4 bg-slate-50/50 text-slate-400 text-center font-bold rounded-2xl">
               {/* {isAlreadyFinished ? 'هذه الوردية مغلقة - وضع العرض فقط' : 'وضع السوبر أدمن مخصص للمراجعة والتقارير'} */}
            </div>
          )}

          <div className="expense-table-container">
            <table className="expense-table">
              <thead>
                {isMonthlyMode ? (
                  <tr>
                    <th style={{ width: '25%' }}>التاريخ</th>
                    <th className="text-center" style={{ width: '25%' }}>المبيعات</th>
                    <th className="text-center" style={{ width: '25%' }}>الخوارج</th>
                    <th className="text-center" style={{ width: '25%' }}>الصافي</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={{ width: isSuper ? '45%' : '60%' }}>البيان</th>
                    {isSuper && <th style={{ width: '25%' }}>الوردية / المستخدم</th>}
                    <th className="text-center" style={{ width: '20%' }}>المبلغ</th>
                    <th className="text-center" style={{ width: '10%' }}>{!isLocked ? 'إدارة' : ''}</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {isMonthlyMode ? (
                  monthDays && monthDays.length > 0 ? (
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
                  )
                ) : (
                  tableExpenses.length > 0 ? (
                    tableExpenses.map((exp, idx) => {
                      const showShiftHeader = isSuper && exp.shiftName && exp.shiftName !== lastShift;
                      if (showShiftHeader) lastShift = exp.shiftName;

                      return (
                        <React.Fragment key={exp.id || idx}>
                          {showShiftHeader && (
                            <tr className="bg-slate-50">
                              <td colSpan={isSuper ? 4 : 3} className="py-2 px-6">
                                <span className="text-xs font-black text-slate-400 tracking-widest uppercase">
                                  وردية: {exp.shiftName} — {exp.userName}
                                </span>
                              </td>
                            </tr>
                          )}
                          <tr 
                            onClick={() => !isLocked && startEdit(exp)} 
                            className={`${!isLocked ? 'cursor-pointer' : ''} ${editingId === exp.id ? 'bg-amber-50/50' : ''} hover:bg-slate-50/30 transition-colors`}
                          >
                            <td className="text-xl font-bold">{(String(exp.id || '') === 'fixed-daily' || String(exp.id || '').startsWith('fixed-daily')) ? 'يوميات' : exp.item}</td>
                            {isSuper && (
                              <td className="text-sm text-amber-600 font-bold">
                                {exp.shiftName}
                              </td>
                            )}
                            <td className="text-center">
                              <span className="text-2xl font-black text-amber-700 monospaced-numbers">{formatAmount(exp.amount) || 0}</span>
                              <span className="currency-tag">ج.م</span>
                            </td>
                            <td className="text-center">
                              {!isLocked && exp.id !== 'fixed-daily' && (
                                <button onClick={(e) => removeExpense(e, exp.id)} className="delete-text-btn">حذف</button>
                              )}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr className="opacity-0 h-4"><td></td></tr>
                  )
                )}
                
                {/* Filler Rows */}
                {!isMonthlyMode && Array.from({ length: Math.max(0, 5 - tableExpenses.length) }).map((_, i) => (
                  <tr key={`filler-${i}`} className="opacity-20 pointer-events-none">
                    <td className="text-transparent">—</td>
                    {isSuper && <td className="text-transparent">—</td>}
                    <td className="text-transparent">—</td>
                    <td className="text-transparent">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>



      {isSuper ? (
        <section className="w-full max-w-4xl mb-32">
          <div className="action-buttons-row">
            <button 
              onClick={onFinalizeDay}
              className="final-action-btn-primary"
            >
                {isMonthlyMode ? 'إنهاء الشهر' : 'إنهاء اليوم'}
            </button>
            <button 
              onClick={onExportDaily}
              className="final-action-btn-secondary"
            >
                {isMonthlyMode ? 'تصدير الشهر Excel' : 'تصدير Excel'}
            </button>
          </div>
        </section>
      ) : (
        <section className="w-full max-w-4xl mb-32">
          <div className="action-buttons-row">
            <button 
              onClick={handleFinalizeClick}
              className={`final-action-btn-primary ${isAlreadyFinished ? 'bg-slate-400 cursor-default shadow-none pointer-events-none' : ''}`}
            >
                {isAlreadyFinished ? 'تم الانتهاء ✅' : 'إنهاء الوردية'}
            </button>
            <button 
              onClick={exportToExcel}
              className="final-action-btn-secondary"
            >
                تصدير Excel
            </button>
          </div>
        </section>
      )}
    </motion.div>
  );
});

