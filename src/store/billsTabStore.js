// src/store/billsTabStore.js
// Multi-Tab Billing Store using Zustand

import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Helper: Generate unique bill ID
const generateBillId = () => `bill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper: Get next invoice number (you can customize this)
const getNextInvoiceNumber = (bills) => {
    if (bills.length === 0) return 'INV-001';
    const lastBill = bills[bills.length - 1];
    const lastNum = parseInt(lastBill.invoiceNo.replace('INV-', '')) || 0;
    return `INV-${String(lastNum + 1).padStart(3, '0')}`;
};

export const useBillsTabStore = create(
    devtools(
        persist(
            (set, get) => ({
                // ════════════════════════════════════════════════════════
                // STATE
                // ════════════════════════════════════════════════════════

                /** Array of all open bills */
                openBills: [],

                /** ID of currently active bill */
                activeBillId: null,

                /** Maximum open bills allowed */
                maxOpenBills: 20,

                // ════════════════════════════════════════════════════════
                // ACTIONS
                // ════════════════════════════════════════════════════════

                /**
                 * Create a new bill tab
                 * @returns {Object} The newly created bill
                 */
                createNewBill: () =>
                    set((state) => {
                        // Check max bills limit
                        if (state.openBills.length >= state.maxOpenBills) {
                            console.error(`❌ Cannot create more than ${state.maxOpenBills} bills`);
                            return state;
                        }

                        // Create new bill object
                        const newBill = {
                            id: generateBillId(),
                            invoiceNo: getNextInvoiceNumber(state.openBills),
                            items: [],
                            customer: {
                                name: '',
                                phone: '',
                                email: '',
                                address: '',
                            },
                            totals: {
                                subtotal: 0,
                                tax: 0,
                                discount: 0,
                                globalDiscount: 0,
                                total: 0,
                            },
                            paymentMethod: 'CASH',
                            notes: '',
                            saved: false,
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                        };

                        console.log('✅ New bill created:', newBill.invoiceNo);

                        return {
                            openBills: [...state.openBills, newBill],
                            activeBillId: newBill.id,
                        };
                    }),

                /**
                 * Set the active bill (switch tabs)
                 * @param {string} billId - ID of bill to activate
                 */
                setActiveBill: (billId) =>
                    set((state) => {
                        const billExists = state.openBills.some((bill) => bill.id === billId);

                        if (!billExists) {
                            console.error(`❌ Bill not found: ${billId}`);
                            return state;
                        }

                        console.log('→ Switched to bill:', state.openBills.find((b) => b.id === billId)?.invoiceNo);

                        return { activeBillId: billId };
                    }),

                /**
                 * Update the active bill with new data
                 * @param {Object} updates - Fields to update
                 */
                updateActiveBill: (updates) =>
                    set((state) => {
                        if (!state.activeBillId) {
                            console.error('❌ No active bill to update');
                            return state;
                        }

                        return {
                            openBills: state.openBills.map((bill) =>
                                bill.id === state.activeBillId
                                    ? {
                                        ...bill,
                                        ...updates,
                                        saved: false, // Mark as unsaved when updated
                                        updatedAt: Date.now(),
                                    }
                                    : bill
                            ),
                        };
                    }),

                /**
                 * Update specific bill by ID (not necessarily active)
                 * @param {string} billId - Bill ID to update
                 * @param {Object} updates - Fields to update
                 */
                updateBill: (billId, updates) =>
                    set((state) => {
                        return {
                            openBills: state.openBills.map((bill) =>
                                bill.id === billId
                                    ? {
                                        ...bill,
                                        ...updates,
                                        updatedAt: Date.now(),
                                    }
                                    : bill
                            ),
                        };
                    }),

                /**
                 * Mark bill as saved
                 * @param {string} billId - Bill ID to mark as saved
                 */
                markBillSaved: (billId) =>
                    set((state) => ({
                        openBills: state.openBills.map((bill) =>
                            bill.id === billId
                                ? { ...bill, saved: true, updatedAt: Date.now() }
                                : bill
                        ),
                    })),

                /**
                 * Mark active bill as saved
                 */
                markActiveBillSaved: () =>
                    set((state) => ({
                        openBills: state.openBills.map((bill) =>
                            bill.id === state.activeBillId
                                ? { ...bill, saved: true, updatedAt: Date.now() }
                                : bill
                        ),
                    })),

                /**
                 * Close (remove) a bill tab
                 * @param {string} billId - Bill ID to close
                 */
                closeBill: (billId) =>
                    set((state) => {
                        const remainingBills = state.openBills.filter((bill) => bill.id !== billId);

                        // If closing active bill, switch to first remaining bill
                        let newActiveId = state.activeBillId;
                        if (state.activeBillId === billId) {
                            newActiveId = remainingBills[0]?.id || null;
                        }

                        console.log('✕ Bill closed:', state.openBills.find((b) => b.id === billId)?.invoiceNo);

                        return {
                            openBills: remainingBills,
                            activeBillId: newActiveId,
                        };
                    }),

                /**
                 * Close active bill
                 */
                closeActiveBill: () =>
                    set((state) => {
                        if (!state.activeBillId) return state;

                        const remainingBills = state.openBills.filter(
                            (bill) => bill.id !== state.activeBillId
                        );
                        const newActiveId = remainingBills[0]?.id || null;

                        console.log('✕ Active bill closed:', state.openBills.find((b) => b.id === state.activeBillId)?.invoiceNo);

                        return {
                            openBills: remainingBills,
                            activeBillId: newActiveId,
                        };
                    }),

                /**
                 * Close multiple bills (filter condition)
                 * @param {Function} predicate - Function returning true for bills to close
                 */
                closeBillsWhere: (predicate) =>
                    set((state) => {
                        const remainingBills = state.openBills.filter((bill) => !predicate(bill));

                        let newActiveId = state.activeBillId;
                        if (!remainingBills.some((bill) => bill.id === state.activeBillId)) {
                            newActiveId = remainingBills[0]?.id || null;
                        }

                        const closedCount = state.openBills.length - remainingBills.length;
                        console.log(`✕ ${closedCount} bills closed`);

                        return {
                            openBills: remainingBills,
                            activeBillId: newActiveId,
                        };
                    }),

                /**
                 * Update items in active bill
                 * @param {Array} items - New items array
                 */
                setActiveBillItems: (items) =>
                    set((state) => ({
                        openBills: state.openBills.map((bill) =>
                            bill.id === state.activeBillId
                                ? { ...bill, items, saved: false, updatedAt: Date.now() }
                                : bill
                        ),
                    })),

                /**
                 * Add item to active bill
                 * @param {Object} item - Item to add
                 */
                addItemToActiveBill: (item) =>
                    set((state) => {
                        if (!state.activeBillId) {
                            console.error('❌ No active bill');
                            return state;
                        }

                        return {
                            openBills: state.openBills.map((bill) =>
                                bill.id === state.activeBillId
                                    ? {
                                        ...bill,
                                        items: [...bill.items, item],
                                        saved: false,
                                        updatedAt: Date.now(),
                                    }
                                    : bill
                            ),
                        };
                    }),

                /**
                 * Remove item from active bill by index
                 * @param {number} index - Index of item to remove
                 */
                removeItemFromActiveBill: (index) =>
                    set((state) => {
                        if (!state.activeBillId) return state;

                        return {
                            openBills: state.openBills.map((bill) =>
                                bill.id === state.activeBillId
                                    ? {
                                        ...bill,
                                        items: bill.items.filter((_, i) => i !== index),
                                        saved: false,
                                        updatedAt: Date.now(),
                                    }
                                    : bill
                            ),
                        };
                    }),

                /**
                 * Update item in active bill
                 * @param {number} index - Index of item
                 * @param {Object} updatedItem - Updated item data
                 */
                updateItemInActiveBill: (index, updatedItem) =>
                    set((state) => {
                        if (!state.activeBillId) return state;

                        return {
                            openBills: state.openBills.map((bill) =>
                                bill.id === state.activeBillId
                                    ? {
                                        ...bill,
                                        items: bill.items.map((item, i) =>
                                            i === index ? { ...item, ...updatedItem } : item
                                        ),
                                        saved: false,
                                        updatedAt: Date.now(),
                                    }
                                    : bill
                            ),
                        };
                    }),

                /**
                 * Update customer in active bill
                 * @param {Object} customer - Customer data
                 */
                setActiveBillCustomer: (customer) =>
                    set((state) => ({
                        openBills: state.openBills.map((bill) =>
                            bill.id === state.activeBillId
                                ? { ...bill, customer, saved: false, updatedAt: Date.now() }
                                : bill
                        ),
                    })),

                /**
                 * Update totals in active bill
                 * @param {Object} totals - Totals data
                 */
                setActiveBillTotals: (totals) =>
                    set((state) => ({
                        openBills: state.openBills.map((bill) =>
                            bill.id === state.activeBillId
                                ? { ...bill, totals, saved: false, updatedAt: Date.now() }
                                : bill
                        ),
                    })),

                /**
                 * Clear all bills
                 */
                clearAllBills: () =>
                    set(() => {
                        console.log('⚠️ Clearing all bills');
                        return {
                            openBills: [],
                            activeBillId: null,
                        };
                    }),

                /**
                 * Set max open bills limit
                 * @param {number} max - Max bills allowed
                 */
                setMaxOpenBills: (max) =>
                    set(() => ({ maxOpenBills: max })),

                // ════════════════════════════════════════════════════════
                // SELECTORS / GETTERS
                // ════════════════════════════════════════════════════════

                /**
                 * Get the active bill object
                 * @returns {Object|null} Active bill or null
                 */
                getActiveBill: () => {
                    const state = get();
                    return state.openBills.find((bill) => bill.id === state.activeBillId) || null;
                },

                /**
                 * Get bill by ID
                 * @param {string} billId - Bill ID
                 * @returns {Object|null} Bill or null
                 */
                getBillById: (billId) => {
                    const state = get();
                    return state.openBills.find((bill) => bill.id === billId) || null;
                },

                /**
                 * Get bill by invoice number
                 * @param {string} invoiceNo - Invoice number
                 * @returns {Object|null} Bill or null
                 */
                getBillByInvoiceNo: (invoiceNo) => {
                    const state = get();
                    return state.openBills.find((bill) => bill.invoiceNo === invoiceNo) || null;
                },

                /**
                 * Get count of unsaved bills
                 * @returns {number} Count of unsaved bills
                 */
                getUnsavedBillsCount: () => {
                    const state = get();
                    return state.openBills.filter((bill) => !bill.saved).length;
                },

                /**
                 * Get all unsaved bills
                 * @returns {Array} Unsaved bills
                 */
                getUnsavedBills: () => {
                    const state = get();
                    return state.openBills.filter((bill) => !bill.saved);
                },

                /**
                 * Check if bill has unsaved changes
                 * @param {string} billId - Bill ID
                 * @returns {boolean} True if unsaved
                 */
                isBillUnsaved: (billId) => {
                    const state = get();
                    const bill = state.openBills.find((b) => b.id === billId);
                    return bill ? !bill.saved : false;
                },

                /**
                 * Get total items across all bills
                 * @returns {number} Total item count
                 */
                getTotalItemsCount: () => {
                    const state = get();
                    return state.openBills.reduce((sum, bill) => sum + bill.items.length, 0);
                },

                /**
                 * Get total revenue from all bills
                 * @returns {number} Total revenue
                 */
                getTotalRevenue: () => {
                    const state = get();
                    return state.openBills.reduce((sum, bill) => sum + (bill.totals.total || 0), 0);
                },

                /**
                 * Check if can create more bills
                 * @returns {boolean} True if under limit
                 */
                canCreateMoreBills: () => {
                    const state = get();
                    return state.openBills.length < state.maxOpenBills;
                },

                /**
                 * Get open bills count
                 * @returns {number} Number of open bills
                 */
                getOpenBillsCount: () => {
                    const state = get();
                    return state.openBills.length;
                },
            }),
            {
                name: 'bills-tab-store', // LocalStorage key
                partialize: (state) => ({
                    // Only persist these fields (don't persist activeBillId on refresh)
                    openBills: state.openBills,
                    maxOpenBills: state.maxOpenBills,
                }),
            }
        )
    )
);

// ════════════════════════════════════════════════════════
// EXPORT HOOK ALIASES FOR CONVENIENCE
// ════════════════════════════════════════════════════════

export const useActiveBill = () => {
    const activeBillId = useBillsTabStore((state) => state.activeBillId);
    const openBills = useBillsTabStore((state) => state.openBills);
    return openBills.find((bill) => bill.id === activeBillId) || null;
};

export const useOpenBills = () => useBillsTabStore((state) => state.openBills);

export const useActiveBillId = () => useBillsTabStore((state) => state.activeBillId);

export const useUnsavedBillsCount = () => {
    const openBills = useBillsTabStore((state) => state.openBills);
    return openBills.filter((bill) => !bill.saved).length;
};

export const useBillsActions = () =>
    useBillsTabStore((state) => ({
        createNewBill: state.createNewBill,
        setActiveBill: state.setActiveBill,
        updateActiveBill: state.updateActiveBill,
        closeBill: state.closeBill,
        closeActiveBill: state.closeActiveBill,
        markBillSaved: state.markBillSaved,
        markActiveBillSaved: state.markActiveBillSaved,
        setActiveBillItems: state.setActiveBillItems,
        addItemToActiveBill: state.addItemToActiveBill,
        removeItemFromActiveBill: state.removeItemFromActiveBill,
        updateItemInActiveBill: state.updateItemInActiveBill,
        setActiveBillCustomer: state.setActiveBillCustomer,
        setActiveBillTotals: state.setActiveBillTotals,
        clearAllBills: state.clearAllBills,
    }));