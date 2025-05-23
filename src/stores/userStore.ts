import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';
import { toast } from 'svelte-sonner';
import { user } from './authStore';

export const businessId = writable<string | null>(null);

interface User {
  id: string;
  email?: string;
  [key: string]: any; 
}

/**
 * Gets the business ID for the current user and sets it in the store
 * @returns {Promise<string|null>} The business ID or null if an error occurred
 */
export async function getBusinessId(): Promise<string | null> {
  try {
    let currentUser: User | null = null;
    const unsubscribe = user.subscribe(value => {
      currentUser = value as User | null;
    });
    unsubscribe();
    
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('business_users')
      .select('business_id')
      .eq('user_id', currentUser.id)
      .single();
    
    if (error) throw error;
    
    const id = data.business_id;
    businessId.set(id);
    
    return id;
  } catch (error) {
    console.error('Error getting business ID:', error);
    toast.error('Failed to get business information');
    return null;
  }
}
