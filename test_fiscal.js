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
console.log('2026-03-06 in 2026-03?', isInFiscalMonth('2026-03-06', '2026-03'));
console.log('2026-03-14 in 2026-03?', isInFiscalMonth('2026-03-14', '2026-03'));
console.log('2026-03-05 in 2026-03?', isInFiscalMonth('2026-03-05', '2026-03'));
console.log('2026-03-05 in 2026-02?', isInFiscalMonth('2026-03-05', '2026-02'));
