/*
  # Fix RLS policies for predictions table

  1. Changes
    - Adds RLS policy for recipients to read their predictions
    - Updates existing policies to be more specific
    - Ensures proper access control for both senders and recipients

  2. Security
    - Maintains RLS enabled
    - Adds specific policies for different access patterns
    - Ensures users can only access their own data
*/

-- First, enable RLS if not already enabled
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can create predictions" ON predictions;
DROP POLICY IF EXISTS "Users can read predictions they sent or received" ON predictions;

-- Create new, more specific policies
CREATE POLICY "Users can create predictions"
ON predictions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can read sent predictions"
ON predictions
FOR SELECT
TO authenticated
USING (auth.uid() = sender_id);

CREATE POLICY "Users can read received predictions"
ON predictions
FOR SELECT
TO authenticated
USING (auth.uid() = recipient_id);