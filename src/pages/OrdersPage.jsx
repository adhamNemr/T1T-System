import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { OrderHeader } from '../components/orders/OrderHeader';
import { OrderForm } from '../components/orders/OrderForm';
import { OrderTable } from '../components/orders/OrderTable';

import { SummaryCard } from '../components/SummaryCard';

export const OrdersPage = ({ orders, setOrders, userRole, showConfirm, showToast }) => {
  const [newOrder, setNewOrder] = useState({ 
    item: '', 
    price: '', 
    paidAmount: '', 
    date: new Date().toISOString().split('T')[0] 
  });
  const [editingOrderId, setEditingOrderId] = useState(null);
  const isSuper = userRole === 'super';

  const startEditOrder = (order) => {
    setEditingOrderId(order.id);
    setNewOrder({
      item: order.item,
      price: order.price,
      paidAmount: order.paidAmount,
      date: order.date
    });
  };

  const saveOrder = () => {
    if (!newOrder.item || !newOrder.price) return;

    if (editingOrderId) {
      // Update existing
      setOrders(orders.map(o => o.id === editingOrderId ? { 
        ...o, 
        ...newOrder, 
        price: Number(newOrder.price), 
        paidAmount: Number(newOrder.paidAmount || 0) 
      } : o));
      setEditingOrderId(null);
    } else {
      // Add new
      const order = {
        ...newOrder,
        id: Date.now(),
        price: Number(newOrder.price),
        paidAmount: Number(newOrder.paidAmount || 0),
        timestamp: new Date().toISOString()
      };
      setOrders([order, ...orders]);
    }

    setNewOrder({ 
        item: '', 
        price: '', 
        paidAmount: '', 
        date: new Date().toISOString().split('T')[0] 
    });
  };

  const removeOrder = (id) => {
    showConfirm(
      'حذف طلبية',
      'هل أنت متأكد من حذف بيانات هذه الطلبية نهائياً؟',
      () => {
        if (editingOrderId === id) setEditingOrderId(null);
        setOrders(orders.filter(o => o.id !== id));
        showToast('تم الحذف', 'تم حذف الطلبية بنجاح', 'success');
      }
    );
  };

  const totalOrdersValue = orders.reduce((sum, o) => sum + Number(o.price), 0);
  const totalPaid = orders.reduce((sum, o) => sum + Number(o.paidAmount), 0);
  const totalRemaining = totalOrdersValue - totalPaid;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      className="flex flex-col items-center gap-10"
    >
      {/* 1. Summary Cards */}
      <div className="stat-cards-container">
        <SummaryCard 
          title="قيمة بضاعة الطلبيات" 
          value={totalOrdersValue} 
          color="emerald"
        />
        <SummaryCard 
          title="المدفوع فعلياً" 
          value={totalPaid} 
          color="amber" 
        />
        <SummaryCard 
          title="إجمالي ديون الموردين" 
          value={totalRemaining} 
          color="gold" 
          highlight 
        />
      </div>

      {/* 2. Combined Form and Table (Same as Logger Expense Card) */}
      <section className="w-full max-w-4xl">
        <div className="expense-card">
          <OrderForm 
            newOrder={newOrder} 
            setNewOrder={setNewOrder} 
            onSave={saveOrder} 
            onCancel={() => {
              setEditingOrderId(null);
              setNewOrder({ 
                item: '', 
                price: '', 
                paidAmount: '', 
                date: new Date().toISOString().split('T')[0] 
              });
            }}
            editingId={editingOrderId}
          />
          <OrderTable 
            orders={orders} 
            onRemove={removeOrder} 
            onEdit={startEditOrder}
            editingId={editingOrderId}
            isSuper={isSuper} 
          />
        </div>
      </section>
    </motion.div>
  );
};
