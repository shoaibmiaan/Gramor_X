'use client';

     import { useState, useEffect } from 'react';
     import { supabase } from '@/lib/supabaseClient'; // Replaced supabaseBrowser

     export default function TeacherProfile() {
       const [user, setUser] = useState<{ id: string; email: string } | null>(null);
       const [loading, setLoading] = useState(true);
       const [error, setError] = useState<string | null>(null);

       useEffect(() => {
         let mounted = true;

         const fetchUser = async () => {
           try {
             const { data: { user }, error } = await supabase.auth.getUser();
             if (error) throw error;
             if (mounted) {
               setUser(user ? { id: user.id, email: user.email ?? '' } : null);
             }
           } catch (err) {
             if (mounted) setError(err.message || 'Failed to fetch user');
           } finally {
             if (mounted) setLoading(false);
           }
         };

         fetchUser();

         return () => {
           mounted = false;
         };
       }, []);

       if (loading) return <div>Loading...</div>;
       if (error) return <div>Error: {error}</div>;

       return (
         <div>
           <h1>Teacher Profile</h1>
           {user ? (
             <>
               <p>ID: {user.id}</p>
               <p>Email: {user.email}</p>
             </>
           ) : (
             <p>No user data available</p>
           )}
         </div>
       );
     }