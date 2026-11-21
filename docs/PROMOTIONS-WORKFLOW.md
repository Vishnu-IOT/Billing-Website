# How to Add an Offer

## Current limitation

There is no Offers or Promotions page in the frontend, and the supplied backend API documentation does not describe an offer-creation endpoint or another supported offer-administration process. This frontend therefore cannot create, edit, activate, or delete offers today.

Do not add an offer by changing the POS cart, browser storage, product prices, or sale request. The backend is responsible for promotion eligibility, campaign priority, gift quantities, pricing, and stock allocation. Do not write directly to a database unless the backend owner provides an approved procedure and schema.

## What to ask the backend owner

Ask for the supported offer setup method and the API contract or admin workflow. It must define:

- How an offer is listed, created, edited, activated, deactivated, and deleted.
- Which product or category is eligible, the bill type, and the validity dates.
- The exact fields required for each offer type and for same-product or different-product gifts.
- How festival campaign priority and per-product offer rules are configured.
- How the backend returns offer name, discount, paid/free/total quantity, gift product, and gift batch allocation on a saved sale.

The backend documentation lists these offer types: `BUY_X_GET_Y_FREE`, `BUY_X_GET_Y_FREE_FIXED`, `BUY_N_GET_M_FREE`, `PERCENTAGE_DISCOUNT`, `FLAT_DISCOUNT`, and `SPECIAL_PRICE`. It does not document the request fields for creating them.

## Using an offer at checkout

Once the backend owner confirms that an offer is configured and active:

1. In POS, scan or search for the qualifying product.
2. Select the sale batch and enter the quantity the customer is paying for. Do not add free units manually.
3. Submit the sale using the existing `POST /api/sales/add-sales` workflow.
4. Let the backend validate the offer and determine campaign priority, discount, gift lines, and stock allocation.
5. Check the saved invoice/receipt for promotion and gift details returned by the backend. If the promotion is absent, ask the backend owner to verify the offer's active dates, eligibility, bill type, and returned sale fields.

## Frontend integration once the contract exists

After the backend contract is available, the offer-management workflow can be added to the frontend using the existing Axios client and authenticated API pattern. Use the documented methods, paths, request fields, and response fields exactly. Add the relevant offer form and list, loading and error states, validation, status confirmation, and tests. Keep promotion calculations on the backend; POS should display the saved backend result rather than calculate eligibility locally.
