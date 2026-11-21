export function hasPermission(user, permissionKey) {
  if (user?.roleSystemKey === 'ADMIN') return true;
  if (!Array.isArray(user?.permissions)) return false;
  if (user.permissions.includes(permissionKey)) return true;
  const lastSeparator = permissionKey.lastIndexOf('.');
  return lastSeparator > 0 &&
    user.permissions.includes(`${permissionKey.slice(0, lastSeparator)}.manage`);
}

export function getPagePermission(page, searchParams) {
  if (page.startsWith('sales/edit/')) return 'sales.invoices.edit';
  if (page.startsWith('purchase/edit/')) return 'purchases.invoices.edit';

  if (page === 'sales') {
    return searchParams?.get('type') === 'B2C'
      ? 'pos.billing.access'
      : 'sales.invoices.view';
  }
  if (page === 'documents' && ['SALES_RETURN', 'CREDIT_NOTE', 'DEBIT_NOTE'].includes(searchParams?.get('type'))) {
    return 'documents.business.return';
  }

  const permissionsByPage = {
    dashboard: 'dashboard.overview.view',
    purchases: 'purchases.invoices.view',
    'purchase-returns': 'purchases.returns.view',
    'quick-sales': 'quick-sales.aliases.view',
    products: 'products.catalog.view',
    offers: 'offers.promotions.view',
    inventory: 'inventory.stock.view',
    'adjust-items': 'inventory.adjustments.adjustStock',
    accounting: 'accounting.ledger.view',
    categories: 'categories.catalog.view',
    brands: 'brands.catalog.view',
    customers: 'customers.directory.view',
    parties: 'parties.directory.view',
    'reports-hub': 'reports.business.view',
    'user-report': 'users.directory.view',
    'sale-report': 'reports.business.view',
    'purchase-report': 'reports.business.view',
    'stock-report': 'reports.business.view',
    'payment-in': 'payments.receipts.view',
    'payment-out': 'payments.receipts.view',
    company: 'company.profile.view',
    financials: 'settings.company.view',
    'user-management': 'users.directory.view',
    roles: 'roles.configuration.view',
    expenses: 'expenses.management.view',
    analytics: 'analytics.overview.view',
    documents: 'documents.business.view',
    compliance: 'compliance.einvoice.view',
    'gstr1-report': 'reports.tax.view',
    'gstr2-report': 'reports.tax.view',
    'gstr3b-report': 'reports.tax.view',
    'more-reports': 'reports.business.view',
    'shift-management': 'shifts.management.view',
    settings: 'settings.configuration.view',
  };
  return permissionsByPage[page] || 'dashboard.overview.view';
}

export function canAccessPage(user, page, searchParams) {
  return hasPermission(user, getPagePermission(page, searchParams));
}
