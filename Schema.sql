CREATE TYPE user_role AS ENUM ('teacher', 'student');
CREATE TYPE session_status AS ENUM ('lobby', 'in_progress', 'completed');

-- users Table (Extends the hidden auth.users table)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'student',
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
