// File purpose: Defines the static Guide topic content rendered by the Guide feature.
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import TrackChangesRoundedIcon from "@mui/icons-material/TrackChangesRounded";
import type { GuideSectionCollection } from "../types";

export const guideSections = Object.freeze([
  {
    id: "sharpe-ratio",
    label: "Sharpe Ratio",
    icon: ShowChartRoundedIcon,
    description:
      "The Sharpe Ratio shows how much extra return an investment earns for each unit of risk it takes. " +
      "It compares the return above a risk-free investment with how much the investment's returns move up and down.",
    formula:
      "Sharpe Ratio = (Return - Risk-Free Rate) / Standard Deviation of Returns",
    interpretation:
      "Higher is better. As a rough guide, above 1.0 is considered good, above 2.0 very good, and above 3.0 excellent. " +
      "A negative value means the investment earned less than the risk-free rate. " +
      "For example, a stock returning 8% with 10% volatility can be a better risk-adjusted choice than one returning 10% with 20% volatility.",
    takeaway:
      "Use the Sharpe Ratio to compare investments with different levels of risk, instead of looking at returns alone.",
  },
  {
    id: "sortino-ratio",
    label: "Sortino Ratio",
    icon: TrackChangesRoundedIcon,
    description:
      "The Sortino Ratio is similar to the Sharpe Ratio, but it only treats downward price movements as risk. " +
      "Upward movements are good for investors, so they are not counted as risk.",
    formula:
      "Sortino Ratio = (Annualised Average Return - Risk-Free Rate) / Annualised Downside Deviation",
    interpretation:
      "Higher is better, but only compare ratios calculated over the same period. " +
      "FIT uses every day in the sample to calculate downside deviation. " +
      "If a day's return is above the daily risk-free target, it counts as zero shortfall instead of being removed. " +
      "If no day falls below the target, FIT shows the ratio as unbounded instead of showing a misleading number.",
    takeaway:
      "Use the Sortino Ratio when you want to see whether returns are enough to cover the risk of losses.",
  },
  {
    id: "alpha",
    label: "Alpha",
    icon: AutoGraphRoundedIcon,
    description:
      "Alpha shows whether an investment did better or worse than expected based on the amount of market risk it took. " +
      "It shows how much extra return the investment made beyond following the market.",
    formula:
      "Alpha = Actual Return - (Risk-Free Rate + Beta x (Market Return - Risk-Free Rate))",
    interpretation:
      "FIT shows annualised alpha as a decimal. " +
      "Positive alpha means the investment earned more than expected, while negative alpha means it earned less. " +
      "For example, an alpha of 0.02 means the investment earned about 2 percentage points more than expected over a year.",
    takeaway:
      "Consistently positive alpha may suggest that an investment adds value beyond simply following the market.",
  },
  {
    id: "beta",
    label: "Beta",
    icon: BarChartRoundedIcon,
    description:
      "Beta measures how much an asset's returns tend to move with the overall market. " +
      "It shows how strongly a stock tends to move when the market moves.",
    formula:
      "Beta = Covariance(Stock Returns, Market Returns) / Variance(Market Returns)",
    interpretation:
      "A beta of 1.0 means the stock tends to move with the market. " +
      "Above 1.0 means it tends to move more than the market. " +
      "For example, a beta of 1.5 means the stock may move about 15% when the market moves 10%. " +
      "Below 1.0 means it tends to move less, while a negative beta means it tends to move in the opposite direction.",
    takeaway:
      "Use beta to understand how much your portfolio moves with the market. " +
      "A higher beta means more market exposure, while a lower beta means less.",
  },
  {
    id: "volatility",
    label: "Volatility",
    icon: TimelineRoundedIcon,
    description:
      "Volatility measures how much an investment's returns swing up and down over time. " +
      "It is usually expressed as the standard deviation of returns.",
    formula: 
      "Volatility = Standard Deviation of Returns (often annualised by multiplying by √(Periods per Year))",
    interpretation:
      "Higher volatility means bigger price changes and more uncertainty. " +
      "Lower volatility usually means more stable returns, but it does not mean the investment is safe.",
    takeaway:
      "Volatility is a useful measure of risk, but also consider the expected return and how long you plan to invest.",
  },
  {
    id: "max-drawdown",
    label: "Max Drawdown",
    icon: ShieldRoundedIcon,
    description:
      "Drawdown shows how far the price has fallen from its highest point so far. " +
      "Maximum Drawdown is the largest fall during the selected period, showing the worst drop from a peak to a low point.",
    formula:
      "Drawdown(t) = (Current Price - Highest Price So Far) / Highest Price So Far; Max Drawdown = minimum Drawdown(t)",
    interpretation:
      "A drawdown of -0.25 (-25%) means the price is 25% below its previous peak. " +
      "The lowest point on the chart is the Maximum Drawdown. " +
      "A return to 0 means the price has reached its previous high.",
    takeaway:
      "Look at the whole chart to see how deep each decline was and how long it took to recover, " +
      "and use the lowest point to judge the worst historical loss.",
  },
  {
    id: "value-at-risk",
    label: "Value at Risk",
    icon: QueryStatsRoundedIcon,
    description:
      "Value at Risk (VaR) estimates how much an investment could lose in one day under normal conditions. " +
      "FIT uses historical VaR, based on the stock's actual past daily returns.",
    formula:
      "Historical VaR = max(0, - selected lower-tail return percentile)",
    interpretation:
      "In the historical daily return distribution, a 95% VaR of 3% means that on about 5% of past trading days, the loss was more than 3%. " +
      "Lower is better. VaR shows a loss threshold, not the maximum possible loss. " +
      "On the worst days, losses can be much larger, and VaR does not show how much larger they could be.",  
    takeaway:
      "Use VaR to understand typical losses on bad days, and use it with Max Drawdown to see how large losses can become.",
  },
  {
    id: "efficient-frontier",
    label: "Efficient Frontier",
    icon: AccountTreeRoundedIcon,
    description:
      "The Efficient Frontier shows the relationship between risk and return when you combine different stocks in a portfolio. " +
      "FIT deterministically samples up to 10,000 long-only portfolios with different weightings and plots each one based on its estimated return and risk. " +
      "These samples are not a mathematically optimized frontier.",
    formula:
      "For each sample: Expected Return = Weights x Annualised Mean Returns; Risk = √(Weights x Covariance Matrix x Weights)",
    interpretation:
      "Each point is one possible mix of the selected stocks, with no short selling and weights adding up to 100%. " +
      "Points towards the upper-left offer more return for less risk. " +
      "FIT highlights the sample with the best Sharpe Ratio and the sample with the lowest volatility, " +
      "but these are the best of the samples, not guaranteed exact optimums.",
    takeaway:
      "Use the chart to see how combining different stocks affects risk and return. " +
      "The upper edge of the points gives an estimate of the true Efficient Frontier.",
  },
] satisfies GuideSectionCollection);
