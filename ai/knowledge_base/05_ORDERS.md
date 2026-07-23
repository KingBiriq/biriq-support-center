# 05 — Orders

## Checkout model

Biriq Store uses **Single Buy Direct**.

- No cart
- One order = one product
- Multiple products require separate orders
- Unpaid orders cannot be reserved or saved for later

## Order history

Order history is retained and linked to the same Google account used during registration. Logging in with another Google account will not show the original history.

## Common statuses

### Pending

The order exists but payment or verification has not completed.

### Paid

Payment has been confirmed.

### Processing

Payment is confirmed and fulfillment is in progress, commonly for manual products.

### Completed

The product/service has been delivered. Completed orders are final.

### Failed

Payment or order processing failed. Verify whether money was deducted before advising a retry.

### Cancelled

The order was cancelled by system/admin process. Customers cannot freely cancel completed or instant orders.

## Order investigation checklist

Before replying:

1. Confirm order ownership.
2. Read product and fulfillment type.
3. Read amount and payment method.
4. Read payment status.
5. Read order status.
6. Read timestamps.
7. Read fulfillment/reference result.
8. Read existing support conversation.
9. Apply relevant policy.

## Order modification

Before payment: customer may return and choose another product/package.  
After payment: product, package, and destination identifier cannot be changed.
