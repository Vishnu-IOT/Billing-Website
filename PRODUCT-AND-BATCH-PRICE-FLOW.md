# Product and Batch Selling Price Flow

This guide explains where the current product price and each batch price are
stored, how the frontend reads and previews them, and how the backend chooses
the authoritative price when a sale is saved.

## Price fields

| Price detail | Database field | Purpose |
|---|---|---|
| Current product selling price | `products.salesPrice` | Product configuration and non-POS pricing only; never a POS B2C selling-price fallback. |
| Product selling-price mode | `products.sellingPriceType` | Whether `salesPrice` includes GST (`WITH_GST`) or excludes GST (`WITHOUT_GST`). |
| Product GST rate | `products.taxRate` | GST percentage used with the product price. |
| Product discount | `products.discount` | Product-level configuration for workflows that still use product pricing; never applied to a POS batch price. |
| Product MRP | `products.MRP` | Product-level maximum retail price. |
| Batch selling price | `product_batches.salePrice` | Selling price associated with a specific received stock batch. |
| Batch GST rate | `product_batches.gstPercentage` | GST percentage associated with the batch. |
| Batch MRP | `product_batches.mrp` | MRP associated with the batch. |
| Saved sale price | `sales_items.price` | Historical unit price used for the saved sale line. |
| Saved sale batch | `sales_items.productBatchId` | Batch actually consumed for the sale line, if any. |

Product and batch prices are different sources. Editing `products.salesPrice`
does not rewrite existing `product_batches.salePrice` values or saved invoice
prices.

## How prices enter the database

- Product create/update stores the product selling price, price type, GST rate,
  MRP, and configured discount on the product.
- Creating a product with opening stock creates an opening batch. That batch
  initially receives the product selling price, MRP, and GST rate.
- Purchase receiving can set a batch selling price. If one is omitted, the
  backend defaults it to the product selling price at receipt time.
- Updating the product later changes the product-level price only. Existing
  batches keep the price already stored on each batch unless those batches are
  explicitly updated.

## Frontend: loading and showing prices

The frontend loads product records with `GET /api/products/get-Products`.
Product responses include the product selling price and price configuration.
The helper `getProductPricing(product, 'sales')` reads
`sellingPrice ?? salesPrice` and normalizes `sellingPriceType`.

The POS can load a product's stock batches with:

```text
GET /api/products/get-Batches/:productId?availableOnly=true
```

`availableOnly=true` asks the authenticated backend to return batches belonging
to the user's company with positive `availableQuantity`. The UI filters expired
batches and groups remaining stock by **MRP, batch sale price, batch GST rate,
and product selling-price type**. Batches with the same group values can be
allocated together; distinct groups are presented for price selection. A
single eligible group is selected automatically. No eligible group means the
POS rejects the addition; it never prices the item from the product record.

The batch endpoint returns batch records, including `id`, `batchNumber`,
`availableQuantity`, `mrp`, `salePrice`, `gstPercentage`, and `expiryDate`.
The frontend uses these values to present/select a price group and build batch
allocations. The price-group selection is not itself proof of the final saved
price: the backend checks it against current database records at preview and
save time.

## Which price does the backend use?

POS B2C always uses an eligible product-batch price group:

| Sale selection | Price used by backend |
|---|---|
| POS B2C sale | `product_batches.salePrice`, with MRP, GST rate, and price type from the selected compatible group. Every line must submit concrete batch allocations that match the group and company. |
| Regular sale explicitly selecting a batch | The selected batch `salePrice`; backend records that batch ID on the sale line. |
| Regular sale without explicit batch selection | Product price is used unless a valid one-off price override is submitted. Stock allocation is handled separately from price selection. |

The batch's `salePrice` already represents its final selling price. POS does
not read `products.salesPrice` or apply `products.discount`, and it does not
reconstruct the batch price from a discount. If a batch allocation or selected
group is unavailable, the backend rejects the sale rather than falling back.
Compatible batches retain individual FIFO allocations so each batch's stock
is decremented and later restored exactly.

## GST calculation after selecting a price

After resolving the actual selling price `P`, price mode, and GST percentage
`r`, the backend calculates the taxable unit price and GST:

| Mode | Taxable unit price | GST per unit |
|---|---|---|
| `WITHOUT_GST` | `P` | `round2(P × r / 100)` |
| `WITH_GST` | `round2(P / (1 + r / 100))` | `round2(P - taxable unit price)` |

The sale line then uses the paid quantity and item discount to calculate its
taxable base, tax, and total. POS frontend previews use the matching
two-decimal unit-base rule. The backend recalculates those amounts before
saving; it does not trust a submitted cart total.

## Request and save flow

1. The POS fetches authenticated, company-scoped batches and builds eligible
   price groups.
2. The POS selects the sole group automatically or opens Price Check for
   multiple incompatible groups. The group key and concrete allocations are
   retained through scans, quantity edits, held carts, and invoice editing.
3. On checkout, every request line includes the product ID, quantity, selected
   `priceGroup` / `priceGroupKey`, and explicit `batchAllocations`.
   The backend enforces batch-only pricing for B2C regardless of the legacy
   `useProductSalesPrice` request flag.
4. The backend locks batches for the authenticated company, verifies current
   group values, expiry, and available stock, reads `salePrice` and GST from the
   database, and calculates the invoice in the same transaction that deducts
   stock.
5. The backend saves the price snapshot and allocated batch on `sales_items`.
   The frontend fetches the saved invoice after creation and uses its stored
   line and invoice amounts for the thermal receipt.

Important code locations:

- Product and batch prices: [`../../NodeJS/billing-backend/mysql-models/Product.js`](../../NodeJS/billing-backend/mysql-models/Product.js) and [`../../NodeJS/billing-backend/mysql-models/ProductBatch.js`](../../NodeJS/billing-backend/mysql-models/ProductBatch.js)
- Batch read API: [`../../NodeJS/billing-backend/mysql-controllers/productController.js`](../../NodeJS/billing-backend/mysql-controllers/productController.js) and [`../../NodeJS/billing-backend/routes/productRoutes.js`](../../NodeJS/billing-backend/routes/productRoutes.js)
- Frontend batch API: [`src/api/products.js`](src/api/products.js)
- POS price grouping and allocation: [`src/utils/priceCheck.js`](src/utils/priceCheck.js) and [`src/features/sales/POSScreen.js`](src/features/sales/POSScreen.js)
- Backend selection and calculations: [`../../NodeJS/billing-backend/utils/productMargin.js`](../../NodeJS/billing-backend/utils/productMargin.js) and [`../../NodeJS/billing-backend/mysql-controllers/salesController.js`](../../NodeJS/billing-backend/mysql-controllers/salesController.js)

## SQL checks

Check current product price and price configuration:

```sql
SELECT
  id,
  name,
  salesPrice,
  sellingPriceType,
  taxRate,
  discount,
  MRP,
  stockQuantity
FROM products
WHERE id = ?;
```

Compare current product price with batch prices and remaining batch stock:

```sql
SELECT
  p.id AS productId,
  p.name,
  p.salesPrice AS productSalesPrice,
  p.sellingPriceType,
  p.taxRate AS productTaxRate,
  p.discount AS productDiscount,
  b.id AS batchId,
  b.batchNumber,
  b.salePrice AS batchSalePrice,
  b.gstPercentage AS batchGstRate,
  b.mrp AS batchMrp,
  b.availableQuantity,
  b.expiryDate
FROM products p
LEFT JOIN product_batches b ON b.productId = p.id
WHERE p.id = ?
ORDER BY b.createdAt, b.id;
```

Check what price and batch were actually saved on a sale:

```sql
SELECT
  s.invoiceNumber,
  s.bill_type,
  s.totalAmount AS invoiceTotal,
  si.productId,
  si.productName,
  si.productBatchId,
  si.price AS savedUnitPrice,
  si.priceType,
  si.quantity,
  si.paidQuantity,
  si.discountPercentage,
  si.discountAmount,
  si.baseRate,
  si.taxPercentage,
  si.taxAmount,
  si.netRate
FROM sales s
JOIN sales_items si ON si.saleId = s.id
WHERE s.id = ?
ORDER BY si.id;
```

The current backend model maps the sale header to `sales`.
