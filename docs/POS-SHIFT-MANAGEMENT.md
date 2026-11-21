# POS Shift Management

This document describes the current BillFlow POS shift workflow, its cash
calculations, history screen, API calls, and implementation limitations.

## Related implementation

Frontend:

- `src/features/pos/ShiftManagement.js` — shift history, filters, status,
  details, and CSV export.
- `src/features/sales/POSScreen.js` — opens/closes shifts from the POS screen
  and attaches the active shift ID to a saved B2C sale.
- `src/store/posStore.js` — Zustand state and shift API actions.
- `src/api/pos.js` — HTTP requests for current, start, end, and history actions.
- `src/styles/ShiftManagement.css` — history screen styling.

Backend:

- `mysql-controllers/posController.js` — current shift, start, end, and history
  endpoints.
- `mysql-models/POSShift.js` — persisted shift fields.
- `mysql-controllers/salesController.js` and `mysql-models/SalesBill.js` — POS
  sale association with a shift.

## Shift lifecycle

### 1. Check for an open shift

When the POS screen initializes, it calls `checkCurrentShift()` and stores the
result as `activeShift`.

The API is `GET /api/pos/shifts/current`, with the authenticated user's ID and
company ID as query parameters. The request also carries the auth token. The
backend verifies that supplied IDs match the authenticated user and loads only
that user's newest `OPEN` shift in the authenticated company. It never uses a
frontend-supplied identity as the source of authority.

The API helper logs a fetch error and returns `null`. The store then sets
`activeShift` to that value.

### 2. Start a shift

The POS shift button opens an opening-cash dialog when there is no active
shift. The operator counts notes and coins; the POS calculates the opening
float from those counts and submits:

```json
{
  "userId": 7,
  "companyId": 3,
  "openingFloat": 700,
  "openingDenominations": {
    "500": 1,
    "100": 2
  },
  "terminalId": "POS-TERMINAL-1"
}
```

The frontend includes zero counts for denominations not shown above. The
backend validates whole-number counts, recomputes the total, verifies that it
matches `openingFloat`, and stores both the total and denomination snapshot in
the existing `pos_shifts` row. Amount-only requests remain supported for older
clients. The POS sends the logged-in user's actual ID and company ID; it does not use a
hard-coded user fallback. The backend derives both values from the verified
token and rejects a mismatching supplied user or company. A transaction locks
the authenticated user row before checking for another open
shift, so concurrent attempts for the same user cannot create duplicates.
Different users in the same company can open shifts at the same time. The
backend creates each shift with an opening time and `OPEN` status. Monetary
fields such as the opening float are stored as decimal values with two
fractional digits.

On success, the store sets `activeShift` to the returned shift and the POS
closes the dialog. On error, the POS displays a toast and leaves the dialog
available for correction.

### 3. Record POS sales against the shift

When a POS bill is saved, the frontend includes `shiftId: activeShift.id` in
the B2C sale request, or `null` if there is no active shift. The shift ID
associates the sale with its shift. When a shift ID is supplied, the backend
authenticates the request and verifies that the shift is open and belongs to
that authenticated user and company before saving the sale.

### 4. Close a shift

The POS shift button opens the cash drawer reconciliation dialog when a shift
is active. The dialog displays opening float, bill count, reported payment
totals, and expected closing cash. The operator counts notes and coins; the
POS calculates actual cash and the difference before submission. The close
request contains:

```json
{
  "shiftId": 123,
  "closingCashActual": 2550,
  "closingDenominations": {
    "500": 5,
    "50": 1
  }
}
```

As with opening counts, omitted denomination values are zero. The backend
validates the counts, verifies the submitted total, and saves the denomination
snapshot in the same transaction that closes the shift. Legacy amount-only
close requests remain supported.

The backend calculates:

```text
expected closing cash = opening float + cash sales + cash in - cash out - cash refunds
difference            = actual closing cash - expected closing cash
```

It saves expected cash, actual cash, closed time, and `CLOSED` status. A
positive difference means the counted drawer has more cash than expected; a
negative difference means it is short. The response includes the difference.
The frontend displays that difference in a success toast and clears the active
shift in the store. A user can close only their own shift; an `Owner` or `Admin`
can close a shift belonging to another user in the same company.

The POS expected-cash calculation accepts a missing or `null` shift while the
active shift is being loaded, preventing the initial render from crashing.

## Cash and sales calculations

The shift model has these monetary and count fields:

| Field | Intended meaning |
|---|---|
| `openingFloat` | Cash placed in the drawer at shift start, derived from denominations |
| `openingDenominations` | JSON snapshot of opening note and coin counts |
| `companyId` | Company scope of the shift, derived from the authenticated user |
| `cashSalesTotal` | Cash tender actually collected for POS bills on the shift |
| `cashInTotal` | Physical cash added to the drawer |
| `cashOutTotal` | Physical cash removed from the drawer |
| `cashRefundsTotal` | Physical cash refunded from the drawer |
| `cardSalesTotal` | Card sales associated with the shift |
| `upiSalesTotal` | UPI sales associated with the shift |
| `otherSalesTotal` | Other non-cash tender, such as bank transfer or cheque |
| `closingCashExpected` | Opening float + cash sales + cash in - cash out - cash refunds |
| `closingCashActual` | Operator-counted cash at close |
| `closingDenominations` | JSON snapshot of closing note and coin counts |
| `totalSalesCount` | Number of sales associated with the shift |

On each B2C POS sale create, edit, cancellation, or return transaction, the
backend recalculates the shift's bill count and tender totals from its
non-cancelled sales. The recalculation is persisted in the same transaction as
the sale operation, making retries and edits idempotent rather than
incrementing a bill twice. Only sales linked to the exact shift and its owner
are included. Separate `PaymentIn` invoice-payment records are not included;
POS tender allocations saved with the sale are the source for shift totals.

POS tender allocations are stored as JSON in `sales.paymentDetails`. The
aggregation reads cash, UPI, card, and other numeric allocation values; it
also supports allocation arrays and falls back to the single payment method
when no allocation breakdown is present. `returnCredit` and change metadata
are not treated as tender received. Applying a returned-sale credit to a new
bill reduces the new bill's payable amount, so only the new bill's actual
cash/card/UPI allocations are added to its shift. Existing returns issue
store credit; they are not physical cash refunds and do not reduce drawer
cash. The current system has no cash-in, cash-out, or physical cash-refund
entry workflow, so those adjustment totals default to zero until such
transactions are supported.

## Shift Management history screen

### Defaults and filters

The page loads history on mount. The store's default filters are:

- From date: today.
- To date: today.
- Employee: all.
- Status: all.

Date fields display in the shared `DD/MM/YYYY` format while the API receives
ISO `YYYY-MM-DD` strings. Employee choices are fetched through
`fetchCompanyUsersAPI(1)`. Date, employee, and status values remain draft state
until **Apply Filters** is clicked.

The history request is `GET /api/pos/shifts/all-shifts`, with optional
`userId`, `fromDate`, `toDate`, and `status` parameters. It requires an
authenticated `Owner` or `Admin`; the backend scopes results to that user's
company regardless of any frontend company parameter. The backend filters
shifts by their `openedAt` timestamp and returns them newest first. The default
date range therefore means shifts opened today; it does not filter by closing
date.

### Table and status

The table displays shift ID, employee, start/end time, expected cash, actual
cash, difference, status, and a details action.

- For an open shift, expected cash in the table is calculated in the frontend
  using the same opening float + cash sales + cash-in - cash-out - cash-refunds
  formula as the close endpoint. Actual cash and difference are shown as `--`.
- For a closed shift, the table uses the saved `closingCashExpected` and
  `closingCashActual`; difference is `actual - expected`.
- `OPEN` shifts are labeled **Active**.
- Closed shifts with an absolute difference greater than `0.009` are labeled
  **Discrepancy**; otherwise, they are labeled **Closed**.

Pagination is client-side, with five shifts per page. The API response count
is kept in the store, but the page count and pagination use the fetched
`shiftList.length`.

### Shift details

The eye action opens a details dialog with employee name/email, terminal,
status, start/end timestamps, opening float, cash/card/UPI sales, total sales
count, expected and actual closing cash, difference, and optional notes.

For an open shift, some close-only fields are absent and are formatted as zero
in this dialog; the main table instead suppresses actual cash and difference
for open shifts.

### CSV export and printing

**Export CSV** exports all currently fetched shifts, not just the current
pagination page. For open shifts, expected cash is recomputed as opening float
plus cash sales and actual/difference are blank. For closed shifts, the saved
expected and actual values and their difference are exported. The filename
includes today's ISO date.

The component has a print handler, but its print button is commented out in the
header. The table marks controls as non-printable for the existing print
stylesheet.

## API summary

| Operation | Request |
|---|---|
| Load current shift | `GET /api/pos/shifts/current?userId=...` |
| Start shift | `POST /api/pos/shifts/start` with user, opening float, denomination counts, terminal |
| Close shift | `POST /api/pos/shifts/end` with shift ID, actual cash, and denomination counts |
| List shift history | `GET /api/pos/shifts/all-shifts` with optional filters |

Shift API helpers add the application's auth headers. Start, close, history,
and current-shift errors are logged and surfaced to the caller. Shift
authorization comes from the verified token, not request payload identity.

The backend schema update is migration
`20261106030000-add-pos-shift-denominations.js` in the billing-backend
repository. Apply it with `npm run migrate` before deploying the frontend
denomination workflow.

## Current behavior notes

- The POS reloads the active shift when the authenticated user or company
  changes, clears the previous user's in-memory shift first, and ignores stale
  responses from earlier user lookups.
- The history page fetches employees using the authenticated user's company.
- Existing shifts are backfilled with their owner's company ID during the
  runtime schema migration.
- Payment totals and bill count are present in the model and UI, but are not
  updated by the inspected sale-save code.
- Expected cash does not include card or UPI sales, which is correct for a
  cash drawer calculation; those remain informational payment totals.
- The expected-cash formula does not include cash refunds, cash payouts,
  deposits, or withdrawals. No shift fields or calculations for those flows
  appear in the inspected implementation.
- Shift start/close and filter state are managed by the frontend store; the
  store does not persist `activeShift` across a browser reload. The POS checks
  the backend again on mount.
