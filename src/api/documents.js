import { axios, BASE_URL, getAuthHeaders } from './client';

export async function fetchDocumentsAPI(documentType) {
  try {
    const response = await axios.get(
      `${BASE_URL}/documents/get-Documents`,
      { params: { type: documentType }, ...getAuthHeaders() }
    );
    return response.data || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function fetchDocumentByIdAPI(id) {
  try {
    const response = await axios.get(
      `${BASE_URL}/documents/get-Document/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function addDocumentAPI(document) {
  try {
    const response = await axios.post(
      `${BASE_URL}/documents/add-Document`,
      document,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function updateDocumentAPI(id, document) {
  try {
    const response = await axios.put(
      `${BASE_URL}/documents/update-Document/${id}`,
      document,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function deleteDocumentAPI(id) {
  try {
    const response = await axios.delete(
      `${BASE_URL}/documents/delete-Document/${id}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function convertDocumentToInvoiceAPI(id) {
  try {
    const response = await axios.post(
      `${BASE_URL}/documents/convert-Document/${id}`,
      {},
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}
