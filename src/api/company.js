import { axios, BASE_URL, getAuthHeaders } from './client';

export async function fetchCompaniesAPI(id = 1) {
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

export async function updateCompanyAPI(id, data) {
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

export async function fetchFinancialDetailsAPI(companyId = 1) {
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

export async function updateFinancialDetailsAPI(companyId, id, data) {
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

export async function fetchCompanyUsersAPI(companyId = 1) {
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

export async function addCompanyUserAPI(companyId, data) {
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

export async function updateCompanyUserAPI(id, data) {
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

export async function deleteCompanyUserAPI(id, toast) {
  try {
    const response = await axios.post(
      `${BASE_URL}/company/delete-User/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    console.error(err);
    toast.error(err.response?.data?.message || 'Failed to delete user');
    return { success: false };
  }
}
