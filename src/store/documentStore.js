/* ===== DOCUMENT STORE — Zustand ===== */
import { create } from 'zustand';
import {
  fetchDocumentsAPI,
  fetchDocumentByIdAPI,
  fetchDocumentsByPartyAPI,
  addDocumentAPI,
  updateDocumentAPI,
  deleteDocumentAPI,
  convertDocumentToInvoiceAPI,
} from '../api';

const useDocumentStore = create((set, get) => ({
  documents: {},
  filters: {}, // keyed by documentType — { partyId, fromDate, toDate }
  loading: false,
  error: null,

  loadDocuments: async (documentType, filters) => {
    const appliedFilters = filters ?? get().filters[documentType] ?? {};
    set({ loading: true, error: null });
    try {
      const data = await fetchDocumentsAPI(documentType, appliedFilters);
      const docs = Array.isArray(data) ? data : data?.data ?? [];
      set((s) => ({
        documents: { ...s.documents, [documentType]: docs },
        filters: { ...s.filters, [documentType]: appliedFilters },
        loading: false,
      }));
    } catch (err) {
      set({ loading: false, error: err?.response?.data?.message || err.message });
    }
  },

  setFilters: (documentType, filters) => {
    set((s) => ({ filters: { ...s.filters, [documentType]: filters } }));
  },

  getDocuments: (documentType) => get().documents[documentType] || [],
  getFilters: (documentType) => get().filters[documentType] || {},

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
  fetchDocumentsByParty: async (partyId, filters) => fetchDocumentsByPartyAPI(partyId, filters),
}));

export default useDocumentStore;
