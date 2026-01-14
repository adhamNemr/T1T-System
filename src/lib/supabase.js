import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ryfwovwgtpvaxnuxxuzu.supabase.co';
const supabaseAnonKey = 'sb_publishable_wEkKV3fSNAfv8olDscbI-Q_4nDb45af'; // Note: Ensure this is the Supabase Anon Key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
