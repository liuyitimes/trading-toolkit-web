## Why

页面首屏存在依次等待独立接口的加载路径，且后端冷缓存会阻塞较长时间。

## What Changes

- 首页并发读取独立概览与情绪数据。
- 为快速返回但标识为陈旧的数据保留既有展示，不阻塞主界面。

## Impact

影响 Vue 首页加载编排；依赖配套 Service `optimize-local-performance` 变更。
