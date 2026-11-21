import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import BarcodeInput from './BarcodeInput';

describe('BarcodeInput product search', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('matches multiple partial tokens and still selects an exact scanned barcode immediately', () => {
    jest.useFakeTimers();
    const product = {
      id: 1,
      name: 'SurfXL Washing Powder 500g',
      barcode: '8901234567890',
      sku: 'SURF-500',
    };
    const onProductFound = jest.fn();
    render(
      <BarcodeInput
        products={[product]}
        onProductFound={onProductFound}
      />,
    );
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: 'powder sur 500' } });
    act(() => jest.advanceTimersByTime(150));
    expect(screen.getByText(product.name)).toBeTruthy();

    fireEvent.change(input, { target: { value: product.barcode } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onProductFound).toHaveBeenCalledWith(product);
  });
});
