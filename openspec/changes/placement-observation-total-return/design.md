## 设计

Web 将服务端 `placement_observation_state` 作为唯一资格事实。派生列表保留全部观察标的：`eligible` 按登记日升序、`registration_unknown` 居中、`expired` 按登记日降序。视图在桌面和移动端显示已过期标签；该标签采用风险语义，不能表示为机会。
