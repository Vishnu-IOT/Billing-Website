import { axios, BASE_URL, getAuthHeaders } from './client';

export async function fetchVariantsByProductAPI(productId) {
  try {
    const response = await axios.get(
      `${BASE_URL}/variants/get-Variants/${productId}`,
      getAuthHeaders()
    );
    return response.data?.data || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function addVariantAPI(variant) {
  try {
    const response = await axios.post(
      `${BASE_URL}/variants/add-Variant`,
      variant,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err?.response?.data?.message || 'Failed to create variant');
  }
}

export async function deleteVariantAPI(id) {
  try {
    const response = await axios.delete(
      `${BASE_URL}/variants/delete-Variant/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err?.response?.data?.message || 'Failed to delete variant');
  }
}
