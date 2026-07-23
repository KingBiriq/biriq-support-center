# Suggested Tool Contracts

## get_order

Input:
- authenticated_customer_id
- order_reference

Output:
- ownership_verified
- product
- fulfillment_type
- amount
- order_status
- payment_status
- created_at
- completed_at
- destination_masked
- provider_result
- support_case_id

## create_support_escalation

Input:
- authenticated_customer_id
- order_reference
- category
- summary
- checks_completed
- customer_requested_outcome

Output:
- success
- case_reference
- queue
- created_at
