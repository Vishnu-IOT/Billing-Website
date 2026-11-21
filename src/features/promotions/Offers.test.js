import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import useAppStore from '../../store/appStore';
import { useToast } from '../../hooks/useToast';
import {
  createPromotionOfferAPI,
  fetchPromotionOffersAPI,
} from '../../api/promotions';
import Offers from './Offers';

jest.mock('../../store/appStore', () => jest.fn());
jest.mock('../../hooks/useToast', () => ({
  useToast: jest.fn(),
}));
jest.mock('../../api/promotions', () => ({
  archivePromotionOfferAPI: jest.fn(),
  createPromotionOfferAPI: jest.fn(),
  fetchPromotionOffersAPI: jest.fn(),
  updatePromotionOfferAPI: jest.fn(),
}));

const mockError = jest.fn();
const mockSuccess = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.mockImplementation((selector) => selector({
    products: [
      { id: 11, name: 'Qualifying product' },
      { id: 22, name: 'Gift product' },
    ],
    categories: [],
  }));
  useToast.mockReturnValue({
    error: mockError,
    success: mockSuccess,
    toasts: [],
  });
  fetchPromotionOffersAPI.mockResolvedValue({ data: [] });
  createPromotionOfferAPI.mockResolvedValue({ success: true });
});

test('FREE_GIFT configuration collects a qualifying quantity and persists the gift quantity', async () => {
  render(<Offers />);
  await waitFor(() => expect(fetchPromotionOffersAPI).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: /new offer/i }));

  fireEvent.change(screen.getByLabelText('Offer name *'), {
    target: { value: 'Buy 3, get a gift' },
  });
  fireEvent.change(screen.getByLabelText('Offer type *'), {
    target: { value: 'FREE_GIFT' },
  });
  fireEvent.change(screen.getByLabelText('Product *'), {
    target: { value: '11' },
  });

  const threshold = screen.getByLabelText('Paid quantity to qualify *');
  fireEvent.change(threshold, { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('Gift quantity *'), {
    target: { value: '2' },
  });
  fireEvent.change(screen.getByLabelText('Gift product *'), {
    target: { value: '22' },
  });

  fireEvent.click(screen.getByRole('button', { name: /create offer/i }));

  await waitFor(() => expect(createPromotionOfferAPI).toHaveBeenCalledWith(
    expect.objectContaining({
      offerType: 'FREE_GIFT',
      productId: 11,
      buyQuantity: 3,
      freeQuantity: 0,
      giftProductId: 22,
      giftQuantity: 2,
    }),
  ));
});
