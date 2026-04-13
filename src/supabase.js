import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bqciggzshqdychtgongv.supabase.co'
const supabaseKey = 'sb_publishable_c6kaD77-nCUbmhlIxfFeOA_2f9c2BKg'

export const supabase = createClient(supabaseUrl, supabaseKey)