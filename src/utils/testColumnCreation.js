import { supabase } from '$lib/supabase';
import { user } from '../stores/authStore';
import { get } from 'svelte/store';

// Function to test adding a column to the custom_columns table
export async function testAddColumn(businessId) {
  if (!businessId) {
    console.error('No business ID provided');
    return null;
  }
  
  try {
    console.log('Testing column creation for business ID:', businessId);
    
    // Get current user ID from the store
    const currentUser = get(user);
    const userId = currentUser?.id;
    console.log('Current user ID:', userId);
    
    // Create a test column
    const testColumn = {
      business_id: businessId,
      column_key: `test_column_${Date.now()}`,
      display_name: 'Test Column',
      column_type: 'text',
      is_required: false,
      default_value: null,
      options: null,
      ui_settings: {
        width: 150,
        minSize: 80,
        maxSize: 300,
        sortable: true,
        filter: true
      },
      created_by: userId
    };
    
    console.log('Inserting test column:', testColumn);
    
    // Insert the test column
    const { data, error } = await supabase
      .from('custom_columns')
      .insert(testColumn)
      .select();
    
    if (error) {
      console.error('Error creating test column:', error);
      return null;
    }
    
    console.log('Test column created successfully:', data);
    return data[0];
  } catch (error) {
    console.error('Exception in testAddColumn:', error);
    return null;
  }
}
