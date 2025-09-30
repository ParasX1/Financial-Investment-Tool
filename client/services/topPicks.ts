import supabase from '@/components/supabase'
import { METRICS_BASE } from '@/lib/apiBase'

export type TopPicksRow = {
  symbol: string
  name: string
  industry: 'Technology'|'Healthcare'|'Finance'|'Consumer'|'Energy'|'Industrials'
  ret1y: number
  sharpe: number
  sortino: number
  volatility: number
  maxDD: number
  beta: number
  alpha: number
  infoRatio: number
}

export type SortKey = keyof Pick<TopPicksRow,'ret1y'|'sharpe'|'sortino'|'volatility'|'maxDD'|'beta'|'alpha'|'infoRatio'>

type SingleValueMap = Record<string, number>
type TimeSeriesMap = Record<string, Record<string, number>>

async function postMetric<T=any>(kind: string, payload: any): Promise<T> {
  const res = await fetch(`${METRICS_BASE}/${kind.toLowerCase()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(`${kind} failed: ${res.status}`)
  return res.json()
}

function lastValue(series?: Record<string, number>): number {
  if (!series) return 0
  const entries = Object.entries(series)
  if (!entries.length) return 0
  entries.sort((a, b) => (a[0] < b[0] ? -1 : 1))
  return Number(entries[entries.length - 1][1] ?? 0)
}

export async function fetchTopPicks(opts?: {
  limit?: number
  sort_key?: SortKey
  sort_dir?: 'asc'|'desc'
  tickers?: string[]
  start_date?: string
  end_date?: string
  market_ticker?: string
  risk_free_rate?: number
}): Promise<TopPicksRow[]> {
  let symbols = opts?.tickers
  let nameMap: Record<string,string> = {}
  let industryMap: Record<string, TopPicksRow['industry']> = {}
  if (!symbols) {
    const { data, error } = await supabase
      .from('tickers')
      .select('symbol, name, industry')
      .limit(200)
    if (error) throw error
    symbols = (data ?? []).map(r => r.symbol)
    nameMap = Object.fromEntries((data ?? []).map(r => [r.symbol, r.name]))
    industryMap = Object.fromEntries((data ?? []).map(r => [r.symbol, (r.industry ?? 'Technology') as TopPicksRow['industry']]))
  }
  if (!symbols || symbols.length === 0) return []
  const start_date = opts?.start_date ?? new Date(Date.now() - 365*24*3600*1000).toISOString().slice(0,10)
  const end_date = opts?.end_date ?? new Date().toISOString().slice(0,10)
  const market = opts?.market_ticker ?? 'SPY'
  const rf = opts?.risk_free_rate ?? 0.01
  const basePayload = {
    stock_tickers: symbols,
    start_date,
    end_date,
    market_ticker: market,
    risk_free_rate: rf
  }
  const [
    sharpeMap, sortinoMap, volMap, betaMap, alphaMap,
    retSeries, maxddMap
  ] = await Promise.all([
    postMetric<SingleValueMap>('SharpeRatioMatrix', basePayload),
    postMetric<SingleValueMap>('SortinoRatioVisualization', basePayload).catch(() => ({} as SingleValueMap)),
    postMetric<SingleValueMap>('VolatilityAnalysis', basePayload),
    postMetric<SingleValueMap>('BetaAnalysis', basePayload).catch(() => ({} as SingleValueMap)),
    postMetric<SingleValueMap>('AlphaComparison', basePayload).catch(() => ({} as SingleValueMap)),
    postMetric<TimeSeriesMap>('CumulativeReturnComparison', basePayload),
    postMetric<SingleValueMap>('MaxDrawdownAnalysis', basePayload).catch(() => ({} as SingleValueMap))
  ])
  const rows: TopPicksRow[] = symbols.map(sym => {
    const ret1y = lastValue(retSeries[sym])
    const sharpe = Number(sharpeMap[sym] ?? 0)
    const sortino = Number(sortinoMap[sym] ?? 0)
    const vol = Number(volMap[sym] ?? 0)
    const beta = Number(betaMap[sym] ?? 0)
    const alpha = Number(alphaMap[sym] ?? 0)
    const maxDD = Number.isFinite(Number(maxddMap[sym])) ? Number(maxddMap[sym]) : 0
    const info = vol ? alpha / vol : 0
    return {
      symbol: sym,
      name: nameMap[sym] ?? sym,
      industry: industryMap[sym] ?? 'Technology',
      ret1y,
      sharpe,
      sortino,
      volatility: vol,
      maxDD,
      beta,
      alpha,
      infoRatio: info
    }
  })
  const sort_key = opts?.sort_key ?? 'sharpe'
  const sort_dir = opts?.sort_dir ?? 'desc'
  rows.sort((a,b) => {
    const va = (a as any)[sort_key] ?? 0
    const vb = (b as any)[sort_key] ?? 0
    return sort_dir === 'asc' ? (va - vb) : (vb - va)
  })
  const limit = Math.max(1, Math.min(opts?.limit ?? 50, rows.length))
  return rows.slice(0, limit)
}
