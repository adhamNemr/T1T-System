import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ryfwovwgtpvaxnuxxuzu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5ZndvdndndHB2YXhudXh4dXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTg0NDMsImV4cCI6MjA4MzM3NDQ0M30.J3pSeGpVe8Uryndf00xLQRV7KY49wlFQTdTuS_Ala40';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCurrentState() {
  console.log('🔍 Checking Live Database State...');

  const { data, error } = await supabase
    .from('t1t_system_data')
    .select('*')
    .eq('key', 't1t_currentEntry')
    .single();

  if (error) {
    console.error('❌ Error fetching currentEntry:', error.message);
    return;
  }

  const entry = data.value;
  if (!entry) {
    console.log('⚠️ t1t_currentEntry is NULL or EMPTY in the cloud.');
  } else {
    console.log('✅ Current Active Entry in Cloud:');
    console.log(`User: ${entry.user}`);
    console.log(`Shift: ${entry.shift}`);
    console.log(`Sales: ${entry.sales}`);
    console.log(`Last Updated (approx): ${new Date(data.updated_at).toLocaleString()}`);
    console.log('Expenses:', JSON.stringify(entry.expenses, null, 2));
  }
}

checkCurrentState();
