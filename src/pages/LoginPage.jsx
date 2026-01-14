import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { normalizeInput } from '../utils/numberUtils';

export const LoginPage = ({ loginUser, setLoginUser, loginPassword, setLoginPassword, onLogin, isLoggingIn }) => {
  const passwordRef = useRef(null);

  return (
    <div className="login-screen">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="login-card"
      >
        <div className="logo-container">
          <img 
            src="./assets/logo.png" 
            alt="TAKE ONE TEA Logo" 
            className="login-logo-img"
            onError={(e) => {
              // Fallback if the path is slightly different in Electron build
              e.target.src = 'assets/logo.png';
            }}
          />
        </div>
        <p className="login-subtitle">Management System Login</p>
        
        <div className="login-input-group">
          <label>اسم المستخدم</label>
          <input 
            type="text" 
            className="login-field" 
            placeholder="...أدخل اسم المستخدم"
            value={loginUser}
            disabled={isLoggingIn}
            dir="ltr"
            onChange={(e) => {
              const normalized = normalizeInput(e.target.value);
              const val = normalized.replace(/[^a-zA-Z0-9_]/g, '');
              setLoginUser(val.toLowerCase());
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') passwordRef.current?.focus();
            }}
          />
        </div>

        <div className="login-input-group">
          <label>كلمة المرور</label>
          <input 
            ref={passwordRef}
            type="password" 
            className="login-field" 
            placeholder="••••••••"
            value={loginPassword}
            disabled={isLoggingIn}
            onChange={(e) => {
              const normalized = normalizeInput(e.target.value);
              const filtered = normalized.replace(/[^a-zA-Z0-9]/g, '');
              setLoginPassword(filtered);
            }}
            onKeyDown={(e) => e.key === 'Enter' && onLogin()}
          />
        </div>

        <button 
          onClick={onLogin} 
          disabled={isLoggingIn}
          className={`login-submit-btn ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
           {isLoggingIn ? 'جاري التحقق...' : 'دخول للنظام'}
        </button>
      </motion.div>
    </div>
  );
};
