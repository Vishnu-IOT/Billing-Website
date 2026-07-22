import { axios, BASE_URL, getAuthHeaders } from './client';

export async function fetchEInvoicesAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/compliance/get-EInvoices`,
      getAuthHeaders()
    );
    return response.data || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function fetchEWayBillsAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/compliance/get-EWayBills`,
      getAuthHeaders()
    );
    return response.data || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function generateEInvoiceAPI(billId, billType = 'SALE') {
  try {
    const response = await axios.post(
      `${BASE_URL}/compliance/generate-EInvoice`,
      { billId, billType },
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function generateEWayBillAPI(billId, billType = 'SALE') {
  try {
    const response = await axios.post(
      `${BASE_URL}/compliance/generate-EWayBill`,
      { billId, billType },
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function cancelEInvoiceAPI(irn) {
  try {
    const response = await axios.post(
      `${BASE_URL}/compliance/cancel-EInvoice`,
      { irn },
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function cancelEWayBillAPI(ewbNo) {
  try {
    const response = await axios.post(
      `${BASE_URL}/compliance/cancel-EWayBill`,
      { ewbNo },
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function fetchGSTR1ReportAPI(params) {
  try {
    const response = await axios.get(`${BASE_URL}/compliance/get-GSTR1`, {
      params,
      ...getAuthHeaders(),
    });
    return response.data;
  } catch (err) {
    console.error(err);
    return { sections: [], summary: {} };
  }
}

export async function fetchGSTR3BReportAPI(params) {
  try {
    const response = await axios.get(`${BASE_URL}/compliance/get-GSTR3B`, {
      params,
      ...getAuthHeaders(),
    });
    return response.data;
  } catch (err) {
    console.error(err);
    return { sections: [], summary: {} };
  }
}
