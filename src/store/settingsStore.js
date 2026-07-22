/* ===== SETTINGS STORE — Persisted Zustand Store ===== */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const defaultSettings = {
  // Invoice & Billing
  invoicePrefix: 'INV',
  invoiceYearFormat: 'YY-YY',
  invoiceSeparator: '-',
  invoiceStartingNumber: '1',
  billTheme: 'classic',
  termsAndConditions: 'Goods once sold will not be returned.',
  defaultDueDays: 30,
  dateFormat: 'DD/MM/YYYY',
  showBankDetails: false,
  showUpiQr: false,
  showSignature: false,

  // Tax & GST
  gstRegistrationType: 'Regular',
  defaultTaxRate: '18',
  taxCalculationMode: 'Inclusive',
  hsnDigits: '4',
  roundOffInvoices: true,
  reverseCharge: false,

  // Payments
  defaultPaymentMethod: 'Cash',
  acceptedPaymentMethods: ['Cash', 'UPI', 'Bank Transfer', 'Cheque'],
  defaultPaymentTerms: 'Immediate',
  creditLimitWarning: false,
  defaultCreditLimit: 50000,
  paymentRoundOff: true,

  // POS & Printing
  printerWidth: '80', // '58' | '80'
  autoPrint: false,
  scannerEnabled: true,
  cameraEnabled: true,
  receiptHeader: '',
  receiptFooter: 'Thank you for shopping with us!',
  showGstOnReceipt: true,
  posGridItemDisplay: 'Name + Price',
};

const useSettingsStore = create(
  persist(
    (set, get) => ({
      ...defaultSettings,

      // Update specific settings section or key-value pairs
      updateSettings: (newSettings) =>
        set((state) => ({
          ...state,
          ...newSettings,
        })),

      // Reset to defaults
      resetSettings: () => set(defaultSettings),

      // Backward-compatible settings object getter
      getSettings: () => {
        const state = get();
        return {
          invoicePrefix: state.invoicePrefix,
          invoiceYearFormat: state.invoiceYearFormat,
          invoiceSeparator: state.invoiceSeparator,
          invoiceStartingNumber: state.invoiceStartingNumber,
          billTheme: state.billTheme,
          termsAndConditions: state.termsAndConditions,
          defaultDueDays: state.defaultDueDays,
          dateFormat: state.dateFormat,
          showBankDetails: state.showBankDetails,
          showUpiQr: state.showUpiQr,
          showSignature: state.showSignature,
        };
      },
    }),
    {
      name: 'erp-settings', // localStorage key
    }
  )
);

export default useSettingsStore;
