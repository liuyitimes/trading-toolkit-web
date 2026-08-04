## Why

配债工作区隐藏登记日已过的末段标的，且客户端重复推断资格，无法满足持续观察需求。

## What Changes

- 消费服务端观察状态，显示已过期记录而不暗示可参与。
- 按临近登记、登记日未知、已过期的固定组别排序。
- 配套 Service 变更为 `trading-toolkit-service/placement-observation-total-return`。

## Scope

本次实施任务 01；总收益详情将在后续任务实现。
