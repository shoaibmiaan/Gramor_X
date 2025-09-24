import { supabaseBrowser } from './supabaseBrowser';

export const getUserRole = async (userId: string) => {
  const { data, error } = await supabaseBrowser
    .from('profiles') // Assuming you store user roles in the profiles table
    .select('role')
    .eq('id', userId) // Use the user's ID to query their role
    .single(); // We expect only one result

  if (error) {
    console.error('Error fetching role:', error.message);
    return null;
  }
  return data?.role; // Return the role
};
