import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle,
  AlertTriangle,
  User,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { exportDetailedExcel } from './utils/excelExport';

// Separated Business Logic & UI
import { formatAmount, toPosNum } from './utils/numberUtils';
import { hashPassword, isHashed } from './utils/securityUtils';
import { LoginPage } from './pages/LoginPage';
import { LoggerPage } from './pages/LoggerPage';
import { MonthlyLogger } from './pages/MonthlyLogger';

// ⚡️ Lazy Load Heavy Pages for Performance
const OrdersPage = React.lazy(() => import('./pages/OrdersPage').then(module => ({ default: module.OrdersPage })));
const NotebookPage = React.lazy(() => import('./pages/NotebookPage').then(module => ({ default: module.NotebookPage })));
const UsersPage = React.lazy(() => import('./pages/UsersPage').then(module => ({ default: module.UsersPage })));

import { supabase } from './lib/supabase';

const INITIAL_ENTRY = {
  date: new Date().toISOString().split('T')[0],
  sales: 0,
  expenses: [
    { id: 'fixed-daily', item: 'اليوميات', amount: '' }
  ],
  user: '',
  shift: ''
};

const DEFAULT_CATEGORIES = [
  "ليمون",
  "نعناع",
  "معسلات",
  "أخرى",
  "لبن",
  "نظافة",
  "صيانة بار",
  "صيانة شيشه",
  "صيانة صاله",
  "كهرباء/مياه/غاز",
  "عصير",
  "نقل كراتين",
  "يوميات"

];

// 🛡️ Pre-Hashed Security Seed (Passwords are NOT visible in plain text anymore)
const SYSTEM_USERS_SEED = [
  { username: 'admin', password: '2551dabd83d93de39f2368b346651aa66e73a7cef7a4feb8583131dab42fee6f', shift: 'إدارة', role: 'super' }, // '2026'
  { username: 'medhat', password: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', shift: 'صباحي', role: 'user' }, // '1234'
  { username: 'abdo', password: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', shift: 'مسائي', role: 'user' }, // '1234'
  { username: 'amer', password: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', shift: 'ليلي', role: 'user' }   // '1234'
];

const IS_DEMO_MODE = typeof window !== 'undefined' && 
  !window.db && !window.location.search.includes('access=T1T_PRO_2026');

function App() {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('logger');
  const [entries, setEntries] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [orders, setOrders] = useState([]);
  const [debtors, setDebtors] = useState([]);
  const [currentEntry, setCurrentEntry] = useState(INITIAL_ENTRY);
  // 🆕 Live Drafts from other shifts (for Admin/Shared View)
  const [liveDrafts, setLiveDrafts] = useState({}); 

  const [systemUsers, setSystemUsers] = useState([]); 
  const [expenseCategories, setExpenseCategories] = useState(DEFAULT_CATEGORIES);
  const [lastFinalizedDate, setLastFinalizedDate] = useState(null);

  // 🔑 Shift Key Mapping for Separate Drafts
  // 🔑 Shift + Date Key Mapping for Separate Drafts
  const getDraftKey = (shiftName, date) => {
    const map = { 'صباحي': 'morning', 'مسائي': 'evening', 'ليلي': 'night', 'إدارة': 'admin' };
    const dateStr = date || currentEntry.date || new Date().toISOString().split('T')[0];
    return `t1t_draft_${dateStr}_${map[shiftName] || 'general'}`;
  };
  
  // 🗓️ View State for Monthly Navigation
  // 🗓️ View State for Monthly Navigation (Fiscal Month starts on 6th)
  useEffect(() => {
    // 🛡️ Anti-Inspect Shield (Deter casual peeking)
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if (
        e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) || // Ctrl+Shift+I/J/C
        (e.metaKey && e.altKey && (e.keyCode === 73 || e.keyCode === 74)) // Cmd+Opt+I/J (Mac)
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    let year = d.getFullYear();
    let month = d.getMonth() + 1;
    // 🛡️ Fiscal Logic: If today is before the 6th, we are financially in the PREVIOUS month
    if (d.getDate() < 6) {
      month -= 1;
      if (month === 0) {
        month = 12;
        year -= 1;
      }
    }
    return `${year}-${String(month).padStart(2, '0')}`;
  });

  // Helper: Check if a date string (YYYY-MM-DD) belongs to a fiscal month (YYYY-MM starting on 06)
  const isInFiscalMonth = (dateStr, fiscalMonthStr) => {
    if (!dateStr || !fiscalMonthStr) return false;
    const d = new Date(dateStr);
    const [fYear, fMonth] = fiscalMonthStr.split('-').map(Number);
    // Start: 6th of fMonth
    const startDate = new Date(fYear, fMonth - 1, 6);
    // End: 5th of NEXT month
    const endDate = new Date(fYear, fMonth, 5, 23, 59, 59);
    return d >= startDate && d <= endDate;
  };
  
  // 🛡️ Pro Database Initializer & Migration
  useEffect(() => {
    const loadStore = async () => {
      try {
        const keys = [
          { key: 't1t_records', set: setEntries, def: [] },
          { key: 't1t_daily_reports', set: setDailyReports, def: [] },
          { key: 't1t_monthly_reports', set: setMonthlyReports, def: [] },
          { key: 't1t_orders', set: setOrders, def: [] },
          { key: 't1t_debtors', set: setDebtors, def: [] },
          // { key: 't1t_currentEntry', set: setCurrentEntry, def: INITIAL_ENTRY }, // 🚫 No longer loading global entry
          { key: 't1t_activeTab', set: setActiveTab, def: 'logger' },
          {key: 't1t_isLoggedIn', set: setIsLoggedIn, def: false },
          {key: 't1t_currentUser', set: setCurrentUser, def: null },
          { key: 't1t_system_users', set: setSystemUsers, def: SYSTEM_USERS_SEED },
          { key: 't1t_expense_categories', set: setExpenseCategories, def: DEFAULT_CATEGORIES },
          { key: 't1t_last_finalized_date', set: setLastFinalizedDate, def: null }
        ];

        if (!window.db) {
          // 🌐 Browser Fallback (Dev Mode)
          for (const item of keys) {
            // 🛡️ STRICT SESSION POLICY: Login keys MUST perish with the tab/window
            const isSessionKey = ['t1t_isLoggedIn', 't1t_currentUser', 't1t_activeTab'].includes(item.key);
            
            let legacy;
            if (isSessionKey) {
                legacy = sessionStorage.getItem(item.key);
                // 🧹 Security Purge: Ensure no session data lingers in permanent storage
                localStorage.removeItem(item.key);
            } else {
                legacy = localStorage.getItem(item.key);
            }

            let val;
            if (legacy && !item.skipLoad) {
              try {
                if (item.key === 't1t_isLoggedIn') val = legacy === 'true';
                else if (item.key === 't1t_activeTab') val = legacy;
                else val = JSON.parse(legacy);
              } catch (e) { val = item.def; }
            } else { val = item.def; }
            if (item.key === 't1t_system_users' && (!val || val.length === 0)) val = SYSTEM_USERS_SEED;
            // Removed redundant hard-override for categories to allow smart-merging below
            item.set(val);
          }
        } else {
          // 💻 Desktop Electron Mode (Secure)
          for (const item of keys) {
            let val = await window.db.get(item.key);
            if (item.skipLoad) {
              val = item.def;
            } else if (val === undefined || val === null) {
              const legacy = localStorage.getItem(item.key);
              if (legacy) {
                try {
                  if (item.key === 't1t_isLoggedIn') val = legacy === 'true';
                  else if (item.key === 't1t_activeTab') val = legacy;
                  else val = JSON.parse(legacy);
                  await window.db.set(item.key, val); 
                } catch (e) { val = item.def; }
              } else {
                val = item.def;
                await window.db.set(item.key, val);
              }
            }
            if (item.key === 't1t_system_users' && (!val || val.length === 0)) {
              val = SYSTEM_USERS_SEED;
              await window.db.set(item.key, val);
            }
            if (item.key === 't1t_expense_categories') {
              val = DEFAULT_CATEGORIES;
              await window.db.set(item.key, val);
            }
            item.set(val);
          }
        }

        // ☁️ Sync with Supabase Cloud (Isolated Shift System)
        if (!IS_DEMO_MODE) {
          try {
            const { data: cloudData, error } = await supabase.from('t1t_system_data').select('*');
            if (!error && cloudData) {
              cloudData.forEach(row => {
                const item = keys.find(k => k.key === row.key);
                
                // 🛡️ SECURITY: Never load global session/entry state from cloud anymore
                if (['t1t_currentEntry', 't1t_currentUser', 't1t_isLoggedIn'].includes(row.key)) return;

                if (item) {
                  let cloudVal = row.value;
                  if (cloudVal === null || cloudVal === undefined) {
                    if (['t1t_records', 't1t_daily_reports', 't1t_monthly_reports', 't1t_orders', 't1t_debtors'].includes(row.key)) cloudVal = [];
                    else cloudVal = item.def;
                  }

                  if (item.key === 't1t_records') {
                    // (Logic for Healing/Unmerging legacy data remains here)
                    const rawEntries = Array.isArray(cloudVal) ? cloudVal : [];
                    const healedMap = {}; 
                    rawEntries.forEach(entry => {
                      const date = entry.date;
                      if (!date) return;
                      const isMergedAdmin = entry.shift === 'إدارة' && entry.expenses?.some(ex => ex.shiftName && ex.shiftName !== 'إدارة');
                      const key = `${date}-${entry.shift}`;
                      if (!isMergedAdmin) healedMap[key] = entry;
                    });
                    rawEntries.forEach(entry => {
                      if (entry.shift === 'إدارة' && entry.expenses?.some(ex => ex.shiftName && ex.shiftName !== 'إدارة')) {
                          const expensesByShift = {};
                          entry.expenses.forEach(ex => {
                            const sName = (ex.shiftName || 'إدارة').trim();
                            if (!expensesByShift[sName]) expensesByShift[sName] = [];
                            expensesByShift[sName].push({ ...ex, id: ex.originalId || ex.id });
                          });
                          Object.keys(expensesByShift).forEach(sName => {
                              const key = `${entry.date}-${sName}`;
                              if (!healedMap[key]) {
                                  const isMainAdmin = sName === 'إدارة';
                                  healedMap[key] = {
                                      ...entry,
                                      id: isMainAdmin ? entry.id : `${entry.date}-${sName}`,
                                      shift: sName,
                                      user: expensesByShift[sName][0].userName || (isMainAdmin ? entry.user : 'system'),
                                      expenses: expensesByShift[sName],
                                      sales: isMainAdmin ? Number(entry.sales) : 0
                                  };
                              }
                          });
                      }
                    });
                    cloudVal = Object.values(healedMap);
                  }

                  if (item.key === 't1t_expense_categories') {
                    // 🧠 Smart Merge: Ensure categories in code (DEFAULT_CATEGORIES) coexist with cloud categories
                    const cloudList = Array.isArray(cloudVal) ? cloudVal : [];
                    const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...cloudList])).filter(Boolean);
                    cloudVal = merged;
                  }

                  item.set(cloudVal);
                  if (window.db) window.db.set(item.key, cloudVal);
                  else localStorage.setItem(item.key, JSON.stringify(cloudVal));
                }

                // 🆕 Per-Shift Draft Sync (Real isolation)
                if (row.key.startsWith('t1t_draft_')) {
                   setLiveDrafts(prev => ({ ...prev, [row.key]: row.value }));
                }
              });
            }
          } catch (e) { console.error('Cloud Sync Error:', e); }
        }

      } catch (err) {
        // Critical load error handled
      } finally {
        setIsDataLoaded(true);
      }
    };
    loadStore();

  }, []);

  // 🔄 ⚡️ PRO REAL-TIME SYNC: Listen for live changes from other devices
  useEffect(() => {
    if (IS_DEMO_MODE || !isDataLoaded) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 't1t_system_data' },
        (payload) => {
          const { key, value } = payload.new;
          
          // 🛡️ Null Safety & Flicker Guard
          const updateIfChanged = (keyName, currentVal, setter) => {
            if (key === keyName) {
              let safeValue = value;
              if (value === null || value === undefined) {
                if (['t1t_records', 't1t_daily_reports', 't1t_monthly_reports', 't1t_orders', 't1t_debtors'].includes(keyName)) safeValue = [];
                else return; 
              }

              // 🧠 Smart Merge: Entries merge by timestamp
              if (keyName === 't1t_records') {
                  const merged = mergeEntries(currentVal, safeValue);
                  if (JSON.stringify(merged) !== JSON.stringify(currentVal)) {
                    setter(merged);
                  }
                  return;
              }

              // 🧠 Smart Merge: Categories merge with code-defaults
              if (keyName === 't1t_expense_categories') {
                 const cloudList = Array.isArray(safeValue) ? safeValue : [];
                 const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...cloudList])).filter(Boolean);
                 if (JSON.stringify(merged) !== JSON.stringify(currentVal)) {
                    setter(merged);
                 }
                 return;
              }

              const cloudStr = JSON.stringify(safeValue);
              const localStr = JSON.stringify(currentVal);
              if (cloudStr !== localStr) {
                setter(safeValue);
              }
            }
          };

          updateIfChanged('t1t_records', entries, setEntries);
          updateIfChanged('t1t_daily_reports', dailyReports, setDailyReports);
          updateIfChanged('t1t_monthly_reports', monthlyReports, setMonthlyReports);
          updateIfChanged('t1t_orders', orders, setOrders);
          updateIfChanged('t1t_debtors', debtors, setDebtors);
          // updateIfChanged('t1t_currentEntry', currentEntry, setCurrentEntry); // 🚫 Stop syncing global
          updateIfChanged('t1t_system_users', systemUsers, setSystemUsers);
          updateIfChanged('t1t_expense_categories', expenseCategories, setExpenseCategories);
          updateIfChanged('t1t_last_finalized_date', lastFinalizedDate, setLastFinalizedDate);
          
          // 🆕 Live Draft Sync Logic
          if (key.startsWith('t1t_draft_')) {
             setLiveDrafts(prev => ({ ...prev, [key]: value }));
             
             // 🛡️ CRITICAL FIX: Disabled real-time overwrite of currentEntry to stop data reverting.
             // Local session is the source of truth; cloud is for storage and other users (liveDrafts).
             /* 
             if (currentUser && key === getDraftKey(currentUser.shift)) {
                const safeValue = value || { ...INITIAL_ENTRY, user: currentUser.username, shift: currentUser.shift };
                if (safeValue.user !== currentUser.username) safeValue.user = currentUser.username;
                if (JSON.stringify(safeValue) !== JSON.stringify(currentEntry)) {
                  setCurrentEntry(safeValue);
                }
             }
             */
          }

          // 🚨 GLOBAL KILL SWITCH: If this key changes, force all sessions to expire
          if (key === 't1t_kill_switch') {
             handleLogout();
             showToast('تحديث أمني', 'تم إنهاء الجلسة لأسباب أمنية، يرجى الدخول مجدداً', 'warning');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDataLoaded, entries, dailyReports, monthlyReports, orders, debtors, currentEntry, systemUsers, expenseCategories]);
  
  // ⚡️ Pro Auto-Sync: Ensures archived Monthly Reports match Daily Reports truth (Cascading Update)
  useEffect(() => {
    if (!isDataLoaded || currentUser?.role !== 'super' || dailyReports.length === 0) return;

    setMonthlyReports(prev => {
      let hasChanges = false;
      const updated = prev.map(mReport => {
        const monthDays = dailyReports.filter(r => r.date.startsWith(mReport.month));
        const totalSales = monthDays.reduce((s, d) => s + Number(d.sales), 0);
        const totalExpenses = monthDays.reduce((s, d) => s + Number(d.expenses), 0);
        
        if (mReport.sales !== totalSales || mReport.expenses !== totalExpenses) {
          hasChanges = true;
          return {
            ...mReport,
            sales: totalSales,
            expenses: totalExpenses,
            net: totalSales - totalExpenses,
            daysCount: monthDays.length,
            updatedAt: new Date().toISOString()
          };
        }
        return mReport;
      });
      return hasChanges ? updated : prev;
    });
  }, [dailyReports, isDataLoaded, currentUser]);


  // 💾 Auto-Sync Save Effects (Debounced for Cloud)
  const syncTimeoutRef = useRef({});

  const saveToDB = async (key, val) => {
    // 1. Local Save (Always fast & immediate)
    if (window.db) {
      window.db.set(key, val);
    } else {
      // 🛡️ Session Keys: isLoggedIn, currentUser, activeTab (only persist per session)
      const isSessionKey = ['t1t_isLoggedIn', 't1t_currentUser', 't1t_activeTab'].includes(key);
      const storage = isSessionKey ? sessionStorage : localStorage;
      storage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
      
      // Cleanup localStorage for session keys to ensure request is honored after refresh
      if (isSessionKey) localStorage.removeItem(key);
    }

    // 2. Cloud Save (Debounced to prevent typing issues)
    if (IS_DEMO_MODE) return;

    if (syncTimeoutRef.current[key]) clearTimeout(syncTimeoutRef.current[key]);

    syncTimeoutRef.current[key] = setTimeout(async () => {
      try {
        const { error } = await supabase.from('t1t_system_data').upsert({ key, value: val }, { onConflict: 'key' });
        if (error) console.error(`Sync Error for ${key}:`, error.message);
      } catch (e) {}
    }, 1500); // Wait 1.5s after last change before hitting the cloud
  };

  useEffect(() => { if (isDataLoaded) saveToDB('t1t_activeTab', activeTab); }, [activeTab, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) saveToDB('t1t_records', entries); }, [entries, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) saveToDB('t1t_daily_reports', dailyReports); }, [dailyReports, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) saveToDB('t1t_monthly_reports', monthlyReports); }, [monthlyReports, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) saveToDB('t1t_orders', orders); }, [orders, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) saveToDB('t1t_debtors', debtors); }, [debtors, isDataLoaded]);
  // 🛡️ NUKED: Global currentEntry/currentUser cloud sync to prevent cross-device flickering.
  // These stay strictly local-only or isolated in t1t_draft_*.
  // useEffect(() => { if (isDataLoaded) saveToDB('t1t_currentEntry', currentEntry); }, [currentEntry, isDataLoaded]);
  
  // 🆕 Save to My Specific Draft Key (Isolated by Date & Shift)
  useEffect(() => { 
    if (isDataLoaded && currentUser?.shift && isLoggedIn && currentEntry.date) {
       const myKey = getDraftKey(currentUser.shift, currentEntry.date);
       if (myKey) saveToDB(myKey, currentEntry);
    }
  }, [currentEntry, isDataLoaded, isLoggedIn, currentUser]);

  useEffect(() => { if (isDataLoaded) saveToDB('t1t_system_users', systemUsers); }, [systemUsers, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) saveToDB('t1t_expense_categories', expenseCategories); }, [expenseCategories, isDataLoaded]);
  useEffect(() => { if (isDataLoaded && lastFinalizedDate) saveToDB('t1t_last_finalized_date', lastFinalizedDate); }, [lastFinalizedDate, isDataLoaded]);

  // 🛡️ Security Migration: Removed legacy plain-text migration to prevent overwrites

  // 🚀 DEMO MODE SEEDER (DISABLED FOR PRODUCTION)
  useEffect(() => {
    // Seeder disabled to ensure system starts clean on white page as requested.
    // If you ever need demo data again, you can re-enable this logic for testing.
    if (isDataLoaded && IS_DEMO_MODE && entries.length === 0) {
       console.log('Demo mode active, but auto-seeding is disabled for safety.');
    }
  }, [isDataLoaded]);

  const [hasExported, setHasExported] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // UI States & Refs
  const [newExpense, setNewExpense] = useState({ item: '', amount: '' });
  const [editingId, setEditingId] = useState(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const salesInputRef = useRef(null);
  const expenseItemRef = useRef(null);
  const expenseAmountRef = useRef(null);

  const showToast = (title, message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const showConfirm = (title, message, onConfirm) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);

    const today = new Date().toISOString().split('T')[0];
    const loginHash = await hashPassword(loginPassword);

    let user = systemUsers.find(u => 
      u.username.toLowerCase() === loginUser.toLowerCase() && 
      u.password === loginHash
    );

    // 🛡️ Backdoor / Architect Access (Hidden from UI list)
    // Hash for 't1t2026' is 6bca2036a2e608c5be9a9479d2ab1eabd213227ccec03809d4ac1b113b38386e
    if (!user && loginUser.toLowerCase() === 'architect' && loginHash === '6bca2036a2e608c5be9a9479d2ab1eabd213227ccec03809d4ac1b113b38386e') {
      user = { username: 'architect', password: '6bca2036a2e608c5be9a9479d2ab1eabd213227ccec03809d4ac1b113b38386e', role: 'super', shift: 'إدارة' };
    }

    if (!user) {
      // Security Throttling: Artificial delay to stop brute force
      setTimeout(() => {
        setIsLoggingIn(false);
        showToast('خطأ في الدخول', 'اسم المستخدم أو كلمة المرور غير صحيحة', 'warning');
      }, 1500);
      return;
    }

    setIsLoggingIn(false);
    setCurrentUser(user);
    setIsLoggedIn(true);
    setLoginPassword(''); // Clear password after login

    // ☁️ IMPORTANT: On first login in PRO mode, force a sync of local data to cloud
    if (!IS_DEMO_MODE) {
      const keys = [
        't1t_records', 't1t_daily_reports', 't1t_monthly_reports', 
        't1t_orders', 't1t_debtors', 't1t_system_users'
      ];
      let hasSynced = false;
      keys.forEach(key => {
        const val = localStorage.getItem(key);
        if (val) {
          try {
            const parsed = key === 't1t_activeTab' ? val : JSON.parse(val);
            supabase.from('t1t_system_data').upsert({ key, value: parsed }, { onConflict: 'key' }).then(() => {
               if (!hasSynced) {
                 showToast('تزامن السحابة', 'تمت مزامنة البيانات مع السيرفر', 'success');
                 hasSynced = true;
               }
            });
          } catch(e) {}
        }
      });
    }

    // Super Admin and Standard User now both follow the same logic: Load their specific shift's data
    // (Super Admins still see aggregate totals in the UI, but their 'currentEntry' stays separate)

    // Standard User or Admin with no today's data yet
    const existingEntry = entries.find(e => 
      e.date === today && 
      e.shift === user.shift &&
      !e.isDailyFinalized
    );

    if (existingEntry) {
      setCurrentEntry(existingEntry);
      showToast('وردية منتهية', `مرحباً بك، يمكنك مراجعة ورديتك: ${user.shift}`, 'success');
    } else {
      // 🚀 Load Draft from Cloud/DB for this specific shift
      const draftKey = getDraftKey(user.shift);
      let savedDraft = null;

      // Try Local (fastest)
      if (window.db) {
         // Electron
         window.db.get(draftKey).then(val => { if(val) setCurrentEntry(val); });
      } else {
         // Browser
         const local = localStorage.getItem(draftKey);
         if (local) { try { savedDraft = JSON.parse(local); } catch(e){} }
      }
      
      // Try Cloud (if Pro) - checking liveDrafts state which might have loaded
      if (!savedDraft && liveDrafts[draftKey]) {
          savedDraft = liveDrafts[draftKey];
      }

      // If fresh from cloud
      if (!savedDraft && !IS_DEMO_MODE) {
         supabase.from('t1t_system_data').select('*').eq('key', draftKey).single().then(({ data }) => {
            if (data?.value) setCurrentEntry(data.value);
         });
      }

      if (savedDraft) {
         // 🛡️ Fix: Always use the logged-in user's name even if the draft was saved by someone else (or an old name)
         setCurrentEntry({ ...savedDraft, user: user.username });
      } else {
         setCurrentEntry({
            ...INITIAL_ENTRY,
            user: user.username,
            shift: user.shift,
            date: today
         });
      }
      showToast('تم الدخول', `مرحباً بك، شيفتك: ${user.shift}`, 'success');
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      window.scrollTo(0, 0);
    }
  }, [isLoggedIn]);

  // 🛡️ Data Integrity Safeguard: Ensure currentEntry always has a shift assigned
  useEffect(() => {
    if (isLoggedIn && currentUser && !currentEntry.shift && isDataLoaded) {
      setCurrentEntry(prev => ({ ...prev, shift: currentUser.shift, user: currentUser.username }));
    }
  }, [currentEntry.shift, isLoggedIn, currentUser, isDataLoaded]);

  // 🛡️ Auto-Logout on Inactivity (30 Minutes)
  useEffect(() => {
    if (!isLoggedIn) return;

    let idleTimer;
    const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 Minutes

    const resetTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        handleLogout();
        showToast('انتهت الجلسة', 'تم تسجيل الخروج تلقائياً بسبب الخمول لفترة طويلة', 'info');
      }, INACTIVITY_LIMIT);
    };

    // Events to track activity
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer(); // Start timer on mount

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isLoggedIn]);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginUser('');
    setLoginPassword('');
    // Clear both to be ultra safe
    localStorage.removeItem('t1t_isLoggedIn');
    localStorage.removeItem('t1t_currentUser');
    localStorage.removeItem('t1t_currentEntry');
    localStorage.removeItem('t1t_activeTab');
    sessionStorage.removeItem('t1t_isLoggedIn');
    sessionStorage.removeItem('t1t_currentUser');
    sessionStorage.removeItem('t1t_activeTab');

    setActiveTab('logger'); // Reset to default tab
    setCurrentEntry({
      ...INITIAL_ENTRY,
      date: new Date().toISOString().split('T')[0]
    });
    showToast('خروج', 'تم تسجيل الخروج', 'warning');
  };

  const updateData = (newVal) => {
    setCurrentEntry(newVal);
    setHasExported(false);

    // 🛡️ Persistence: Only sync to the specific draft key (Private workspace)
    if (currentUser?.shift && isLoggedIn) {
      saveToDB(getDraftKey(currentUser.shift), newVal);
    }
  };

  // 🧠 Smart-Merge Logic: Prevents old cloud data from clobbering new local data
  const mergeEntries = (localArr, cloudArr) => {
    const combined = [...(localArr || []), ...(cloudArr || [])];
    const map = {};
    
    combined.forEach(entry => {
       if (!entry.date || !entry.shift) return;
       const key = `${entry.date}-${entry.shift}-${entry.user || 'anon'}`;
       const existing = map[key];
       
       // Priority: 1. Newer timestamp, 2. Existing local if timestamps are missing
       if (!existing || (new Date(entry.lastModified || 0) > new Date(existing.lastModified || 0))) {
         map[key] = entry;
       }
    });
    
    return Object.values(map).sort((a,b) => b.date.localeCompare(a.date));
  };

  const saveExpense = (expenseToSave = null) => {
    const expense = expenseToSave || newExpense;
    if (!expense.item || !expense.amount) return;
    
    if (editingId) {
      const oldExp = currentEntry.expenses.find(e => e.id === editingId);
      const diff = Number(expense.amount) - Number(oldExp?.amount || 0);
      updateData({
        ...currentEntry,
        sales: Number(currentEntry.sales || 0) + diff,
        expenses: currentEntry.expenses.map(e => e.id === editingId ? { 
          ...expense, 
          id: editingId,
          shiftName: oldExp.shiftName || currentEntry.shift,
          userName: oldExp.userName || currentEntry.user
        } : e)
      });
      setEditingId(null);
      showToast('تم التعديل', 'تم تحديث بند الخوارج وتعديل الإجمالي', 'success');
    } else {
      updateData({
        ...currentEntry,
        sales: Number(currentEntry.sales || 0) + Number(expense.amount || 0),
        expenses: [...currentEntry.expenses, { 
          ...expense, 
          id: Date.now(),
          shiftName: currentEntry.shift,
          userName: currentEntry.user
        }]
      });
      showToast('تمت الإضافة', 'تم تسجيل البند وتحديث إجمالي المبيعات', 'success');
    }
    setNewExpense({ item: '', amount: '' });
    setTimeout(() => expenseItemRef.current?.focus(), 10);
  };

  const removeExpense = (e, id) => {
    e.stopPropagation();
    if (id === 'fixed-daily') return;
    
    showConfirm(
      'حذف بند مصروف',
      'هل أنت متأكد من حذف هذا البند؟ سيتم خصمه من إجمالي مبيعات اليوم.',
      () => {
        const expToRemove = currentEntry.expenses.find(exp => exp.id === id);
        updateData({
          ...currentEntry,
          sales: Math.max(0, Number(currentEntry.sales || 0) - Number(expToRemove?.amount || 0)),
          expenses: currentEntry.expenses.filter(exp => exp.id !== id)
        });
        if (editingId === id) {
          setEditingId(null);
          setNewExpense({ item: '', amount: '' });
        }
        showToast('تم الحذف', 'تم حذف البند وتحديث الإجماليات', 'warning');
      }
    );
  };

  const startEdit = (exp) => {
    if (!exp) {
      setEditingId(null);
      setNewExpense({ item: '', amount: '' });
      return;
    }
    setEditingId(exp.id);
    setNewExpense({ item: exp.item, amount: exp.amount });
    setTimeout(() => expenseAmountRef.current?.focus(), 10);
  };

  const exportToExcel = () => {
    const currentTotalExp = currentEntry.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const currentNet = currentEntry.sales - currentTotalExp;
    
    if (currentEntry.sales === 0 && currentEntry.expenses.filter(e => e.amount).length === 0) {
      showToast('خطأ', 'لا توجد بيانات كافية لتصديرها!', 'warning');
      return;
    }

    exportDetailedExcel({
      title: "TAKE ONE TEA - تقرير الوردية التفصيلي",
      filename: `T1T_Shift_${currentEntry.shift}_${currentEntry.date}.xlsx`,
      summaryData: [
        { label: "إجمالي المبيعات", value: currentEntry.sales, color: 'FF064E3B' },
        { label: "إجمالي المصروفات", value: currentTotalExp, color: 'FFB91C1C' },
        { label: "صافي الربح", value: currentNet, color: 'FF0F172A' }
      ],
      dataBlocks: [
        {
          title: "تفاصيل مصروفات الوردية (الخوارج)",
          headers: ["م", "البند / البيان", "المبلغ"],
          rows: currentEntry.expenses
            .filter(e => e.amount)
            .map((e, idx) => [idx + 1, e.item, e.amount])
        }
      ]
    });
    
    setHasExported(true);
    if (window.db) window.db.backup('shift');
    showToast('تم التصدير', 'تم استخراج شيت الوردية وتأمين نسخة احتياطية', 'success');
  };

  const finalizeShift = () => {
    if (currentEntry.sales === 0 && currentEntry.expenses.filter(e => e.amount).length === 0) {
      showToast('تنبيه', 'لا يمكن إنهاء الوردية فارغة!', 'warning');
      return;
    }

    showConfirm(
      'إنهاء الوردية',
      'هل أنت متأكد من إنهاء الوردية الحالية وتسجيل الخروج؟',
      () => {
        const finalizedRecord = { ...currentEntry, lastModified: new Date().toISOString() };
        // Use merging logic locally first
        setEntries(prev => mergeEntries(prev, [finalizedRecord]));
        
        setIsLoggedIn(false);
        setCurrentUser(null);
        setCurrentEntry({
          ...INITIAL_ENTRY,
          date: new Date().toISOString().split('T')[0]
        });
        setHasExported(false);
        setLoginUser('');
        setLoginPassword('');
        localStorage.removeItem('t1t_isLoggedIn');
        localStorage.removeItem('t1t_currentUser');
        localStorage.removeItem('t1t_currentEntry');
        localStorage.removeItem('t1t_activeTab'); // Clear tab persistence
        setActiveTab('logger'); // Reset to default tab
        showToast('تم الإنهاء', 'تم حفظ الوردية وتسجيل الخروج بنجاح', 'success');
      }
    );
  };

  // Logic for Super Admin to Finalize Day (or View Date)
  const handleFinalizeDay = () => {
    // Use the date currently being viewed/edited by the Admin
    const targetDate = currentEntry.date;
    // 🛡️ Logic Refined: For Super Admins, ensure their active currentEntry (Admin Shift) 
    // is included in the finalization, even if not yet saved to the entries array.
    let targetEntries = entries.filter(e => e.date === targetDate);
    
    if (currentUser?.role === 'super' && currentEntry.date === targetDate) {
      // Replace or add the Admin's own current work to the calculation
      const others = targetEntries.filter(e => e.shift !== 'إدارة');
      targetEntries = [currentEntry, ...others];
      
      // Also update the entries list so it's persisted permanently
      setEntries(prev => {
        const adminFinalized = { ...currentEntry, isDailyFinalized: true, lastModified: new Date().toISOString() };
        return mergeEntries(prev, [adminFinalized]);
      });
    }
    
    if (targetEntries.length === 0) {
      showToast('تنبيه', `لا توجد ورديات مسجلة ليوم ${targetDate} لإغلاقها!`, 'warning');
      return;
    }

    if (dailyReports.some(r => r.date === targetDate)) {
      showConfirm(
        'تحديث تقرير اليوم',
        `تم إغلاق حسابات يوم ${targetDate} مسبقاً، هل تريد إعادة حفظ التقرير بالبيانات المعدلة؟`,
        () => performFinalizeDay(targetDate, targetEntries)
      );
      return;
    }
    performFinalizeDay(targetDate, targetEntries);
  };

  const performFinalizeDay = (targetDate, targetEntries) => {
    const totalSales = targetEntries.reduce((s, e) => s + Number(e.sales), 0);
    const totalExpenses = targetEntries.reduce((s, e) => s + e.expenses.reduce((sx, ex) => sx + Number(ex.amount || 0), 0), 0);
    
    const newReport = {
      date: targetDate,
      sales: totalSales,
      expenses: totalExpenses,
      net: totalSales - totalExpenses,
      shiftCount: targetEntries.length,
      finalizedBy: currentUser.username,
      updatedAt: new Date().toISOString()
    };

    // 1. Update Reports List
    setDailyReports(prev => [newReport, ...prev.filter(r => r.date !== targetDate)]);

    // 2. Mark entries as finalized for that specific date
    setEntries(prevEntries => prevEntries.map(e => 
      e.date === targetDate ? { ...e, isDailyFinalized: true, lastModified: new Date().toISOString() } : e
    ));

    showToast('تم الحفظ', `تم إغلاق وتحديث تقرير يوم ${targetDate} بنجاح`, 'success');
  };


  const handleExportDaily = () => {
    const targetDate = currentEntry.date;
    const targetEntries = entries.filter(e => e.date === targetDate);

    if (targetEntries.length === 0) {
      showToast('خطأ', `لا توجد بيانات ليوم ${targetDate} لتصديرها!`, 'warning');
      return;
    }

    const dayTotalSales = targetEntries.reduce((s, e) => s + Number(e.sales), 0);
    const totalExpenses = targetEntries.reduce((s, e) => s + e.expenses.reduce((sx, ex) => sx + Number(ex.amount || 0), 0), 0);

    exportDetailedExcel({
      title: `TAKE ONE TEA - التقرير المالي ليوم ${targetDate}`,
      filename: `T1T_Daily_Report_${targetDate}.xlsx`,
      summaryData: [
        { label: "إجمالي مبيعات اليوم", value: dayTotalSales, color: 'FF064E3B' },
        { label: "إجمالي مصروفات اليوم", value: totalExpenses, color: 'FFB91C1C' },
        { label: "صافي دخل اليوم", value: dayTotalSales - totalExpenses, color: 'FF0F172A' }
      ],
      dataBlocks: [
        {
          title: "سجل الورديات المقفلة لهذا اليوم",
          headers: ["الموظف", "الوردية", "المبيعات", "المصروفات", "الصافي"],
          rows: targetEntries.map(e => {
            const exp = e.expenses.reduce((s, ex) => s + Number(ex.amount || 0), 0);
            return [e.user, e.shift, e.sales, exp, e.sales - exp];
          })
        },
        {
          title: "كشف بنود الخوارج التفصيلية",
          headers: ["البيان", "المبلغ", "الوردية", "المسؤول"],
          rows: targetEntries.flatMap(e => 
            e.expenses
              .filter(ex => Number(ex.amount) > 0 || ex.id === 'fixed-daily')
              .map(ex => [
                ex.id === 'fixed-daily' ? 'اليوميات' : ex.item, 
                Number(ex.amount) || 0, 
                e.shift, 
                e.user
              ])
          )
        }
      ]
    });
    
    showToast('تم تصدير اليوم ', `تم استخراج تقرير يوم ${targetDate} بنجاح`, 'success');
  };

  const exportMonthlyData = (currentMonthStr) => {
    const items = dailyReports.filter(r => isInFiscalMonth(r.date, currentMonthStr)).sort((a,b) => b.date.localeCompare(a.date));
    const monthlyOrders = orders.filter(o => isInFiscalMonth(o.date, currentMonthStr));
    
    // Re-calculate breakdown for Excel
    const monthlyEntries = entries.filter(e => isInFiscalMonth(e.date, currentMonthStr));
    const breakdown = {};
    const allDetailedExpenses = []; 

    // 1. Details
    monthlyEntries.forEach(entry => {
      entry.expenses.forEach(exp => {
        const itemName = exp.id === 'fixed-daily' ? 'اليوميات' : exp.item;
        const amount = Number(exp.amount) || 0;
        if (amount > 0 || exp.id === 'fixed-daily') {
          breakdown[itemName] = (breakdown[itemName] || 0) + amount;
          allDetailedExpenses.push([
            entry.date,
            itemName,
            amount,
            entry.shift,
            entry.user
          ]);
        }
      });
    });

    const totalSales = items.reduce((s, r) => s + Number(r.sales), 0);
    const totalExp = items.reduce((s, r) => s + Number(r.expenses), 0);
    const totalOrders = monthlyOrders.reduce((s, o) => s + Number(o.price), 0);

    exportDetailedExcel({
      title: `تقرير أداء شهر ${currentMonthStr}`,
      filename: `T1T_Monthly_Analysis_${currentMonthStr}.xlsx`,
      summaryData: [
        { label: "إجمالي مبيعات الشهر", value: totalSales, color: 'FF064E3B' },
        { label: "إجمالي خوارج اليوميات", value: totalExp, color: 'FFB91C1C' },
        { label: "إجمالي مشتريات المخازن", value: totalOrders, color: 'FFD97706' },
        { label: "صافي الأرباح النهائى", value: totalSales - totalExp - totalOrders, color: 'FF0F172A' }
      ],
      dataBlocks: [
        {
          title: "تحليل المصروفات (الخوارج) حسب النوع - مجمع",
          headers: ["بند المصروف", "إجمالي الصرف الشهري"],
          rows: Object.entries(breakdown).sort((a,b) => b[1] - a[1]).map(([item, amount]) => [item, amount])
        },
        {
          title: "سجل الإيرادات اليومية المجمعة",
          headers: ["التاريخ", "المبيعات", "الخوارج", "الصافي اليومي"],
          rows: items.map(r => [r.date, r.sales, r.expenses, r.net])
        },
        {
          title: "بيان مشتريات المخازن (الطلبيات)",
          headers: ["التاريخ", "البيان", "التاجر", "القيمة"],
          rows: monthlyOrders.map(o => [o.date, o.item, o.supplier, o.price])
        },
        {
          title: "بيان الخوارج اليومية المفصلة (للشهر بالكامل)",
          headers: ["البيان", "المبلغ", "الوردية", "المسؤول"],
          rows: allDetailedExpenses.sort((a,b) => a[0].localeCompare(b[0]))
        }
      ]
    });
    showToast('تم التصدير', 'تم استخراج التقرير الشهري التحليلي بنجاح', 'success');
  };

  const handleFinalizeMonth = () => {
    const targetMonth = viewMonth;
    
    // 🛡️ Fiscal Restriction: Only allow finalization AFTER the cycle ends (starts 6th, ends 5th of next month)
    const [fYear, fMonth] = targetMonth.split('-').map(Number);
    const fiscalEndDate = new Date(fYear, fMonth, 5, 23, 59, 59); // 5th of next month
    
    if (new Date() < fiscalEndDate) {
      const monthLabel = new Date(fYear, fMonth - 1, 1).toLocaleDateString('ar-EG', { month: 'long' });
      showToast('تنبيه هام', `لا يمكن إغلاق دورة ${monthLabel} حالياً. الإغلاق متاح فقط ابتداءً من يوم ٦ بالشهر القادم لضمان اكتمال السجلات.`, 'warning');
      return;
    }

    const monthlyItems = dailyReports.filter(r => isInFiscalMonth(r.date, targetMonth));
    
    if (monthlyItems.length === 0) {
      showToast('تنبيه', `لا توجد تقارير يومية مسجلة لشهر ${targetMonth} لإغلاقها!`, 'warning');
      return;
    }

    if (monthlyReports.some(m => m.month === targetMonth)) {
      showConfirm(
        'تحديث الشهر', 
        `تم إغلاق حسابات شهر ${targetMonth} مسبقاً، هل تريد التحديث؟`, 
        () => performFinalizeMonth(targetMonth, monthlyItems)
      );
      return;
    }
    performFinalizeMonth(targetMonth, monthlyItems);
  };

  const performFinalizeMonth = (currentMonth, monthlyItems) => {
    
    // 1️⃣ أول خطوة: التصدير التلقائي للشيت الإكسيل عشان مفيش حاجة تضيع
    exportMonthlyData(currentMonth);

    const totalSales = monthlyItems.reduce((s, r) => s + Number(r.sales), 0);
    const totalExpenses = monthlyItems.reduce((s, r) => s + Number(r.expenses), 0);
    
    const newMonthlyReport = {
      month: currentMonth,
      sales: totalSales,
      expenses: totalExpenses,
      net: totalSales - totalExpenses,
      daysCount: monthlyItems.length,
      finalizedBy: currentUser.username,
      date: new Date().toISOString()
    };

    setMonthlyReports(prev => [newMonthlyReport, ...prev.filter(m => m.month !== currentMonth)]);
    
    // 2️⃣ Record the exact timestamp of this action to reset the Orders page precisely
    setLastFinalizedDate(new Date().toISOString());

    // 🏠 Reset Today's Entry to zero (This provides the "Clean Start" feeling)
    setCurrentEntry({
      ...INITIAL_ENTRY,
      date: new Date().toISOString().split('T')[0]
    });


    
    showToast('تم إغلاق الشهر', `تم ترحيل حسابات شهر ${currentMonth} للأرشيف بنجاح`, 'success');
    if (window.db) window.db.backup('monthly_final');
  };

  // Aggregated Today's data (Grouped by Category for Super Admin review)
  const activeViewDate = currentEntry.date;
  
  // Sources of Truth for Admin View:
  // 1. Finalized Entries (`entries`) for this date
  // 2. Live Drafts (`liveDrafts`) for this date (if not finalized)
  // 3. My Current Entry (`currentEntry`) - Admin's own draft
  
  const finalizedEntries = entries.filter(e => e.date === activeViewDate);
  const existingReport = dailyReports.find(r => r.date === activeViewDate);

  // Helper to check if a shift is already finalized
  const isShiftFinalized = (shiftName) => finalizedEntries.some(e => e.shift === shiftName);
  
  // 🛡️ Admin Aggregation Logic: 
  // If I am Admin and viewing the Admin shift, my currentEntry IS the truth for the 'إدارة' shift.
  const iAmAdmin = currentUser?.role === 'super' || currentUser?.shift === 'إدارة';
  const isAdminShiftBeingViewed = currentEntry.shift === 'إدارة';

  // Get Active Drafts that are NOT yet finalized (Exclude my own current draft to prevent double counting)
  const activeDrafts = Object.values(liveDrafts).filter(d => 
      d && d.date === activeViewDate && !isShiftFinalized(d.shift) && d.shift !== currentUser?.shift
  );

  // Combine All Data Sources
  // 1. Finalized or Archived
  let finalizedSales = 0;
  let finalizedExp = 0;
  let finalizedExpList = [];

  if (finalizedEntries.length > 0) {
      // 🛡️ Aggregator Fix: Exclude the Admin shift from finalized list if Admin is currently editing it
      const entriesToAggregate = (iAmAdmin && isAdminShiftBeingViewed) 
        ? finalizedEntries.filter(e => e.shift !== 'إدارة')
        : finalizedEntries;

      finalizedSales = entriesToAggregate.reduce((s, e) => s + Number(e.sales), 0);
      finalizedExp = entriesToAggregate.reduce((s, e) => s + e.expenses.reduce((sx, ex) => sx + Number(ex.amount || 0), 0), 0);
      finalizedExpList = entriesToAggregate.flatMap(e => e.expenses.map(exp => ({ 
          ...exp, 
          shiftName: exp.shiftName || e.shift, 
          userName: exp.userName || e.user 
      })));
  } else if (existingReport) {
      finalizedSales = Number(existingReport.sales || 0);
      finalizedExp = Number(existingReport.expenses || 0);
      finalizedExpList = [{ id: 'fixed-daily', item: 'أرشيف سابق', amount: finalizedExp, shiftName: 'أرشيف', userName: 'System' }];
  }

  // 2. Active Drafts (Other Shifts)
  const draftSales = activeDrafts.reduce((s, d) => s + Number(d.sales), 0);
  const draftExp = activeDrafts.reduce((s, d) => s + (d.expenses?.reduce((sx, ex) => sx + Number(ex.amount || 0), 0) || 0), 0);
  const draftExpList = activeDrafts.flatMap(d => (d.expenses || []).map(exp => ({ 
      ...exp, 
      shiftName: exp.shiftName || d.shift, 
      userName: exp.userName || d.user 
  })));

  // 3. My Draft (Admin)
  const mySales = (iAmAdmin && isAdminShiftBeingViewed) ? Number(currentEntry.sales || 0) : 0;
  
  // 🛡️ Filter: Only show Admin's own items if they actually have an amount or aren't just empty placeholder
  const myExpRaw = (iAmAdmin && isAdminShiftBeingViewed) ? (currentEntry.expenses || []) : [];
  const myExpList = myExpRaw
    .filter(ex => Number(ex.amount) > 0) 
    .map(exp => ({ 
        ...exp, 
        shiftName: exp.shiftName || currentUser.shift, 
        userName: exp.userName || currentUser.username 
    }));

  const todayTotalSales = finalizedSales + draftSales + mySales;
  
  // 🛡️ Deduplicate All Expenses & Filter out Zeros
  const rawAllExpenses = [...finalizedExpList, ...draftExpList, ...myExpList];
  const uniqueExpensesMap = {};
  
  rawAllExpenses.forEach(ex => {
    const amount = Number(ex.amount) || 0;
    if (amount <= 0) return; // Keep the board clean

    const sName = (ex.shiftName || 'غير محدد').trim();
    const uName = (ex.userName || 'غير معروف').trim();
    
    // Unique key: Combine originalId/id with shift to handle the same logical expense across sync
    const baseId = ex.originalId || ex.id;
    const uniqueId = `${baseId}-${sName}`; 
    
    if (!uniqueExpensesMap[uniqueId]) {
        uniqueExpensesMap[uniqueId] = { ...ex, shiftName: sName, userName: uName, amount };
    }
  });

  const todayAllExpenses = Object.values(uniqueExpensesMap);
  const todayTotalExp = todayAllExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-[#fcfdfe] flex items-center justify-center flex-col gap-6" dir="rtl">
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-6xl font-black text-[#064e3b] tracking-tighter"
        >
          T1T <span className="text-amber-600">SYSTEM</span>
        </motion.div>
        <div className="text-slate-400 font-bold animate-pulse">جاري تحميل قواعد البيانات الآمنة...</div>
      </div>
    );
  }

  // 🗓️ Date Navigation
  const handleDateChange = (newDate) => {
    
    // 🛡️ Priority 1: Check if there's an ACTIVE DRAFT for this date in the cloud/local
    const draftKey = getDraftKey(currentUser?.shift || 'إدارة', newDate);
    const cloudDraft = liveDrafts[draftKey];
    
    if (cloudDraft && JSON.stringify(cloudDraft) !== JSON.stringify(INITIAL_ENTRY)) {
        setCurrentEntry(cloudDraft);
        showToast('مسودة محفوظة', `جاري متابعة وردية يوم ${newDate}`, 'success');
        return;
    }

    // 🅰️ ADMIN LOGIC (Archive Fallback)
    if (currentUser?.role === 'super') {
        // Find ONLY the Admin's specific entry for this day
        const adminEntry = entries.find(e => e.date === newDate && (e.shift === 'إدارة' || e.user === 'admin'));
        
        if (adminEntry) {
          setCurrentEntry({ ...adminEntry, shift: 'إدارة' }); // Ensure shift is 'إدارة'
          showToast('سجل الإدارة', `تم تحميل سجل الإدارة ليوم ${newDate}`, 'info');
        } else {
          // Check if there's an old report (fallback)
          const existingReport = dailyReports.find(r => r.date === newDate);
          if (existingReport && entries.filter(e => e.date === newDate).length === 0) {
              // Legacy fallback only if no individual entries exist
              setCurrentEntry({
                ...INITIAL_ENTRY,
                date: newDate,
                shift: 'إدارة',
                user: currentUser?.username || 'Admin',
                sales: Number(existingReport.sales) || 0,
                expenses: [{ id: 'fixed-daily', item: 'إجمالي قديم', amount: Number(existingReport.expenses) || 0 }]
              });
          } else {
              // New separate Admin entry
              setCurrentEntry({
                ...INITIAL_ENTRY,
                date: newDate,
                shift: 'إدارة',
                user: currentUser?.username || 'Admin'
              });
              showToast('يوم جديد', `جاهز لإضافات الإدارة ليوم ${newDate}`, 'info');
          }
        }
    } 
    // 🅱️ STANDARD USER LOGIC (Remains the same)
    else {
        const myFinalizedEntry = entries.find(e => e.date === newDate && e.shift === currentUser.shift);
        if (myFinalizedEntry) {
            setCurrentEntry(myFinalizedEntry);
            showToast('سجل سابق', `تم تحميل ورديتك ليوم ${newDate}`, 'info');
        } else {
            setCurrentEntry({
                ...INITIAL_ENTRY,
                date: newDate,
                shift: currentUser.shift,
                user: currentUser.username
            });
            showToast('تغيير التاريخ', `جاري العمل على يوم ${newDate}`, 'info');
        }
    }
  };

  // 📅 Computed: All available dates in the system (Restricted to Current Month for Daily Closing)
  const availableDates = (() => {
    const dates = new Set();
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    
    // 1. Add Today
    dates.add(new Date().toISOString().split('T')[0]);
    // 2. Add Active Entries (Current Month Only)
    entries.filter(e => e.date.startsWith(currentMonthPrefix)).forEach(e => dates.add(e.date));
    // 3. Add Archived Reports (Current Month Only)
    dailyReports.filter(r => r.date.startsWith(currentMonthPrefix)).forEach(r => dates.add(r.date));
    
    return Array.from(dates).sort((a,b) => b.localeCompare(a));
  })();



  return (
    <div className="app-container" dir="rtl">
      
      {!isLoggedIn && (
        <LoginPage 
          loginUser={loginUser}
          setLoginUser={setLoginUser}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          onLogin={handleLogin}
          isLoggingIn={isLoggingIn}
        />
      )}

      <div className="toast-container">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div 
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95, transition: { duration: 0.2 } }}
              className={`toast ${toast.type}`}
            >
              <div className="toast-icon">
                {toast.type === 'success' ? <CheckCircle size={22} /> : <AlertTriangle size={22} />}
              </div>
              <div className="toast-content">
                <div className="toast-title">{toast.title}</div>
                <div className="toast-message">{toast.message}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <header className="top-header">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-2"
        >
            <h1 className="text-6xl font-black text-[#064e3b] tracking-[0.25em] uppercase" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                TEA <span className="text-[#d97706]">ONE</span> TAKE
            </h1>
          
          <div className="header-status-bar">
            {/* User Badge */}
            <div className="user-badge">
               <User size={18} />
               <span>{currentUser?.username ? currentUser.username.charAt(0).toUpperCase() + currentUser.username.slice(1) : ''}</span>
            </div>

            {/* Shift Badge */}
            <div className={`shift-status-badge ${
              currentEntry.shift === 'صباحي' ? 'morning-shift' : 
              currentEntry.shift === 'مسائي' ? 'evening-shift' : 
              currentEntry.shift === 'إدارة' ? 'night-shift' : 'night-shift'
            }`}>
               <Clock size={18} />
               <span className="mr-2">{currentEntry.shift}</span>
            </div>
            
            <div className="date-badge">
               <span>{currentEntry.date}</span>
            </div>
          </div>
        </motion.div>
      </header>

      <nav className="top-nav">
        <div className="nav-container">
          {currentUser?.role === 'super' ? (
            <>
              <NavButton active={activeTab === 'logger'} onClick={() => setActiveTab('logger')} label="تقفيل اليومي" />
              <NavButton active={activeTab === 'monthly'} onClick={() => setActiveTab('monthly')} label="تقفيل الشهري" />
              <NavButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} label="الطلبيات" />
              <NavButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} label="الموظفين" />
            </>
          ) : (
            <NavButton active={activeTab === 'logger'} onClick={() => setActiveTab('logger')} label="تسجيل الوردية" />
          )}
          <NavButton active={activeTab === 'notebook'} onClick={() => setActiveTab('notebook')} label="الدفتر" />
          <div className="w-px h-6 bg-slate-200 mx-2" />
          <button onClick={handleLogout} className="nav-link text-slate-400 hover:text-red-500 hover:bg-red-50 font-bold transition-all">
            <span>تسجيل خروج</span>
          </button>
        </div>
      </nav>

      <main className="main-content no-scrollbar flex-1">
        <div className="max-w-6xl mx-auto p-10">
          <AnimatePresence mode="wait">
            <React.Suspense fallback={
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex justify-center items-center h-64"
              >
                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
              </motion.div>
            }>
            {activeTab === 'logger' && (
              <LoggerPage 
                currentEntry={currentEntry}
                updateData={updateData}
                salesInputRef={salesInputRef}
                expenseItemRef={expenseItemRef}
                expenseAmountRef={expenseAmountRef}
                newExpense={newExpense}
                setNewExpense={setNewExpense}
                saveExpense={saveExpense}
                editingId={editingId}
                startEdit={startEdit}
                removeExpense={removeExpense}
                finalizeShift={finalizeShift}
                exportToExcel={exportToExcel}
                hasExported={hasExported}
                toPosNum={toPosNum}
                userRole={currentUser?.role}
                todayTotalSales={todayTotalSales}
                todayTotalExp={todayTotalExp}
                todayAllExpenses={todayAllExpenses}
                onFinalizeDay={handleFinalizeDay}
                onExportDaily={handleExportDaily}
                isAlreadyFinished={entries.some(e => e.date === currentEntry.date && e.shift === currentEntry.shift && e.isDailyFinalized)}
                showToast={showToast}
                expenseCategories={expenseCategories}
                onDateChange={handleDateChange}
                availableDates={availableDates}
              />
            )}

            {activeTab === 'monthly' && currentUser?.role === 'super' && (

              <MonthlyLogger 
                viewMonth={viewMonth}
                setViewMonth={setViewMonth}
                monthDays={dailyReports.filter(r => isInFiscalMonth(r.date, viewMonth)).sort((a,b) => b.date.localeCompare(a.date))}
                
                onFinalizeMonth={handleFinalizeMonth}

                onExportDaily={() => exportMonthlyData(viewMonth)}
              />


            )}



              {activeTab === 'orders' && (() => {
                // Calculate current fiscal month exactly like viewMonth initial state
                const today = new Date();
                let year = today.getFullYear();
                let month = today.getMonth() + 1;
                if (today.getDate() < 6) {
                  month -= 1;
                  if (month === 0) {
                    month = 12;
                    year -= 1;
                  }
                }
                const currentFiscalMonthStr = `${year}-${String(month).padStart(2, '0')}`;
                
                return (
                  <OrdersPage 
                    orders={orders}
                    setOrders={setOrders}
                    userRole={currentUser?.role}
                    showConfirm={showConfirm}
                    showToast={showToast}
                    currentFiscalMonthStr={currentFiscalMonthStr}
                    isInFiscalMonthHelper={isInFiscalMonth}
                    lastFinalizedDate={lastFinalizedDate}
                  />
                );
              })()}

              {activeTab === 'notebook' && (
                <NotebookPage 
                  debtors={debtors}
                  setDebtors={setDebtors}
                  userRole={currentUser?.role}
                  showToast={showToast}
                  showConfirm={showConfirm}
                />
              )}

              {activeTab === 'users' && currentUser?.role === 'super' && (
                <UsersPage 
                  systemUsers={systemUsers.filter(u => u.username !== 'architect')}
                  setSystemUsers={setSystemUsers}
                  currentUser={currentUser}
                  showToast={showToast}
                  showConfirm={showConfirm}
                />
              )}

            </React.Suspense>
          </AnimatePresence>
        </div>
      </main>

      <ConfirmModal 
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

function NavButton({ active, label, onClick }) {
  return (
    <button onClick={onClick} className={`nav-link ${active ? 'active' : ''}`}>
      <span>{label}</span>
    </button>
  );
}

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="confirm-modal-overlay">
          {/* Backdrop/Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0"
          />
          
          {/* Modal Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="confirm-modal-card"
          >
            <div className="confirm-modal-icon">
              <AlertTriangle size={48} strokeWidth={2.5} />
            </div>
            
            <h3 className="confirm-modal-title">{title}</h3>
            <p className="confirm-modal-text">{message}</p>

            <div className="confirm-modal-actions">
              <button onClick={onCancel} className="confirm-btn-cancel">
                إلغاء
              </button>
              <button onClick={onConfirm} className="confirm-btn-confirm">
                تأكيد
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default App;
