/* ===== UI STORE — Zustand ===== */
import { create } from 'zustand';

const useUIStore = create((set) => ({
  page: 'dashboard',
  searchParams: new URLSearchParams(),
  sidebarOpen: false,

  setPage: (page) => set({ page }),
  setSearchParams: (sp) => set({ searchParams: sp }),
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));

export default useUIStore;
