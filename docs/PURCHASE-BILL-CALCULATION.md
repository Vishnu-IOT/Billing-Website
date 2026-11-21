# Purchase Bill Calculation

This document describes how the frontend previews purchase-bill amounts and
what it sends when a purchase bill is saved. The frontend calculation is for
display; the backend remains authoritative for persisted bill totals.

Relevant implementation:

- [`calcItemRow`](../src/utils/invoice.js) calculates each row.
- [`calcBillTotals`](../src/utils/invoice.js) calculates bill totals.
- [`buildPurchaseBillPayload`](../src/utils/invoice.js) prepares the save request.
- [`useBillCalculations`](../src/hooks/useBillCalculations.js) recalculates a row
  when its purchase fields change.

## 1. Purchase line calculation

The purchase amount is based on the **paid quantity**. A supplier's free
quantity increases the quantity received into stock, but does not increase the
purchase amount.

For each line:

1. **Determine the GST-exclusive unit price**
   - `WITHOUT_GST`: `unitBase = entered price`
   - `WITH_GST`: `unitBase = entered price / (1 + GST rate / 100)`
2. **Calculate the line's pre-discount base**
   - `baseAmount = unitBase * paid quantity`
3. **Apply the line discount**
   - `discountAmount = unitBase * discount % / 100 * paid quantity`
   - `afterDiscount = (unitBase - unitBase * discount % / 100) * paid quantity`
4. **Calculate GST on the discounted base**
   - `taxAmount = afterDiscount * GST rate / 100`
5. **Calculate the line total**
   - `lineTotal = afterDiscount + taxAmount`

The frontend rounds the base, discount, discounted amount, tax, and line total
to two decimal places at the calculation steps shown in `calcItemRow`.

### Example: price includes GST

Suppose a line has:

- Entered unit price: `100.00`
- Price mode: `WITH_GST`
- Paid quantity: `2`
- Line discount: `7.5%`
- GST rate: `5%`

Then the preview is approximately:

| Calculation | Amount |
|---|---:|
| GST-exclusive unit price (`100 / 1.05`) | 95.24 |
| Base before discount (`95.24 × 2`) | 190.48 |
| Line discount | 14.29 |
| Taxable amount after discount | 176.19 |
| GST (`176.19 × 5%`) | 8.81 |
| Line total | 185.00 |

Minor one-cent differences can result from the frontend's intermediate
two-decimal rounding.

## 2. Free quantity and stock received

For a purchase line with paid quantity `10` and free quantity `2`:

- Bill calculation uses quantity `10`.
- The request sends `quantity: 10`, `paidQuantity: 10`, and `freeQuantity: 2`.
- Total received stock is `10 + 2 = 12`.
- The two free units do not add purchase cost or tax.

When an existing purchase is edited, the frontend loads the billed/paid
quantity separately from the received total so free units are not billed again.

## 3. Entering the supplier's final line amount

The purchase table supports either entry path without a calculation-mode
selector:

- Enter or edit **Price** to use the normal rate-based calculation.
- Enter or edit **Final Amount** to treat the supplier's GST-inclusive line
  total as authoritative.

For final-amount entry, the effective inclusive rate starts as
`final amount / paid quantity`. If there is a line discount, the rate is
reverse-calculated before that discount so the backend can use its existing
rate-and-discount contract. The selected price mode for this calculated rate is
`WITH_GST`.

The final amount is split into taxable value and GST. Because the backend
rounds unit prices and taxable values to two decimals, the payload also sends
the exact line `discountAmount` implied by that split. The backend treats that
explicit amount as authoritative instead of applying the discount percentage a
second time; the entered percentage is retained. The amount is based on paid
quantity only.

Example:

- Final line amount: `185.03`
- Paid quantity: `2`; free quantity: `3`
- GST: `5%`; line discount: `7.5%`
- Effective inclusive rate after discount: `185.03 / 2 = 92.515`
- Reverse-calculated inclusive rate before discount: `185.03 / 2 / 0.925`,
  approximately `100.0162`
- Backend-compatible rate sent: `100.02`
- Reconciled taxable value after discount: `176.22`
- GST: `8.81`
- Saved line total: `176.22 + 8.81 = 185.03`

In this example, the line's explicit discount amount is `14.30`; it makes the
backend's rounded rate produce the exact supplier amount. For a decimal paid
quantity, a one-cent reconciliation may also be necessary even when the
discount percentage is `0%`.

When editing a saved purchase, already-allocated global discounts are reversed
for the row preview before the bill-level discount is recalculated. This keeps
the supplier's original line amount from being discounted twice.

## 4. Bill totals and global discount

Only rows with a product name are included in bill totals.

- `subtotal`: sum of each line's `afterDiscount` (GST-exclusive taxable amount),
  reduced by the purchase global discount percentage when entered.
- `totalTax`: GST recalculated on the discounted taxable amounts.
- `baseTotal`: sum of each line's `baseAmount` before line discounts.
- `rawTotal`: sum of line totals, including GST and after line discounts.

For a purchase global discount percentage:

- `global discount amount = taxable subtotal × percentage / 100`.
- The discount is allocated across purchase lines by their taxable values.
- GST is recalculated on each reduced taxable line.
- `afterGlobalDiscount = discounted taxable subtotal + recalculated GST`.

For a fixed global discount amount, the existing gross-amount behavior is kept:
the fixed amount is deducted from the line totals including GST.

- The preview rounds `afterGlobalDiscount` to the nearest whole currency unit
  for `grandTotal`.
- `roundOff = grandTotal - afterGlobalDiscount`.

Both line discounts and percentage-based purchase global discounts reduce the
taxable base before GST is calculated.

## 5. Data sent when saving

The purchase payload sends the invoice number and date, party/company/user
identifiers when available, invoice-level discount, and purchase line details.
Each line includes its paid and free quantities, entered price, purchase price,
price mode when present, line discount percentage and amount, GST percentage,
and applicable batch/expiry/pricing details.

The payload sends the global discount as a percentage when one is entered; in
that case `global_discount_amount` is sent as `0`. If no percentage is entered,
the fixed amount is sent as `global_discount_amount`.

The frontend does not send its computed `grandTotal` in the purchase payload.
The backend calculates and saves authoritative bill totals from the submitted
line and discount data.
