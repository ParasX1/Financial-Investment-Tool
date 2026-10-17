# 2026-08-13 之后代码改动汇报

本文档汇总 2026-08-13 之后围绕 Financial Investment Tool 所做的主要代码改动，重点覆盖 TopPicks、Portfolio、ETF 预览页和 TopPicks universe 同步能力。

## 总体概览

本阶段改动主要围绕三个方向展开：

- TopPicks 从单一年化排行扩展为支持 Day、Week、Month、Year 的多时间窗口排行，并增强后台 snapshot 刷新能力。
- Portfolio 的 symbol 输入从硬编码候选改为真实市场搜索，提高股票、ETF、指数和加密货币的输入体验。
- 新增独立 ETF 预览页面和后端 API，为后续接入真实 ETF universe 和行情数据源提前建立前后端契约。

## 改动总结表

| 日期/范围 | 模块 | 主要改动 | 用户价值 | 技术影响 |
|---|---|---|---|---|
| 2026-08-19 | TopPicks | 新增 `1D`、`1W`、`1M`、`1Y` 四个排行窗口 | 用户可以按不同投资观察周期查看排行榜 | 后端请求 contract 支持 `window` 字段，并按窗口校验可用 sort key |
| 2026-08-19 | TopPicks | 不同时间窗口展示不同指标列 | Day/Week/Month/Year 的指标展示更贴合金融语义 | 前端按 window 过滤表格列和 edit columns 弹窗 |
| 2026-08-19 | TopPicks | Year 窗口保留原有一年排行逻辑 | 避免短周期逻辑破坏原本的一年排行体验 | Year 仍使用 trailing one year，并保留 200 observation 完整性要求 |
| 2026-08-19 | TopPicks | snapshot cache 按 window 分开保存 | 用户切换窗口时可以看到对应窗口的缓存结果 | cache key 纳入 window，Day/Week/Month/Year 分开计算和存储 |
| 2026-08-19 | TopPicks | 持久化 snapshot 改为保留最近完整结果作为 fallback | 服务重启后可先展示旧结果，减少空白等待 | 启动后加载 stale snapshot，并在后台重新计算新 snapshot |
| 2026-08-19 | Portfolio | symbol 输入框接入 `/api/market/symbol-search` | 用户可以搜索真实市场标的，不再受写死候选限制 | Portfolio 仍只保存 ticker symbol，后续指标计算流程不变 |
| 2026-08-19 | Portfolio | 输入规则和 autocomplete 行为收紧 | 减少半截输入误提交和无效 ticker 请求 | 保留最多 5 个 symbols、格式校验、去重和自动大写 |
| 2026-08-26 | TopPicks | 新增 `force_refresh` 请求能力 | 用户无需手动刷新浏览器即可持续看到新排行 | 前端每 20 秒发起 force refresh，后端返回缓存并触发后台 rebuild |
| 2026-08-26 | TopPicks | 强制刷新前清理底层 stock-data cache | 排行刷新更容易拿到最新市场数据 | 通过 composition 层注入 `market_cache_clearer`，保持 domain 边界清晰 |
| 2026-08-26 | TopPicks | 全窗口后台刷新和 pending refresh 处理 | 用户停留在单个 tab 时，其他窗口数据也会持续推进 | 已有刷新运行时，新请求会记录 pending，并在当前刷新结束后补跑 |
| 2026-08-26 | TopPicks | toolbar 展示后端 `metadata.generatedAt` 更新时间 | 更新时间更可信，不用浏览器当前时间误导用户 | 只有拿到新的 snapshot metadata 后，`Updated` 时间才变化 |
| 2026-08-26 | TopPicks | 调整同步状态和底部文案 | 减少 `using previous results` 与更新时间之间的语义冲突 | toolbar 使用 `Syncing latest`、`Updated <time>` 等状态；底部保留结果数量和分页信息 |
| 2026-08-26 | ETF | 新增独立 `/ETF` 页面和侧边栏入口 | 用户可以进入单独 ETF 工作区 | 新增 `client/features/etf` 和 `client/pages/ETF.tsx` |
| 2026-08-26 | ETF | 新增 ETF 后端预览接口 | 前后端具备 ETF 排行接口契约 | 新增 `GET /api/etfs?window=1D/1W/1M/1Y` |
| 2026-08-26 | ETF | 首版返回 10 个硬编码 ETF preview rows | 可以先验证 UI、API 和排序逻辑 | 当前 ETF 页面仍是 preview，不是真实实时行情 |
| 2026-08-26 | ETF | ETF 支持与 TopPicks 一致的四个时间窗口 | ETF 排行体验与 TopPicks 保持一致 | Day/Week/Month 按 `priceReturn` 排序，Year 按 `sharpe` 排序 |
| 2026-08-19 相关 | TopPicks Universe | TopPicks 优先读取 `top_picks_universe`，再 fallback 到 legacy `tickers` | 排行 universe 更接近标准指数来源 | 支持 S&P 500、ASX 200、HSI 等来源同步 |

## 模块说明

### TopPicks

TopPicks 的定位从原本的一年期单视图排行，升级为多时间窗口的股票发现页面。前端现在可以在 Day、Week、Month、Year 之间切换，后端根据不同 window 返回适合该窗口的指标和排序结果。

同时，TopPicks 的 snapshot 机制也做了增强。系统会保留最近一次完整 snapshot 作为 fallback，服务重启后可以先展示旧结果，再在后台刷新新结果。8 月 26 日之后又进一步加入了 `force_refresh`，页面挂载后会周期性触发刷新，减少用户手动刷新浏览器的需要。

### Portfolio

Portfolio 的主要改动集中在 symbol 输入体验。原先输入框使用 `AAPL`、`MSFT`、`NVDA` 这类硬编码候选，现在改为调用市场搜索 API：

```text
/api/market/symbol-search?q=<query>
```

搜索结果可以覆盖股票、ETF、指数和加密货币。用户选择候选后，Portfolio 仍然只保存 ticker symbol，因此不会影响后续已有指标计算流程。

### ETF

新增了独立 ETF 页面：

```text
/ETF
```

ETF 页面目前是 preview 阶段，主要用于确认页面结构、表格字段、window 切换和后端 API 契约。后端当前返回 10 个硬编码 ETF，包括 `SPY`、`QQQ`、`VOO`、`IWM`、`VTI`、`VEA`、`VWO`、`XLK`、`XLE`、`TLT`。

ETF API 支持：

```text
GET /api/etfs?window=1D
GET /api/etfs?window=1W
GET /api/etfs?window=1M
GET /api/etfs?window=1Y
```

当前排序规则为：

- Day、Week、Month 按 `priceReturn` 排序。
- Year 按 `sharpe` 排序。

## 主要修改文件

| 模块 | 文件 |
|---|---|
| TopPicks API | `client/features/top-picks/api/fetchTopPicks.ts` |
| TopPicks controller | `client/features/top-picks/hooks/useTopPicksController.ts` |
| TopPicks toolbar | `client/features/top-picks/components/TopPicksToolbar.tsx` |
| TopPicks screen | `client/features/top-picks/screens/TopPicksScreen.tsx` |
| TopPicks backend contract | `server/src/top_picks/contracts.py` |
| TopPicks backend service | `server/src/top_picks/service.py` |
| TopPicks composition | `server/src/composition/top_picks.py` |
| Metrics cache | `server/src/metrics.py` |
| ETF frontend | `client/features/etf` |
| ETF page route | `client/pages/ETF.tsx` |
| ETF backend service | `server/src/etf/service.py` |
| ETF backend route | `server/src/routes/etf.py` |
| Server route registration | `server/src/server.py` |
| Navigation | `client/components/navigation/sidebarNavigation.ts` |

## 验证记录

| 日期/范围 | 验证命令 | 结果 |
|---|---|---|
| 2026-08-19 | `npx.cmd jest --config jest.portfolio-top-picks.config.js --runInBand --coverage=false` | 45 个 test suites passed，246 个 tests passed |
| 2026-08-19 | `npx.cmd tsc --noEmit --pretty false` | TypeScript 检查通过 |
| 2026-08-19 | `git diff --check` | diff check 通过 |
| 2026-08-19 | 后端 pytest | 当时本地 `python.exe` 指向 WindowsApps shim，无法运行；属于本地 Python 环境问题 |
| 2026-08-26 | `python -m pytest` | 136 tests passed，只有 2 个 Supabase deprecation warnings |
| 2026-08-26 | `npm.cmd run test:portfolio-top-picks:coverage` | 45 个前端 test suites passed，253 个前端 tests passed |
| 2026-08-26 | `npm.cmd run build` | Next build completed successfully，`/ETF` 出现在 pages route 输出中 |
| 2026-08-26 | ETF API smoke test | 四个 window 都返回 10 条 ETF rows；Year 返回 `sortKey=sharpe`，其他窗口返回 `sortKey=priceReturn` |

## 已知限制和后续建议

| 项目 | 当前状态 | 后续建议 |
|---|---|---|
| ETF 数据 | 当前仍是 hardcoded preview | 接入真实 ETF universe 和 market-data provider |
| ETF 指标 | 短周期 Sharpe 暂时显示不可用 | 接真实数据后再根据样本长度决定是否开放短周期 Sharpe |
| TopPicks live refresh | 由前端 `/TopPicks` 页面挂载触发 | 如果需要无人值守刷新，可考虑后端 scheduler 或 worker |
| Portfolio 搜索 hook | 与 Watchlist 搜索 hook 有相似逻辑 | 如果后续行为完全一致，可抽成 shared symbol-search hook |
| TopPicks 到 Portfolio | 本阶段未实现 linked-history 自动传递 | 后续可设计从 TopPicks 选择标的并带入 Portfolio 的工作流 |

## 汇报结论

2026-08-13 之后的代码改动，让系统从单点功能增强走向更完整的投资研究工作流：

- TopPicks 负责发现候选股票，并支持多周期排行和持续刷新。
- Portfolio 负责把候选标的放入组合中做进一步分析，输入体验更接近真实市场搜索。
- ETF 页面开始独立成型，虽然当前仍是 preview，但前后端结构、路由、表格和时间窗口契约已经建立。

整体来看，本阶段改动提升了数据刷新可信度、排行维度灵活性和跨资产类型扩展能力，也为后续接入真实 ETF 数据和打通 TopPicks 到 Portfolio 的流程打下了基础。
