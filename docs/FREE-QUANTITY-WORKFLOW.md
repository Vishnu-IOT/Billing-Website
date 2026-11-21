# Free Quantity Workflows

This guide covers the two different kinds of free quantity in BillFlow:

- **Supplier free quantity** is extra stock received from a supplier. It does
  not increase the billed purchase quantity or purchase amount.
- **Promotional free quantity** is extra stock given to a customer under an
  eligible offer. The backend decides eligibility and validates the final
  quantity.

## Enter supplier free quantity on a purchase

1. Open **Purchases** and create a purchase invoice.
2. Select the product and enter the supplier-paid quantity in **Paid Qty**.
3. If the supplier included extra units at no charge, enter them in **Free
   Qty**. Leave it at zero when there is no supplier bonus.
4. Optionally select the product batch. Entering a batch ID associates this
   purchase line with that existing batch.
5. Review **Total received**. It is the paid quantity plus the supplier free
   quantity. For weight products, the displayed unit follows the selected
   quantity unit.
6. Review **Effective cost per received unit**. This divides the purchase line
   total by all received units; the invoice amount itself is based on the paid
   quantity only.
7. Save the purchase invoice. Inventory quantity is updated by the backend.

Example: enter 10 paid units and 2 free units. The purchase amount is for 10
units, while 12 units are received into stock.

Batch-level pricing, GST, discount, expiry, and manufacturing information can
also be maintained under **Adjust Items & Batches → Batches**. Use the purchase
invoice to record the actual receipt and its paid/free quantities.

## Sell promotional free quantity through POS

1. Ensure the intended offer is active in the backend offer configuration and
   applies to the product or category, date, and quantity being sold.
2. Open **POS**, scan the product barcode or add the product from the product
   list, then select the applicable batch. The POS selects the oldest available
   batch by default when possible; the cashier can choose another listed batch.
3. Enter the quantity the customer is paying for. Do not add the offer's free
   quantity to the cashier-entered paid quantity.
4. Complete checkout. The frontend submits the sale through the existing sales
   API. Promotional eligibility and free quantity must be calculated and
   revalidated by the backend; the frontend does not calculate the offer.
5. After the sale is saved, the invoice/receipt displays the backend-returned
   offer name and paid, free, and total quantities when those fields are
   included in the sales response. The backend deducts paid and free quantities
   from stock.

Example: for an active **Buy 10 Get 1 Free** offer, enter 10 as the paid
quantity. If the backend confirms eligibility, the saved sale should show 10
paid, 1 free, and 11 total. The customer is charged for the paid quantity only.

If the saved invoice does not show a free quantity, check that the offer is
active and eligible, and that the backend sales response includes
`paidQuantity`, `freeQuantity`, `totalQuantity`, and (when applicable)
`offerName`. Do not manually adjust customer totals or stock to simulate a
promotion.

## Current frontend/API boundary

The supplied `FRONTEND-LATEST-UPDATES-ANALYSIS.md` lists offer fields and
business rules, but does not document offer create/list/update routes, an offer
eligibility/calculation route, or their request and response shapes. Therefore
the frontend uses the existing sales and batch APIs, displays offer data
returned by the backend, and does not add an offer-management screen or
calculate promotional quantities locally. Exact offer administration and
eligibility API documentation is needed to implement those screens safely.
