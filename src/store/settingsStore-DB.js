/* ===== SETTINGS STORE — DB-Synced Zustand Store ===== */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    fetchAppSettingsAPI,
    updateAppSettingsAPI,
    updateSettingFieldAPI,
    resetSettingsAPI,
} from '../api/appSettings';

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

    // Metadata
    isLoaded: false,
    isSyncing: false,
    lastSyncTime: null,
    syncError: null,
    companyId: 1,
};

const useSettingsStore = create(
    persist(
        (set, get) => ({
            ...defaultSettings,

            // ===== INITIALIZATION & SYNC =====

            /**
             * Load settings from database on app start
             * Falls back to localStorage if DB is unavailable
             */
            initializeSettings: async (companyId = 1) => {
                set({ isSyncing: true, companyId });
                try {
                    // Fetch from backend
                    const dbSettings = await fetchAppSettingsAPI(companyId);

                    if (dbSettings) {
                        // Settings found in DB - use them
                        set((state) => ({
                            ...dbSettings,
                            isLoaded: true,
                            isSyncing: false,
                            syncError: null,
                            lastSyncTime: new Date(),
                            companyId,
                        }));
                        return true;
                    } else {
                        // DB call failed, use localStorage (already loaded by persist middleware)
                        set({
                            isLoaded: true,
                            isSyncing: false,
                            syncError: 'Failed to fetch from DB, using cached settings',
                            companyId
                        });
                        return false;
                    }
                } catch (error) {
                    console.error('Settings initialization error:', error);
                    set({
                        isLoaded: true,
                        isSyncing: false,
                        syncError: error.message,
                        companyId,
                    });
                    return false;
                }
            },

            // ===== UPDATE OPERATIONS =====

            /**
             * Update multiple settings at once
             * Sends to DB and updates local store
             */
            updateSettings: async (newSettings) => {
                set({ isSyncing: true });
                try {
                    const companyId = get().companyId;

                    // Call backend API
                    const updated = await updateAppSettingsAPI(newSettings, companyId);

                    if (updated) {
                        set((state) => ({
                            ...state,
                            ...updated,
                            isSyncing: false,
                            syncError: null,
                            lastSyncTime: new Date(),
                        }));
                        return true;
                    }
                } catch (error) {
                    console.error('Settings update error:', error);
                    set({
                        isSyncing: false,
                        syncError: error.message,
                    });
                    // Still update locally even if DB fails
                    set((state) => ({
                        ...state,
                        ...newSettings,
                        syncError: `DB update failed: ${error.message}. Changes saved locally.`,
                    }));
                    return false;
                }
            },

            /**
             * Update a single setting field
             * More efficient for single updates
             */
            updateSettingField: async (field, value) => {
                set({ isSyncing: true });
                try {
                    const companyId = get().companyId;

                    // Call backend API
                    const updated = await updateSettingFieldAPI(field, value, companyId);

                    if (updated) {
                        set((state) => ({
                            ...state,
                            [field]: value,
                            isSyncing: false,
                            syncError: null,
                            lastSyncTime: new Date(),
                        }));
                        return true;
                    }
                } catch (error) {
                    console.error(`Setting ${field} update error:`, error);
                    set({
                        isSyncing: false,
                        syncError: error.message,
                    });
                    // Still update locally
                    set((state) => ({
                        ...state,
                        [field]: value,
                        syncError: `DB update failed for ${field}. Changes saved locally.`,
                    }));
                    return false;
                }
            },

            /**
             * Reset all settings to defaults
             */
            resetSettings: async () => {
                set({ isSyncing: true });
                try {
                    const companyId = get().companyId;
                    const reset = await resetSettingsAPI(companyId);

                    if (reset) {
                        set({
                            ...defaultSettings,
                            isLoaded: true,
                            isSyncing: false,
                            syncError: null,
                            lastSyncTime: new Date(),
                            companyId,
                        });
                        return true;
                    }
                } catch (error) {
                    console.error('Settings reset error:', error);
                    set({
                        isSyncing: false,
                        syncError: error.message,
                    });
                    return false;
                }
            },

            /**
             * Manual sync - pull fresh settings from DB
             */
            syncFromDB: async () => {
                set({ isSyncing: true });
                try {
                    const companyId = get().companyId;
                    const dbSettings = await fetchAppSettingsAPI(companyId);

                    if (dbSettings) {
                        set((state) => ({
                            ...dbSettings,
                            isLoaded: true,
                            isSyncing: false,
                            syncError: null,
                            lastSyncTime: new Date(),
                            companyId,
                        }));
                        return true;
                    }
                } catch (error) {
                    console.error('Sync from DB error:', error);
                    set({
                        isSyncing: false,
                        syncError: error.message,
                    });
                    return false;
                }
            },

            // ===== GETTERS & HELPERS =====

            /**
             * Get all settings as object
             */
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
                    gstRegistrationType: state.gstRegistrationType,
                    defaultTaxRate: state.defaultTaxRate,
                    taxCalculationMode: state.taxCalculationMode,
                    hsnDigits: state.hsnDigits,
                    roundOffInvoices: state.roundOffInvoices,
                    reverseCharge: state.reverseCharge,
                    defaultPaymentMethod: state.defaultPaymentMethod,
                    acceptedPaymentMethods: state.acceptedPaymentMethods,
                    defaultPaymentTerms: state.defaultPaymentTerms,
                    creditLimitWarning: state.creditLimitWarning,
                    defaultCreditLimit: state.defaultCreditLimit,
                    paymentRoundOff: state.paymentRoundOff,
                    printerWidth: state.printerWidth,
                    autoPrint: state.autoPrint,
                    scannerEnabled: state.scannerEnabled,
                    cameraEnabled: state.cameraEnabled,
                    receiptHeader: state.receiptHeader,
                    receiptFooter: state.receiptFooter,
                    showGstOnReceipt: state.showGstOnReceipt,
                    posGridItemDisplay: state.posGridItemDisplay,
                };
            },

            /**
             * Get a specific setting value
             */
            getSetting: (key) => get()[key],

            /**
             * Check if settings are loaded
             */
            isSettingsLoaded: () => get().isLoaded,

            /**
             * Get sync status
             */
            getSyncStatus: () => ({
                isSyncing: get().isSyncing,
                lastSyncTime: get().lastSyncTime,
                syncError: get().syncError,
            }),
        }),
        {
            name: 'erp-settings', // localStorage key - acts as fallback cache
        }
    )
);

export default useSettingsStore;