import { createClient } from '@supabase/supabase-js'

// Recuperiamo le chiavi in modo sicuro
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Inizializziamo il client solo se le chiavi esistono
export const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

if (!supabase) {
    console.error("ERRORE: Chiavi Supabase mancanti in .env.local!");
}