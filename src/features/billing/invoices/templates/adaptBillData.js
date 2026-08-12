/* ═══════════════════════════════════════════════════════════════════════════════
   FILE: adaptBillData.js  (UPDATED — pulls GST/bank data from Financial API)
   LOCATION: frontend/src/features/billing/invoices/templates/adaptBillData.js
   ═══════════════════════════════════════════════════════════════════════════════

   WHY THIS CHANGED:
   - Company GST/PAN/bank details do NOT live on the `companies` table.
     They live in a separate `company_financials` table, served by:
       GET /api/company/get-CompanyFinancials/:companyId
     which you already call via fetchFinancialDetailsAPI() in src/api/company.js

   - The Party model has NO state/city fields — just a single `address` string
     and a `GST` field. So billingState/shippingState (needed to decide
     SGST+CGST vs IGST) is DERIVED from the GST number's first 2 digits
     (standard GSTIN state code), not read directly off the party.

   ═══════════════════════════════════════════════════════════════════════════════ */

import { fetchFinancialDetailsAPI } from '../../../../api/company';

// Standard GSTIN state code → state name map (first 2 digits of any GSTIN)
const GST_STATE_CODES = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
  '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi',
  '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim',
  '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
  '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
  '24': 'Gujarat', '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra', '28': 'Andhra Pradesh (Old)', '29': 'Karnataka',
  '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
  '34': 'Puducherry', '35': 'Andaman and Nicobar Islands', '36': 'Telangana',
  '37': 'Andhra Pradesh', '38': 'Ladakh',
};

/**
 * Extract the state name from a GSTIN (first 2 digits = state code).
 * Returns null if the GSTIN is missing/invalid so callers can fall back safely.
 */
export function stateFromGSTIN(gstin) {
  if (!gstin || gstin.length < 2) return null;
  const code = gstin.substring(0, 2);
  return GST_STATE_CODES[code] || null;
}

/**
 * Fetches the company's real GST/PAN/bank details from the Financial API
 * and merges them with the basic company record.
 *
 * @param {number} companyId
 * @param {object} companyBasic - the plain company record (name, address, logo, phone, email)
 * @returns {object} company object shaped for the invoice templates
 */
export async function fetchCompanyForInvoice(companyId, companyBasic = {}) {
  let financials = {};

  try {
    const res = await fetchFinancialDetailsAPI(companyId);
    // Controller wraps successful results as { success, message, data }
    financials = res?.data?.data || res?.data || {};
  } catch (err) {
    console.error('Could not load company financial details:', err);
  }

  return {
    name: companyBasic.name,
    address: companyBasic.address,
    city: companyBasic.city,
    zipCode: companyBasic.zipCode,
    phone: companyBasic.phone,
    email: companyBasic.email,
    logo: companyBasic.logo,

    // ── Real GST/PAN comes from Company_Financials, not the companies table ──
    gstNumber: financials.gstin || '',
    pan: financials.pan || '',
    state: stateFromGSTIN(financials.gstin) || companyBasic.state || '',

    // ── Real bank details come from Company_Financials ──
    bankDetails: {
      bankName: financials.bank_name || '',
      accountNumber: financials.bank_account_enc || '', // decrypt server-side before sending if encrypted
      ifscCode: financials.ifsc_code || '',
      accountType: financials.account_type || '',
      accountName: companyBasic.name || '',
    },
  };
}

/**
 * Converts your existing bill/party/items shape into the { invoice, company }
 * shape the new templates expect.
 *
 * NOTE: `company` here must already be the OUTPUT of fetchCompanyForInvoice()
 * above — this function no longer guesses GST/bank fields off `companies[0]`.
 */
export function adaptBillToInvoice(bill, party, items, company) {
  // Party's own GST determines the "customer state" for the SGST/CGST vs IGST split
  const customerState = stateFromGSTIN(party?.GST) || party?.state || '';
  const companyState = company?.state || '';

  return {
    invoice: {
      invoiceNumber: bill.invoiceNumber,
      date: bill.saleDate || bill.createdAt,
      dueDate: bill.dueDate,
      billType: bill.bill_type,

      customerName: party?.name,
      customerEmail: party?.email,
      customerPhone: party?.phone,
      customerGST: party?.GST,
      billingAddress: party?.address,
      billingState: customerState,     // derived from party's GSTIN

      shippingAddress: bill.shippingAddress || party?.address,
      shippingState: bill.shippingState || customerState,

      items: items.map((i) => ({
        name: i.productName,
        hsn: i.hsncode,
        quantity: i.quantity,
        unit: i.unit || 'Unit',
        rate: parseFloat(i.baseRate),
        batchNumber: i.batchNo,
      })),

      discount: bill.global_discount_percentage || 0,
      amount: bill.totalAmount,
      paymentMethod: bill.paymentMethod,
      notes: bill.notes,

      // E-invoice / E-way bill — fetched separately from complianceController
      // (getEInvoices / getEWayBills) and merged in by the calling component,
      // not guessed here.
      irn: bill.irn || null,
      ewayBillNumber: bill.ewayBillNumber || null,
      qrCode: bill.qrCode || null,
    },

    // company is passed straight through — build it with fetchCompanyForInvoice()
    company: {
      ...company,
      billingState: companyState,
    },
  };
}
