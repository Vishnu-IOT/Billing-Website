import { axios, BASE_URL, getAuthHeaders } from './client';

// Chart of Accounts API
export async function fetchChartOfAccountsAPI() {
  try {
    const response = await axios.get(`${BASE_URL}/accounting/accounts`, getAuthHeaders());
    return response.data?.data || [];
  } catch (err) {
    console.error('fetchChartOfAccountsAPI error:', err);
    return [];
  }
}

export async function createAccountAPI(payload) {
  try {
    const response = await axios.post(`${BASE_URL}/accounting/accounts`, payload, getAuthHeaders());
    return response.data;
  } catch (err) {
    console.error('createAccountAPI error:', err);
    throw err.response?.data?.message || err.message;
  }
}

// Journal Entries API
export async function fetchJournalEntriesAPI() {
  try {
    const response = await axios.get(`${BASE_URL}/accounting/journals`, getAuthHeaders());
    return response.data?.data || [];
  } catch (err) {
    console.error('fetchJournalEntriesAPI error:', err);
    return [];
  }
}

export async function createJournalEntryAPI(payload) {
  try {
    const response = await axios.post(`${BASE_URL}/accounting/journals`, payload, getAuthHeaders());
    return response.data;
  } catch (err) {
    console.error('createJournalEntryAPI error:', err);
    throw err.response?.data?.message || err.message;
  }
}

// Party Ledger Statement API
export async function fetchPartyLedgerAPI(partyId) {
  try {
    const response = await axios.get(`${BASE_URL}/accounting/party-ledger`, {
      params: { partyId },
      ...getAuthHeaders(),
    });
    return response.data || null;
  } catch (err) {
    console.error('fetchPartyLedgerAPI error:', err);
    return null;
  }
}

// Financial Statements API
export async function fetchTrialBalanceAPI() {
  try {
    const response = await axios.get(`${BASE_URL}/accounting/trial-balance`, getAuthHeaders());
    return response.data || null;
  } catch (err) {
    console.error('fetchTrialBalanceAPI error:', err);
    return null;
  }
}

export async function fetchProfitAndLossAPI() {
  try {
    const response = await axios.get(`${BASE_URL}/accounting/profit-loss`, getAuthHeaders());
    return response.data || null;
  } catch (err) {
    console.error('fetchProfitAndLossAPI error:', err);
    return null;
  }
}

export async function fetchBalanceSheetAPI() {
  try {
    const response = await axios.get(`${BASE_URL}/accounting/balance-sheet`, getAuthHeaders());
    return response.data || null;
  } catch (err) {
    console.error('fetchBalanceSheetAPI error:', err);
    return null;
  }
}
