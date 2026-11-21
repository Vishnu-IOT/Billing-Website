import { act, renderHook } from '@testing-library/react';
import { usePagination } from '../hooks/usePagination';
import {
  matchesProductSearch,
  normalizeProductSearchTokens,
} from './productSearch';

describe('product search', () => {
  const product = {
    name: 'SurfXL Washing Powder 500g',
    sku: 'SURF-500',
    barcode: '8901234567890',
    brandId: 4,
    categoryId: 9,
  };

  test.each([
    'sur',
    'surfxl',
    'sur 500g',
    'surfxl was',
    'washing 500',
    'powder sur',
    'xl 500g',
  ])('matches product name tokens in any order: %s', (search) => {
    expect(matchesProductSearch(product, search)).toBe(true);
  });

  test('matches tokens against SKU, barcode, brand, and category fields', () => {
    expect(matchesProductSearch(product, 'surf 500', ['SURF-500'])).toBe(true);
    expect(matchesProductSearch(product, '890123 67890')).toBe(true);
    expect(matchesProductSearch(product, product.barcode)).toBe(true);
    expect(
      matchesProductSearch(product, 'kamachi laund', [
        'Kamachi Brand',
        'Laundry Category',
      ]),
    ).toBe(true);
  });

  test('trims and ignores extra whitespace and case', () => {
    expect(normalizeProductSearchTokens('  SUR   500G  ')).toEqual(['sur', '500g']);
    expect(matchesProductSearch(product, '  SUR   500G  ')).toBe(true);
  });

  test('empty search matches all products and unrelated tokens do not', () => {
    expect(matchesProductSearch(product, '   ')).toBe(true);
    expect(matchesProductSearch(product, 'surf 1kg')).toBe(false);
  });

  test('pagination is applied to the filtered result set', () => {
    const filteredProducts = Array.from({ length: 15 }, (_, index) => ({
      ...product,
      id: index + 1,
    })).filter((item) => matchesProductSearch(item, 'sur 500g'));
    const { result } = renderHook(() => usePagination(filteredProducts, 10));

    expect(result.current.total).toBe(15);
    expect(result.current.paginated).toHaveLength(10);
    act(() => result.current.goToPage(2));
    expect(result.current.from).toBe(11);
    expect(result.current.paginated).toHaveLength(5);
  });
});
