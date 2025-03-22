/*
  # Fix predictions data integrity

  1. Changes
    - Add foreign key constraint to ensure sender_id exists in profiles
    - Add NOT NULL constraint to sender_id and recipient_id
    - Add RLS policy to allow reading joined profile data
    - Clean up any orphaned records
    
  2. Security
    - Update RLS policies to handle joins correctly
*/

-- First, clean up any predictions with invalid sender_id or recipient_id
DELETE FROM predictions
WHERE sender_id NOT IN (SELECT id FROM profiles)
OR recipient_id NOT IN (SELECT id FROM profiles);

-- Add NOT NULL constraints if not already present
ALTER TABLE predictions 
  ALTER COLUMN sender_id SET NOT NULL,
  ALTER COLUMN recipient_id SET NOT NULL;

-- Ensure foreign key constraints exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'predictions_sender_id_fkey'
  ) THEN
    ALTER TABLE predictions
      ADD CONSTRAINT predictions_sender_id_fkey 
      FOREIGN KEY (sender_id) 
      REFERENCES profiles(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'predictions_recipient_id_fkey'
  ) THEN
    ALTER TABLE predictions
      ADD CONSTRAINT predictions_recipient_id_fkey 
      FOREIGN KEY (recipient_id) 
      REFERENCES profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Update RLS policies to handle joins
DROP POLICY IF EXISTS "Users can read received predictions" ON predictions;
CREATE POLICY "Users can read received predictions and sender profiles"
  ON predictions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = recipient_id
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = predictions.sender_id
    )
  );

-- Ensure RLS is enabled
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;