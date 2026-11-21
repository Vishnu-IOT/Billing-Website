# Sales Pricing and Price Storage

This guide explains where a sales price comes from, how the frontend sends it,
how the backend calculates and saves a sales invoice, and how to read the saved
price later. The backend is authoritative for persisted invoice amounts.

## The three prices to distinguish

| Value | Table / field | Meaning |
|---|---|---|
| Product catalog selling price | `products.salesPrice` | Default product price. The product API also returns the alias `sellingPrice`. |
| Batch selling price | `product_batches.salePrice` | Selling price for stock received in a particular batch. |
| Historical invoiced price | `sales_items.price` | The unit price the backend actually used for that invoice line. It is a snapshot and does not change when the product's current price changes. |

`products.sellingPriceType` determines whether a product or batch selling price
is tax-inclusive (`WITH_GST`) or tax-exclusive (`WITHOUT_GST`). The sale line
stores its applied mode in `sales_items.priceType`.

Related implementation:

- Detailed B2C POS bill math: [`B2C-POS-BILL-CALCULATION.md`](B2C-POS-BILL-CALCULATION.md)
- Product-vs-batch price lookup and selection: [`PRODUCT-AND-BATCH-PRICE-FLOW.md`](PRODUCT-AND-BATCH-PRICE-FLOW.md)
- Frontend price helpers: [`src/utils/gstPricing.js`](src/utils/gstPricing.js)
- Frontend bill item and request builders: [`src/utils/invoice.js`](src/utils/invoice.js)
- POS flow: [`src/features/sales/POSScreen.js`](src/features/sales/POSScreen.js)
- Backend product pricing: [`../../NodeJS/billing-backend/utils/productMargin.js`](../../NodeJS/billing-backend/utils/productMargin.js)
- Backend sale creation/update: [`../../NodeJS/billing-backend/mysql-controllers/salesController.js`](../../NodeJS/billing-backend/mysql-controllers/salesController.js)
- Database models: [`../../NodeJS/billing-backend/mysql-models/Product.js`](../../NodeJS/billing-backend/mysql-models/Product.js), [`../../NodeJS/billing-backend/mysql-models/ProductBatch.js`](../../NodeJS/billing-backend/mysql-models/ProductBatch.js), and [`../../NodeJS/billing-backend/mysql-models/Sales-Items.js`](../../NodeJS/billing-backend/mysql-models/Sales-Items.js)

## Where catalog prices are stored

Creating or editing a product sends `sellingPrice` (or the legacy name
`salesPrice`), `sellingPriceType`, `purchasePrice`, `purchasePriceType`, and
`taxRate` to the product API. The backend validates these values and stores:

- selling price in `products.salesPrice`
- mode in `products.sellingPriceType`
- GST rate in `products.taxRate`
- purchase price and mode in `products.purchasePrice` and
  `products.purchasePriceType`

The `sellingPrice` API name is an alias; it is not a separate database column.
The product response includes both `salesPrice` and `sellingPrice`, plus
derived `sellingBasePrice`, `sellingGSTAmount`, and margin fields. Those
derived values are response data, not separate source prices.

For example, `sellingPrice = 118`, `sellingPriceType = WITH_GST`, and
`taxRate = 18` means the catalog price includes GST: taxable unit price is
100 and GST is 18. With `sellingPrice = 100` and `WITHOUT_GST`, taxable unit
price is 100 and GST is added at invoice time.

Relevant API routes:

| Method | Route | Use |
|---|---|---|
| `GET` | `/api/products/get-Products` | Lists product data, including current selling price and mode. |
| `GET` | `/api/products/get-Products/:id` | Reads one product with pricing fields. |
| `POST` | `/api/products/add-Products` | Creates a product and its initial price. |
| `POST` | `/api/products/update-Products/:id` | Updates catalog price and mode. |

## Where batch prices come from

Each received inventory batch stores its own `product_batches.salePrice`, MRP,
GST rate, quantity, and expiry. Purchase-bill entry can supply the batch
`salePrice`; when omitted, the backend falls back to the product's current
`salesPrice`. Creating a product with opening stock also creates a batch using
the product selling price.

The sales screen loads batches from:

```text
GET /api/products/get-Batches/:productId
```

In POS, selecting a batch uses that batch's `salePrice` and MRP. For a price
check, the frontend groups available batches by MRP, selling price, GST rate,
and the product selling-price mode. The selected batch allocation and price
group are sent to the backend; the frontend does not choose the final saved
invoice amount.

## Frontend sale request

Both regular sales forms and POS build their invoice item list through
`buildSaleBillPayload` / `buildBillItems` in `src/utils/invoice.js`.

- For a normal product line without a selected batch, the request normally
  contains `productId`, quantity, and discounts. The backend reads the saved
  product `salesPrice`, `sellingPriceType`, and `taxRate`.
- If a one-off line price or price mode differs from the product's saved value,
  the frontend sends `price` and, when needed, `priceType`.
- A selected batch sends its batch ID. A POS MRP price-group line sends its
  `batchAllocations`, `priceGroup`, and `priceGroupKey` instead of trusting a
  client-submitted unit price.
- POS also sends `bill_type: "B2C"` and `useProductSalesPrice: true`.

The backend locks product and batch stock, checks the selected batch or price
group, resolves the price again from the product/batch records, calculates the
invoice values, and updates stock within a database transaction. Invalid or
stale allocations are rejected.

## Backend price selection

The backend uses `resolveSalePricing` in `utils/productMargin.js`:

1. If an allocated batch is being used, it selects that batch's `salePrice` and
   MRP.
2. Otherwise, it selects the product's `salesPrice` and MRP.
3. For POS B2C with `useProductSalesPrice: true` and no selected batch, the
   product's configured `discount` may reduce the product price.
4. It obtains the tax mode from the product's `sellingPriceType` (or a valid
   per-line `priceType` where supported) and the tax rate from the product or
   selected batch.

For a normal non-POS sale, a batch allocation uses the batch price; a product
stock/unbatched allocation uses the product price. POS price-group allocations
must match the backend's current batch MRP/price/tax values.

## How line amounts are calculated

The backend's `calculateInvoiceItem` calculates and rounds monetary values to
two decimal places.

For a unit price `P` and GST rate `r`:

| Price mode | Taxable unit price before discount | GST before discount |
|---|---:|---:|
| `WITHOUT_GST` | `P` | `P × r / 100` |
| `WITH_GST` | `P / (1 + r / 100)` | `P - taxable unit price` |

The backend applies an item discount to the taxable amount, then calculates
GST on the discounted taxable amount. Important saved `sales_items` values:

- `price`: applied unit price before item discount
- `priceType`: tax-inclusive/exclusive mode used
- `discountPercentage`, `discountAmount`: line discount
- `baseRate`: taxable amount after the line and allocated global discounts
- `taxPercentage`, `taxAmount`: GST rate and amount
- `netRate`: line total after discounts, including tax
- `mrp`, `productBatchId`, `batchNo`, `expiryDate`: price/batch context
- `quantity`, `paidQuantity`, `freeQuantity`, `totalQuantity`, `quantityUnit`:
  sold quantity information

The frontend also rounds a GST-inclusive unit's taxable price to two decimals
before multiplying by quantity and applying its discount. This matches the
backend calculation and prevents a one-paisa difference between the cart and
the saved thermal receipt.

The backend calculates invoice-level `baseRate`, `tax`, and `totalAmount`
from the calculated lines and global discount. Submitted frontend totals are
not the source of truth.

POS B2C line amounts and the invoice total retain two-decimal paise precision.
The POS does not apply whole-rupee rounding, so no round-off is added to the
amount due or saved invoice total.

## Saving and reading an invoice

| Method | Route | Behavior |
|---|---|---|
| `POST` | `/api/sales/add-sales` | Creates the invoice and its calculated `sales_items` lines in a transaction. |
| `PUT` | `/api/sales/updatebyid-sales/:id` | Restores the old stock and rebuilds the invoice lines using current product/batch pricing. |
| `GET` | `/api/sales/get-sales` | Lists invoices and includes their sale items and related product data. |
| `GET` | `/api/sales/get-sales/:id` | Reads an invoice with sale items, product, batch, and promotion data. |

The create API returns an invoice summary. The POS then calls the single-invoice
GET route and uses the returned backend-calculated line and invoice totals for
the receipt. `SalesItem.price`, `baseRate`, `taxAmount`, and `netRate` are the
historical invoice values; `Product.salesPrice` is the current catalog value.
Do not substitute the current product price when displaying an old invoice.

### Example SQL to compare current and invoiced prices

```sql
SELECT
  s.invoiceNumber,
  s.saleDate,
  si.productName,
  si.productId,
  si.productBatchId,
  si.batchNo,
  si.price AS invoicedUnitPrice,
  si.priceType,
  si.mrp AS invoicedMrp,
  si.discountPercentage,
  si.discountAmount,
  si.baseRate,
  si.taxPercentage,
  si.taxAmount,
  si.netRate,
  p.salesPrice AS currentProductPrice,
  p.sellingPriceType AS currentProductPriceType,
  pb.salePrice AS currentBatchPrice
FROM sales AS s
JOIN sales_items AS si ON si.saleId = s.id
LEFT JOIN products AS p ON p.id = si.productId
LEFT JOIN product_batches AS pb ON pb.id = si.productBatchId
WHERE s.id = ?;
```

The `?` is a placeholder for the invoice ID; bind it through your SQL client
or replace it with a known numeric ID when running a one-off query.

## Practical checks when the saved amount looks wrong

1. Check the product's current `salesPrice`, `sellingPriceType`, and `taxRate`.
2. If the POS line used a batch, check that batch's `salePrice`, MRP,
   `gstPercentage`, and whether it was the batch/group actually selected.
3. Check `sales_items.price` and `sales_items.priceType` for the invoice. These
   show what the backend actually used.
4. Check line `discountPercentage` / `discountAmount`, then `baseRate`,
   `taxAmount`, and `netRate`.
5. Check the invoice's `global_discount_percentage` and
   `global_discount_amount` if the line was part of an invoice-wide discount.
6. Confirm the application has the migration that adds `sales_items.mrp` and
   `sales_items.priceType` (`20261118000000-add-sales-item-price-snapshots`).

Changing the product catalog price affects future sales; it does not rewrite
the saved unit price or calculated totals of already-created invoices.
