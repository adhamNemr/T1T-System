import React from 'react';
import { formatAmount } from '../utils/numberUtils';

export const SummaryCard = ({ title, value, color, highlight, editable, onChange, inputRef, onKeyDown }) => {
  return (
    <div className={`stat-card ${highlight ? 'ring-4 ring-[#064e3b]/10' : ''}`}>
       <div className={`stat-card-header ${color}`}>
          <span>{title}</span>
       </div>
       <div className="stat-card-body">
          {editable ? (
            <input 
              ref={inputRef}
              type="text" 
              inputMode="decimal"
              value={formatAmount(value)} 
              onChange={(e) => onChange(e.target.value)} 
              onKeyDown={onKeyDown}
              className="card-input" 
              placeholder="0.00" 
            />
          ) : (
            <div className="card-input select-none cursor-default bg-slate-50/50">
              {formatAmount(value) || 0}
            </div>
          )}
       </div>
    </div>
  );
};
