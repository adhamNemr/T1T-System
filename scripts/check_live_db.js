import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ryfwovwgtpvaxnuxxuzu.supabase.co';
const supabaseKey = 'sb_publishable_wEkKV3fSNAfv8olDscbI-Q_4nDb45af';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkState() {
    console.log("Fetching live DB state for day 14...");
    const { data, error } = await supabase
      .from('t1t_system_data')
      .select('key, value')
      .in('key', ['t1t_records', 't1t_daily_reports']);

    if (error) {
        console.error("DB Error:", error);
        return;
    }

    const entriesObj = data.find(r => r.key === 't1t_records').value;
    const reportsObj = data.find(r => r.key === 't1t_daily_reports').value;

    const entries = typeof entriesObj === 'string' ? JSON.parse(entriesObj) : entriesObj;
    const reports = typeof reportsObj === 'string' ? JSON.parse(reportsObj) : reportsObj;

    const day14Entries = entries.filter(e => e.date === '2026-03-14');
    console.log(`\n--- ALL SHIFTS FOR 2026-03-14 ---`);
    console.log(JSON.stringify(day14Entries, null, 2));

    const day14Report = reports.filter(r => r.date === '2026-03-14');
    console.log(`\n--- FINAL MONTHLY REPORT FOR 2026-03-14 ---`);
    console.log(JSON.stringify(day14Report, null, 2));

}

checkState();
