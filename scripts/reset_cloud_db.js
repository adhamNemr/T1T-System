import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ryfwovwgtpvaxnuxxuzu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5ZndvdndndHB2YXhudXh4dXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTg0NDMsImV4cCI6MjA4MzM3NDQ0M30.J3pSeGpVe8Uryndf00xLQRV7KY49wlFQTdTuS_Ala40';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function resetDatabase() {
  console.log('🔄 Starting Database Reset (Preserving Users)...');

  const keysToReset = [
    't1t_records', 
    't1t_daily_reports', 
    't1t_monthly_reports', 
    't1t_orders', 
    't1t_debtors', 
    't1t_currentEntry',
    't1t_activeTab'
  ];

  for (const key of keysToReset) {
    console.log(`🧹 Clearing ${key}...`);
    // Depending on the RLS, we either update with empty array or delete
    // Using upsert with default empty values is safer to maintain the schema
    const defaultValue = (key === 't1t_activeTab') ? 'logger' : (key === 't1t_currentEntry' ? null : []);
    
    const { error } = await supabase
      .from('t1t_system_data')
      .upsert({ key, value: defaultValue }, { onConflict: 'key' });

    if (error) {
      console.error(`❌ Error resetting ${key}:`, error.message);
    } else {
      console.log(`✅ ${key} has been reset.`);
    }
  }

  console.log('\n✨ Database is now clean! Only users and passwords remain.');
}

resetDatabase();
