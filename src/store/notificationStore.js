/* ===== NOTIFICATION STORE — Zustand ===== */
import { create } from 'zustand';
import {
  fetchNotificationTemplatesAPI,
  updateNotificationTemplatesAPI,
  sendNotificationAPI,
  sendOverdueReminderAPI,
  getDefaultTemplates,
} from '../api';

const useNotificationStore = create((set, get) => ({
  templates: getDefaultTemplates(),
  loading: false,

  loadTemplates: async () => {
    set({ loading: true });
    try {
      const data = await fetchNotificationTemplatesAPI();
      const templates = data?.data ?? data ?? getDefaultTemplates();
      set({ templates, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  updateTemplates: async (templates) => {
    await updateNotificationTemplatesAPI(templates);
    set({ templates });
  },

  sendNotification: async (payload) => sendNotificationAPI(payload),

  sendOverdueReminder: async (partyId) => sendOverdueReminderAPI(partyId),
}));

export default useNotificationStore;
