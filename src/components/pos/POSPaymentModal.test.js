import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import POSPaymentModal from './POSPaymentModal';

describe('POSPaymentModal', () => {
  test('keeps cash tender and change calculations intact in the fiscal checkout', () => {
    const onConfirm = jest.fn();
    render(
      <POSPaymentModal
        open
        totals={{
          grandTotal: 125,
          subtotal: 120,
          totalTax: 5,
          rawTotal: 125,
          roundOff: 0,
        }}
        paymentMethod="Cash"
        onPaymentMethodChange={jest.fn()}
        customerInfo={{ name: 'Walk-in Customer', phone: '' }}
        onCustomerChange={jest.fn()}
        invoiceNo="INV/26-27/0001"
        saleDate="2026-11-16"
        onConfirm={onConfirm}
        onClose={jest.fn()}
        saving={false}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Checkout' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Tendered amount'), {
      target: { value: '175' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /CONFIRM & PRINT BILL/i }),
    );

    expect(onConfirm).toHaveBeenCalledWith(
      { cash: 125 },
      { amountReceived: 175, amountReturned: 50 },
    );
    expect(screen.getByText('₹50.00')).toBeTruthy();
    expect(screen.getByText(/FISCAL LEDGER/)).toBeTruthy();
    expect(screen.getAllByText('₹125.00').length).toBeGreaterThan(0);
  });

  test('preserves split tender allocations in checkout', () => {
    const onConfirm = jest.fn();
    render(
      <POSPaymentModal
        open
        totals={{ grandTotal: 100, subtotal: 95, totalTax: 5, roundOff: 0 }}
        paymentMethod="Split"
        onPaymentMethodChange={jest.fn()}
        customerInfo={{ name: 'Customer', phone: '9876543210' }}
        invoiceNo="INV/26-27/0002"
        saleDate="2026-11-17"
        onConfirm={onConfirm}
        onClose={jest.fn()}
        saving={false}
      />,
    );

    fireEvent.change(screen.getByLabelText('CASH amount'), {
      target: { value: '40' },
    });
    fireEvent.change(screen.getByLabelText('CARD amount'), {
      target: { value: '30' },
    });
    fireEvent.change(screen.getByLabelText('UPI amount'), {
      target: { value: '30' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /CONFIRM & PRINT BILL/i }),
    );

    expect(onConfirm).toHaveBeenCalledWith(
      { cash: 40, card: 30, upi: 30 },
      { amountReceived: 100, amountReturned: 0 },
    );
  });

  test('keeps paise in the amount due without showing a round-off adjustment', () => {
    const onConfirm = jest.fn();
    render(
      <POSPaymentModal
        open
        totals={{ grandTotal: 118.5, subtotal: 100, totalTax: 18.5, roundOff: 0 }}
        paymentMethod="Cash"
        onPaymentMethodChange={jest.fn()}
        customerInfo={{ name: 'Customer', phone: '' }}
        invoiceNo="INV/26-27/0004"
        onConfirm={onConfirm}
        onClose={jest.fn()}
        saving={false}
      />,
    );

    expect(screen.getAllByText('₹118.50').length).toBeGreaterThan(0);
    expect(screen.queryByText('ROUND OFF ADJUSTMENT')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: /CONFIRM & PRINT BILL/i }),
    );

    expect(onConfirm).toHaveBeenCalledWith(
      { cash: 118.5 },
      { amountReceived: 118.5, amountReturned: 0 },
    );
  });

  test('shows final round-off separately without changing line amounts', () => {
    render(
      <POSPaymentModal
        open
        totals={{
          grandTotal: 436,
          preCreditGrandTotal: 436,
          afterGlobalDiscount: 435.97,
          subtotal: 435.97,
          totalTax: 0,
          roundOff: 0.03,
        }}
        paymentMethod="Cash"
        onPaymentMethodChange={jest.fn()}
        customerInfo={{ name: 'Customer', phone: '' }}
        invoiceNo="INV/26-27/0005"
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        saving={false}
      />,
    );

    expect(screen.getByText('INVOICE TOTAL BEFORE ROUND-OFF')).toBeTruthy();
    expect(screen.getAllByText('₹435.97')).toHaveLength(2);
    expect(screen.getByText('+₹0.03')).toBeTruthy();
    expect(screen.getAllByText('₹436.00')).toHaveLength(2);
  });

  test('requires explicit opt-in before showing points to redeem', () => {
    const onRedeemLoyaltyOptInChange = jest.fn();
    const onLoyaltyPointsToRedeemChange = jest.fn();
    render(
      <POSPaymentModal
        open
        totals={{ grandTotal: 90, subtotal: 95, totalTax: 5, roundOff: 0 }}
        paymentMethod="Cash"
        onPaymentMethodChange={jest.fn()}
        customerInfo={{ name: 'Customer', phone: '9876543210' }}
        invoiceNo="INV/26-27/0003"
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        saving={false}
        loyaltyRedemptionEnabled
        availableLoyaltyPoints={25}
        maximumRedeemablePoints={20}
        loyaltyPointsToRedeem={10}
        loyaltyRedemptionAmountPerPoint={1}
        redeemLoyaltyOptIn={false}
        onRedeemLoyaltyOptInChange={onRedeemLoyaltyOptInChange}
        onLoyaltyPointsToRedeemChange={onLoyaltyPointsToRedeemChange}
      />,
    );

    expect(screen.queryByLabelText(/POINTS TO REDEEM/)).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Redeem loyalty points' }));
    expect(onRedeemLoyaltyOptInChange).toHaveBeenCalledWith(true);
  });
});
