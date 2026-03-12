import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { USERS } from '@/types';

const API_BASE_URL = 'http://localhost:3001/api';

interface UserState {
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  filterUserId: string | null;
  setCurrentUser: (user: User | null) => void;
  fetchUsers: () => Promise<void>;
  addUser: (name: string, color: string) => Promise<User>;
  selectUser: (userId: string) => void;
  setFilterUserId: (userId: string | null) => void;
  logout: () => void;
}

export const useUser = create<UserState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: USERS,
      isLoading: false,
      filterUserId: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      fetchUsers: async () => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${API_BASE_URL}/users`);
          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              set({ users: data });
            }
          }
        } catch (err) {
          console.error('Failed to fetch users:', err);
        } finally {
          set({ isLoading: false });
        }
      },
      addUser: async (name, color) => {
        const newUser = {
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          color,
        };
        
        try {
          const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser),
          });
          
          if (response.ok) {
            const { users } = get();
            set({ users: [...users, newUser] });
            return newUser;
          }
          throw new Error('Failed to create user');
        } catch (err) {
          console.error('Add user error:', err);
          throw err;
        }
      },
      selectUser: (userId) => {
        const { users } = get();
        const user = users.find(u => u.id === userId);
        if (user) {
          set({ currentUser: user });
        }
      },
      setFilterUserId: (userId) => set({ filterUserId: userId }),
      logout: () => set({ currentUser: null, filterUserId: null }),
    }),
    {
      name: 'user-storage',
    }
  )
);
