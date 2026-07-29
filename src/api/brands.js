import { axios, BASE_URL, getAuthHeaders } from './client';

export async function fetchBrandsAPI() {
  try {
    const response = await axios.get(`${BASE_URL}/brands/get-Brands`, getAuthHeaders());
    return response.data?.data || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function addBrandAPI(brand) {
  try {
    const response = await axios.post(`${BASE_URL}/brands/add-Brand`, brand, getAuthHeaders());
    return response.data;
  } catch (err) {
    alert(err?.response?.data?.message || 'Failed to create brand');
  }
}

export async function updateBrandAPI(id, brand) {
  try {
    const response = await axios.put(`${BASE_URL}/brands/update-Brand/${id}`, brand, getAuthHeaders());
    return response.data;
  } catch (err) {
    alert(err?.response?.data?.message || 'Failed to update brand');
  }
}

export async function deleteBrandAPI(id) {
  try {
    const response = await axios.delete(`${BASE_URL}/brands/delete-Brand/${id}`, getAuthHeaders());
    return response.data;
  } catch (err) {
    alert(err?.response?.data?.message || 'Failed to delete brand');
  }
}
