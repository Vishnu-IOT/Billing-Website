/* ===== APP STORE — Zustand (products, categories, parties, settings) ===== */
import { create } from 'zustand';
import {
  fetchProductsAPI,
  addProductsAPI,
  updateProductsAPI,
  deleteProductsAPI,
  fetchCategoryAPI,
  addCategoryAPI,
  updateCategoryAPI,
  deleteCategoryAPI,
  fetchBrandsAPI,
  addBrandAPI,
  updateBrandAPI,
  deleteBrandAPI,
  fetchPartiesAPI,
  addPartiesAPI,
  updatePartiesAPI,
  deletePartiesAPI,
  fetchCompaniesAPI,
  fetchCusotmersAPI,
} from '../api';

import useSettingsStore from './settingsStore';
import useAuthStore from './authStore';
import { hasPermission } from '../utils/permissions';

const useAppStore = create((set, get) => ({
  // ── State ──
  products: [],
  categories: [],
  brands: [],
  parties: [],
  customers: [],
  companies: [],
  settings: useSettingsStore.getState(),
  loading: true,
  error: null,

  // ── Bootstrap ──
  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      const canLoad = (...permissions) => permissions.some((permission) => hasPermission(user, permission));
      const [products, categories, brands, parties, customers, companies] =
        await Promise.all([
          canLoad('products.catalog.view', 'pos.billing.access', 'quick-sales.aliases.map') ? fetchProductsAPI().catch(() => []) : [],
          canLoad('categories.catalog.view', 'pos.billing.access') ? fetchCategoryAPI().catch(() => []) : [],
          canLoad('brands.catalog.view', 'pos.billing.access') ? fetchBrandsAPI().catch(() => []) : [],
          canLoad('parties.directory.view') ? fetchPartiesAPI().catch(() => []) : [],
          canLoad('customers.directory.view', 'pos.billing.access') ? fetchCusotmersAPI().catch(() => []) : [],
          canLoad('company.profile.view', 'pos.billing.access', 'purchases.invoices.create')
            ? fetchCompaniesAPI(user?.companyId).catch(() => null)
            : null,
        ]);
      set({
        products: Array.isArray(products) ? products : (products?.data ?? []),
        categories: Array.isArray(categories)
          ? categories
          : (categories?.data ?? []),
        brands: Array.isArray(brands) ? brands : (brands?.data ?? []),
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
    const data = await addProductsAPI(product);
    await get().refreshProducts();
    return data;
  },
  updateProduct: async (id, data) => {
    await updateProductsAPI(id, data);
    // Wait for the refresh so callers see the backend-recalculated values
    await get().refreshProducts();
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
    const data = await addCategoryAPI(cat);
    await get().refreshCategories();
    return data?.cat ?? data?.data ?? data;
  },
  updateCategory: async (id, cat) => {
    const data = await updateCategoryAPI(id, cat);
    await get().refreshCategories();
    return data;
  },
  deleteCategory: async (id) => {
    await deleteCategoryAPI(id);
    set((s) => ({
      categories: s.categories.filter(
        (c) => String(c.id || c._id) !== String(id)
      ),
    }));
  },

  // ── Brands ──
  refreshBrands: async () => {
    const data = await fetchBrandsAPI();
    set({ brands: Array.isArray(data) ? data : (data?.data ?? []) });
  },
  addBrand: async (brand) => {
    const data = await addBrandAPI(brand);
    await get().refreshBrands();
    return data?.data ?? data;
  },
  updateBrand: async (id, brand) => {
    const data = await updateBrandAPI(id, brand);
    await get().refreshBrands();
    return data;
  },
  deleteBrand: async (id) => {
    await deleteBrandAPI(id);
    set((s) => ({
      brands: s.brands.filter((b) => String(b.id || b._id) !== String(id)),
    }));
  },

  // ── Customers ──
  refreshCustomers: async () => {
    const data = await fetchCusotmersAPI();
    set({ customers: Array.isArray(data) ? data : (data?.data ?? []) });
  },
  updateCustomerLoyaltyPoints: (customerId, loyaltyPoints) => {
    set((s) => ({
      customers: s.customers.map((customer) =>
        String(customer.id || customer._id) === String(customerId)
          ? { ...customer, loyalty_points: loyaltyPoints }
          : customer
      ),
    }));
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

  // ── Settings ──
  updateSettings: (newSettings) => {
    useSettingsStore.getState().updateSettings(newSettings);
    set({ settings: useSettingsStore.getState() });
  },
}));

export default useAppStore;
