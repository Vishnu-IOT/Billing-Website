import { axios, BASE_URL, getAuthHeaders } from './client';

export async function addProductsAPI(product) {
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

export async function fetchProductsAPI() {
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

export async function deleteProductsAPI(id) {
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

export async function updateProductsAPI(id, data) {
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

export async function updateProductsBulkAPI(data) {
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

export async function fetchProductBatchesAPI(productId) {
  try {
    const response = await axios.get(
      `${BASE_URL}/products/get-Batches/${productId}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function addProductBatchAPI(productId, batch) {
  try {
    const response = await axios.post(
      `${BASE_URL}/products/add-Batch/${productId}`,
      batch,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function updateProductBatchAPI(productId, batchId, batch) {
  try {
    const response = await axios.post(
      `${BASE_URL}/products/update-Batch/${productId}/${batchId}`,
      batch,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function deleteProductBatchAPI(productId, batchId) {
  try {
    const response = await axios.delete(
      `${BASE_URL}/products/delete-Batch/${productId}/${batchId}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}
