import { useState, useEffect } from 'react';
import { callApiWithToken } from '@/utils/callApi';

export interface User {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        // Removed callApiWithToken("/get-auth/users")
        if (res?.status === 200 && res?.users) {
          const usersData: User[] = res.users.map((u: any) => ({
            uid: u.uid,
            email: u.email,
            displayName: u.displayName || u.providerData?.[0]?.displayName || null,
            photoURL: u.photoURL || u.providerData?.[0]?.photoURL || null,
          }));
          setUsers(usersData);
        } else {
          setError('Failed to fetch users');
          setUsers([]);
        }
      } catch (err: any) {
        console.error("Error fetching users:", err);
        setError(err?.message || 'Failed to fetch users');
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return { users, loading, error };
};



