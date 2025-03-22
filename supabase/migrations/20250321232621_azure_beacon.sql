/*
  # Add function to get total predictions count
  
  Creates a function that bypasses RLS to get the total count of predictions
  for debugging purposes.

  1. Changes
    - Creates a new function `get_total_predictions_count()`
    - Function runs with SECURITY DEFINER to bypass RLS
    - Returns total count of predictions in the database

  2. Security
    - Sets search_path to prevent search_path attacks
    - Uses SECURITY DEFINER to run with elevated privileges
*/

CREATE OR REPLACE FUNCTION get_total_predictions_count()
RETURNS integer
SECURITY DEFINER -- This makes the function run with the privileges of the creator
SET search_path = public -- This prevents search_path attacks
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM predictions);
END;
$$;