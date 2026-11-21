import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BatchPriceHistory from './BatchPriceHistory';
import { loadBatchesCached } from '../../utils/productBatchCache';

jest.mock('../../utils/productBatchCache', () => ({
  loadBatchesCached: jest.fn(),
}));

const batches = [
  {
    id: 2,
    batchNumber: 'PUR-2',
    purchaseDate: '2026-02-02T00:00:00.000Z',
    mrp: 125,
    salePrice: 110,
    purchasePrice: 80,
  },
  {
    id: 1,
    batchNumber: 'PUR-1',
    purchaseDate: '2026-01-02T00:00:00.000Z',
    mrp: 120,
    salePrice: 105,
    purchasePrice: 75,
  },
];

beforeEach(() => {
  loadBatchesCached.mockResolvedValue(batches);
});

test.each([
  ['sales', 'Sales Price', '₹110.00'],
  ['purchase', 'Purchase Price', '₹80.00'],
])('hover shows MRP and the historical %s price', async (priceType, header, price) => {
  render(
    <BatchPriceHistory productId={12} priceType={priceType}>
      <input aria-label="Price" />
    </BatchPriceHistory>,
  );

  fireEvent.mouseEnter(screen.getByLabelText('Price'));

  expect(await screen.findByRole('columnheader', { name: header })).toBeTruthy();
  expect(screen.getByRole('columnheader', { name: 'MRP' })).toBeTruthy();
  expect(screen.getByText('PUR-2')).toBeTruthy();
  expect(screen.getByText(price)).toBeTruthy();
  await waitFor(() => {
    expect(loadBatchesCached).toHaveBeenCalledWith(12, { historyOnly: true });
  });
});

test('touch opens the history popup and a touch outside closes it', async () => {
  render(
    <BatchPriceHistory productId={12} priceType="purchase">
      <input aria-label="Price" />
    </BatchPriceHistory>,
  );

  fireEvent.touchStart(screen.getByLabelText('Price'));
  expect(await screen.findByText('Last 5 batches')).toBeTruthy();

  fireEvent.touchStart(document.body);
  await waitFor(() => {
    expect(screen.queryByText('Last 5 batches')).toBeNull();
  });
});
