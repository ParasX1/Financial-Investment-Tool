# TopPicks 与 Portfolio 工作报告 - 2026-08-19

本文档记录 2026-08-19 围绕 TopPicks 多时间跨度排行、持久化 snapshot fallback、
以及 Portfolio 股票/基金搜索输入框所做的改动。

## 范围

本次主要处理三个方向：

- 保留 TopPicks 原有一年排行逻辑。
- 新增 Day、Week、Month、Year 四个排行视图，并按时间跨度展示适合的指标。
- 将 Portfolio 的 symbol 输入框从硬编码候选列表改成真实市场搜索体验。

本次没有实现 TopPicks 到 Portfolio 的 linked-history 自动传递。

## TopPicks 时间跨度

TopPicks 现在支持四个排行窗口：

- `1D`: Day
- `1W`: Week
- `1M`: Month
- `1Y`: Year

前端在 TopPicks toolbar 中提供切换按钮。原有 Year 视图仍然保留，并且仍然是默认
窗口。

后端请求 contract 现在支持 `window` 字段。后端会校验当前 sort key 是否适用于所选
window：

- Day：只支持 price return。
- Week：支持 price return、annualised volatility、max drawdown。
- Month：支持 price return、annualised volatility、max drawdown。
- Year：保留原有完整 TopPicks 指标。

## 不同时间跨度的指标展示

前端现在会根据 window 过滤表格列和 edit columns 弹窗。

Day 只展示单日排行适合的指标。Week 和 Month 因为有足够短周期观测值，所以可以展示
波动率和最大回撤。Year 保留完整的风险调整指标：

- Price return
- Sharpe ratio
- Sortino ratio
- Annualised volatility
- Max drawdown
- Beta exposure
- Alpha vs benchmark
- Information ratio

列展示偏好现在按用户 scope 和 window 分开保存。因此在 Day 里只显示很少列，不会再
影响 Year 里能看到的列。

## Year 行为

Year 窗口尽量保持原本 TopPicks 的实现语义。

保留的关键行为：

- Year 使用 trailing one year 时间范围。
- Year 仍然要求 `200` 个 observation 才认为完整指标可用。
- Year 的 warnings 仍按原有分类展示：历史不足、部分指标不可用、没有可用市场数据。

这样可以避免 Day、Week、Month 的短周期逻辑影响原本的一年排行。

## 后端 Snapshot Cache

TopPicks snapshot cache key 现在包含所选 window。Day、Week、Month、Year 会分开
计算、分开保存。

持久化 snapshot 行为从“24 小时后过期删除”改成“永久保留最新一次完整结果作为
fallback”：

- 最新完整 snapshot 会写入本地文件。
- 服务重启后，会把持久化 snapshot 作为 stale 结果加载。
- 用户可以先立即看到上一次完整结果。
- 后端同时在后台重新计算新 snapshot。
- 当前端看到 `snapshotRefreshing` 为 true 时，会每 20 秒轮询一次。

这份持久化 cache 的定位是启动 fallback，不代表数据一定是当前最新。

当后端使用 stale 或 previous snapshot 时，会在后台刷新所有 TopPicks windows。
当前用户请求的 window 会优先刷新，然后依次刷新其他 windows。

## TopPicks 前端行为

TopPicks 在轮询刷新时仍然会进入 loading 状态。这个行为被保留，因为用户希望能看到
数据正在更新。

risk-free-rate 文案现在改得更准确：

```text
risk-free rate 4.35% (RBA cash rate target, effective 2026-06-17)
```

这里使用 `effective`，而不是 `as of`，因为这个日期表示 RBA cash rate target 的生效
日期，不是行情数据只更新到 2026-06-17。

同时清理了 TopPicks 中一些显示乱码问题，包括指标空值显示和 loading 文案。

## Portfolio Symbol 搜索

Portfolio 的 shared-universe 输入框不再使用 `AAPL`、`MSFT`、`NVDA` 这类硬编码默认
候选。

现在输入框使用现有市场搜索 API：

```text
/api/market/symbol-search?q=<query>
```

该搜索 API 支持：

- 股票
- ETF
- 指数
- 加密货币

候选项会展示 symbol、交易所或类型，以及产品/公司名称。用户选择候选项后，Portfolio
仍然只保存 ticker symbol，因此后续指标计算流程不变。

手动输入 ticker 仍然支持。placeholder 改为：

```text
Add ticker...
```

避免让用户误以为只能输入 `AAPL` 或本地写死的小列表。

## Portfolio 输入边界

Portfolio symbol 输入框保留原有规则：

- 最多五个 symbols。
- ticker 格式校验。
- 自动去重。
- 自动转换为大写。

Autocomplete 行为也做了收紧：当搜索候选可见时，`A` 这类半截输入不会因为 blur 被误
提交。如果用户输入的是精确匹配的 symbol，例如 `VOO`，仍然可以作为 ticker 提交。

## 验证

前端验证命令通过：

```powershell
npx.cmd jest --config jest.portfolio-top-picks.config.js --runInBand --coverage=false
npx.cmd tsc --noEmit --pretty false
git diff --check
```

结果：

```text
45 个 test suites passed
246 个 tests passed
TypeScript passed
diff check passed
```

后端 pytest 在当前本地环境中无法运行，因为 `python.exe` 指向 WindowsApps shim，并
报错：

```text
系统无法访问此文件。
```

这是本地 Python 环境问题，不是后端测试失败。

## 备注

Portfolio 搜索 hook 和 Watchlist 搜索 hook 现在有相似逻辑。本次保持分开，避免把两个
页面过早耦合。后续如果两个页面继续使用完全一致的搜索行为，可以再抽成 shared
symbol-search hook。
