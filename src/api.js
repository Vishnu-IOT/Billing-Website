import axios from 'axios';
import useAuthStore from './store/authStore';

const BASE_URL = process.env.REACT_APP_BASE_URL;

// ──────────────────────────────────────────────
// Helper: Get auth headers with token
// ──────────────────────────────────────────────
function getAuthHeaders() {
  const token = useAuthStore.getState().token;
  const headers = {
    'ngrok-skip-browser-warning': 'true',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return { headers };
}

async function loginUsersAPI(data) {
  const response = await axios.post(`${BASE_URL}/users/login-Auth`, data, {
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
  });
  return response.data;
}

// ========================================================
//    DASHBOARD SECTION
// ========================================================

async function getDashboardAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/dashboard/get-dashboard`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

// ========================================================
//    PRODUCTS SECTION
// ========================================================

async function addProductsAPI(product) {
  try {
    const response = await axios.post(
      `${BASE_URL}/products/add-Products`,
      product,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

async function fetchProductsAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/products/get-Products`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

async function deleteProductsAPI(id) {
  try {
    const response = await axios.delete(
      `${BASE_URL}/products/delete-Products/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

async function updateProductsAPI(id, data) {
  try {
    const response = await axios.post(
      `${BASE_URL}/products/update-Products/${id}`,
      data,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

async function updateProductsBulkAPI(data) {
  try {
    const response = await axios.post(
      `${BASE_URL}/products/updatebulk-Products`,
      data,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

// ========================================================
//    CATEGORY SECTION
// ========================================================

async function addCategoryAPI(category) {
  try {
    const response = await axios.post(
      `${BASE_URL}/category/add-category`,
      category,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

async function fetchCategoryAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/category/get-category`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

async function deleteCategoryAPI(id) {
  try {
    const response = await axios.get(
      `${BASE_URL}/category/delete-category/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

// ========================================================
//    PARITES SECTION
// ========================================================

async function addPartiesAPI(party) {
  try {
    const response = await axios.post(
      `${BASE_URL}/parties/add-Party`,
      party,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

async function fetchPartiesAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/parties/get-Party`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

async function deletePartiesAPI(id) {
  try {
    const response = await axios.delete(
      `${BASE_URL}/parties/delete-Party/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

async function updatePartiesAPI(id, data) {
  try {
    const response = await axios.post(
      `${BASE_URL}/parties/update-Party/${id}`,
      data,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

async function fetchInvoiceByPartiesIdAPI(id) {
  try {
    const response = await axios.get(
      `${BASE_URL}/parties/invoiceById-Party/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

// ========================================================
//  CUSTOMER DATA FECTHING
// ========================================================

async function fetchCusotmersAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/customers/get-Cusotmer`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

// ========================================================
//   SALES BILLS SECTION (MOCK)
// ========================================================

async function fetchSaleBillsAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/sales/get-sales`,
      getAuthHeaders()
    );
    return response.data || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function fetchSaleBillsByDateAPI(id, date) {
  try {
    const response = await axios.get(`${BASE_URL}/sales/get-sales-date`, {
      params: {
        filter: id,
        startDate: date.startDate,
        endDate: date.endDate,
      },
      ...getAuthHeaders(), // ✅ merge headers here
    });
    return response.data || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function addSaleBillAPI(bill) {
  try {
    const response = await axios.post(
      `${BASE_URL}/sales/add-sales`,
      bill,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

async function updateSaleBillAPI(id, bill) {
  try {
    const response = await axios.put(
      `${BASE_URL}/sales/updatebyid-sales/${id}`,
      bill,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

async function updatePaymentInAPI(bill) {
  try {
    const response = await axios.post(
      `${BASE_URL}/sales/updatepaymentin-sales/${bill.id}`,
      bill,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

async function deleteSaleBillAPI(id) {
  try {
    const response = await axios.delete(
      `${BASE_URL}/sales/delete-sales/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

// ========================================================
//   PURCHASES BILLS SECTION (MOCK)
// ========================================================

async function fetchPurchaseBillsAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/purchase/get-purchase`,
      getAuthHeaders()
    );
    return response.data;
    // return [];
  } catch (err) {
    alert(err);
  }
}

async function fetchPurchaseBillsByDateAPI(id, date) {
  try {
    const response = await axios.get(`${BASE_URL}/purchase/get-purchase-date`, {
      params: {
        filter: id,
        startDate: date.startDate,
        endDate: date.endDate,
      },
      ...getAuthHeaders(), // ✅ merge headers here
    });
    return response.data || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function addPurchaseBillAPI(bill) {
  try {
    const response = await axios.post(
      `${BASE_URL}/purchase/add-purchase`,
      bill,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

async function updatePurchaseBillAPI(id, bill) {
  try {
    const response = await axios.put(
      `${BASE_URL}/purchase/updatebyid-purchase/${id}`,
      bill,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

async function updatePaymentOutAPI(id, bill) {
  try {
    const response = await axios.post(
      `${BASE_URL}/purchase/updatepaymentout-purchase/${id}`,
      bill,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

async function deletePurchaseBillAPI(id) {
  try {
    const response = await axios.delete(
      `${BASE_URL}/purchase/delete-purchase/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

// ========================================================
//    OWNER SECTION
// ========================================================

async function addOwnersAPI(party) {
  try {
    const response = await axios.post(
      `${BASE_URL}/owners/add-Owner`,
      party,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

async function fetchOwnersAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/owners/get-Owner`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

async function deleteOwnersAPI(id) {
  try {
    const response = await axios.delete(
      `${BASE_URL}/owners/delete-Owner/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

async function updateOwnersAPI(id, data) {
  try {
    const response = await axios.post(
      `${BASE_URL}/owners/update-Owner/${id}`,
      data,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

// ========================================================
//    SETTINGS SECTION (MOCK)
// ========================================================

async function fetchCompaniesAPI(id = 1) {
  try {
    const response = await axios.get(
      `${BASE_URL}/company/get-Company/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    return err;
  }
}

async function updateCompanyAPI(id, data) {
  try {
    const response = await axios.post(
      `${BASE_URL}/company/update-Company/${id}`,
      data,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    return err;
  }
}

async function fetchFinancialDetailsAPI(companyId = 1) {
  try {
    const response = await axios.get(
      `${BASE_URL}/company/get-CompanyFinancials/${companyId}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    return err;
  }
}

async function updateFinancialDetailsAPI(companyId, id, data) {
  try {
    const response = await axios.post(
      `${BASE_URL}/company/update-CompanyFinancials/${companyId}/${id}`,
      data,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    return err;
  }
}

async function fetchCompanyUsersAPI(companyId = 1) {
  try {
    const response = await axios.get(
      `${BASE_URL}/company/get-User/${companyId}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    return err;
  }
}

async function addCompanyUserAPI(companyId, data) {
  try {
    const response = await axios.post(
      `${BASE_URL}/company/add-User/${companyId}`,
      data,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    return err;
  }
}

async function updateCompanyUserAPI(id, data) {
  try {
    const response = await axios.post(
      `${BASE_URL}/company/update-user/${id}`,
      data,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    return err;
  }
}

async function deleteCompanyUserAPI(id, toast) {
  try {
    const response = await axios.post(
      `${BASE_URL}/company/delete-User/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    console.error(err);

    toast.error(err.response?.data?.message || 'Failed to delete user');

    return {
      success: false,
    };
  }
}

async function fetchSettingsAPI() {
  try {
    // const response = await axios.get(`${BASE_URL}/settings/get-Settings`,getAuthHeaders());
    // return response.data;
    return {
      companyName: 'Your Business Name',
      companyAddress: 'Your Address',
      companyGstin: '',
      companyPhone: '',
      billTheme: 'classic',
    };
  } catch (err) {
    alert(err);
  }
}

async function updateSettingsAPI(settings) {
  try {
    // const response = await axios.post(`${BASE_URL}/settings/update-Settings`, settings,getAuthHeaders());
    // return response.data;
    return { success: true, settings };
  } catch (err) {
    alert(err);
  }
}

export {
  getDashboardAPI,
  addProductsAPI,
  fetchProductsAPI,
  deleteProductsAPI,
  updateProductsAPI,
  updateProductsBulkAPI,
  addCategoryAPI,
  fetchCategoryAPI,
  deleteCategoryAPI,
  addPartiesAPI,
  fetchPartiesAPI,
  deletePartiesAPI,
  updatePartiesAPI,
  fetchInvoiceByPartiesIdAPI,
  fetchCusotmersAPI,
  fetchSaleBillsAPI,
  fetchSaleBillsByDateAPI,
  addSaleBillAPI,
  updateSaleBillAPI,
  updatePaymentInAPI,
  deleteSaleBillAPI,
  fetchPurchaseBillsAPI,
  fetchPurchaseBillsByDateAPI,
  addPurchaseBillAPI,
  updatePurchaseBillAPI,
  updatePaymentOutAPI,
  deletePurchaseBillAPI,
  fetchCompaniesAPI,
  updateCompanyAPI,
  fetchFinancialDetailsAPI,
  updateFinancialDetailsAPI,
  fetchCompanyUsersAPI,
  addCompanyUserAPI,
  updateCompanyUserAPI,
  deleteCompanyUserAPI,
  fetchSettingsAPI,
  updateSettingsAPI,
  addOwnersAPI,
  fetchOwnersAPI,
  deleteOwnersAPI,
  updateOwnersAPI,
  loginUsersAPI,
};
