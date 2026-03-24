import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginAsGuest: () => void;
  loginWithGoogle: () => void;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

const api = axios.create({ baseURL: 'http://localhost:5000' });

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/api/auth/login', { email, password });
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
          });
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.message || 'Login failed');
        }
      },

      signup: async (name: string, email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/api/auth/register', { name, email, password });
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
          });
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.message || 'Signup failed');
        }
      },

      loginWithGoogle: () => {
        window.location.href = 'http://localhost:5000/api/auth/google';
      },

      loginAsGuest: () => {
        set({
          user: { id: 'guest', name: 'Guest User', email: 'guest@handscript.ai' },
          token: 'guest-token',
          isAuthenticated: true,
          isLoading: false,
        });
      },

      setAuth: (user: User, token: string) => {
        set({ user, token, isAuthenticated: true, isLoading: false });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
      },
    }),
    {
      name: 'handscript-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state?.token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
          }
        };
      },
    }
  )
);
