/* ===== AUTH STORE — Zustand ===== */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fetchCurrentUserAPI, loginUsersAPI } from '../api';

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
          if (response.user && response.success) {
            const data = response.user;
            const roleStr = String(data.role || 'STAFF').toUpperCase();

            const loggedInUser = {
              id: data.id || data._id,
              companyId: data.companyId,
              name: data.name,
              email: data.email,
              role: roleStr === 'ADMIN' ? 'OWNER' : roleStr, // Map Admin role to OWNER if needed, or keep
              legacyRole: data.role,
              roleId: data.roleId,
              roleName: data.roleName,
              roleSystemKey: data.roleSystemKey,
              permissions: Array.isArray(data.permissions) ? data.permissions : [],
              token: response.token,
            };

            set({
              user: loggedInUser,
              token: response.token,
              isAuthenticated: true,
            });
            return loggedInUser;
          } else {
            console.log('Login failed:', response.data);
            throw new Error(response.data?.message || 'Invalid credentials');
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

      refreshAccess: async () => {
        const response = await fetchCurrentUserAPI();
        if (!response?.success || !response.user) {
          throw new Error(response?.message || 'Unable to refresh permissions');
        }
        const current = get().user || {};
        const refreshedUser = {
          ...current,
          ...response.user,
          role: String(response.user.role || current.role || 'STAFF').toUpperCase() === 'ADMIN'
            ? 'OWNER'
            : String(response.user.role || current.role || 'STAFF').toUpperCase(),
          legacyRole: response.user.role,
          roleSystemKey: response.user.roleSystemKey,
          token: get().token,
        };
        set({ user: refreshedUser, isAuthenticated: true });
        return refreshedUser;
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
