# TopPicks 与本地开发 Worklog - 2026-08-07

这份文档记录了本次工作中围绕 TopPicks、Portfolio 指标对齐、缓存、
预热以及本地开发启动体验所做的改动。

## 工作范围

本次主要目标有四个：

- 让 TopPicks 和 Portfolio 的指标语言更一致
- 优化 TopPicks 重复访问、翻页、排序时的加载速度
- 通过预热降低用户点进 TopPicks 时感受到的等待时间
- 简化本地开发启动流程，不再需要开两个 terminal 分别启动前后端

涉及区域：

- TopPicks 指标命名
- TopPicks 后端 snapshot 缓存
- 网站启动时预热 TopPicks cache
- TopPicks metadata 类型
- 本地一键启动脚本
- 测试验证和已知环境问题

## 产品方向

本次讨论中明确了 TopPicks 和 Portfolio 的产品关系：

- TopPicks 是单只股票发现页面
- Portfolio 是多只股票组合验证页面

更清晰的用户路径是：

```text
TopPicks 对单只股票进行排名
-> Portfolio 验证这些股票放在一起是否构成合理组合
```

也就是说，TopPicks 解决的是：

```text
哪些股票单独看起来不错？
```

Portfolio 解决的是：

```text
这些股票作为一个 basket 放在一起是否合理？
```

这样两个页面就不是重复的图表页，而是一个完整研究流程中的上下游。

## TopPicks 指标名称对齐

为了避免用户在 TopPicks 中看完指标后，进入 Portfolio 发现指标名称变了、
对不上，我们先统一了 TopPicks 的表头名称。

修改如下：

- `1Y Return` -> `Cumulative return`
- `Sharpe` -> `Sharpe ratio`
- `Sortino` -> `Sortino ratio`
- `Volatility` -> `Annualised volatility`
- `Max DD` -> `Max drawdown`
- `Beta` -> `Beta exposure`
- `Alpha` -> `Alpha vs benchmark`
- `Info Ratio` -> `Information ratio`

需要注意的地方：

- TopPicks 里的 `Cumulative return` 仍然是 trailing 1Y 的累计收益。
- Portfolio 里的 `Cumulative return` 是用户选择时间区间后的收益曲线。
- TopPicks 里的 `Max drawdown` 是 drawdown history 中的最低点。
- Portfolio 里的 `Drawdown history` 仍然是完整的 drawdown 曲线。

所以这次是统一用户看到的指标语言，而不是把两个页面的展示方式完全改成一样。

相关文件：

- `client/features/top-picks/lib/topPicksColumns.ts`
- `client/features/top-picks/lib/topPicksColumns.test.ts`
- `client/features/top-picks/lib/topPicksCsv.test.ts`
- `client/features/top-picks/screens/TopPicksScreen.test.tsx`
- `client/features/top-picks/components/TopPicksTable.test.tsx`
- `client/features/top-picks/components/TopPicksColumnsDialog.test.tsx`

## 指标算法关系确认

我们确认了 TopPicks 和 Portfolio 中可以对应的指标，后端使用的是同一批
calculator。

这些指标共用后端算法：

- `calculate_cumulative_return`
- `calculate_sharpe_ratio`
- `calculate_sortino_ratio`
- `calculate_volatility`
- `calculate_drawdown`
- `calculate_beta`
- `calculate_alpha`

主要差异不是算法，而是使用方式：

- TopPicks 固定使用 trailing one-year 窗口。
- Portfolio 使用用户选择的日期区间。
- TopPicks 会把部分时序数据压缩成单个排名值。
- Portfolio 会展示完整图表或研究视图。
- TopPicks 有 `Information ratio`，Portfolio 目前还没有对应图表。

## Redis 风格的 TopPicks Snapshot Cache

后端新增了一个 in-memory、Redis-style 的 TTL cache，用来缓存完整的
TopPicks ranking snapshot。

行为：

- 第一次请求会计算完整 snapshot，并返回 `cacheStatus: "miss"`。
- 相同假设条件下的后续请求会返回 `cacheStatus: "hit"`。
- 翻页和排序会基于 cached rows 处理，不再重新计算整个 universe。
- 默认 TTL 是 `600` 秒，也就是 10 分钟。
- 设置 `TOP_PICKS_CACHE_TTL_SECONDS=0` 可以关闭缓存。

cache key 包含：

- benchmark ticker
- risk-free rate
- universe limit
- requested start date
- requested end date

相关文件：

- `server/src/top_picks/service.py`
- `server/src/composition/top_picks.py`
- `server/tests/top_picks/test_service.py`
- `server/tests/top_picks/test_configuration.py`
- `server/tests/api/test_top_picks_app_config.py`
- `client/features/top-picks/types.ts`

## 冷启动优化

我们明确了一点：

```text
cache 本身不能消除真正的第一次冷启动。
```

原因是第一次请求时 cache 里没有数据，系统仍然需要：

- 拉 ticker universe
- 拉历史行情
- 计算各类指标
- 排名
- 写入 cache

为了减少第一次计算时重复拉行情的机会，TopPicks 现在会使用同一个市场数据窗口：

```text
symbols + benchmark
```

这样底层 stock-data cache 更容易复用同一批行情数据。

相关文件：

- `server/src/top_picks/service.py`
- `server/tests/top_picks/test_service_edges.py`

## 网站启动时预热 TopPicks

为了让用户不必等到点击 TopPicks 页面后才开始计算，我们新增了一个前端预热组件。

行为：

- 在 `client/pages/_app.tsx` 中全局挂载。
- 只在浏览器端执行。
- 静默请求一次默认 TopPicks：
  - page 1
  - page size 25
  - Sharpe ratio 降序
- 如果用户直接打开 `/TopPicks`，预热不会额外执行，避免和页面自己的请求重复。

这样当用户先打开首页、dashboard 或其他页面时，TopPicks 后端 cache 会提前开始构建。
之后用户再进入 TopPicks 页面，大概率可以直接命中 cache。

相关文件：

- `client/features/top-picks/components/TopPicksPrewarm.tsx`
- `client/pages/_app.tsx`
- `client/features/top-picks/api/fetchTopPicks.ts`
- `client/features/top-picks/api/fetchTopPicks.test.ts`
- `client/features/top-picks/api/fetchTopPicks.edgeCases.test.ts`

## Cache Metadata 前端保留

后端现在会返回缓存相关 metadata。

前端 normalizer 已经保留：

- `cacheStatus`
- `cacheTtlSeconds`

这样以后如果想在 UI 中展示：

```text
cache hit / miss
```

就不需要再改 API contract。

## 本地开发一键启动

新增了根目录一键启动命令。

现在可以在项目根目录运行：

```powershell
npm run dev
```

或者：

```powershell
npm run dev:all
```

它会同时启动：

- Flask backend: `http://127.0.0.1:8080`
- Next frontend: `http://localhost:3000`

脚本会优先使用当前已知可用的 Conda Python：

```text
C:\Users\Johnny\miniconda3\envs\financeDev-server\python.exe
```

这样可以避开 WindowsApps 中不可用的假 `python.exe` alias。

启动时会优先打印项目链接：

```text
Project link
Client: http://localhost:3000
```

这样不用在大量前后端日志中找链接。

相关文件：

- `package.json`
- `scripts/dev-all.mjs`

## 本地 Python 环境问题

用户交互终端中 Python 是正常的：

```text
Python 3.11.15
```

但非交互 shell 一开始解析到的是：

```text
C:\Users\Johnny\AppData\Local\Microsoft\WindowsApps\python.exe
```

这个路径是 Windows Store alias，不是真正可用的 Python。

解决方式是直接调用 Conda 环境中的 Python：

```powershell
& C:\Users\Johnny\miniconda3\envs\financeDev-server\python.exe -m pytest ...
```

## 验证结果

### 前端 TopPicks 相关测试

运行命令：

```powershell
cd D:\Financial-Investment-Tool\client
npx.cmd jest --config jest.portfolio-top-picks.config.js --runInBand features/top-picks/api/fetchTopPicks.test.ts features/top-picks/api/fetchTopPicks.edgeCases.test.ts features/top-picks/lib/topPicksColumns.test.ts features/top-picks/lib/topPicksCsv.test.ts features/top-picks/components/TopPicksTable.test.tsx features/top-picks/components/TopPicksColumnsDialog.test.tsx features/top-picks/screens/TopPicksScreen.test.tsx features/top-picks/topPicksBoundary.test.ts --coverage=false
```

结果：

- 8 个 test suites passed
- 30 个 tests passed

### 后端 TopPicks 测试

运行命令：

```powershell
cd D:\Financial-Investment-Tool
& C:\Users\Johnny\miniconda3\envs\financeDev-server\python.exe -m pytest server\tests\top_picks server\tests\api\test_top_picks_app_config.py
```

结果：

- 42 个 tests passed
- 2 个 Supabase dependency deprecation warnings

### 启动脚本检查

运行命令：

```powershell
node --check scripts\dev-all.mjs
```

结果：

- passed

### 一键启动 smoke test

运行命令：

```powershell
npm.cmd run dev
```

观察结果：

- Flask backend 成功启动在 `http://127.0.0.1:8080`
- Next frontend 成功启动在 `http://localhost:3000`

## 性能对比

用 mocked market data 和 calculator delay 做了一次本地基准测试。

旧行为，使用 `cache_ttl=0` 模拟无 snapshot cache：

```text
call_1: 0.571s status=miss
call_2: 0.562s status=miss
call_3: 0.559s status=miss
repo_calls=3
calculator_calls=21
```

新 snapshot cache：

```text
call_1: 0.560s status=miss
call_2: 0.001s status=hit
call_3: 0.001s status=hit
repo_calls=1
calculator_calls=7
```

总结：

- 第一次 cold request 基本没有变化。
- 后续相同配置请求几乎瞬间返回。
- 三次连续请求整体约快 3 倍。
- calculator 调用从 21 次降到 7 次。
- repository 调用从 3 次降到 1 次。

## 已知限制

### 真正的 cold start

第一次 cache miss 仍然需要计算 TopPicks snapshot。

如果要让第一次用户可见加载也更快，后续可以考虑：

- 后端启动时 prewarm
- 定时任务生成 daily TopPicks snapshot
- 把 snapshot 写入 Supabase
- 未来把 in-memory cache 替换成 Redis 或其他共享 cache

### 全量 TypeScript 检查

尝试运行：

```powershell
npx.cmd tsc --noEmit
```

但当前 repo 的 TypeScript 配置会报告一些已有问题，包括：

- 测试文件中 Jest globals 类型不可用
- 部分区域 `react-test-renderer` 类型或模块解析问题
- Playwright 类型或模块解析问题
- 一些无关 provider 类型解析 warning

这个失败不是本次 TopPicks prewarm 改动导致的。

### Next config warning

本地启动时 Next 报告了一个已有 warning：

```text
Unrecognized key(s) in object: 'outputFileTracingRoot'
```

这看起来是现有 `next.config.mjs` 的配置 warning，不影响 dev server 启动。

## 部署讨论记录

我们讨论过把项目部署成在线 demo 是可行的，但当前版本在公开部署前建议做安全收口。

上线 demo 前建议：

- 限制 Flask CORS 到前端域名
- 给 API 加基础 rate limit
- 确认 Supabase RLS 和 key 使用方式
- 前端只使用 browser-safe 的 publishable / anon key
- 不提交 `.env`
- 如果是私有面试 demo，可以使用 Vercel Deployment Protection、
  Cloudflare Access 或简单 password gate

推荐的 demo 架构：

```text
Vercel frontend
-> Render / Railway / Fly Flask backend
-> Supabase
```

部署后，本地仍然可以继续开发。代码更新通常通过 Git push 触发线上自动部署。
