import { axios, BASE_URL, getAuthHeaders } from './client';

export async function fetchDocumentsAPI(documentType, filters = {}) {
  const response = await axios.get(
    `${BASE_URL}/documents/get-Documents`,
    { params: { type: documentType, ...filters }, ...getAuthHeaders() }
  );
  return response.data || [];
}

// Read-only — fetches what the next document number would be without
// reserving it, so Quotation/Proforma/Delivery Challan/Credit Note/Debit
// Note previews always reflect the real backend count, not a local guess.
export async function previewNextDocumentNumberAPI(documentType) {
  const response = await axios.get(
    `${BASE_URL}/documents/get-Documents/next-number`,
    { params: { type: documentType }, ...getAuthHeaders() }
  );
  return response.data;
}

export async function fetchDocumentByIdAPI(id) {
  const response = await axios.get(
    `${BASE_URL}/documents/get-Document/${id}`,
    getAuthHeaders()
  );
  return response.data;
}

export async function fetchDocumentsByProductAPI(productId, documentType) {
  const response = await axios.get(
    `${BASE_URL}/documents/get-Documents/by-product/${productId}`,
    { params: documentType ? { type: documentType } : {}, ...getAuthHeaders() }
  );
  return response.data;
}

export async function fetchDocumentsByPartyAPI(partyId, filters = {}) {
  const response = await axios.get(
    `${BASE_URL}/documents/get-Documents/by-party/${partyId}`,
    { params: filters, ...getAuthHeaders() }
  );
  return response.data;
}

export async function addDocumentAPI(document) {
  const response = await axios.post(
    `${BASE_URL}/documents/add-Document`,
    document,
    getAuthHeaders()
  );
  return response.data;
}

export async function updateDocumentAPI(id, document) {
  const response = await axios.put(
    `${BASE_URL}/documents/update-Document/${id}`,
    document,
    getAuthHeaders()
  );
  return response.data;
}

export async function deleteDocumentAPI(id) {
  const response = await axios.delete(
    `${BASE_URL}/documents/delete-Document/${id}`,
    getAuthHeaders()
  );
  return response.data;
}

export async function convertDocumentToInvoiceAPI(id) {
  const response = await axios.post(
    `${BASE_URL}/documents/convert-Document/${id}`,
    {},
    getAuthHeaders()
  );
  return response.data;
}
