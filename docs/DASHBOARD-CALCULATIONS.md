  # Dashboard Calculation Notes

  This document describes the calculations currently used by the dashboard.
  The dashboard UI is in `src/features/dashboard/Dashboard.js`; values are
  calculated by `mysql-controllers/dashboardController.js` and returned from
  `GET /api/dashboard/get-dashboard`.

  ## Summary cards

  All currency values are formatted by the frontend for display. The backend
  performs the aggregates using invoice and product values stored in the
  database.

  ### Total Sales (MTD)

  ```text
  Dashboard sales = SUM(sales.totalAmount)
                    for saleDate between the start and end dates of this month
  ```

  `totalAmount` is the final saved invoice amount, so the sum reflects the amount
  stored on each invoice after its discounts and tax calculation. It is not the
  cash actually collected; payment status and amount paid are not used in this
  calculation.

  ### Total Purchases

  ```text
  Dashboard purchases = SUM(purchases.totalAmount)
                        for purchaseDate between the start and end dates of this month
  ```

  This uses each purchase invoice's saved final `totalAmount`; it does not sum
  purchase line quantities or only amounts already paid.

  ### Gross Profit

  ```text
  Dashboard gross profit = Dashboard sales - Dashboard purchases
  ```

  Both totals above use the current-month date range. This is the dashboard's
  simple sales-minus-purchases figure. It is **not accounting gross profit**:
  it does not match the cost of the specific goods sold, and it does not subtract
  expenses. It can therefore be negative or differ substantially from profit
  calculated using cost of goods sold.

  ### Inventory Value

  ```text
  Dashboard inventory value =
    SUM(batch available quantity * batch inventory unit cost)
    + SUM(unbatched quantity * unbatched average cost)
  ```

  This is a current-inventory value, not a month-to-date value. Batch quantities
  use their own saved acquisition cost; unbatched quantity is the non-negative
  remainder of product stock after subtracting the product's summed batch
  availability and uses the product's persisted `unbatchedAverageCost`.
  Purchase discounts are reflected in batch cost. GST is included only when it
  is non-recoverable under the purchase's saved ITC eligibility. Free units are
  included in the batch quantity denominator.

  `products` currently has no company key, so the dashboard supports this
  valuation only when exactly one company is active. Batch rows are filtered to
  that company, with legacy `companyId = NULL` rows included as belonging to
  the sole company. If the database has zero or multiple active companies, the
  endpoint returns an error rather than showing a misleading value.

  Migration `20261115000000-add-inventory-valuation-costs.js` adds
  `product_batches.inventoryUnitCost` and `products.unbatchedAverageCost`.
  Existing batch cost is derived from its saved purchase lines when available,
  otherwise from the batch purchase price. Existing unbatched quantity is
  initialized once from the current product purchase price as an estimate.
  New purchase batches save their discounted acquisition cost, and manual
  stock increases that add unbatched quantity require an acquisition cost; the
  existing product purchase price is not repurposed. A sale return to
  unbatched stock restores its saved unit cost into the weighted average.
  These cost snapshots do not change invoice prices, totals, or stock movement
  quantities.

  ## Monthly Overview chart

  The chart displays the last 12 calendar months, including months with no
  activity:

  ```text
  Monthly sales     = SUM(sales.totalAmount) grouped by saleDate month
  Monthly purchases = SUM(purchases.totalAmount) grouped by purchaseDate month
  ```

  The query starts at the first day of the oldest displayed month. It does not
  apply a cancellation/status filter or a company filter.

  ## Recent Bills

  The Recent Bills section displays up to the three latest sales ordered by
  `saleDate` descending. It shows invoice number, saved total, date, and payment
  status, with the related customer or party name when available.

  ## Current implementation caveats

  These are details of the current backend query, not recommended accounting
  rules:

  - The dashboard aggregates do not filter `paymentStatus = 'Cancelled'`.
    Cancelled sales and purchases may still contribute if their totals remain
    stored on those invoices.
  - Sales, purchase, monthly chart, and Recent Bills queries remain unchanged
    and do not filter by company. Inventory valuation is scoped to the sole
    active company because products are not company-scoped.
  - The current-month date bounds use JavaScript `Date` values from the first
    day of the month through midnight at the beginning of the last day. As a
    result, invoices later on the last calendar day may be excluded.
  - The chart query applies only a lower date bound, so future-dated invoices
    may be included in the monthly aggregation even though the chart only renders
    the last 12 month labels.
  - Product rows are summed as stored; there is no explicit active-product,
    non-negative-stock, or batch-cost filter.

  These caveats can affect the figures. In particular, do not use the dashboard
  Gross Profit or Stock Value as a finalized accounting report without changing
  the calculation and validating it against the desired accounting rules.

  ## Example

  Suppose this month has saved sales totals of ₹10,000 and saved purchase totals
  of ₹6,000:
  
  ```text
  Total Sales      = ₹10,000
  Total Purchases  = ₹6,000
  Gross Profit     = ₹10,000 - ₹6,000 = ₹4,000
  ```

  If a product has 2 units in a batch at ₹100 and 3 unbatched units at a
  weighted average cost of ₹120:

  ```text
  That product's inventory value = (2 * ₹100) + (3 * ₹120) = ₹560
  ```

  The dashboard Inventory Value is the sum of this calculation over all
  products and their available batches.
