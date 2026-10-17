# TopPicks 与 ETF 工作报告 - 2026-08-26

本文档记录 2026-08-26 围绕 TopPicks 实时刷新、更新时间展示，以及首版独立 ETF 预览页面所做的改动。

## 范围

本次主要处理两个产品方向：

- 让 TopPicks 排行榜 snapshot 能持续刷新，不再需要用户手动刷新浏览器才能看到新结果。
- 新增独立 ETF 页面和后端路由，先用 10 个硬编码 ETF 做 UI 和 API 契约预览，再接真实 ETF 数据源。

ETF 目前是页面和接口预览，不是实时 ETF 行情数据。

## TopPicks 架构边界

曾经讨论过在 TopPicks domain service 里直接引用 legacy `metrics` layer，但这会触发 TopPicks 架构测试。

最终实现把依赖留在 composition 组装层：

- `server/src/top_picks/service.py` 接收注入的 `market_cache_clearer`。
- `server/src/composition/top_picks.py` 从 `metrics` 引入 `clear_stock_data_cache`，再注入到 service。

这样 TopPicks 可以在强制刷新时清理底层 stock-data cache，同时不会让 TopPicks domain package 直接依赖 legacy metrics 模块。

## TopPicks 强制刷新

TopPicks 请求 contract 现在支持：

```json
{
  "force_refresh": true
}
```

当 `force_refresh` 为 true 时：

- 前端在刷新请求进行中保留当前可见 rows，不清空表格。
- 后端可以先返回当前缓存 snapshot。
- 后端同时启动后台 rebuild。
- 强制 rebuild 前会清理底层 stock-data cache。

TopPicks 页面挂载时，前端 controller 每 20 秒发送一次 force refresh。

## 全窗口后台刷新

TopPicks 仍然按 window 分开保存 snapshot cache：

- `1D`
- `1W`
- `1M`
- `1Y`

当前 window 的强制刷新会触发全窗口后台刷新。用户正在看的 window 会优先刷新，然后依次刷新其他 window。

后端还补强了并发行为：如果已有一轮窗口刷新正在运行，这时又收到新的 force refresh，不会直接丢掉，而是记录为 pending。当前刷新结束后，会立刻补跑一轮强制全窗口 rebuild。

这样即使用户一直停留在某一个 TopPicks tab，Day、Week、Month、Year 的 snapshot 也会持续向前推进。

## TopPicks 更新时间

TopPicks toolbar 现在会在 Day/Week/Month/Year 控件旁边显示同步时间。

时间来源是后端 metadata：

```text
metadata.generatedAt
```

它不是浏览器当前时间。只有当前端拿到新的 `generatedAt` 时，`Updated` 时间才会变化。

因此，如果一次成功响应仍然指向同一份 cache snapshot，页面不会假装它是在当前电脑时间重新生成的。

## TopPicks 同步状态

toolbar 现在可能显示：

- `Syncing latest`
- `Syncing - Updated <time>`
- `Updated <time>`
- `Waiting for sync`

`syncing` 现在表示前端当前页面请求正在进行，且已有可见 rows。它不再直接绑定 `metadata.snapshotRefreshing`，因为后端可能已经返回可展示数据，同时仍在后台计算下一版 snapshot。

## TopPicks 底部状态文案

之前底部状态可能显示：

```text
using previous results
```

这句话已经移除，因为它会和 toolbar 的 `Updated` 时间产生语义冲突，并且在后台刷新时容易误导用户。

现在底部只保留中性的结果数量和分页信息，例如：

```text
50 results - Showing page 1 of 2
```

## ETF 预览页面

新增了独立 ETF 工作区：

```text
/ETF
```

ETF 页面和 TopPicks 分开，前端有自己的 feature 文件夹：

```text
client/features/etf
```

侧边栏也新增了 `ETF` 入口。

## ETF 后端预览接口

新增 ETF 后端 route：

```text
GET /api/etfs?window=1D
GET /api/etfs?window=1W
GET /api/etfs?window=1M
GET /api/etfs?window=1Y
```

ETF 后端代码独立放在：

```text
server/src/etf/service.py
server/src/routes/etf.py
```

当前 service 返回 10 个硬编码 ETF 作为预览 universe：

- `SPY`
- `QQQ`
- `VOO`
- `IWM`
- `VTI`
- `VEA`
- `VWO`
- `XLK`
- `XLE`
- `TLT`

## ETF 时间跨度

ETF preview 排行榜现在支持和 TopPicks 一致的四个时间跨度：

- Day
- Week
- Month
- Year

前端会根据选中的 window 请求后端，并更新表格。

排序逻辑：

- Day、Week、Month 按 `priceReturn` 排。
- Year 按 `sharpe` 排。

表格列名使用 `Price return`，不再写死成 `1Y return`，这样同一列可以适配四个时间跨度。

## ETF 预览表格列

首版 ETF 表格包含：

- Rank
- Symbol
- ETF name
- Category
- Issuer
- AUM
- Expense ratio
- Price return
- Sharpe
- Volatility
- Max drawdown

短周期里 Sharpe 暂时显示为不可用，避免为了 preview 硬编一个不可靠的短周期 Sharpe 数字。

## 修改文件

TopPicks 刷新和更新时间相关文件：

- `client/features/top-picks/api/fetchTopPicks.ts`
- `client/features/top-picks/hooks/useTopPicksController.ts`
- `client/features/top-picks/components/TopPicksToolbar.tsx`
- `client/features/top-picks/screens/TopPicksScreen.tsx`
- `server/src/metrics.py`
- `server/src/top_picks/contracts.py`
- `server/src/top_picks/service.py`
- `server/src/composition/top_picks.py`

ETF preview 相关文件：

- `client/features/etf/types.ts`
- `client/features/etf/api/fetchEtfs.ts`
- `client/features/etf/screens/EtfScreen.tsx`
- `client/features/etf/index.ts`
- `client/pages/ETF.tsx`
- `server/src/etf/__init__.py`
- `server/src/etf/service.py`
- `server/src/routes/etf.py`
- `server/src/server.py`
- `client/components/navigation/sidebarNavigation.ts`

测试文件：

- `client/features/top-picks/api/fetchTopPicks.test.ts`
- `client/features/top-picks/hooks/useTopPicksController.test.tsx`
- `client/features/top-picks/components/TopPicksToolbar.test.tsx`
- `client/features/top-picks/screens/TopPicksScreen.test.tsx`
- `client/components/navigation/sidebarNavigation.test.ts`
- `server/tests/api/test_etf_route.py`
- `server/tests/test_metrics_missing_data.py`
- `server/tests/top_picks/test_service.py`
- `server/tests/top_picks/test_service_edges.py`

## 验证

后端检查通过：

```powershell
python -m pytest
```

结果：

```text
136 tests passed
2 个 Supabase 依赖 deprecation warnings
```

前端检查通过：

```powershell
cd client
npm.cmd run test:portfolio-top-picks:coverage
npm.cmd run build
```

结果：

```text
45 个前端 test suites passed
253 个前端 tests passed
Next build completed successfully
/ETF 已出现在 pages route 输出中
```

`next build` 过程中 Windows 报了非阻塞的 `.next/cache` `EPERM` warning，但 build 最终 exit code 为 `0`。

本机运行中的后端也做了 smoke test：

```powershell
GET http://127.0.0.1:8080/api/etfs?window=1D
GET http://127.0.0.1:8080/api/etfs?window=1W
GET http://127.0.0.1:8080/api/etfs?window=1M
GET http://127.0.0.1:8080/api/etfs?window=1Y
```

结果：

```text
四个 window 都返回 10 条 ETF rows。
Year 返回 sortKey=sharpe。
Day、Week、Month 返回 sortKey=priceReturn。
```

## 已知限制

ETF 页面目前仍然是 hardcoded preview。下一步是把 preview service 替换成真实 ETF universe 和 market-data provider。

TopPicks live refresh 仍然由前端页面挂载触发。如果用户离开 `/TopPicks`，浏览器不会继续启动新的 20 秒刷新周期；但后端已经开始的一轮刷新会继续跑完。
