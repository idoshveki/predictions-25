/*
  # Initial Schema for Predictions App

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key) - matches auth.users.id
      - `username` (text, unique)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `predictions`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, references profiles.id)
      - `recipient_id` (uuid, references profiles.id)
      - `message` (text)
      - `scheduled_for` (timestamp)
      - `delivered_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) NOT NULL,
  recipient_id uuid REFERENCES profiles(id) NOT NULL,
  message text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Predictions policies
CREATE POLICY "Users can create predictions"
  ON predictions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can read predictions they sent or received"
  ON predictions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sender_id OR 
    (auth.uid() = recipient_id AND delivered_at IS NOT NULL)
  );

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_predictions_updated_at
  BEFORE UPDATE ON predictions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to handle prediction delivery
CREATE OR REPLACE FUNCTION deliver_prediction()
RETURNS trigger AS $$
BEGIN
  IF NEW.scheduled_for <= now() AND OLD.delivered_at IS NULL THEN
    NEW.delivered_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for prediction delivery
CREATE TRIGGER check_prediction_delivery
  BEFORE UPDATE ON predictions
  FOR EACH ROW
  EXECUTE FUNCTION deliver_prediction();