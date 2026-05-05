import React, { useEffect, useMemo, useState } from 'react'
import Sidebar from '@/components/sidebar'
import {
  Box, Typography, Button, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  Checkbox, FormControlLabel, Table, TableHead, TableRow, TableCell, TableBody, TableSortLabel,
  Pagination, Stack, TextField
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { fetchTopPicks, TopPicksRow } from '@/services/topPicks'
import { useAuth } from '@/components/authContext'
import { loadTopPicksPrefs, saveTopPicksPrefs } from '@/services/topPicksPrefs'

type ColKey = keyof Pick<TopPicksRow,'symbol'|'name'|'ret1y'|'sharpe'|'sortino'|'volatility'|'maxDD'|'beta'|'alpha'|'infoRatio'>
type ColumnDef = { key: ColKey|'rank'; label: string; align?: 'left'|'right'|'center'; format?: (v:any)=>string; width?: number|string; defaultVisible?: boolean }

const COLS: ColumnDef[] = [
  { key: 'rank', label: 'Rank', align: 'left', width: 88, defaultVisible: true },
  { key: 'symbol', label: 'Symbol', align: 'left', width: 110, defaultVisible: true },
  { key: 'name', label: 'Company', align: 'left', width: 220, defaultVisible: true },
  { key: 'ret1y', label: '1Y Return', align: 'right', defaultVisible: true, format: n => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%` },
  { key: 'sharpe', label: 'Sharpe', align: 'right', defaultVisible: true, format: n => n.toFixed(2) },
  { key: 'sortino', label: 'Sortino', align: 'right', defaultVisible: true, format: n => n.toFixed(2) },
  { key: 'volatility', label: 'Volatility', align: 'right', defaultVisible: true, format: n => `${n.toFixed(1)}%` },
  { key: 'maxDD', label: 'Max DD', align: 'right', defaultVisible: true, format: n => `${n.toFixed(1)}%` },
  { key: 'beta', label: 'Beta', align: 'right', defaultVisible: true, format: n => n.toFixed(2) },
  { key: 'alpha', label: 'Alpha', align: 'right', defaultVisible: true, format: n => `${n >= 0 ? '+' : ''}${n.toFixed(1)}` },
  { key: 'infoRatio', label: 'Info Ratio', align: 'right', defaultVisible: true, format: n => n.toFixed(2) }
]

const rankBadgeSx = (rank: number) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: rank <= 3 ? 32 : 'auto',
  height: rank <= 3 ? 32 : 'auto',
  borderRadius: rank <= 3 ? 2 : 0,
  bgcolor: rank === 1 ? 'rgba(202, 138, 4, 0.35)' : rank === 2 ? 'rgba(75, 85, 99, 0.55)' : rank === 3 ? 'rgba(154, 52, 18, 0.45)' : 'transparent',
  color: rank === 1 ? '#fbbf24' : rank === 2 ? '#cbd5e1' : rank === 3 ? '#fb923c' : '#94a3b8',
  fontWeight: 800,
  fontSize: 15,
})

const valueColor = (key: ColumnDef['key'], value: unknown) => {
  if (typeof value !== 'number') return '#f8fafc'
  if (key === 'ret1y' || key === 'alpha') return value >= 0 ? '#00ff88' : '#ff4d4d'
  if (key === 'maxDD') return '#ff4d4d'
  if (key === 'volatility') return '#9db4d4'
  return '#f8fafc'
}

const sortableValue = (value: unknown) => {
  const n = Number(value)
  return Number.isNaN(n) ? Number.NEGATIVE_INFINITY : n
}

type SortState = { key: Exclude<ColumnDef['key'],'rank'> & ColKey; dir: 'asc'|'desc' }
const hasLS = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined'
const LS_COLS = 'topPicks.visibleCols'
const LS_EMAIL = 'topPicks.email'

export default function TopPicksPage() {
  const { user } = useAuth()
  const [rows,setRows] = useState<TopPicksRow[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState<string|null>(null)

  const [visibleKeys,setVisibleKeys] = useState<(ColumnDef['key'])[]>(COLS.filter(c=>c.defaultVisible).map(c=>c.key))
  const [sort,setSort] = useState<SortState>({ key:'sharpe', dir:'desc' })
  const [page,setPage] = useState(1)
  const [pageSize,setPageSize] = useState(25)
  const [colsOpen,setColsOpen] = useState(false)
  const [emailOpen,setEmailOpen] = useState(false)
  const [email,setEmail] = useState('')
  const [emailSaved,setEmailSaved] = useState(false)

  useEffect(()=>{ if(!hasLS()) return; try{
    const v2 = localStorage.getItem(LS_COLS); if(v2) setVisibleKeys(JSON.parse(v2))
    const v5 = localStorage.getItem(LS_EMAIL); if(v5) setEmail(v5)
  }catch{} },[])
  useEffect(()=>{ if(hasLS()) localStorage.setItem(LS_COLS,JSON.stringify(visibleKeys)) },[visibleKeys])

  useEffect(() => {
    if (!user) return
    loadTopPicksPrefs(user.id)
      .then(p => {
        setSort({ key: p.sort_key as any, dir: p.sort_dir })
        setPageSize(p.page_size)
      })
      .catch(console.error)
  }, [user])

    useEffect(() => {
      if (!user) return
      saveTopPicksPrefs(user.id, {
        sort_key: sort.key as any,
        sort_dir: sort.dir,
        page_size: pageSize,
      }).catch(console.error)
    }, [user, sort, pageSize])  

  useEffect(() => {
    setLoading(true); setError(null)
    fetchTopPicks({
      limit: pageSize,
      sort_key: sort.key as any,
      sort_dir: sort.dir,
    })
      .then(setRows)
      .catch(e => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [pageSize, sort])


  const sorted = useMemo(()=>{
    const out=[...rows]
    out.sort((a,b)=>{
      const av=sortableValue(a[sort.key]), bv=sortableValue(b[sort.key])
      if(av===bv) return 0
      const cmp=av<bv?-1:1
      return sort.dir==='asc'?cmp:-cmp
    })
    return out
  },[rows, sort])

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
          <Typography
            variant="h6"
            sx={{
              color:'white',
              fontWeight:600,
              fontSize:35,
              lineHeight:1.1,
              mb:.5,
            }}
          >
            Top Picks
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color:'rgba(255, 255, 255, 0.65)',
              fontWeight:300,
              fontSize:15,
              mt:0,
            }}
          >
            Ranked stocks based on risk-adjusted performance metrics
          </Typography>
        </Box>

        <Box sx={{ px:2, py:1, display:'flex', gap:1.5, alignItems:'center', justifyContent:'flex-end', flexWrap:'wrap' }}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon fontSize="small" />}
            onClick={exportCSV}
            sx={{
              bgcolor:'#17181d',
              color:'#fff',
              border:'1px solid #2a2d35',
              borderRadius:2,
              px:2,
              py:1,
              textTransform:'none',
              fontWeight:700,
              boxShadow:'none',
              '&:hover': { bgcolor:'#202229', boxShadow:'none' },
            }}
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<SettingsOutlinedIcon fontSize="small" />}
            onClick={()=>setColsOpen(true)}
            sx={{
              bgcolor:'#17181d',
              color:'#fff',
              border:'1px solid #2a2d35',
              borderRadius:2,
              px:2,
              py:1,
              textTransform:'none',
              fontWeight:700,
              boxShadow:'none',
              '&:hover': { bgcolor:'#202229', boxShadow:'none' },
            }}
          >
            Edit Columns
          </Button>
          <Button
            variant="contained"
            startIcon={<EmailOutlinedIcon fontSize="small" />}
            onClick={()=>{setEmailSaved(false); setEmailOpen(true)}}
            sx={{
              color:'#fff',
              borderRadius:2,
              px:2,
              py:1,
              textTransform:'none',
              fontWeight:700,
              bgcolor:'#3b82f6',
              backgroundImage:'linear-gradient(90deg, #3b82f6 0%, #9333ea 100%)',
              boxShadow:'none',
              '&:hover': {
                bgcolor:'#2563eb',
                backgroundImage:'linear-gradient(90deg, #2563eb 0%, #7e22ce 100%)',
                boxShadow:'none',
              },
            }}
          >
            Email Updates
          </Button>
        </Box>

        <Box sx={{ px:2, color:'#bdbdbd' }}>
          <Typography variant="body2">{loading?'Loading…':error?`Error: ${error}`:`${total} results • Showing page ${pageSafe} of ${totalPages}`}</Typography>
        </Box>

        <Box sx={{ p:2, pt:1 }}>
          <Box sx={{ bgcolor:'#09090b', border:'1px solid #24262d', borderRadius:2, overflow:'auto' }}>
            <Table stickyHeader size="small" sx={{ minWidth: 1120, borderCollapse: 'separate', borderSpacing: 0 }}>
              <TableHead>
                <TableRow>
                  {visibleCols.map(col=>(
                    <TableCell
                      key={col.key as string}
                      align={col.align||'left'}
                      sx={{
                        top:0,
                        bgcolor:'#111114',
                        color:'#fff',
                        fontWeight:700,
                        whiteSpace:'nowrap',
                        borderBottom:'1px solid #282a30',
                        py:1.8,
                        px:2,
                        width: col.width,
                      }}
                    >
                      <TableSortLabel
                        active={col.key!=='rank' && sort.key===col.key}
                        direction={col.key!=='rank' && sort.key===col.key?sort.dir:'asc'}
                        onClick={()=>onHeaderClick(col.key)}
                        sx={{
                          color:'inherit',
                          '&:hover': { color:'#fff' },
                          '&.Mui-active':{color:'#fff'},
                          '& .MuiTableSortLabel-icon': {
                            color:'#64748b !important',
                          },
                          '&.Mui-active .MuiTableSortLabel-icon': {
                            color:'#3b82f6 !important',
                          },
                        }}
                      >
                        {col.label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paged.map((r,i)=>(
                  <TableRow
                    key={`${r.symbol}-${startIdx+i}`}
                    hover
                    sx={{
                      '&:hover td': {
                        bgcolor:'rgba(255,255,255,0.03)',
                      },
                    }}
                  >
                    {visibleCols.map(col=>{
                      const rank = startIdx+i+1
                      if(col.key==='rank') return (
                        <TableCell
                          key="rank"
                          align="left"
                          sx={{ borderBottom:'1px solid #24262d', py:2, px:2 }}
                        >
                          <Box component="span" sx={rankBadgeSx(rank)}>{rank}</Box>
                        </TableCell>
                      )
                      const val=(r as any)[col.key]; const txt=col.format?col.format(val):String(val)
                      return (
                        <TableCell
                          key={col.key as string}
                          align={col.align||'left'}
                          sx={{
                            color: col.key === 'symbol' ? '#2f9bff' : valueColor(col.key, val),
                            whiteSpace:'nowrap',
                            borderBottom:'1px solid #24262d',
                            py:2,
                            px:2,
                            fontWeight: col.key === 'symbol' ? 500 : 600,
                            fontSize: col.key === 'symbol' ? 16 : 14,
                          }}
                        >
                          {txt}
                        </TableCell>
                      )
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
