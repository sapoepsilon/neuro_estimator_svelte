-- Create the custom_columns table
CREATE TABLE IF NOT EXISTS custom_columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL,
  column_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  column_type TEXT NOT NULL CHECK (column_type IN ('text', 'number')),
  is_required BOOLEAN DEFAULT false,
  default_value TEXT,
  options JSONB,
  ui_settings JSONB,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Composite unique constraint to ensure no duplicate column keys per business
  UNIQUE (business_id, column_key)
);

-- Add RLS policies
ALTER TABLE custom_columns ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to select their business's columns
CREATE POLICY "Users can view their business columns" 
  ON custom_columns 
  FOR SELECT 
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- Create policy to allow users to insert columns for their business
CREATE POLICY "Users can insert columns for their business" 
  ON custom_columns 
  FOR INSERT 
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- Create policy to allow users to update columns for their business
CREATE POLICY "Users can update their business columns" 
  ON custom_columns 
  FOR UPDATE 
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- Create policy to allow users to delete columns for their business
CREATE POLICY "Users can delete their business columns" 
  ON custom_columns 
  FOR DELETE 
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- Create index on business_id for faster queries
CREATE INDEX IF NOT EXISTS custom_columns_business_id_idx ON custom_columns (business_id);
