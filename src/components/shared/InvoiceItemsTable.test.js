import React from 'react';
import { render, screen } from '@testing-library/react';
import { InvoiceItemsTable } from './InvoiceItemsTable';
import BatchPriceHistory from './BatchPriceHistory';

jest.mock('./BatchSelector', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./BatchPriceHistory', () => ({
  __esModule: true,
  default: jest.fn(({ children }) => children),
}));

describe('InvoiceItemsTable product selector props', () => {
  test('renders desktop product search with category and brand data', () => {
    window.innerWidth = 1024;
    const { container } = render(
      <InvoiceItemsTable
        items={[{
          productId: 1,
          productName: 'SurfXL Washing Powder 500g',
          quantity: 1,
          price: 10,
          total: 10,
          taxRate: 0,
          taxAmount: 0,
        }]}
        products={[{ id: 1, name: 'SurfXL Washing Powder 500g' }]}
        categories={[{ id: 2, category: 'Laundry' }]}
        brands={[{ id: 7, name: 'Kamachi' }]}
        onUpdateItem={jest.fn()}
        onRemoveItem={jest.fn()}
        onAddItem={jest.fn()}
      />,
    );

    expect(screen.getByText('SurfXL Washing Powder 500g')).toBeTruthy();
    const table = container.querySelector('table');
    const addRowButton = screen.getByRole('button', { name: '+ Add Row' });
    expect(
      table.compareDocumentPosition(addRowButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(addRowButton.parentElement.style.justifyContent).toBe('flex-end');
  });

  test.each([true, false])(
    'shows purchase-price history on the rate input when GST pricing is %s',
    (gstPricing) => {
      BatchPriceHistory.mockClear();
      render(
        <InvoiceItemsTable
          items={[{
            productId: 1,
            productName: 'Test Product',
            quantity: 1,
            price: 10,
            salePrice: 12,
            total: 10,
          }]}
          products={[{ id: 1, name: 'Test Product' }]}
          categories={[]}
          brands={[]}
          onUpdateItem={jest.fn()}
          onRemoveItem={jest.fn()}
          onAddItem={jest.fn()}
          priceSide="purchase"
          gstPricing={gstPricing}
        />,
      );

      expect(
        BatchPriceHistory.mock.calls.some(
          ([props]) => props.priceType === 'purchase',
        ),
      ).toBe(true);
    },
  );
});
