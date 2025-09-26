import supabase from '@/components/supabase'

export type TopPicksPrefs = {
  sort_key: 'sharpe'|'sortino'|'ret1y'|'volatility'|'maxDD'|'beta'|'alpha'|'infoRatio'
  sort_dir: 'asc'|'desc'
  page_size: number
}

export async function loadTopPicksPrefs(userId: string): Promise<TopPicksPrefs> {
  const { data, error } = await supabase
    .from('top_picks_prefs')
    .select('sort_key, sort_dir, page_size')
    .eq('user_id', userId)
    .single()
  if (error && (error as any).code !== 'PGRST116') throw error
  return {
    sort_key: data?.sort_key ?? 'sharpe',
    sort_dir: data?.sort_dir ?? 'desc',
    page_size: data?.page_size ?? 25
  }
}

export async function saveTopPicksPrefs(userId: string, prefs: TopPicksPrefs) {
  const { error } = await supabase
    .from('top_picks_prefs')
    .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() })
  if (error) throw error
}
