# B2C POS Bill Calculation

This guide describes how a B2C POS cart becomes a saved sale invoice, including
GST, item discounts, bill discounts, return credit, loyalty redemption, and the
thermal receipt. The backend recalculates and saves the authoritative amounts.

## Calculation flow

1. The POS resolves every selling price from an eligible batch price group.
2. Each paid sale line is calculated to two decimal places. Free promotional
   quantity is recorded separately and is not included in the line charge.
3. The POS sends product IDs, quantities, item discount percentages, the
   selected price group, and concrete batch allocations to
   `POST /api/sales/add-sales`.
4. The backend verifies the company-owned batch allocations, resolves each
   batch's saved `salePrice`, recalculates the line values, applies the bill
   discount, and saves the invoice and sale items in a transaction.
5. After saving, the POS fetches the saved invoice and prints the backend's
   saved line and invoice totals.

Relevant implementation:

- Frontend line math and request building: [`src/utils/invoice.js`](src/utils/invoice.js)
- POS save and receipt flow: [`src/features/sales/POSScreen.js`](src/features/sales/POSScreen.js)
- Backend item and invoice math: [`../../NodeJS/billing-backend/utils/productMargin.js`](../../NodeJS/billing-backend/utils/productMargin.js)
- Backend invoice creation: [`../../NodeJS/billing-backend/mysql-controllers/salesController.js`](../../NodeJS/billing-backend/mysql-controllers/salesController.js)
- Thermal receipt: [`src/features/billing/invoices/ThermalInvoice.js`](src/features/billing/invoices/ThermalInvoice.js)

## Price and quantity used

POS B2C always uses `product_batches.salePrice` from the selected compatible
price group. `products.salesPrice` and `products.discount` are not POS price
sources or fallbacks. Each line must include a selected group and concrete
allocations from unexpired batches belonging to the authenticated company. If
the allocation is missing, stale, or insufficient, the backend rejects the
sale. The backend does not trust submitted prices, GST, or cart totals.

Only the paid quantity is charged. Promotional free quantity is saved on the
sale line but does not increase its amount. Weight quantities are converted to
the product's billing unit before calculation.

## Item amount formula

All amounts below are rounded to two decimal places at the calculation steps:

| Price type | Taxable unit price (`unitBase`) |
|---|---|
| `WITHOUT_GST` | `price` |
| `WITH_GST` | `price / (1 + GST rate / 100)` |

For each line:

```text
baseBeforeDiscount = round2(unitBase × paidQuantity)
itemDiscount       = round2(baseBeforeDiscount × itemDiscountPercent / 100)
baseRate           = round2(baseBeforeDiscount - itemDiscount)
taxAmount          = round2(baseRate × GST rate / 100)
lineTotal          = round2(baseRate + taxAmount)
```

For a tax-inclusive selling price, the taxable unit price is rounded before
multiplying by quantity. The frontend follows the same rule as the backend to
avoid a one-paisa difference when a discounted line is saved.

### Example: GST-inclusive line with a discount

Selling price is ₹10.00 **including** 5% GST, quantity is 5, and the item
discount is 1%:

```text
unitBase           = round2(10.00 / 1.05) = 9.52
baseBeforeDiscount = round2(9.52 × 5)    = 47.60
itemDiscount       = round2(47.60 × 1%)  = 0.48
baseRate           = 47.60 - 0.48        = 47.12
taxAmount          = round2(47.12 × 5%)  = 2.36
lineTotal          = 47.12 + 2.36        = 49.48
```

The saved sale item records the applied price, price type, quantity,
`discountPercentage`, `discountAmount`, `baseRate`, `taxPercentage`,
`taxAmount`, and `netRate` (the calculated line total).

## Bill-level discount and invoice total

The backend first sums the calculated line totals. A fixed bill discount is
used as its supplied amount. If a bill discount percentage is supplied, it is
calculated from the invoice total after item discounts, including GST, and
rounded to two decimals.

The per-product promotion preview also preserves paise; it does not round a
product's payable amount to a whole rupee. For example, a ₹314.50 batch price
stays ₹314.50 on the cart line. Only the completed invoice is rounded after
all product lines, GST, and discounts have been calculated.

The bill discount is allocated across lines in proportion to each line's
pre-bill-discount total. The backend adjusts each line's total and recalculates
its taxable base and tax. Any remaining allocation cents go to the last line
so the allocated discount equals the requested bill discount.

The saved invoice values are then calculated from the adjusted lines:

```text
invoice baseRate = round2(sum(adjusted line baseRate))
invoice tax      = round2(sum(adjusted line taxAmount))
invoice total    = round2(invoice baseRate + invoice tax)
```

For B2C POS, whole-rupee rounding follows the company's `roundOffInvoices`
setting and is applied only after line amounts, discounts, and GST are summed.
When enabled, ₹435.97 becomes ₹436.00 and the ₹0.03 adjustment is stored in
`sales.roundOff`. When disabled, the invoice remains ₹435.97 and `roundOff` is
zero. The saved `sales_items` rows are not changed to force the invoice total.

The invoice stores the bill discount percentage/amount, taxable base, tax,
`roundOff`, and `totalAmount`. The saved `sales_items` rows store the
backend-calculated line values. Database money fields use two-decimal precision.

## Credits, loyalty, and payment

Return credit and loyalty redemption affect the amount due at checkout, not the
calculated sale value:

```text
returnCreditApplied = min(invoice total, available return-credit balance)
loyaltyRedemption   = redeemed points × configured value per point
amountDue           = max(0, invoice total - returnCreditApplied - loyaltyRedemption)
```

The backend validates the return-credit balance and loyalty redemption when
saving. The saved invoice total remains the discounted invoice value; applied
return credit and loyalty redemption are recorded separately with the payment
details. The selected payment method and tender/split-payment amounts are also
stored as payment details.

## Reading the saved thermal receipt

After save, the POS fetches the invoice by its saved ID. The receipt uses the
backend's `totalAmount` and saved sale-item `netRate`, base, and tax values
rather than recalculating prices from the current product catalog. This keeps
the receipt consistent with the invoice snapshot even if a product price
changes later.

To investigate a saved total, compare:

1. `sales_items.price`, `priceType`, `quantity` / `paidQuantity`, and discount
   fields.
2. `sales_items.baseRate`, `taxAmount`, and `netRate`.
3. Invoice `baseRate`, `tax`, `global_discount_amount`, and `totalAmount`.
4. Separately recorded return credit and loyalty redemption in payment details.
