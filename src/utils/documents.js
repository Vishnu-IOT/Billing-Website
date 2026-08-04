/* ===== DOCUMENT TYPE CONFIGURATION ===== */

export const DOCUMENT_TYPES = {
  SALE_INVOICE: {
    key: 'SALE_INVOICE',
    label: 'Sale Invoice',
    prefix: 'INV',
    side: 'sales',
    showTax: true,
    showPayment: true,
    showRoundOff: true,
    isInvoice: true,
    partyLabel: 'Select Party *',
    dateLabel: 'Date',
    numberLabel: 'Invoice No',
    itemsField: 'SalesItems',
    dateField: 'saleDate',
    convertible: false,
    requireUserRep: true,
  },
  PURCHASE_BILL: {
    key: 'PURCHASE_BILL',
    label: 'Purchase Bill',
    prefix: 'PUR',
    side: 'purchase',
    showTax: true,
    showPayment: true,
    showRoundOff: true,
    isInvoice: false,
    partyLabel: 'Vendor / Party *',
    dateLabel: 'Date',
    numberLabel: 'Bill No',
    itemsField: 'PurchaseItems',
    dateField: 'purchaseDate',
    convertible: false,
    showState: true,
  },
  QUOTATION: {
    key: 'QUOTATION',
    label: 'Quotation',
    prefix: 'QT',
    side: 'sales',
    showTax: true,
    showPayment: false,
    isInvoice: false,
    convertible: true,
    convertLabel: 'Convert to Sale Invoice',
    validUntilLabel: 'Valid Until',
    showValidUntil: true,
    dateField: 'documentDate',
    itemsField: 'DocumentItems',
  },
  PROFORMA: {
    key: 'PROFORMA',
    label: 'Proforma Invoice',
    prefix: 'PI',
    side: 'sales',
    showTax: true,
    showPayment: false,
    isInvoice: false,
    convertible: false,
    validUntilLabel: 'Valid Until',
    showValidUntil: true,
    dateField: 'documentDate',
    itemsField: 'DocumentItems',
  },
  DELIVERY_CHALLAN: {
    key: 'DELIVERY_CHALLAN',
    label: 'Delivery Challan',
    prefix: 'DC',
    side: 'sales',
    showTax: false,
    showPayment: false,
    isInvoice: false,
    convertible: false,
    transportLabel: 'Transport / Vehicle Ref',
    dateField: 'documentDate',
    itemsField: 'DocumentItems',
  },
  CREDIT_NOTE: {
    key: 'CREDIT_NOTE',
    label: 'Credit Note',
    prefix: 'CN',
    side: 'sales',
    showTax: true,
    showPayment: false,
    isInvoice: false,
    convertible: false,
    referenceLabel: 'Original Invoice No',
    dateField: 'documentDate',
    itemsField: 'DocumentItems',
  },
  DEBIT_NOTE: {
    key: 'DEBIT_NOTE',
    label: 'Debit Note',
    prefix: 'DN',
    side: 'purchase',
    showTax: true,
    showPayment: false,
    isInvoice: false,
    convertible: false,
    referenceLabel: 'Original Bill No',
    dateField: 'documentDate',
    itemsField: 'DocumentItems',
  },
};

export const SALES_DOCUMENT_TYPES = [
  'QUOTATION',
  'PROFORMA',
  'DELIVERY_CHALLAN',
  'CREDIT_NOTE',
];
export const PURCHASE_DOCUMENT_TYPES = ['DEBIT_NOTE'];

export function getDocumentConfig(documentType) {
  return DOCUMENT_TYPES[documentType] || DOCUMENT_TYPES.QUOTATION;
}

export function isInvoiceDocType(documentType) {
  return !!getDocumentConfig(documentType).isInvoice;
}

export function getDocumentPrefix(documentType, settings = {}) {
  if (documentType === 'SALE_INVOICE') {
    return settings.invoicePrefix || 'INV';
  }
  // if (documentType === 'PURCHASE_BILL') {
  //   return settings.purchasePrefix || 'PUR';
  // }
  const config = getDocumentConfig(documentType);
  const key = `${documentType.toLowerCase()}Prefix`;
  return settings[key] || config.prefix;
}
