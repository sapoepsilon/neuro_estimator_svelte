-- Function to get user projects without triggering RLS recursion
CREATE OR REPLACE FUNCTION get_user_projects(user_id_param UUID)
RETURNS SETOF jsonb AS 23778
BEGIN
  RETURN QUERY
  SELECT 
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'created_at', p.created_at,
      'business', jsonb_build_object(
        'id', b.id,
        'name', b.name
      )
    )
  FROM 
    projects p
    JOIN businesses b ON p.business_id = b.id
    JOIN business_users bu ON b.id = bu.business_id
  WHERE 
    bu.user_id = user_id_param;
END;
23778 LANGUAGE plpgsql SECURITY DEFINER;
