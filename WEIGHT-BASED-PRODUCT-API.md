# Weight-Based Product API

Weight-based quantities are opt-in. Existing products remain `PIECE` products
with `PCS` stock and whole-number quantities unless explicitly configured as
`WEIGHT`.

## Product unit configuration

Use the existing product endpoints:

- `POST /api/products/add-Products`
- `POST /api/products/update-Products/:id`
- `GET /api/products/get-Products`
- `GET /api/products/get-Products/:id`

Default product unit fields:

```json
{
  "unitType": "PIECE",
  "baseUnit": "PCS",
  "allowDecimalQuantity": false
}
```

Example weight product fields in the existing product-create request:

```json
{
  "name": "Tomato",
  "unitType": "WEIGHT",
  "baseUnit": "KG",
  "allowDecimalQuantity": true,
  "stockQuantity": 50,
  "stockUnit": "KG",
  "salesPrice": 40,
  "sellingPriceType": "WITHOUT_GST",
  "purchasePrice": 30,
  "purchasePriceType": "WITHOUT_GST",
  "taxRate": 0
}
```

The existing required product fields (such as `MRP` and `categoryId`) must also
be supplied. Optional `stockUnit` accepts `GRAM` or `KG` for weight products
and is used only when setting opening stock. If omitted, stock quantity is
interpreted in the configured base unit.

Products returned by the existing product APIs now include `unitType`,
`baseUnit`, and `allowDecimalQuantity`. Unit type cannot be changed after stock
or sales/purchase history exists; create a new product to avoid interpreting
old quantities in a different unit.

## Quantity input and normalization

Line items may provide `quantityUnit` as `GRAM` or `KG` for WEIGHT products.
The aliases `inputUnit` and `unit` are also accepted. If no unit is provided,
the quantity is interpreted in the product's base unit (`KG` for WEIGHT,
`PCS` for PIECE).

| Input | Stored normalized quantity |
|---|---:|
| `150 GRAM` | `0.150 KG` |
| `250 GRAM` | `0.250 KG` |
| `500 GRAM` | `0.500 KG` |
| `1.250 KG` | `1.250 KG` |

Normalized weight quantity is stored with up to three decimal places in KG.
GRAM quantities must convert exactly to that precision. Non-positive
quantities, unsupported units, and weights for PIECE products are rejected.
PIECE product quantities must remain whole numbers.

## Purchase

Use the existing `POST /api/purchase/add-purchase` endpoint. The entered price
is the configured purchase price per KG; normal GST and discount handling
continues after quantity normalization.

```json
{
  "invoiceNumber": "PUR-1001",
  "partyId": 2,
  "items": [
    {
      "productId": 15,
      "productName": "Tomato",
      "quantity": 500,
      "quantityUnit": "GRAM"
    }
  ]
}
```

At ₹30/KG, 500 GRAM normalizes to `0.500 KG` and has a pre-tax line value of
₹15. Stock is increased by `0.500 KG`. Purchase responses include normalized
`quantity` and `quantityUnit` in each item, for example:

```json
{
  "invoiceNumber": "PUR-1001",
  "items": [
    {
      "productId": 15,
      "quantity": 0.5,
      "quantityUnit": "KG",
      "price": "30.00",
      "baseRate": "15.00"
    }
  ]
}
```

## Sales and POS

Use the existing `POST /api/sales/add-sales` endpoint for direct sales and POS
checkout. POS held-cart data remains unchanged; checkout quantities are
validated and normalized by the existing sales API.

```json
{
  "userId": 3,
  "companyId": 1,
  "bill_type": "B2C",
  "name": "Customer",
  "phone": "9000000000",
  "items": [
    {
      "productId": 15,
      "productName": "Tomato",
      "quantity": 250,
      "quantityUnit": "GRAM"
    }
  ]
}
```

At ₹40/KG and zero GST, 250 GRAM normalizes to `0.250 KG`, is priced at ₹10,
and deducts `0.250 KG` from stock. With GST or discounts, existing backend
pricing, GST, and invoice discount calculations are applied to the normalized
quantity.

The sales-create response adds normalized line quantity information without
removing existing fields:

```json
{
  "success": true,
  "data": {
    "id": 101,
    "invoiceNumber": "INV/26-27/0001",
    "totalAmount": 10,
    "items": [
      {
        "saleItemId": 501,
        "productId": 15,
        "quantity": 0.25,
        "quantityUnit": "KG",
        "price": "40.00"
      }
    ]
  }
}
```

Sales and purchase history items also include `quantityUnit`; related product
data includes `unitType` and `baseUnit`.

## Inventory and cancellation

Product `stockQuantity` is maintained in the configured base unit. Purchases
increase stock, sales deduct stock, invoice edits reverse the old line and
apply the replacement, and invoice deletion restores the unreturned quantity.
Stock movement records for weight sales, purchases, and returns use normalized
KG quantities. Stock transfers also normalize to the product base unit.

For piece products, stock and billing continue to use whole `PCS` quantities.
Requests without a quantity unit remain interpreted in the product's configured
base unit.

## Partial weight sales returns

Register a stock return with the existing sales route:

`POST /api/sales/return-sales/:saleId`

Each return must include a unique idempotency key (header or request body):

```http
Idempotency-Key: tomato-return-2026-001
Content-Type: application/json
```

```json
{
  "saleItemId": 501,
  "quantity": 150,
  "quantityUnit": "GRAM",
  "reason": "Damaged produce returned"
}
```

The endpoint records `0.150 KG`, restores exactly that amount to product
stock, and returns the remaining returnable quantity. It locks the sales item,
checks all previous returns inside the transaction, rejects returns above the
unreturned sold quantity, and returns the original return record if the same
idempotency key is retried. PIECE products are not handled by this new endpoint
and retain their existing workflow.

Example response:

```json
{
  "success": true,
  "data": {
    "id": 44,
    "saleId": 101,
    "saleItemId": 501,
    "productId": 15,
    "quantity": "0.150",
    "quantityUnit": "KG",
    "remainingReturnableQuantity": 0.1,
    "stockQuantity": 49.85,
    "replayed": false
  }
}
```

This endpoint records the inventory return; it does not change the original
invoice totals or create a monetary refund/credit. Use the existing credit-note
and payment workflows for financial adjustments.

## Database migration

Run `migrations/20261106020000-add-weight-based-quantities.js` before using the
new fields. It:

- Adds product unit configuration with PIECE/PCS defaults for existing rows.
- Changes only quantity columns needed for three-decimal weight tracking:
  product stock, sales items, purchase items, document items, stock movements,
  and existing stock transfer quantities.
- Adds a sales-return record table with a unique idempotency key.
- Provides a guarded rollback: it refuses to downgrade while weight-mode
  products, KG history, returns, or precision that would be lost still exists.

## Verification

Automated tests cover piece-only whole quantities, rejection of weight units
for PIECE products, GRAM-to-KG conversion, price calculations at ₹30/KG and
₹40/KG, opening stock normalization, and invalid unit configurations.
