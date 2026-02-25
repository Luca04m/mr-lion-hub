import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://amxgmjvxsmggffsmvlbu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFteGdtanZ4c21nZ2Zmc212bGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTk5ODksImV4cCI6MjA4NzU5NTk4OX0.KrA9KbjgjMukmT3G2491idjFgiEoGsieY03EcgCoTY4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const isSupabaseEnabled = true;
