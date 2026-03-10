import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ryfwovwgtpvaxnuxxuzu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5ZndvdndndHB2YXhudXh4dXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTg0NDMsImV4cCI6MjA4MzM3NDQ0M30.J3pSeGpVe8Uryndf00xLQRV7KY49wlFQTdTuS_Ala40';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDay6() {
  console.log('🔍 Fetching records for 2026-02-06...');

  const { data, error } = await supabase
    .from('t1t_system_data')
    .select('*')
    .eq('key', 't1t_records')
    .single();

  if (error) {
    console.error('❌ Error fetching records:', error.message);
    return;
  }

  const allRecords = data.value || [];
  // Filter for Feb 6th, 2026
  const targetDate = '2026-02-06';
  
  const dayRecords = allRecords.filter(r => r.date === targetDate);

  if (dayRecords.length === 0) {
    console.log(`⚠️ No finalized records found for ${targetDate}.`);
  } else {
    console.log(`✅ Found ${dayRecords.length} records for ${targetDate}:\n`);
    dayRecords.forEach((r, i) => {
      console.log(`--- Record #${i + 1} ---`);
      console.log(`User: ${r.user} (${r.shift})`);
      console.log(`Sales: ${r.sales}`);
      console.log(`Expense Items (Total: ${r.expenses.reduce((s, e) => s + Number(e.amount||0), 0)}):`);
      r.expenses.forEach(e => {
          if(e.amount) console.log(`  - [${e.shiftName || 'N/A'} - ${e.userName || 'N/A'}] ${e.item}: ${e.amount}`);
      });
      console.log('------------------\n');
    });
  }
}

checkDay6();
