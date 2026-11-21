# Frontend Analysis: Latest Billing Backend Updates

This document summarizes the latest backend changes relevant to the frontend and outlines the required UI/API updates for purchase, sales, inventory, and promotional flows.

## 1. Scope of backend changes

The backend now supports:

- Supplier free quantity on purchase entries
- Customer promotional free quantity on sales
- Batch-wise MRP and purchase cost history
- Product batch availability tracking
- Multiple batch selection for POS/barcode flow
- Promotional offer model for B2C pricing
- Separate storage of paid and free quantities in transaction items

## 2. Core data model changes

### Purchase items
The purchase item payload should now consider these fields:

- quantity: billed/paid supplier quantity
- paidQuantity: effective payable quantity (can be set separately when supplier free quantity exists)
- freeQuantity: supplier free quantity
- totalQuantity: quantity + freeQuantity
- productBatchId: batch associated with this purchase record

Important rule:
- Free quantity is not treated as additional billed stock.
- Purchase amount should reflect billed quantity only.
- Inventory should increase by total received quantity.

### Sales items
For B2C promotional sales, sales items should include:

- quantity: legacy total quantity field or total delivered quantity
- paidQuantity: customer paid quantity
- freeQuantity: promotional free quantity
- totalQuantity: paid + free quantity
- offerId: linked promotional offer
- offerName: snapshot label for reporting
- productBatchId: specific batch consumed

Important rule:
- Customer free quantity must not be charged.
- Stock deduction should include both paid and free quantity.
- Free quantity must be revalidated on the backend before finalizing the invoice.

### Product batch model
The batch model now supports:

- freeQuantity
- totalReceivedQuantity
- availableQuantity
- discount
- gstPercentage

This means the frontend must avoid assuming a single latest product MRP or sales price is the only source of truth.

### Promotional offer model
New model: promotional_offers

Fields include:

- id
- name
- offerType
- productId
- categoryId
- buyQuantity
- freeQuantity
- startDate
- endDate
- isActive

Supported offer patterns:

- Buy 1 Get 1 Free
- Buy 10 Get 1 Free
- other offer patterns represented by offerType values such as BUY_X_GET_Y_FREE and BUY_N_GET_M_FREE

## 3. Frontend implications

### A. Purchase form updates
Frontend purchase entry should be updated so the user can enter:

- purchase quantity
- free quantity
- paid quantity (if the backend receives it separately)
- total received quantity (auto-calculated)

Recommended behavior:

- When free quantity is entered, calculate totalReceivedQuantity as quantity + freeQuantity.
- Keep billing amount based only on paid quantity and purchase price.
- Store/submit productBatchId when a batch is selected.
- Show effective inventory cost as purchase amount / total received quantity.

### B. Product/batch UI updates
The product detail or POS screen should not rely on a single product-level MRP.

Instead:

- Fetch all available batches for a product by common barcode
- Display each batch with:
  - batch number
  - MRP
  - purchase price
  - selling price
  - discount
  - available stock
- Allow default FIFO selection
- Allow manual batch selection
- When a cashier selects a batch, use that batch's MRP, sale price, and default discount immediately; recalculate the line amount and submit its batch ID.
- When no batch is selected, keep the product's saved MRP and sales price while stock is allocated FIFO.

### C. POS sales flow changes
When barcode is scanned:

- look up the product by barcode
- resolve all batches for that product
- allocate stock FIFO when no batch is selected; use the explicitly selected batch when one is chosen
- show pricing for each batch if needed
- apply promotional rules against the selected product and active offers
- calculate free quantity based on paid quantity
- display both paid and free quantities separately in the line item

Example:

- Product price: ₹100
- Discount: 10%
- Selling price effective: ₹90
- Buy 10 Get 1 Free
- Customer buys 10 pcs
- Paid quantity = 10
- Free quantity = 1
- Total quantity = 11
- Customer pays for 10 only

### D. Cart line item structure
The frontend should support new line item fields and not assume legacy quantity-only carts.

Recommended cart fields:

- quantity
- paidQuantity
- freeQuantity
- totalQuantity
- price
- discountPercentage
- discountAmount
- productId
- productBatchId
- offerId
- offerName

If the backend expects separate values, frontend should submit them explicitly instead of recomputing blindly.

## 4. Validation rules the frontend should enforce

The frontend should validate the following before sending data:

- free quantity cannot exceed available stock
- total quantity cannot exceed inventory availability for the chosen batch
- promotional free quantity must be computed by the backend, not trusted from client state
- B2B sales should continue to use standard transaction logic
- only eligible B2C sales should trigger promo calculations
- piece products must use integer quantities; weight products must follow the configured unit rules

## 5. Recommended UI behavior changes

### Purchase screen
Add fields:

- Quantity
- Free quantity
- Total received quantity
- Paid quantity (if required by the backend contract)
- Batch selection
- Batch MRP / purchase cost / discount / GST fields

### Sales POS screen
Add state for:

- auto-calculated free quantity
- visible `paidQuantity` label
- visible `freeQuantity` label
- separate stock deduction values
- selected batch and batch pricing
- active offer badge

### Product inventory panel
Show:

- batch-level stock
- free quantity received history
- total received quantity
- available quantity
- batch expiry/manufacturing metadata

## 6. API compatibility checklist for frontend

Before integrating, confirm that the frontend handles these updates:

- purchase items may include `freeQuantity` and `totalQuantity`
- sales items may include `paidQuantity` and `freeQuantity`
- batch data may include `availableQuantity`, `totalReceivedQuantity`, and `discount`
- product barcode flow returns batches and pricing values
- each sales line may be tied to `productBatchId`
- sales records may link to `offerId` and `offerName`

## 7. Migration impact summary

The frontend must stop treating product MRP as a single global price. Pricing is now batch-aware and can vary by purchase lot. The POS must handle batch-specific price snapshots and free-quantity logic correctly.

## 8. Practical frontend implementation plan

1. Update purchase item form to support free quantity and batch reservation.
2. Update sales cart to track paid and free quantity separately.
3. Update barcode scanning flow to resolve all product batches.
4. Add consent/selection for batch FIFO vs manual override.
5. Recompute available stock against the chosen batch before final submit.
6. Add offer badge states for B2C promotions.
7. Keep B2B billing unchanged.
8. Add final validation before invoice creation to avoid negative stock or invalid promo results.

## 9. Final recommendation

The frontend should be updated to treat the backend as the authority for promotional eligibility and inventory deduction. All batch, pricing, and free-quantity calculations should be validated server-side, while the UI should focus on user-friendly selection, display, and warnings.

This is the key shift from the older single-price product model to a batch-aware, offer-aware, inventory-aware pricing model.
