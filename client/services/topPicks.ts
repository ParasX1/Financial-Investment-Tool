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
  
    // hard-coded default universe until backend is connected
  const DEFAULTS: Array<{symbol:string; name:string; industry:TopPicksRow['industry']}> = [
    { symbol:'AAPL', name:'Apple Inc.',   industry:'Technology' },
    { symbol:'AMZN', name:'Amazon', industry:'Consumer' },
    { symbol:'GOOGL', name:'Alphabet', industry:'Technology' },
    { symbol:'MSFT', name:'Microsoft', industry:'Technology' }
  ]
  
    // deterministic placeholder metrics replace with backend values
  function hashStr(s: string){ let h=2166136261>>>0; for(let i=0;i<s.length;i++) h=Math.imul(h^s.charCodeAt(i),16777619); return h>>>0 }
  function seeded(sym: string){ const n=hashStr(sym); return (min:number,max:number)=>{ const r=(n%10000)/10000; return min+(max-min)*r } }
  
  export async function fetchTopPicks(): Promise<TopPicksRow[]> {
    // fetch from backend and map results into this shape
    return DEFAULTS.map(d=>{
      const r=seeded(d.symbol)
      return {
        symbol:d.symbol, name:d.name, industry:d.industry,
        ret1y:r(-15,90),
        sharpe:r(-0.2,3),
        sortino:r(-0.2,4),
        volatility:r(10,65),
        maxDD:r(5,55),
        beta:r(0.5,1.7),
        alpha:r(-5,12),
        infoRatio:r(-0.5,1.2)
      }
    })
  }
  