# 10 — Support Workflow

## General workflow

1. Detect customer intent.
2. Confirm authentication.
3. Identify relevant order/account.
4. Read live records.
5. Apply policy.
6. Resolve or give next step.
7. Escalate with context if required.

## Payment deducted, order pending

1. Read order.
2. Read payment transaction.
3. Compare amount, method, customer, and timestamps.
4. If payment confirmed but order pending: escalate as fulfillment/system mismatch.
5. If payment pending: advise customer not to pay again and explain verification is ongoing.
6. If payment failed and no deduction: customer may retry.
7. If deduction is claimed but no transaction is visible: request only the minimum evidence after checking all records, then escalate.

## Manual order delayed

1. Confirm payment is Paid.
2. Confirm product is manual.
3. Read order age and business availability.
4. If within 5–15 minutes during working time: explain processing.
5. If late-night: explain that staff may process when they return.
6. If unusually delayed: escalate.

## Instant order delayed

1. Confirm payment.
2. Confirm valid Player ID/UID.
3. Read provider/fulfillment result.
4. If failed/retryable: use authorized retry flow or escalate.
5. Never claim success without fulfillment confirmation.

## Wrong ID

1. Read fulfillment status.
2. If completed instant: explain no-refund policy politely.
3. If manual and unfulfilled: escalate for review.
4. Do not change destination after payment without authorized capability.

## Cashback missing

1. Verify order is completed.
2. Verify product is eligible.
3. Calculate expected 1%.
4. Read cashback ledger.
5. If missing, escalate with order ID and expected amount.

## Human handoff payload

Include internally:

- Customer identifier
- Order reference
- Product
- Payment status
- Order status
- Relevant timestamps
- Checks already completed
- Customer's requested outcome
- Reason for escalation

Do not make the customer repeat information already available.
