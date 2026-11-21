import { canAccessPage, getPagePermission, hasPermission } from './permissions';

describe('dynamic route permissions', () => {
  const user = {
    permissions: [
      'pos.billing.access',
      'sales.invoices.view',
      'documents.business.return',
      'products.catalog.view',
    ],
  };

  test('selects separate POS and invoice permissions from the bill type', () => {
    expect(getPagePermission('sales', new URLSearchParams('type=B2C'))).toBe('pos.billing.access');
    expect(getPagePermission('sales', new URLSearchParams('type=B2B'))).toBe('sales.invoices.view');
  });

  test('protects edit and return routes with action-specific permissions', () => {
    expect(getPagePermission('sales/edit/12', new URLSearchParams())).toBe('sales.invoices.edit');
    expect(getPagePermission('documents', new URLSearchParams('type=SALES_RETURN'))).toBe('documents.business.return');
    expect(canAccessPage(user, 'documents', new URLSearchParams('type=SALES_RETURN'))).toBe(true);
    expect(canAccessPage(user, 'sales/edit/12', new URLSearchParams())).toBe(false);
  });

  test('checks explicit permissions and denies unknown page access by default', () => {
    expect(hasPermission(user, 'products.catalog.view')).toBe(true);
    expect(canAccessPage(user, 'user-management', new URLSearchParams())).toBe(false);
    expect(hasPermission({ permissions: ['users.directory.manage'] }, 'users.directory.create')).toBe(true);
  });

  test('Administrator UI access includes future permissions while Staff remains limited to POS', () => {
    expect(hasPermission({ roleSystemKey: 'ADMIN' }, 'future.module.action')).toBe(true);
    expect(canAccessPage(
      { roleSystemKey: 'ADMIN' },
      'purchase-returns',
      new URLSearchParams()
    )).toBe(true);

    const staff = {
      roleSystemKey: 'STAFF',
      permissions: [
        'pos.billing.access',
        'pos.billing.create',
        'quick-sales.creation.create',
      ],
    };
    expect(canAccessPage(staff, 'sales', new URLSearchParams('type=B2C'))).toBe(true);
    expect(hasPermission(staff, 'quick-sales.creation.create')).toBe(true);
    expect(hasPermission(staff, 'quick-sales.aliases.review')).toBe(false);
    expect(hasPermission(staff, 'customers.loyalty.manage')).toBe(false);
    expect(canAccessPage(staff, 'sales', new URLSearchParams('type=B2B'))).toBe(false);
    expect(canAccessPage(staff, 'customers', new URLSearchParams())).toBe(false);
    expect(canAccessPage(staff, 'purchases', new URLSearchParams())).toBe(false);
  });
});
