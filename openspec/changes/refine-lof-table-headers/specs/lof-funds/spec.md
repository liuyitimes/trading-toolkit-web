## MODIFIED Requirements

### Requirement: LOF desktop-table scanning and liquidity sorting

The LOF desktop tables SHALL use text-only metric headers and SHALL allow users to sort the `成交额` column by the normalized numeric `amountRaw` value in both the standard and arbitrage lists.

#### Scenario: A user scans an LOF table header

- GIVEN the standard or arbitrage LOF desktop table is visible
- WHEN the user views headers for 溢价率, 净溢价, 预期收益(万), and 成交额
- THEN the headers contain their textual labels without formula information icons.

#### Scenario: A user sorts by transaction amount

- GIVEN an LOF desktop table contains funds with different `amountRaw` values
- WHEN the user clicks the 成交额 header
- THEN the table sorts the visible rows by `amountRaw`
- AND repeated sorting can reverse the numeric order.
