import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CornerDownLeft, Check, PackagePlus } from 'lucide-react';
import { toPosNum } from '../../utils/numberUtils';

const orderCategories = [
  'بن', 'لبن', 'سكر', 'أكواب', 'بيبسي', 'معسلات', 'ليات', 'مياه', 'فحم', 'منظفات', 'شاي/أعشاب', 'عصائر', 'إيجار', 'كهرباء/مياه', 'صيانة', 'أخرى'
];

export const OrderForm = ({ newOrder, setNewOrder, onSave, onCancel, editingId }) => {
  const priceRef = useRef(null);
  const paidRef = useRef(null);
  const dateRef = useRef(null);
  const dropdownRef = useRef(null);
  const customDetailRef = useRef(null);
  const [showDropdown, setShowDropdown] = React.useState(false);

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
    setNewOrder({ ...newOrder, item: cat });
    setShowDropdown(false);
    
    if (cat === 'أخرى') {
      setTimeout(() => customDetailRef.current?.focus(), 100);
    } else {
      priceRef.current?.focus();
    }
  };

  const handleKeyDown = (e, nextRef, isLast = false) => {
    if (e.key === 'Enter') {
      if (isLast) {
        onSave();
      } else {
        nextRef.current?.focus();
      }
    }
  };

  const handlePaidChange = (val) => {
    const amount = Number(val);
    const total = Number(newOrder.price || 0);
    if (amount > total) {
      setNewOrder({...newOrder, paidAmount: total});
    } else {
      setNewOrder({...newOrder, paidAmount: val});
    }
  };

  return (
    <>
      <header className="expense-header">
        <h3 className="text-4xl font-black text-white">
          {editingId ? 'تعديل بيانات الطلبية' : 'إضافة طلبية جديدة'}
        </h3>
      </header>

      <motion.div 
        key={editingId ? 'editing' : 'adding'}
        layout
        className="expense-input-row !p-6" 
        style={{ overflow: 'visible' }}
      >
        {/* Item Dropdown Trigger */}
        <motion.div 
          ref={dropdownRef}
          layout
          style={{ flex: editingId ? '0.8 1 0%' : '1.2 1 0%', position: 'relative', minWidth: 0, zIndex: 100 }}
        >
          <input 
            type="text" 
            readOnly 
            placeholder="اختر الصنف" 
            value={newOrder.item === 'أخرى' ? 'أخرى' : (orderCategories.includes(newOrder.item) ? newOrder.item : (newOrder.item || ''))}
            onClick={() => setShowDropdown(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setShowDropdown(true);
            }}
            className={`expense-input cursor-pointer caret-transparent w-full text-center ${editingId ? 'bg-amber-50/50 border-amber-100 placeholder-amber-400' : ''}`} 
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
                  padding: '20px',
                  borderRadius: '24px'
                }}
                className="no-scrollbar"
              >
                {orderCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => selectCategory(cat)}
                    className="w-full text-right transition-all flex justify-between items-center group flex-shrink-0"
                    style={{
                      backgroundColor: 'white',
                      padding: '10px 16px',
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
        <AnimatePresence>
          {newOrder.item === 'أخرى' && (
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
              value={newOrder.customItem || ''}
              onChange={(e) => setNewOrder({...newOrder, customItem: e.target.value})}
              onKeyDown={(e) => {
                 if (e.key === 'Enter') priceRef.current?.focus();
              }}
              style={{ flex: '1 1 0%', minWidth: 0 }}
              className="expense-input text-center bg-amber-50 border-amber-200 placeholder-amber-400 text-amber-900 font-bold"
            />
          )}
        </AnimatePresence>

        {/* Price Input */}
        <motion.input 
          layout
          transition={{ 
            layout: { 
              duration: 0.65, 
              ease: [0.34, 1.56, 0.64, 1],
              delay: editingId ? 0 : 0.25 
            } 
          }}
          ref={priceRef}
          type="text"
          inputMode="decimal"
          placeholder="السعر"
          value={newOrder.price}
          onChange={(e) => setNewOrder({...newOrder, price: toPosNum(e.target.value)})}
          onKeyDown={(e) => handleKeyDown(e, paidRef)}
          style={{ flex: editingId ? '0.5 1 0%' : '1.0 1 0%', minWidth: 0 }}
          className={`expense-input text-center ${editingId ? 'bg-amber-50/50 border-amber-100 placeholder-amber-400' : ''}`} 
        />

        {/* Paid Input */}
        <motion.input 
          layout
          transition={{ 
            layout: { 
              duration: 0.65, 
              ease: [0.34, 1.56, 0.64, 1],
              delay: editingId ? 0 : 0.25 
            } 
          }}
          ref={paidRef}
          type="text"
          inputMode="decimal"
          placeholder="مدفوع"
          value={newOrder.paidAmount}
          onChange={(e) => handlePaidChange(toPosNum(e.target.value))}
          onKeyDown={(e) => handleKeyDown(e, dateRef)}
          style={{ flex: editingId ? '0.5 1 0%' : '1.0 1 0%', minWidth: 0 }}
          className={`expense-input text-center ${editingId ? 'bg-amber-50/50 border-amber-100 placeholder-amber-400' : ''}`} 
        />

        {/* Date Input */}
        <motion.input 
          layout
          transition={{ 
            layout: { 
              duration: 0.65, 
              ease: [0.34, 1.56, 0.64, 1],
              delay: editingId ? 0 : 0.25 
            } 
          }}
          ref={dateRef}
          type="date"
          value={newOrder.date}
          onChange={(e) => setNewOrder({...newOrder, date: e.target.value})}
          onKeyDown={(e) => handleKeyDown(e, null, true)}
          style={{ flex: editingId ? '0.7 1 0%' : '1.4 1 0%', minWidth: 0 }}
          className={`expense-input text-center px-4 ${editingId ? 'bg-amber-50/50 border-amber-100' : ''}`} 
        />

        {/* Cancel Button */}
        <AnimatePresence>
          {editingId && (
            <motion.button
              layout
              initial={{ opacity: 0, scale: 0.5, width: 0, flex: '0 0 0%' }}
              animate={{ opacity: 1, scale: 1, flex: '1.0 1 0%' }}
              exit={{ 
                opacity: 0, 
                scale: 0.5, 
                width: 0,
                flex: '0 0 0%',
                transition: { duration: 0.3, ease: "anticipate" } 
              }}
              transition={{ 
                layout: { duration: 0.65, ease: [0.34, 1.56, 0.64, 1] },
                opacity: { duration: 0.3 }
              }}
              onClick={onCancel}
              className="final-action-btn-primary bg-amber-600"
              style={{ minWidth: 0 }}
            >
              <X size={32} strokeWidth={2.5} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Save/Add Button */}
        <motion.button 
          layout
          transition={{ 
            layout: { 
              duration: 0.65, 
              ease: [0.34, 1.56, 0.64, 1],
              delay: editingId ? 0 : 0.25 
            } 
          }}
          onClick={onSave} 
          disabled={!newOrder.item || !newOrder.price}
          style={{ flex: editingId ? '1.0 1 0%' : '0.8 1 0%', minWidth: 0 }}
          className={`final-action-btn-primary ${editingId ? 'bg-amber-600' : 'bg-[#064e3b]'}`}
        >
          {editingId ? <Check size={32} strokeWidth={2.5} /> : <PackagePlus size={32} strokeWidth={2.5} />}
        </motion.button>
      </motion.div>
    </>
  );
};
