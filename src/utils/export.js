/* ===== EXCEL EXPORT UTILITY ===== */
import * as XLSX from 'xlsx';

/**
 * Export an array of objects to an Excel file
 * @param {Object[]} rows - data rows
 * @param {string} sheetName - worksheet name
 * @param {string} fileName - output file name (without extension)
 */
export function exportToExcel(rows, sheetName = 'Sheet1', fileName = 'Report') {
  if (!rows || rows.length === 0) {
    throw new Error('No data to export');
  }
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Build GST export rows from sale bills
 */
export function buildSalesGSTExportRows(bills) {
  return bills.map((sale) => ({
    Date: sale.saleDate || '',
    PartyName: sale.Party?.name || '',
    InvoiceNo: sale.invoiceNumber || '',
    TransactionType: 'Sale',
    PaymentStatus: sale.paymentStatus || '',
    TaxableValue: parseFloat(sale.baseRate || 0).toFixed(2),
    TotalGST: parseFloat(sale.tax || 0).toFixed(2),
    CGST: (parseFloat(sale.tax || 0) / 2).toFixed(2),
    SGST: (parseFloat(sale.tax || 0) / 2).toFixed(2),
    TotalAmount: parseFloat(sale.totalAmount || 0).toFixed(2),
  }));
}

/**
 * Build export rows from purchase bills
 */
export function buildPurchaseExportRows(bills) {
  return bills.map((bill) => ({
    Date: bill.purchaseDate || '',
    PartyName: bill.Party?.name || '',
    InvoiceNo: bill.invoiceNumber || '',
    TransactionType: 'Purchase',
    PaymentStatus: bill.paymentStatus || '',
    TaxableValue: parseFloat(bill.baseRate || 0).toFixed(2),
    TotalGST: parseFloat(bill.tax || 0).toFixed(2),
    TotalAmount: parseFloat(bill.totalAmount || 0).toFixed(2),
  }));
}

/**
 * Build export rows from products (stock report)
 */
export function buildStockExportRows(products) {
  return products.map((p) => ({
    Name: p.name || '',
    HSNCode: p.HSNCode || '',
    Category: p.category || p.categoryName || '',
    MRP: p.MRP || 0,
    SalesPrice: p.salesPrice || 0,
    PurchasePrice: p.purchasePrice || 0,
    StockQty: p.stockQuantity || 0,
    Unit: p.unit || 'pcs',
    TaxRate: p.taxRate || 0,
  }));
}
