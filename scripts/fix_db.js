import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ryfwovwgtpvaxnuxxuzu.supabase.co';
const supabaseKey = 'sb_publishable_wEkKV3fSNAfv8olDscbI-Q_4nDb45af';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDays() {
    console.log("Fixing daily reports for 9 and 14...");
    
    const { data: recordsData } = await supabase.from('t1t_system_data').select('value').eq('key', 't1t_records').single();
    const { data: reportsData } = await supabase.from('t1t_system_data').select('value').eq('key', 't1t_daily_reports').single();
    
    let entries = typeof recordsData.value === 'string' ? JSON.parse(recordsData.value) : recordsData.value;
    let reports = typeof reportsData.value === 'string' ? JSON.parse(reportsData.value) : reportsData.value;

    const datesToFix = ['2026-03-09', '2026-03-14'];

    datesToFix.forEach(targetDate => {
        const targetEntries = entries.filter(e => e.date === targetDate);
        if (targetEntries.length > 0) {
            const totalSales = targetEntries.reduce((s, e) => s + Number(e.sales), 0);
            const totalExpenses = targetEntries.reduce((s, e) => s + e.expenses.reduce((sx, ex) => sx + Number(ex.amount || 0), 0), 0);
            
            console.log(`Recalculated ${targetDate}: Sales: ${totalSales}, Expenses: ${totalExpenses}`);

            reports = reports.map(r => {
                if (r.date === targetDate) {
                    return {
                        ...r,
                        sales: totalSales,
                        expenses: totalExpenses,
                        net: totalSales - totalExpenses,
                        updatedAt: new Date().toISOString()
                    };
                }
                return r;
            });
        }
    });

    await supabase.from('t1t_system_data').upsert({ key: 't1t_daily_reports', value: reports }, { onConflict: 'key' });
    console.log("Fix deployed to database successfully!");
}

fixDays();
