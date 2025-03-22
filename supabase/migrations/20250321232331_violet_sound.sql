/*
  # Add function to get total predictions count
  
  Creates a function that bypasses RLS to get the total count of predictions
  for debugging purposes.
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