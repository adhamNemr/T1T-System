import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Trash2, Edit3, Check, X, Search, DollarSign, Wallet } from 'lucide-react';
import { formatAmount, normalizeInput, toPosNum } from '../utils/numberUtils';

export const NotebookPage = ({ debtors, setDebtors, userRole, showToast, showConfirm }) => {
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    balance: ''
  });
  const balanceRef = useRef(null);

  const handleAdd = () => {
    if (!formData.name) {
      showToast('خطأ', 'برجاء إدخال اسم العميل', 'warning');
      return;
    }

    if (debtors.find(d => d.name.toLowerCase() === formData.name.toLowerCase())) {
      showToast('خطأ', 'هذا الاسم موجود بالفعل', 'warning');
      return;
    }

    const newDebtor = {
      id: Date.now(),
      name: formData.name,
      balance: Number(formData.balance) || 0,
      history: [] // Keeping history array just in case, or for future legacy support
    };

    setDebtors([...debtors, newDebtor]);
    setFormData({ name: '', balance: '' });
    showToast('تمت الإضافة', 'تم فتح حساب جديد بنجاح', 'success');
  };

  const handleDelete = (id) => {
    showConfirm(
      'حذف حساب عميل',
      'هل أنت متأكد من حذف هذا الحساب نهائياً من الدفتر؟ لا يمكن التراجع عن هذه الخطوة.',
      () => {
        setDebtors(debtors.filter(d => d.id !== id));
        if (editingId === id) {
          setEditingId(null);
          setFormData({ name: '', balance: '' });
        }
        showToast('تم الحذف', 'تم حذف الحساب بنجاح', 'success');
      }
    );
  };

  const handleUpdate = (id) => {
    const updatedDebtors = debtors.map(d => 
      d.id === id ? { ...d, name: formData.name, balance: Number(formData.balance) || 0 } : d
    );
    setDebtors(updatedDebtors);
    setEditingId(null);
    setFormData({ name: '', balance: '' });
    showToast('تم التعديل', 'تم تحديث البيانات بنجاح', 'success');
  };
  // ⌨️ Keyboard Shortcut: Escape to cancel edit
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && editingId) {
        setEditingId(null);
        setFormData({ name: '', balance: '' });
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [editingId]);

  const startEdit = (debtor) => {
    setEditingId(debtor.id);
    setFormData({
      name: debtor.name,
      balance: debtor.balance
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-12 pb-20 w-full"
    >
      <div className="w-full max-w-5xl expense-card">
         {/* 1. Header */}
         <header className="expense-header">
            <h3 className="text-4xl font-black text-white">
              دفتر الديون
            </h3>
         </header>

         {/* 2. Input Row (The "Classic" Styling with New Mechanism) */}
         <div className="expense-input-row !gap-6" key={editingId ? 'editing' : 'adding'}>
              {/* Name Input */}
              <motion.input 
                layout
                transition={{ 
                  layout: { duration: 0.65, ease: [0.34, 1.56, 0.64, 1] },
                  delay: editingId ? 0 : 0.25 
                }}
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: normalizeInput(e.target.value)})}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') balanceRef.current?.focus();
                }}
                style={{ flex: editingId ? '0.5 1 0%' : '1 1 0%', minWidth: 0 }}
                className={`expense-input ${editingId ? 'bg-amber-50/50 border-amber-100' : ''}`}
                placeholder="اسم العميل"
              />

              {/* Balance Input */}
              <motion.input 
                layout
                transition={{ 
                  layout: { duration: 0.65, ease: [0.34, 1.56, 0.64, 1] },
                  delay: editingId ? 0 : 0.25 
                }}
                ref={balanceRef}
                type="text"
                inputMode="decimal"
                value={formData.balance}
                onChange={(e) => setFormData({...formData, balance: toPosNum(e.target.value)})}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    editingId ? handleUpdate(editingId) : handleAdd();
                  }
                }}
                style={{ flex: editingId ? '0.5 1 0%' : '1 1 0%', minWidth: 0 }}
                className={`expense-input text-center font-black ${editingId ? 'bg-amber-50/50 border-amber-100' : ''}`}
                placeholder="المبلغ / الرصيد"
              />

              {/* Cancel Button */}
              <AnimatePresence>
                {editingId && (
                  <motion.button
                    layout
                    initial={{ opacity: 0, scale: 0.9, width: 0, flex: '0 0 0%' }}
                    animate={{ opacity: 1, scale: 1, flex: '0.5 1 0%' }}
                    exit={{ opacity: 0, scale: 0.9, width: 0, flex: '0 0 0%', transition: { duration: 0.3, ease: "anticipate" } }}
                    transition={{ 
                      layout: { duration: 0.65, ease: [0.34, 1.56, 0.64, 1] },
                      opacity: { duration: 0.3 }
                    }}
                    onClick={() => {
                      setEditingId(null);
                      setFormData({ name: '', balance: '' });
                    }}
                    className="final-action-btn-primary bg-amber-600 overflow-hidden"
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
                onClick={editingId ? () => handleUpdate(editingId) : handleAdd}
                disabled={!formData.name}
                style={{ flex: editingId ? '0.5 1 0%' : '0.5 1 0%', minWidth: 0 }}
                className={`final-action-btn-primary ${editingId ? 'bg-amber-600' : ''}`}
              >
                 {editingId ? <Check size={32} strokeWidth={2.5} /> : <UserPlus size={32} strokeWidth={2.5} />}
              </motion.button>
         </div>

         {/* 3. Debtor List Table */}
         <div className="expense-table-container">
            <table className="expense-table">
               <thead>
                  <tr>
                    <th style={{width: '50%'}}>الاسم</th>
                    <th style={{width: '30%'}} className="text-center">الرصيد الحالي</th>
                    <th style={{width: '20%'}} className="text-center">إجراءات</th>
                  </tr>
               </thead>
               <tbody>
                  <AnimatePresence>
                  {debtors.map((debtor) => (
                     <motion.tr 
                        layout
                        key={debtor.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => startEdit(debtor)}
                        className="hover:bg-amber-50/50 transition-colors group border-b border-slate-100 last:border-0 cursor-pointer"
                     >
                        {/* Name Col */}
                        <td className="px-6 py-6 align-middle">
                           <span className="font-black text-slate-700 text-xl tracking-tight block group-hover:text-[#064e3b] transition-colors">
                              {debtor.name}
                           </span>
                        </td>

                        {/* Balance Col */}
                        <td className="px-6 py-6 align-middle text-center">
                           <span className={`inline-flex items-center gap-1 font-black text-xl dir-ltr ${debtor.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              <span className="text-sm text-slate-400 font-bold mr-1">EGP</span>
                              {formatAmount(debtor.balance)}
                           </span>
                        </td>

                        {/* Actions Col */}
                        <td className="px-6 py-6 align-middle text-center">
                           <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                              {userRole === 'super' && (
                                 <button 
                                 onClick={(e) => { e.stopPropagation(); handleDelete(debtor.id); }}
                                 className="delete-text-btn"
                                 >
                                    <span>حذف</span>
                                 </button>
                              )}
                           </div>
                        </td>
                     </motion.tr>
                  ))}
                  </AnimatePresence>
                  
                  {debtors.length === 0 && (
                     <tr>
                        <td colSpan="3" className="p-12 text-center text-slate-400 font-medium">
                           لا يوجد عملاء في الدفتر حالياً. ابدأ بإضافة عميل جديد.
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </motion.div>
  );
};
