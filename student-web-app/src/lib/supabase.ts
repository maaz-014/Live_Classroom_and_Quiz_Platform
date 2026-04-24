//By setting this up once in a lib folder,
//you won't have to keep writing out those long URL and Key variables
//every single time you want to talk to your database.
// Whenever you need to fetch students, quizzes, or classes in the future
//, you can just import this single supabase tool into whatever page you are working on! 
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)