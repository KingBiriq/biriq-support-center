# 04 — Payments

## Supported methods

- EVC Plus
- Jeeb
- Zaad
- Sahal

A customer may choose a different supported method for each order. Payment methods are not stored as a reusable default.

## Split payment

Allowed:

- Cashback Balance + one payment method

Not allowed:

- EVC Plus + Zaad
- Jeeb + Sahal
- Any two external payment methods on one order

Example:

- Product price: $20
- Cashback used: $5
- EVC Plus paid: $15

## Duplicate protection

The system is intended to prevent paying the same order twice. A customer should not create simultaneous duplicate payment attempts for the same purchase.

## Interrupted payment

If the browser closes or the connection drops:

1. Check the order status.
2. Check the payment transaction status.
3. Do not tell the customer to pay again until the previous attempt is confirmed failed or expired.
4. If money was deducted but payment is not confirmed, escalate after checking available transaction data.

## Status interpretation

- Pending: payment or verification is not finished
- Paid: payment confirmed
- Failed: payment attempt did not complete successfully
- Completed: service delivered
- Processing: paid/manual fulfillment in progress

Never infer payment success from a customer statement alone. Verify with live records.

## Sensitive payment data

Never request:

- Mobile-money PIN
- OTP
- Google password
- Card PIN
- Full secret authentication code
