import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Trash2, Edit3, Shield, Clock, Key, Check, X, User, Crown, Coffee } from 'lucide-react';
import { normalizeInput } from '../utils/numberUtils';
import { hashPassword } from '../utils/securityUtils';

export const UsersPage = ({ systemUsers, setSystemUsers, currentUser, showToast, showConfirm }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    shift: 'صباحي',
    role: 'user'
  });
  const passwordRef = useRef(null);

  const shifts = ['صباحي', 'مسائي', 'ليلي', 'إدارة'];
  const roles = [
    { value: 'user', label: 'موظف باريستا / كاشير', icon: Coffee },
    { value: 'super', label: 'مدير نظام (Admin)', icon: Crown }
  ];

  // Helper to get initials or first letter
  const getInitials = (name) => name ? name.charAt(0).toUpperCase() : '?';

  const handleAdd = async () => {
    if (!formData.username || !formData.password) {
      showToast('خطأ', 'برجاء إدخل اسم المستخدم وكلمة المرور', 'warning');
      return;
    }

    if (systemUsers.find(u => u.username.toLowerCase() === formData.username.toLowerCase())) {
      showToast('خطأ', 'اسم المستخدم موجود بالفعل', 'warning');
      return;
    }

    const hashedPassword = await hashPassword(formData.password);
    setSystemUsers([...systemUsers, { ...formData, password: hashedPassword }]);
    setFormData({ username: '', password: '', shift: 'صباحي', role: 'user' });
    setIsAdding(false);
    showToast('تمت الإضافة', 'تم إضافة الموضع الجديد بنجاح', 'success');
  };

  const handleDelete = (username) => {
    if (username === currentUser.username) {
      showToast('خطأ', 'لا يمكنك حذف حسابك الحالي!', 'warning');
      return;
    }
    
    showConfirm(
      'حذف موظف',
      `هل أنت متأكد من حذف حساب الموظف "${username}" نهائياً من النظام؟`,
      () => {
        setSystemUsers(systemUsers.filter(u => u.username !== username));
        showToast('تم الحذف', 'تم حذف حساب الموظف من النظام', 'success');
      }
    );
  };

  const handleUpdate = async (originalUsername) => {
    const userToUpdate = systemUsers.find(u => u.username === originalUsername);
    if (!userToUpdate) return;

    // 1. Check for duplicate username IF changed
    if (formData.username.toLowerCase() !== originalUsername.toLowerCase()) {
       if (systemUsers.find(u => u.username.toLowerCase() === formData.username.toLowerCase())) {
         showToast('خطأ', 'اسم المستخدم هذا موجود بالفعل', 'warning');
         return;
       }
    }

    let updatedPassword = userToUpdate.password;
    // Only re-hash if the user entered a NEW password
    if (formData.password) {
      updatedPassword = await hashPassword(formData.password);
    }

    const updatedUsers = systemUsers.map(u => 
      u.username === originalUsername ? { ...formData, password: updatedPassword } : u
    );
    setSystemUsers(updatedUsers);
    setEditingId(null);
    setFormData({ username: '', password: '', shift: 'صباحي', role: 'user' });
    showToast('تم التعديل', 'تم تحديث بيانات الموظف بنجاح', 'success');
  };

  const startEdit = (user) => {
    setEditingId(user.username);
    setFormData({ ...user, password: '' });
    // Edit logic handled in the Quick Row
  };

  // ⌨️ Keyboard Shortcut: Escape to cancel edit
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && editingId) {
        setEditingId(null);
        setFormData({ username: '', password: '', shift: 'صباحي', role: 'user' });
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [editingId]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-12 pb-20 w-full"
    >
      <div className="w-full max-w-5xl expense-card">
         {/* 1. Header (Unified Standard) */}
         <header className="expense-header">
            <h3 className="text-4xl font-black text-white">
              فريق العمل
            </h3>
         </header>

         {/* 2. Quick Add Row (Unified & Animated) */}
         <motion.div 
            layout 
            transition={{ 
              layout: { duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }
            }}
            className="expense-input-row !gap-6"
            key={editingId ? 'editing' : 'adding'}
         >
              {/* Username Input */}
              <motion.input 
                layout
                transition={{ 
                  layout: { duration: 0.65, ease: [0.34, 1.56, 0.64, 1] },
                  delay: editingId ? 0 : 0.25 
                }}
                type="text"
                value={formData.username}
                onChange={(e) => {
                  const normalized = normalizeInput(e.target.value);
                  const filtered = normalized.replace(/[^a-zA-Z0-9_]/g, '');
                  setFormData({...formData, username: filtered.toLowerCase()});
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') passwordRef.current?.focus();
                }}

                style={{ flex: editingId ? '0.5 1 0%' : '1 1 0%', minWidth: 0 }}
                className={`expense-input ${editingId ? 'bg-amber-50/50 border-amber-100 placeholder-amber-400' : ''}`}
                placeholder="اسم المستخدم"
              />

              {/* Password Input */}
              <motion.input 
                layout
                transition={{ 
                  layout: { duration: 0.65, ease: [0.34, 1.56, 0.64, 1] },
                  delay: editingId ? 0 : 0.25 
                }}
                ref={passwordRef}
                type="text"
                value={formData.password}
                onChange={(e) => {
                  const normalized = normalizeInput(e.target.value);
                  const filtered = normalized.replace(/[^a-zA-Z0-9]/g, '');
                  setFormData({...formData, password: filtered});
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    editingId ? handleUpdate(editingId) : handleAdd();
                  }
                }}
                style={{ flex: editingId ? '0.5 1 0%' : '1 1 0%', minWidth: 0 }}
                className={`expense-input ${editingId ? 'bg-amber-50/50 border-amber-100 placeholder-amber-400' : ''}`}
                placeholder={editingId ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"}
              />

              {/* Shift Select */}
              <motion.select
                layout
                transition={{ 
                  layout: { duration: 0.65, ease: [0.34, 1.56, 0.64, 1] },
                  delay: editingId ? 0 : 0.25 
                }}
                value={formData.shift}
                onChange={(e) => setFormData({...formData, shift: e.target.value})}
                style={{ flex: editingId ? '0.35 1 0%' : '0.7 1 0%', minWidth: 0 }}
                className={`expense-input text-center cursor-pointer ${editingId ? 'bg-amber-50/50 border-amber-100' : ''}`}
              >
                {shifts.map(s => <option key={s} value={s}>{s}</option>)}
              </motion.select>

              {/* Role Select */}
              <motion.select
                layout
                transition={{ 
                  layout: { duration: 0.65, ease: [0.34, 1.56, 0.64, 1] },
                  delay: editingId ? 0 : 0.25 
                }}
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                style={{ flex: editingId ? '0.4 1 0%' : '0.8 1 0%', minWidth: 0 }}
                className={`expense-input text-center cursor-pointer ${editingId ? 'bg-amber-50/50 border-amber-100' : ''}`}
              >
                 <option value="user">موظف (User)</option>
                 <option value="super">مدير (Admin)</option>
              </motion.select>

              {/* Action Buttons Group */}
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
                      setFormData({ username: '', password: '', shift: 'صباحي', role: 'user' });
                    }}
                    className="final-action-btn-primary bg-amber-600 overflow-hidden"
                    style={{ minWidth: 0 }}
                  >
                    <X size={32} strokeWidth={2.5} />
                  </motion.button>
                )}
              </AnimatePresence>

              <motion.button 
                layout
                transition={{ 
                  layout: { duration: 0.65, ease: [0.34, 1.56, 0.64, 1] },
                  delay: editingId ? 0 : 0.25 
                }}
                onClick={editingId ? () => handleUpdate(editingId) : handleAdd}
                disabled={!formData.username || (!editingId && !formData.password)}
                style={{ flex: editingId ? '0.5 1 0%' : '0.5 1 0%', minWidth: 0 }}
                className={`final-action-btn-primary ${editingId ? 'bg-amber-600' : ''}`}
              >
                 {editingId ? <Check size={32} strokeWidth={2.5} /> : <UserPlus size={32} strokeWidth={2.5} />}
              </motion.button>
         </motion.div>


         {/* 3. Table Container */}
         <div className="expense-table-container">
            <table className="expense-table">
               <thead>
                  <tr>
                  <th style={{width: '30%'}}>المستخدم</th>
                  <th style={{width: '25%'}}>الدور / الصلاحية</th>
                  <th style={{width: '25%'}}>الوردية</th>
                  <th style={{width: '20%'}} className="text-center">إجراءات</th>
                  </tr>
               </thead>
               <tbody>
                  <AnimatePresence>
                  {systemUsers.map((user) => (
                     <motion.tr 
                        layout
                        key={user.username}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => startEdit(user)}
                        className="hover:bg-amber-50/50 transition-colors group border-b border-slate-100 last:border-0 cursor-pointer"
                     >
                        {/* User Info Col (Text Only) */}
                        <td className="px-6 py-6 align-middle">
                           <span className="font-black text-slate-700 text-xl tracking-tight block group-hover:text-[#064e3b] transition-colors">
                              {user.username}
                           </span>
                        </td>

                        {/* Role Badge Col */}
                        <td className="px-6 py-6 align-middle">
                           <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black border ${user.role === 'super' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                              <span>{user.role === 'super' ? 'مدير (Admin)' : 'موظف (User)'}</span>
                           </span>
                        </td>

                        {/* Shift Info Col */}
                        <td className="px-6 py-6 align-middle">
                           <span className="font-bold text-slate-600 text-lg">
                              {user.shift}
                           </span>
                        </td>

                        {/* Actions Col (Delete Only) */}
                        <td className="px-6 py-6 align-middle text-center">
                           <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                              {user.username !== currentUser.username && (
                                 <button 
                                 onClick={(e) => { e.stopPropagation(); handleDelete(user.username); }}
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
               </tbody>
            </table>
            
            {systemUsers.length === 0 && (
               <div className="p-12 text-center text-slate-400 font-medium">
                  لا يوجد مستخدمين مضافين حالياً
               </div>
            )}
         </div>
      </div>
    </motion.div>
  );
};
