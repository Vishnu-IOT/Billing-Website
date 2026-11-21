# Party Storage and Billing

This guide describes how BillFlow stores parties and associates them with sales,
purchases, and payments.

## What is a party?

A party is a business/customer/vendor record used as the counterparty on a
regular sale invoice, purchase bill, or other party-linked record. The same
`parties` table is used for both customers and vendors; the business role is
determined by the transaction, not by a separate party type field.

POS walk-in customers and loyalty accounts are separate. They are stored in
the `customers` table and linked to sales using `customerId`; they are not
automatically party records.

## What is stored

Party data is stored in the MySQL `parties` table through the Sequelize model
`mysql-models/Party.js`.

| Field | Database behavior | Form behavior |
|---|---|---|
| `id` | Auto-increment primary key | Generated when saved |
| `name` | Required, non-empty string | Required |
| `phone` | Required string | Required; the current form validates 10 digits |
| `email` | Optional string; unique when present; validated as an email when non-empty | Optional |
| `GST` | Nullable; registered parties require a valid GSTIN | Shown only for registered parties; validated as a 15-character GSTIN |
| `gstRegistrationType` | `REGISTERED` or `UNREGISTERED`; defaults to `UNREGISTERED` | Selected in the party form |
| `address` | Required string | Required |
| `createdAt`, `updatedAt` | Added by Sequelize timestamps | Managed by the backend |

Party fields do not include invoice totals, payment status, product data, or
company ownership. Those belong to the relevant transaction or other
application records. The Party model currently has no `companyId` field.

## Adding and editing parties

In the **Parties** page, select **Add Party**, enter the required fields, and
save. The frontend calls:

```text
POST /api/parties/add-Party
```

with a JSON body like:

```json
{
  "name": "Example Traders",
  "phone": "9876543210",
  "email": "accounts@example.com",
  "GST": "29ABCDE1234F1Z5",
  "gstRegistrationType": "REGISTERED",
  "address": "12 Market Road, Bengaluru"
}
```

The backend validates the record and creates it in `parties`. An empty email is
stored as `NULL`. Editing sends the updated fields to
`POST /api/parties/update-Party/:id`; the party ID remains the same, so linked
transactions remain associated with that record.

Other party endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/parties/get-Party` | List parties for the selector and Parties page |
| `GET /api/parties/:id` | Fetch one party |
| `DELETE /api/parties/delete-Party/:id` | Delete a party |
| `GET /api/parties/invoiceById-Party/:id` | List that party's sales and purchases |
| `GET /api/parties/get-Ageing/:id` | Return sales aging buckets for the party |

The frontend loads the party list into the app store. Invoice forms use a party
selector to choose a saved record and submit its `id` as `partyId`.

## Billing against a party

### Sale invoice

A regular sale invoice stores a nullable `partyId` in the `sales` table. The
sales model also stores invoice number/date, bill type, line items, subtotal
(`baseRate`), tax, total, discount, amount paid, and payment status.

The shared sale-invoice form requires a party selection and includes
`partyId` in the request to:

```text
POST /api/sales/add-sales
```

Editing a sale updates its `partyId` and other invoice fields. B2C POS sales
may instead use `customerId` for a walk-in/loyalty customer; their party link is
optional.

### Purchase bill

A purchase bill stores a required `partyId` in the `purchases` table, normally
identifying the supplier. The purchase record holds the purchase invoice
number/date, items, totals, discounts, tax, amount paid, payment status, and
warehouse. Its party link is submitted to:

```text
POST /api/purchase/add-purchase
```

Purchase bills are edited through `PUT /api/purchase/updatebyid-purchase/:id`.
Product quantities, batches, and inventory are recorded on purchase line
items; they are not stored in the party record.

#### Supplier invoice tax treatment

The purchase form requires an invoice type that matches the supplier's GST
registration:

| Supplier status | Allowed purchase invoice type | Purchase tax calculation |
|---|---|---|
| Registered | GST Invoice | Applies product GST; resolves CGST + SGST or IGST from supplier/company state codes, unless explicitly overridden |
| Registered | Bill of Supply | Does not extract or add GST |
| Unregistered | Non-GST Invoice | Does not extract or add GST |

ITC is ineligible by default and must be explicitly enabled for a GST Invoice.
Reverse charge is a separate manual flag and amount; it is recorded on the
purchase bill and is not added to the supplier invoice total. Purchase tax
components and the product's GST rate are saved as line snapshots, while the
supplier invoice type, tax type, reverse-charge details, and ITC values are
saved on the purchase record. Editing a purchase bill retains its tax policy
and updates its product and batch stock in the same transaction.

The migration backfills valid existing GSTINs as `REGISTERED` and all other
existing party records as `UNREGISTERED`. Existing purchase invoices keep a
nullable invoice type until edited; legacy tax values are not reinterpreted.

### How the link works

The `partyId` on a bill is a foreign-key-style reference to `parties.id`.
Sequelize defines `Party.hasMany(Sale)` and `Sale.belongsTo(Party)`, and the
equivalent relationship for purchases. Invoice APIs can include the related
party so the UI can display its name and contact details.

The bill stores the party ID, not a frozen copy of every party field. As a
result, an invoice read with the Party association can show the party's
currently saved name/contact information after the party record is edited.
The invoice totals and line items remain on the invoice.

## Payments and party history

Payments are linked to both the relevant bill and party:

- `payments_in` records receipts against sales, using `saleId` and `partyId`.
- `payments_out` records payments against purchases, using `purchaseId` and
  `partyId`.

The payment workflow updates the invoice's `amountPaid` and derives its
`paymentStatus` (`Unpaid`, `Partial`, or `Paid`) from the amount paid compared
with the invoice total. Payment mode, date, reference number, and notes are
stored on the payment record.

The Parties page loads a party's sales and purchases through
`GET /api/parties/invoiceById-Party/:id` and presents a combined transaction
history. The aging endpoint currently summarizes that party's unpaid/overdue
sales into `0-30`, `31-60`, `61-90`, and `90+` day buckets.

## Related implementation

- Frontend party form and history: `src/features/parties/Parties.js`
- Frontend party API/store: `src/api/parties.js`, `src/store/appStore.js`
- Shared party picker: `src/components/shared/PartySelector.js`
- Party model and endpoints: `mysql-models/Party.js`,
  `mysql-controllers/partyController.js`, `routes/partyRoutes.js`
- Sale and purchase party links: `mysql-models/SalesBill.js`,
  `mysql-models/PurchaseBill.js`, and `mysql-models/modelfk.js`
- Invoice payloads: `src/utils/invoice.js`
- Payment records: `mysql-models/PaymentIn.js` and
  `mysql-models/PaymentOut.js`
