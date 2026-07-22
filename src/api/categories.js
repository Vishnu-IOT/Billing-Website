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
    alert(err);
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
    alert(err);
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
    alert(err);
  }
}
