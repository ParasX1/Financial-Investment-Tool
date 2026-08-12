import supabase from '@/components/supabase'

type PortfolioPrefs = { tags: string[] }

export async function loadPortfolioConfig(userId: string): Promise<PortfolioPrefs> {
  const { data, error } = await supabase
    .from('portfolio_prefs')
    .select('tags')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') { // not found
    console.error('loadPortfolioConfig error:', error)
  }
  return { tags: data?.tags ?? [] }
}

export async function savePortfolioConfig(userId: string, prefs: PortfolioPrefs) {
  const { error } = await supabase
    .from('portfolio_prefs')
    .upsert(
      { user_id: userId, tags: prefs.tags, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' } 
    )
  if (error) throw error
}
