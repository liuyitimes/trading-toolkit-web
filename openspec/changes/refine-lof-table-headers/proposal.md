# Refine LOF Table Headers

## Why

The LOF desktop tables use formula information icons in their headers even though the user wants a cleaner header row. Their transaction-amount column also cannot be sorted, which makes liquidity comparison slower.

## Scope

- Remove formula information icons from LOF desktop-table headers.
- Make the transaction-amount column sortable by normalized numeric amount in both the standard and arbitrage desktop tables.
- Preserve formulas and detail explanations outside table headers.

## Out of scope

- Mobile card layout changes.
- Backend API or data-model changes.
- Mini-program work.

## Rollback

Revert the single Web view change to restore prior header content and column behavior.
