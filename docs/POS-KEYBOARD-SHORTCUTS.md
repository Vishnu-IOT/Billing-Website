# POS Keyboard Shortcuts

Use the keyboard to scan or find products, edit the cart, and complete checkout.
The shortcuts below apply while the POS screen is active.

## POS shortcuts

| Key | Action |
| --- | --- |
| `F2` | Focus the barcode/product search field |
| `F3` | Focus the first item's discount percentage |
| `F4` | Focus the customer phone field |
| `F5` | Focus the first item's quantity |
| `F6` | Focus the customer name field |
| `F8` | Open checkout when the cart has items |
| `F9` | Start a new bill; asks before clearing a non-empty cart |
| `F10` | Hold the current cart, or open held carts if the cart is empty |
| `Esc` | Close the topmost dialog/drawer or product suggestions; otherwise return when not editing a field |;'
## Product search and cart

1. Press `F2` and type a product name, barcode, or SKU. Barcode scanners that
   send `Enter` add an exact barcode/SKU match immediately.
2. For search suggestions, use `Up` / `Down` to choose a product and `Enter`
   to add the highlighted product. `Esc` closes the suggestions.
3. Use `F3` to edit the first item's discount, or `F5` to edit its quantity.
   Enter a value and press `Enter` or `Tab` to apply it. Discount is a
   percentage from 0 to 100.
4. Use `Tab` / `Shift+Tab` to move between cart controls. Quantity increase,
   quantity decrease, and remove buttons can be activated with `Enter` or
   `Space`.

The cart shows the GST rate and amount per item. The line total includes GST.

## Checkout

1. Press `F8` to open checkout.
2. Use `Alt+1` through `Alt+4` to select `Cash`, `UPI`, `Card`, or `Split`.
   You can also use `Tab` to focus a payment option, then press `Enter` or
   `Space`.
3. For cash or split payments, use `Tab` to reach the amount fields and type
   the amounts.
4. Press `Ctrl+Enter` to confirm and print when the payment is valid. You can
   also `Tab` to **Confirm & Print** and press `Enter`.
5. Press `Esc` to close checkout and return focus to the previous control.

## Notes

- `Tab` and `Shift+Tab` follow the normal page focus order.
- Invalid discount values are restored to the last saved value; valid
  discounts are limited to 0–100%.
- `F9` confirms before clearing an existing cart to prevent accidental loss.
