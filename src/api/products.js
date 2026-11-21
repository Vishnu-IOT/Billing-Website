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
    // Surface the API's own message (e.g. unsupported tax rate, missing price)
    throw new Error(err.response?.data?.message || 'Failed to save product');
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
    console.error('Failed to fetch products:', err);
    throw new Error(err.response?.data?.message || 'Failed to load products');
  }
}

export async function lookupProductByBarcodeAPI(barcode) {
  try {
    const response = await axios.get(
      `${BASE_URL}/products/lookup-barcode`,
      {
        ...getAuthHeaders(),
        params: { barcode },
      }
    );
    return response.data;
  } catch (err) {
    const error = new Error(
      err.response?.data?.message || 'Failed to look up barcode'
    );
    error.status = err.response?.status;
    error.code = err.response?.data?.code;
    throw error;
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
    const status = err.response?.status;
    const message =
      err.response?.data?.message ||
      err.message ||
      'Failed to delete product';
    throw new Error(
      status ? `Delete product failed (${status}): ${message}` : message
    );
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
    throw new Error(err.response?.data?.message || 'Failed to update product');
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

export async function fetchProductBatchesAPI(
  productId,
  { availableOnly = false, includeBatchId, historyOnly = false } = {},
) {
  try {
    const params = {
      ...(availableOnly && {
        availableOnly: true,
        ...(includeBatchId ? { includeBatchId } : {}),
      }),
      ...(historyOnly && { historyOnly: true }),
    };
    const response = await axios.get(
      `${BASE_URL}/products/get-Batches/${productId}`,
      {
        ...getAuthHeaders(),
        params: Object.keys(params).length ? params : undefined,
      }
    );
    return response.data;
  } catch (err) {
    console.error('Failed to fetch product batches:', err);
    throw new Error(err.response?.data?.message || 'Failed to load product batches');
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
    console.error('Failed to add product batch:', err);
    throw new Error(err.response?.data?.message || 'Failed to add product batch');
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
    console.error('Failed to update product batch:', err);
    throw new Error(err.response?.data?.message || 'Failed to update product batch');
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
    console.error('Failed to delete product batch:', err);
    throw new Error(err.response?.data?.message || 'Failed to delete product batch');
  }
}
