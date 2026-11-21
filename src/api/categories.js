import { axios, BASE_URL, getAuthHeaders } from './client';

export async function addCategoryAPI(category) {
  try {
    const response = await axios.post(
      `${BASE_URL}/category/add-category`,
      category,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    throw new Error(
      err.response?.data?.message || err.message || 'Failed to create category'
    );
  }
}

export async function fetchCategoryAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/category/get-category`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    throw new Error(
      err.response?.data?.message || err.message || 'Failed to load categories'
    );
  }
}

export async function updateCategoryAPI(id, category) {
  try {
    const response = await axios.put(
      `${BASE_URL}/category/update-category/${id}`,
      category,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to update category'
    );
  }
}

export async function deleteCategoryAPI(id) {
  try {
    const response = await axios.get(
      `${BASE_URL}/category/delete-category/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    throw new Error(
      err.response?.data?.message || err.message || 'Failed to delete category'
    );
  }
}
