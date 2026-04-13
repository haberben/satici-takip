import { createClient } from '@supabase/supabase-js';

// Supabase bilgileri (Kullanıcının .env dosyasına gireceği değerler)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xxxxxxx.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'xxxxxxx';

export const supabase = createClient(supabaseUrl, supabaseKey);
