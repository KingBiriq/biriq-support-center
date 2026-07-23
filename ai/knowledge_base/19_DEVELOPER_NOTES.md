# 19 — Developer Notes

## Architecture requirement

Markdown files alone do not make the AI operational. The application must:

1. Load `MASTER_SYSTEM_PROMPT.md`.
2. Retrieve relevant knowledge files.
3. Provide authenticated tool access.
4. Enforce authorization server-side.
5. Log escalations and sensitive actions.

## Suggested tools

- `get_authenticated_customer`
- `get_customer_profile`
- `get_recent_orders`
- `get_order`
- `get_payment`
- `get_cashback_balance`
- `get_cashback_ledger`
- `get_refund_request`
- `create_refund_review`
- `create_support_escalation`
- `get_business_settings`

## Never expose service-role keys to the browser

All privileged Supabase operations must run server-side.

## Retrieval tags

Suggested metadata:

- account
- payments
- orders
- cashback
- refund
- products
- security
- privacy
- escalation
- language

## Configuration over hard-coding

Store changing values in admin settings where possible:

- Business hours
- Active payment methods
- Cashback rate
- Refund deduction
- Delivery estimates
- Product availability
- Support status

The AI should read live settings before static defaults when available.

## Testing

Test at minimum:

- Authenticated vs unauthenticated access
- Wrong-order ownership
- Pending payment
- Duplicate payment attempt
- Completed instant refund request
- Unfulfilled manual refund review
- Missing cashback
- Human handoff
- Prompt injection
- Somali/English/Arabic responses
