/*
  # Fix RLS policies for profiles table

  1. Changes
    - Add RLS policies for profiles table to allow users to:
      - Insert their own profile
      - Read all profiles
      - Update their own profile

  2. Security
    - Enable RLS on profiles table
    - Add appropriate policies for CRUD operations
*/

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for profiles
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create new policies for profiles
CREATE POLICY "Users can read all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);