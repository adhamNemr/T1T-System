import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatAmount } from '../../utils/numberUtils';

export const OrderTable = ({ orders, onRemove, onEdit, editingId, isSuper }) => {
  return (
    <div className="expense-table-container">
      <table className="expense-table">
        <thead>
          <tr>
            <th style={{ width: '15%' }}>التاريخ</th>
            <th style={{ width: '30%' }}>الصنف</th>
            <th className="text-center" style={{ width: '15%' }}>الإجمالي</th>
            <th className="text-center" style={{ width: '15%' }}>المدفوع</th>
            <th className="text-center" style={{ width: '15%' }}>المتبقي</th>
            <th className="text-center" style={{ width: '10%' }}>{isSuper ? 'إدارة' : ''}</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {orders.map((order) => {
              const remaining = order.price - (order.paidAmount || 0);
              const isFullyPaid = remaining <= 0;
              const isEditing = editingId === order.id;
              
              return (
                <motion.tr 
                  key={order.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => onEdit(order)}
                  className={`cursor-pointer transition-colors ${isEditing ? 'bg-amber-50/80 shadow-inner' : 'hover:bg-slate-50'}`}
                >
                  <td className="text-[10px] font-bold text-slate-400">{order.date}</td>
                  <td className="text-lg font-bold text-slate-800">{order.item}</td>
                  <td className="text-center">
                    <span className="text-xl font-black text-slate-600 monospaced-numbers">{formatAmount(order.price)}</span>
                    <span className="currency-tag">ج.م</span>
                  </td>
                  <td className="text-center">
                    <span className="text-xl font-black text-emerald-600 monospaced-numbers">{formatAmount(order.paidAmount || 0)}</span>
                    <span className="currency-tag">ج.م</span>
                  </td>
                  <td className="text-center">
                    <div className={`text-xl font-black ${isFullyPaid ? 'text-slate-300' : 'text-red-600'}`}>
                      {isFullyPaid ? 'مدفوع ' : (
                        <>
                          <span className="monospaced-numbers">{formatAmount(remaining)}</span>
                          <span className="currency-tag">ج.م</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="text-center">
                    {isSuper && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(order.id);
                        }} 
                        className="delete-text-btn"
                      >
                        حذف
                      </button>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </AnimatePresence>
          
          {Array.from({ length: Math.max(0, 5 - orders.length) }).map((_, i) => (
            <tr key={`filler-${i}`} className="opacity-20 pointer-events-none">
              <td className="text-transparent">—</td>
              <td className="text-transparent">—</td>
              <td className="text-transparent">—</td>
              <td className="text-transparent">—</td>
              <td className="text-transparent">—</td>
              <td className="text-transparent">—</td>
            </tr>
          ))}

          {orders.length === 0 && (
            <tr>
              <td colSpan="6" className="p-20 text-center text-slate-300 font-bold">
                 لا توجد طلبيات مسجلة حتى الآن
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
