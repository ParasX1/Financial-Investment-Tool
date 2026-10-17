# TopPicks 与 Portfolio Worklog - 2026-08-08

这份文档记录 2026-08-08 围绕 TopPicks 股票池扩容、同步脚本、本地缓存、
Portfolio 加载体验，以及两者计算解耦所做的改动。

## 背景

一开始 TopPicks 只返回 22 条股票。确认后发现这不是 Supabase 的查询行数
限制，而是数据库里 `public.tickers` 本身只有 22 条 legacy seed 数据。

产品目标调整为：

- TopPicks 不再依赖开发者手动挑 22 只股票。
- 使用标准指数成分股构建股票池。
- 先覆盖美股、澳股、港股。
- Portfolio 用户点击 `Run analysis` 时，应优先计算当前最多 5 只股票，
  不被 TopPicks 大股票池计算拖慢。

## TopPicks 标准股票池

新增 Supabase migration：

- `supabase/migrations/20260808010000_create_top_picks_universe.sql`

该 migration 创建：

- `public.top_picks_universe`
- `market`: `US` / `AU` / `HK`
- `source`: `SP500` / `ASX200` / `HSI` / `LEGACY` / `MANUAL`
- `active`
- `updated_at`

部署 migration 后，旧的 `public.tickers` 会先迁移为 `LEGACY` 数据，因此部署后
默认仍能继承旧 22 条，不会让 TopPicks 空掉。

TopPicks repository 现在读取顺序是：

```text
public.top_picks_universe active rows
-> fallback public.tickers
```

默认 universe limit 从 50 提升到 1000，支持标准池规模。

## Universe 同步脚本

新增脚本：

- `scripts/sync_top_picks_universe.py`

支持两种输入方式：

```powershell
python scripts\sync_top_picks_universe.py --preset SP500
python scripts\sync_top_picks_universe.py --preset ASX200
```

也支持手动 CSV：

```powershell
python scripts\sync_top_picks_universe.py `
  --csv .\data\example.csv `
  --market US `
  --source SP500 `
  --symbol-column Symbol `
  --name-column Name `
  --industry-column Industry
```

同步脚本会：

- normalize Yahoo Finance ticker 格式。
- US class shares 使用 `-`，例如 `BRK.B` -> `BRK-B`。
- AU ticker 自动补 `.AX`。
- HK 数字 ticker 自动补零到四位并补 `.HK`。
- upsert 到 `top_picks_universe`。
- 将同一 source 中不再出现的旧 symbol 标记为 `active=false`。

## S&P 500 与 ASX 200

S&P 500 使用公开维护的 CSV preset：

```text
https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv
```

同步后实际结果：

```text
SP500 / US: 503
```

ASX 200 优先尝试 OpenASX snapshot feed。如果 OpenASX 返回 `403 Forbidden`，
脚本会 fallback 到本地：

- `data/asx200.csv`

当前本地 ASX200 snapshot dry-run 结果：

```text
Prepared 196 ASX200 records from data/asx200.csv.
```

其中 `IFL.AX` 和 `NSR.AX` 被排除，因为 Yahoo Finance 当前没有可用行情。

## 本地开发自动同步

`npm run dev` 现在会先启动页面和 Flask API，再延迟在后台同步 universe：

- ASX200 默认 60 秒后同步。
- S&P 500 默认 90 秒后同步。

可以用环境变量关闭：

```env
TOP_PICKS_DEV_SYNC_ASX200=false
TOP_PICKS_DEV_SYNC_SP500=false
```

也可以调整延迟：

```env
TOP_PICKS_DEV_SYNC_DELAY_MS=60000
TOP_PICKS_DEV_SYNC_SP500_DELAY_MS=90000
```

后台同步失败不会 kill dev server。

## TopPicks 持久 Snapshot Cache

之前 TopPicks cache 只是 in-memory，Flask dev server 重启后就没有上一次结果。
这会导致用户每次重新打开都还要等全量计算。

现在新增本地持久 snapshot cache：

```text
server/.cache/top-picks-snapshot-cache.json
```

默认配置：

```env
TOP_PICKS_CACHE_PATH=server/.cache/top-picks-snapshot-cache.json
```

行为：

- 第一次完整计算仍然需要等待。
- 计算完成后，完整 ranking snapshot 会写入本地 cache 文件。
- 下次打开或重启 dev server 后，如果 cache 仍在 stale window 内，会先返回旧结果。
- 后端同时后台刷新新 snapshot。
- 前端每 20 秒轮询一次。
- 新 snapshot 计算完成后，表格自动替换，不需要用户刷新浏览器。

前端状态文案：

```text
503 results - using previous results
```

## TopPicks 前端加载行为

TopPicks 不再做半页 preview。当前策略是：

- 有可用 stale snapshot：立即展示旧完整结果。
- 后台刷新新结果。
- 新结果准备好后自动替换。
- 如果没有任何旧 snapshot，仍然展示 loading，等待第一次完整计算。

`TopPicksPrewarm` 也调整为：

- 延迟 30 秒预热。
- 不在 `/Portfolio` 和 `/dashboardView` 上预热。

这样 Portfolio 页面不会因为 TopPicks 预热而被抢资源。

## Portfolio 加载体验

Portfolio 的指标计算逻辑保持轻量：

- 最多 5 个股票。
- 点击 `Run analysis` 后只计算当前 Portfolio 已应用的 symbols。
- 如果已有旧图，新请求期间保留旧图并标记 `Updating`。
- 如果是第一次计算，没有旧图可展示，则显示明确的 `Running analysis` 状态。

这次修复了之前 loading skeleton 太淡的问题。之前看起来像卡片内容消失，
现在改成明确的状态块：

```text
Running analysis
Loading <metric> with the applied symbols and assumptions.
```

同时清理了 Portfolio 组件里几处乱码字符。

## Portfolio 与 TopPicks 计算解耦

发现一个关键阻塞点：

`server/src/metrics.py` 的 `fetch_stock_data` 原先在拿着全局 cache lock 的
情况下执行 yfinance 下载。TopPicks 一次拉大股票池时，Portfolio 的小请求也可能
被这个锁挡住。

现在改为：

- cache 读写时才持有 `_stock_data_lock`。
- 真正的 yfinance 网络下载不持有全局 cache lock。

同时本地 Flask dev server 明确设置：

```python
threaded=True
```

这样 `/api/metrics/...` 和 `/api/top-picks` 可以并发处理。TopPicks 后台大计算
不应该再阻塞 Portfolio 的 3-5 只股票分析请求。

## 环境配置

`server/.env.example` 新增：

```env
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
TOP_PICKS_CACHE_PATH=server/.cache/top-picks-snapshot-cache.json
```

本地 `server/.env` 应保持普通 dotenv 格式：

```env
SUPABASE_URL=...
SUPABASE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TOP_PICKS_CACHE_PATH=server/.cache/top-picks-snapshot-cache.json
```

不要使用 PowerShell 的 `$env:KEY=...` 写法放进 `.env` 文件。

## 验证

后端 TopPicks 相关测试：

```text
46 passed, 2 warnings
```

前端 TopPicks 相关测试：

```text
20 passed
```

Portfolio 相关测试：

```text
28 passed
```

Metrics / dev server 解耦相关测试：

```text
20 passed
```

ASX200 preset dry-run：

```text
Prepared 196 ASX200 records from data/asx200.csv.
```

Python compile 和 `node --check scripts/dev-all.mjs` 均通过。

## 已知限制

### 第一次 TopPicks 冷启动仍然慢

如果本地还没有 `server/.cache/top-picks-snapshot-cache.json`，第一次 TopPicks
仍然必须完整计算一次。这是正常的，因为没有旧 snapshot 可以先展示。

### ASX200 fallback 不是实时数据源

如果 OpenASX 被 403 block，本地会使用 `data/asx200.csv`。这保证开发体验稳定，
但它不是实时更新源。之后可以考虑换成更稳定的 ASX 数据 API 或定时更新 CSV。

### HK / Hang Seng 尚未完成自动 preset

数据库 schema 和同步脚本已经支持 `HK` / `HSI`，但本次主要落地了 SP500 和
ASX200。Hang Seng 仍需要选定可靠 CSV/API 数据源后接入。

