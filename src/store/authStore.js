/* ===== AUTH STORE — Zustand ===== */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { loginUsersAPI } from '../api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (data) => {
        // 1. Fall back to backend API
        try {
          const response = await loginUsersAPI(data);
          console.log(response);

          if (response.user && response.success) {
            const data = response.user;
            const roleStr = String(data.role || 'STAFF').toUpperCase();

            const loggedInUser = {
              id: data.id || data._id,
              name: data.name,
              email: data.email,
              role: roleStr === 'ADMIN' ? 'OWNER' : roleStr, // Map Admin role to OWNER if needed, or keep
              token: response.token,
            };

            set({
              user: loggedInUser,
              token: response.token,
              isAuthenticated: true,
            });
            return loggedInUser;
          } else {
            throw new Error(response.data?.message || 'Invalid credentials');
            console.log(response.data);
            return response.data;
          }
        } catch (err) {
          console.error('API login failed:', err);
          throw new Error(
            err.response?.data?.message || err.message || 'Login failed'
          );
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        window.location.hash = 'login';
      },

      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
          token: user ? user.token : null,
        });
      },
    }),
    {
      name: 'thrive-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useAuthStore;
