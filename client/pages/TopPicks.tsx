import React, { useEffect, useMemo, useState } from 'react'
import Sidebar from '@/components/sidebar'
import {
  Box, Typography, Button, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  Checkbox, FormControlLabel, Table, TableHead, TableRow, TableCell, TableBody, TableSortLabel,
  Pagination, Stack, TextField
} from '@mui/material'
import { fetchTopPicks, TopPicksRow } from '@/services/topPicks'

type ColKey = keyof Pick<TopPicksRow,'symbol'|'name'|'industry'|'ret1y'|'sharpe'|'sortino'|'volatility'|'maxDD'|'beta'|'alpha'|'infoRatio'>
type ColumnDef = { key: ColKey|'rank'; label: string; align?: 'left'|'right'|'center'; format?: (v:any)=>string; width?: number|string; defaultVisible?: boolean }

const COLS: ColumnDef[] = [
  { key: 'rank', label: 'S.No.', align: 'right', width: 72, defaultVisible: true },
  { key: 'name', label: 'Name', align: 'left', width: 220, defaultVisible: true },
  { key: 'symbol', label: 'Symbol', align: 'left', width: 100, defaultVisible: true },
  { key: 'ret1y', label: '1Y Return %', align: 'right', defaultVisible: true, format: n => n.toFixed(2) },
  { key: 'sharpe', label: 'Sharpe', align: 'right', defaultVisible: true, format: n => n.toFixed(2) },
  { key: 'sortino', label: 'Sortino', align: 'right', defaultVisible: true, format: n => n.toFixed(2) },
  { key: 'volatility', label: 'Volatility %', align: 'right', defaultVisible: true, format: n => n.toFixed(2) },
  { key: 'maxDD', label: 'Max DD %', align: 'right', defaultVisible: true, format: n => n.toFixed(2) },
  { key: 'beta', label: 'Beta (SPY)', align: 'right', defaultVisible: true, format: n => n.toFixed(2) },
  { key: 'alpha', label: "Jensen's α", align: 'right', defaultVisible: true, format: n => n.toFixed(2) },
  { key: 'infoRatio', label: 'Info Ratio', align: 'right', defaultVisible: true, format: n => n.toFixed(2) }
]

type SortState = { key: Exclude<ColumnDef['key'],'rank'> & ColKey; dir: 'asc'|'desc' }
const INDUSTRIES = ['All','Technology','Healthcare','Finance','Consumer','Energy','Industrials'] as const
const hasLS = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined'
const LS_COLS = 'topPicks.visibleCols'
const LS_SORT = 'topPicks.sort'
const LS_PGSZ = 'topPicks.pageSize'
const LS_INDS = 'topPicks.industry'
const LS_EMAIL = 'topPicks.email'

export default function TopPicksPage() {
  const [rows,setRows] = useState<TopPicksRow[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState<string|null>(null)

  const [industry,setIndustry] = useState<(typeof INDUSTRIES)[number]>('All')
  const [visibleKeys,setVisibleKeys] = useState<(ColumnDef['key'])[]>(COLS.filter(c=>c.defaultVisible).map(c=>c.key))
  const [sort,setSort] = useState<SortState>({ key:'sharpe', dir:'desc' })
  const [page,setPage] = useState(1)
  const [pageSize,setPageSize] = useState(25)
  const [colsOpen,setColsOpen] = useState(false)
  const [emailOpen,setEmailOpen] = useState(false)
  const [email,setEmail] = useState('')
  const [emailSaved,setEmailSaved] = useState(false)

  useEffect(()=>{ if(!hasLS()) return; try{
    const v1 = localStorage.getItem(LS_INDS); if(v1 && (INDUSTRIES as readonly string[]).includes(v1)) setIndustry(v1 as any)
    const v2 = localStorage.getItem(LS_COLS); if(v2) setVisibleKeys(JSON.parse(v2))
    const v3 = localStorage.getItem(LS_SORT); if(v3) setSort(JSON.parse(v3))
    const v4 = Number(localStorage.getItem(LS_PGSZ)); if(Number.isFinite(v4) && v4>0) setPageSize(v4)
    const v5 = localStorage.getItem(LS_EMAIL); if(v5) setEmail(v5)
  }catch{} },[])
  useEffect(()=>{ if(hasLS()) localStorage.setItem(LS_INDS,industry) },[industry])
  useEffect(()=>{ if(hasLS()) localStorage.setItem(LS_COLS,JSON.stringify(visibleKeys)) },[visibleKeys])
  useEffect(()=>{ if(hasLS()) localStorage.setItem(LS_SORT,JSON.stringify(sort)) },[sort])
  useEffect(()=>{ if(hasLS()) localStorage.setItem(LS_PGSZ,String(pageSize)) },[pageSize])

  useEffect(()=>{
    setLoading(true); setError(null)
    fetchTopPicks().then(setRows).catch(e=>setError(e.message||'Failed to load')).finally(()=>setLoading(false))
  },[])

  const filtered = useMemo(()=>rows.filter(r=>industry==='All'?true:r.industry===industry),[rows,industry])
  const sorted = useMemo(()=>{
    const out=[...filtered]
    out.sort((a,b)=>{
      const av=a[sort.key], bv=b[sort.key]
      if(av===bv) return 0
      const cmp=(av as any)<(bv as any)?-1:1
      return sort.dir==='asc'?cmp:-cmp
    })
    return out
  },[filtered,sort])

  const total = sorted.length
  const totalPages = Math.max(1,Math.ceil(total/pageSize))
  const pageSafe = Math.min(page,totalPages)
  const startIdx = (pageSafe-1)*pageSize
  const paged = sorted.slice(startIdx,startIdx+pageSize)
  const visibleCols = COLS.filter(c=>visibleKeys.includes(c.key))

  const onHeaderClick = (key: ColumnDef['key'])=>{
    if(key==='rank') return
    setSort(prev=>prev.key!==key?{key:key as SortState['key'],dir:'desc'}:{key:prev.key,dir:prev.dir==='desc'?'asc':'desc'})
  }

  const exportCSV = ()=>{
    const cols = visibleCols
    const esc = (s:any)=>`"${String(s).replaceAll('"','""')}"`
    const head = cols.map(c=>esc(c.label)).join(',')
    const body = sorted.map((r,i)=>cols.map(c=>{
      if(c.key==='rank') return esc(String(i+1))
      const val=(r as any)[c.key]; const txt=c.format?c.format(val):String(val)
      return esc(txt)
    }).join(',')).join('\n')
    const csv=head+'\n'+body
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a'); a.href=url; a.download='top-picks.csv'
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  const saveEmail = ()=>{
    if(!/\S+@\S+\.\S+/.test(email)) return
    if(hasLS()) localStorage.setItem(LS_EMAIL,email)
    setEmailSaved(true); setTimeout(()=>setEmailOpen(false),900)
  }

  return (
    <Box sx={{ display:'flex', minHeight:'100vh' }}>
      <Sidebar />
      <Box sx={{ flex:1, pl:'50px', bgcolor:'black' }}>
        <Box sx={{ px:2, pt:2 }}>
          <Typography variant="h4" sx={{ color:'white', mb:.5 }}>Top Picks</Typography>
          <Typography variant="body2" sx={{ color:'#bdbdbd' }}>Sort columns, filter by industry, export, or edit visible columns. Backend hook-up ready.</Typography>
        </Box>

        <Box sx={{ px:2, py:1, display:'flex', gap:1, alignItems:'center', justifyContent:'flex-end' }}>
          <Select size="small" value={industry} onChange={e=>{setIndustry(e.target.value as any); setPage(1)}} sx={{ bgcolor:'white', minWidth:140 }}>
            {(['All','Technology','Healthcare','Finance','Consumer','Energy','Industrials'] as const).map(opt=><MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
          </Select>
          <Button variant="outlined" onClick={exportCSV}>Export</Button>
          <Button variant="outlined" onClick={()=>setColsOpen(true)}>Edit Columns</Button>
          <Button variant="contained" onClick={()=>{setEmailSaved(false); setEmailOpen(true)}}>Get email updates</Button>
        </Box>

        <Box sx={{ px:2, color:'#bdbdbd' }}>
          <Typography variant="body2">{loading?'Loading…':error?`Error: ${error}`:`${total} results • Showing page ${pageSafe} of ${totalPages}`}</Typography>
        </Box>

        <Box sx={{ p:2, pt:1 }}>
          <Box sx={{ bgcolor:'#0f0f0f', border:'1px solid #444', borderRadius:1, overflow:'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {visibleCols.map(col=>(
                    <TableCell key={col.key as string} align={col.align||'left'} sx={{ top:0, bgcolor:'#121212', color:'#ddd', fontWeight:600, whiteSpace:'nowrap' }}>
                      <TableSortLabel active={col.key!=='rank' && sort.key===col.key} direction={col.key!=='rank' && sort.key===col.key?sort.dir:'asc'} onClick={()=>onHeaderClick(col.key)} sx={{ color:'inherit','&.Mui-active':{color:'inherit'} }}>
                        {col.label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paged.map((r,i)=>(
                  <TableRow key={r.symbol} hover>
                    {visibleCols.map(col=>{
                      if(col.key==='rank') return <TableCell key="rank" align="right" sx={{ color:'#e0e0e0' }}>{startIdx+i+1}</TableCell>
                      const val=(r as any)[col.key]; const txt=col.format?col.format(val):String(val)
                      return <TableCell key={col.key as string} align={col.align||'left'} sx={{ color:'#e0e0e0', whiteSpace:'nowrap' }}>{txt}</TableCell>
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt:1 }}>
            <Stack direction="row" gap={1} alignItems="center">
              <Typography variant="body2" sx={{ color:'#bdbdbd' }}>Rows per page:</Typography>
              <Select size="small" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value)); setPage(1)}} sx={{ bgcolor:'white', width:88 }}>
                {[10,25,50,100].map(n=><MenuItem key={n} value={n}>{n}</MenuItem>)}
              </Select>
            </Stack>
            <Pagination count={totalPages} page={pageSafe} onChange={(_,p)=>setPage(p)} color="primary" sx={{ '& .MuiPaginationItem-root':{ color:'white' } }} />
          </Stack>
        </Box>

        <Dialog open={colsOpen} onClose={()=>setColsOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Edit columns</DialogTitle>
          <DialogContent dividers>
            <Stack>
              {COLS.map(col=>(
                <FormControlLabel key={col.key as string} control={
                  <Checkbox checked={visibleKeys.includes(col.key)} onChange={(_,c)=>setVisibleKeys(prev=>c?Array.from(new Set([...prev,col.key])):prev.filter(k=>k!==col.key))} />
                } label={col.label} />
              ))}
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={()=>setColsOpen(false)}>Close</Button></DialogActions>
        </Dialog>

        <Dialog open={emailOpen} onClose={()=>setEmailOpen(false)}>
          <DialogTitle>Get email updates</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb:1 }}>We’ll email you when Top Picks are updated. Stored locally for now.</Typography>
            <TextField label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} fullWidth autoFocus />
            {emailSaved && <Typography variant="body2" sx={{ color:'green', mt:1 }}>Saved ✓</Typography>}
          </DialogContent>
          <DialogActions>
            <Button onClick={()=>setEmailOpen(false)}>Cancel</Button>
            <Button onClick={saveEmail} variant="contained" disabled={!/\S+@\S+\.\S+/.test(email)}>Save</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  )
}