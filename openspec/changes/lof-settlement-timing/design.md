# Design

## API boundary

The companion Service change exposes the same optional settlement object from the LOF list and detail contracts. The Web does not calculate timing values. Each timing is independently represented so one verified value can remain visible when the other is unavailable.

```text
execution.settlement_timing = {
  subscription_confirmation: {
    status: "verified" | "unavailable" | "stale",
    timing_text: "T+1 个工作日",
    source: {
      title: "基金招募说明书",
      url: "https://...",
      effective_date: "2026-08-01",
      verified_at: "2026-08-05T09:30:00+08:00"
    }
  },
  redemption_payment: {
    status: "verified" | "unavailable" | "stale",
    timing_text: "T+2 个工作日",
    source: { ... }
  }
}
```

`timing_text` is the Service-normalized display value and retains the source's stated day basis. The client treats it as display text: it neither derives a number from it nor substitutes an exchange default. `unavailable` values may omit `timing_text` and source fields. A `stale` value remains visible with its stale state rather than becoming verified.

The Web maintains compatibility with current list and detail responses that omit `execution.settlement_timing`. Missing objects and missing sides normalize to `暂缺` with an incomplete execution-path state.

## Presentation

`Lof.vue` adds a `申/赎时效` field to each desktop LOF table and a matching metric to every mobile LOF card. The compact value is `申 {subscription} / 赎 {redemption}`, for example `申 T+1 个工作日 / 赎 T+2 个工作日`. This includes standard and arbitrage tabs. It is not used as a client-side sorting or qualification input.

`LofDetail.vue` extends `申购与交割` with `申购确认时效` and `赎回到账时效`. Each row shows the timing and its status; verified or stale values provide the evidence title as an external link and expose effective date and verification time. A missing side renders `暂缺`. When either side is not verified, the existing execution-path disclosure remains incomplete and no strategy label asserts executable arbitrage. Neutral incomplete state uses the product's yellow semantic; negative or risk state uses green when a dedicated strategy label is shown.

The old modal's exchange-derived `赎回规则` is removed. No LOF surface may map an exchange to a timing rule. Existing `ExchangeBadge` markers remain the only mainland-market markers.

## Verification strategy

Add focused contract and browser coverage for a complete response, a partially unavailable response, a stale response, and the legacy response without settlement fields. Assertions cover both desktop tables, mobile cards, and the deep-link detail view. They must prove that no exchange-based fallback or expected-sell-date-derived value appears.

The companion Service change must verify evidence freshness, source metadata, and list/detail contract parity. It uses the same change name and is deployed independently; the Web remains stable before those optional fields arrive.
