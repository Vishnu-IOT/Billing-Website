/* ===== DOCUMENT STORE — Zustand ===== */
import { create } from 'zustand';
import {
  fetchDocumentsAPI,
  fetchDocumentByIdAPI,
  addDocumentAPI,
  updateDocumentAPI,
  deleteDocumentAPI,
  convertDocumentToInvoiceAPI,
} from '../api';

const useDocumentStore = create((set, get) => ({
  documents: {},
  loading: false,
  error: null,

  loadDocuments: async (documentType) => {
    set({ loading: true });
    try {
      const data = await fetchDocumentsAPI(documentType);
      const docs = Array.isArray(data) ? data : data?.data ?? [];
      set((s) => ({
        documents: { ...s.documents, [documentType]: docs },
        loading: false,
      }));
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  getDocuments: (documentType) => get().documents[documentType] || [],

  addDocument: async (payload) => {
    const result = await addDocumentAPI(payload);
    await get().loadDocuments(payload.documentType);
    return result;
  },

  updateDocument: async (id, payload) => {
    await updateDocumentAPI(id, payload);
    await get().loadDocuments(payload.documentType);
  },

  deleteDocument: async (id, documentType) => {
    await deleteDocumentAPI(id);
    set((s) => ({
      documents: {
        ...s.documents,
        [documentType]: (s.documents[documentType] || []).filter(
          (d) => String(d.id || d._id) !== String(id)
        ),
      },
    }));
  },

  convertToInvoice: async (id, documentType) => {
    const result = await convertDocumentToInvoiceAPI(id);
    await get().loadDocuments(documentType);
    return result;
  },

  fetchDocument: async (id) => fetchDocumentByIdAPI(id),
}));

export default useDocumentStore;
