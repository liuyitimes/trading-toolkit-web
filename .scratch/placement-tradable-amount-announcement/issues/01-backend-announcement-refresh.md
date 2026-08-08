# 01 — 后台同步公告并计算首日可交易量

**What to build:** 配债快照后台按正股代码同步巨潮公告，使用原股东优先配售合计计算真实首日可交易量。

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] 公告已发布时覆盖配售金额、配售率和首日可交易量
- [x] 公告缺失时返回 null，不回退为发行规模
- [x] 读取接口不等待公告网络请求

## Answer

已在服务端完成，并保留公告来源与缺失原因字段。
