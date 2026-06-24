/* ===== APP STORE — Zustand (products, categories, parties, settings) ===== */
import { create } from 'zustand';
import {
  fetchProductsAPI,
  addProductsAPI,
  updateProductsAPI,
  deleteProductsAPI,
  fetchCategoryAPI,
  addCategoryAPI,
  deleteCategoryAPI,
  fetchPartiesAPI,
  addPartiesAPI,
  updatePartiesAPI,
  deletePartiesAPI,
  fetchCompaniesAPI,
  fetchCusotmersAPI,
} from '../api';

const useAppStore = create((set, get) => ({
  // ── State ──
  products: [],
  categories: [],
  parties: [],
  customers: [],
  companies: [],
  loading: true,
  error: null,

  // ── Bootstrap ──
  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const [products, categories, parties, customers, companies] =
        await Promise.all([
          fetchProductsAPI().catch(() => []),
          fetchCategoryAPI().catch(() => []),
          fetchPartiesAPI().catch(() => []),
          fetchCusotmersAPI().catch(() => []),
          fetchCompaniesAPI(1).catch(() => null),
        ]);
      set({
        products: Array.isArray(products) ? products : (products?.data ?? []),
        categories: Array.isArray(categories)
          ? categories
          : (categories?.data ?? []),
        parties: Array.isArray(parties) ? parties : (parties?.data ?? []),
        customers: Array.isArray(customers)
          ? customers
          : (customers?.data ?? []),
        companies: companies?.data ?? companies ?? get().companies,
        loading: false,
      });
    } catch (err) {
      console.error('Failed to load app data', err);
      set({ loading: false, error: err.message });
    }
  },

  // ── Products ──
  refreshProducts: async () => {
    const data = await fetchProductsAPI();
    set({ products: Array.isArray(data) ? data : (data?.data ?? []) });
  },
  addProduct: async (product) => {
    await addProductsAPI(product);
    get().refreshProducts();
  },
  updateProduct: async (id, data) => {
    await updateProductsAPI(id, data);
    get().refreshProducts();
  },
  deleteProduct: async (id) => {
    await deleteProductsAPI(id);
    set((s) => ({
      products: s.products.filter((p) => String(p.id || p._id) !== String(id)),
    }));
  },

  // ── Categories ──
  refreshCategories: async () => {
    const data = await fetchCategoryAPI();
    set({ categories: Array.isArray(data) ? data : (data?.data ?? []) });
  },
  addCategory: async (cat) => {
    await addCategoryAPI(cat);
    get().refreshCategories();
  },
  deleteCategory: async (id) => {
    await deleteCategoryAPI(id);
    set((s) => ({
      categories: s.categories.filter(
        (c) => String(c.id || c._id) !== String(id)
      ),
    }));
  },

  // ── Customers ──
  refreshCustomers: async () => {
    const data = await fetchCusotmersAPI();
    set({ customers: Array.isArray(data) ? data : (data?.data ?? []) });
  },

  // ── Parties ──
  refreshParties: async () => {
    const data = await fetchPartiesAPI();
    set({ parties: Array.isArray(data) ? data : (data?.data ?? []) });
  },
  addParty: async (party) => {
    const saved = await addPartiesAPI(party);
    set((s) => ({ parties: [...s.parties, saved?.data ?? saved] }));
    return saved?.data ?? saved;
  },
  updateParty: async (id, data) => {
    await updatePartiesAPI(id, data);
    set((s) => ({
      parties: s.parties.map((p) =>
        String(p.id || p._id) === String(id) ? { ...p, ...data } : p
      ),
    }));
  },
  deleteParty: async (id) => {
    await deletePartiesAPI(id);
    set((s) => ({
      parties: s.parties.filter((p) => String(p.id || p._id) !== String(id)),
    }));
  },

  // ── companies ──
  updatecompanies: (companies) =>
    set((s) => ({ companies: { ...s.companies, ...companies } })),
}));

export default useAppStore;
