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
import { FitPageHeader } from '@/components/shared/FitPageHeader'

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
  fontWeight: 'var(--fit-type-weight-bold)',
  fontSize: 'var(--fit-type-size-body)',
})

const valueColor = (key: ColumnDef['key'], value: unknown) => {
  if (typeof value !== 'number') return '#e2e7f2'
  if (key === 'ret1y' || key === 'alpha') return value >= 0 ? '#38d996' : '#ff5b7c'
  if (key === 'maxDD') return '#ff5b7c'
  if (key === 'volatility') return 'var(--fit-color-text-body, #b9c1d0)'
  return '#e2e7f2'
}

const sortableValue = (value: unknown) => {
  const n = Number(value)
  return Number.isNaN(n) ? Number.NEGATIVE_INFINITY : n
}

type SortState = { key: Exclude<ColumnDef['key'],'rank'> & ColKey; dir: 'asc'|'desc' }
const hasLS = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined'
const LS_COLS = 'topPicks.visibleCols'
const LS_EMAIL = 'topPicks.email'

const secondaryActionSx = {
  minHeight: 40,
  bgcolor: 'var(--fit-color-field, #18181b)',
  color: '#dce4ff',
  border: '1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))',
  borderRadius: '0.625rem',
  px: 2,
  py: 1,
  textTransform: 'none',
  fontWeight: 'var(--fit-type-weight-semibold)',
  boxShadow: 'none',
  '&:hover': {
    bgcolor: 'var(--fit-color-surface-soft, #111114)',
    borderColor: 'var(--fit-color-brand-border-hover, rgba(123, 140, 255, 0.44))',
    boxShadow: 'none',
  },
  '&:focus-visible': {
    outline: '2px solid var(--fit-color-focus-ring, rgba(123, 140, 255, 0.82))',
    outlineOffset: 2,
  },
}

const primaryActionSx = {
  ...secondaryActionSx,
  bgcolor: '#5d67ff',
  color: '#fff',
  borderColor: 'rgba(111, 124, 255, 0.62)',
  '&:hover': {
    bgcolor: '#7079ff',
    borderColor: 'rgba(123, 140, 255, 0.72)',
    boxShadow: 'none',
  },
}

const darkControlSx = {
  bgcolor: 'var(--fit-color-field, #18181b)',
  color: '#fff',
  fontSize: 'var(--fit-type-size-body-sm)',
  borderRadius: '0.625rem',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--fit-color-border-control, #202230)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--fit-color-brand-border-hover, rgba(123, 140, 255, 0.44))',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--fit-color-focus-ring, rgba(123, 140, 255, 0.82))',
  },
  '& .MuiSelect-icon': {
    color: 'var(--fit-color-text-muted, #8f98aa)',
  },
}

const darkMenuProps = {
  PaperProps: {
    sx: {
      bgcolor: 'var(--fit-color-surface, #09090b)',
      color: '#fff',
      border: '1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))',
      borderRadius: '0.625rem',
      '& .MuiMenuItem-root.Mui-selected': {
        bgcolor: 'var(--fit-color-brand-chip, rgba(123, 140, 255, 0.1))',
      },
      '& .MuiMenuItem-root:hover': {
        bgcolor: 'var(--fit-color-brand-fill-hover, rgba(123, 140, 255, 0.12))',
      },
    },
  },
}

const dialogPaperSx = {
  bgcolor: 'var(--fit-color-surface, #09090b)',
  color: '#fff',
  fontFamily: 'var(--fit-font-family)',
  border: '1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))',
  borderRadius: '0.75rem',
  backgroundImage: 'none',
  boxShadow: '0 1.8rem 5rem rgba(0, 0, 0, 0.62)',
}

const dialogFieldSx = {
  mt: 1,
  '& .MuiInputLabel-root': {
    color: 'var(--fit-color-text-muted, #8f98aa)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: 'var(--fit-color-accent-strong, #65a0fd)',
  },
  '& .MuiOutlinedInput-root': {
    ...darkControlSx,
  },
}

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
    <Box sx={{ display:'flex', minHeight:'100vh', bgcolor:'var(--fit-color-page-bg, #000000)', color:'#fff', colorScheme: 'dark', fontFamily:'var(--fit-font-family)' }}>
      <Sidebar />
      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{
          flex: 1,
          minWidth: 0,
          pl: 'var(--app-sidebar-width, 64px)',
          background: 'var(--fit-page-background)',
          transition: 'padding-left 200ms ease',
        }}
      >
        <Box sx={{ px:{ xs:2, sm:3 }, pt:{ xs:2.5, sm:3 } }}>
          <FitPageHeader
            title="Top Picks"
            subtitle="Ranked stocks based on risk-adjusted performance metrics"
          />
        </Box>

        <Box sx={{ px:{ xs:2, sm:3 }, pb:2, display:'flex', gap:1.25, alignItems:'center', justifyContent:'flex-end', flexWrap:'wrap' }}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon fontSize="small" />}
            onClick={exportCSV}
            sx={secondaryActionSx}
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<SettingsOutlinedIcon fontSize="small" />}
            onClick={()=>setColsOpen(true)}
            sx={secondaryActionSx}
          >
            Edit Columns
          </Button>
          <Button
            variant="contained"
            startIcon={<EmailOutlinedIcon fontSize="small" />}
            onClick={()=>{setEmailSaved(false); setEmailOpen(true)}}
            sx={primaryActionSx}
          >
            Email Updates
          </Button>
        </Box>

        <Box sx={{ px:{ xs:2, sm:3 }, color:'var(--fit-color-text-muted, #8f98aa)' }}>
          <Typography variant="body2">{loading?'Loading…':error?`Error: ${error}`:`${total} results • Showing page ${pageSafe} of ${totalPages}`}</Typography>
        </Box>

        <Box sx={{ px:{ xs:2, sm:3 }, pb:3, pt:1 }}>
          <Box sx={{ bgcolor:'var(--fit-color-surface, #09090b)', border:'1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))', borderRadius:'0.75rem', overflow:'auto' }}>
            <Table stickyHeader size="small" sx={{ minWidth: 1120, borderCollapse: 'separate', borderSpacing: 0 }}>
              <TableHead>
                <TableRow>
                  {visibleCols.map(col=>(
                    <TableCell
                      key={col.key as string}
                      align={col.align||'left'}
                      sx={{
                        top:0,
                        bgcolor:'var(--fit-color-surface-soft, #111114)',
                        color:'#fff',
                        fontWeight:'var(--fit-type-weight-semibold)',
                        fontSize:'var(--fit-type-size-body-sm)',
                        whiteSpace:'nowrap',
                        borderBottom:'1px solid var(--fit-color-border-panel, #27272a)',
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
                            color:'var(--fit-color-text-label, #687184) !important',
                          },
                          '&.Mui-active .MuiTableSortLabel-icon': {
                            color:'var(--fit-color-accent-strong, #65a0fd) !important',
                          },
                          '&:focus-visible': {
                            outline:'2px solid var(--fit-color-focus-ring, rgba(123, 140, 255, 0.82))',
                            outlineOffset:2,
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
                        bgcolor:'var(--fit-color-brand-fill-hover, rgba(123, 140, 255, 0.12))',
                      },
                    }}
                  >
                    {visibleCols.map(col=>{
                      const rank = startIdx+i+1
                      if(col.key==='rank') return (
                        <TableCell
                          key="rank"
                          align="left"
                          sx={{ borderBottom:'1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))', py:2, px:2 }}
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
                            color: col.key === 'symbol' ? 'var(--fit-color-accent-strong, #65a0fd)' : valueColor(col.key, val),
                            whiteSpace:'nowrap',
                            borderBottom:'1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))',
                            py:2,
                            px:2,
                            fontWeight: col.key === 'symbol' ? 'var(--fit-type-weight-medium)' : 'var(--fit-type-weight-semibold)',
                            fontSize: col.key === 'symbol' ? 'var(--fit-type-size-body)' : 'var(--fit-type-size-body-sm)',
                            fontVariantNumeric:'tabular-nums',
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
              <Typography variant="body2" sx={{ color:'var(--fit-color-text-muted, #8f98aa)' }}>Rows per page:</Typography>
              <Select size="small" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value)); setPage(1)}} MenuProps={darkMenuProps} sx={{ ...darkControlSx, width:88 }}>
                {[10,25,50,100].map(n=><MenuItem key={n} value={n}>{n}</MenuItem>)}
              </Select>
            </Stack>
            <Pagination count={totalPages} page={pageSafe} onChange={(_,p)=>setPage(p)} sx={{ '& .MuiPaginationItem-root':{ color:'var(--fit-color-text-body, #b9c1d0)', borderRadius:'0.5rem' }, '& .MuiPaginationItem-root.Mui-selected':{ bgcolor:'var(--fit-color-brand-chip, rgba(123, 140, 255, 0.1))', color:'#fff' }, '& .MuiPaginationItem-root:focus-visible':{ outline:'2px solid var(--fit-color-focus-ring, rgba(123, 140, 255, 0.82))', outlineOffset:2 } }} />
          </Stack>
        </Box>

        <Dialog open={colsOpen} onClose={()=>setColsOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx:dialogPaperSx }}>
          <DialogTitle sx={{ fontSize:'var(--fit-type-size-panel-title)', fontWeight:'var(--fit-type-weight-semibold)', lineHeight:'var(--fit-type-leading-heading)', borderBottom:'1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))' }}>Edit columns</DialogTitle>
          <DialogContent dividers sx={{ borderColor:'var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))', color:'var(--fit-color-text-body, #b9c1d0)' }}>
            <Stack>
              {COLS.map(col=>(
                <FormControlLabel key={col.key as string} control={
                  <Checkbox checked={visibleKeys.includes(col.key)} onChange={(_,c)=>setVisibleKeys(prev=>c?Array.from(new Set([...prev,col.key])):prev.filter(k=>k!==col.key))} sx={{ color:'var(--fit-color-text-muted, #8f98aa)', '&.Mui-checked':{ color:'var(--fit-color-accent-strong, #65a0fd)' } }} />
                } label={col.label} />
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ borderTop:'1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))', p:2 }}><Button onClick={()=>setColsOpen(false)} sx={secondaryActionSx}>Close</Button></DialogActions>
        </Dialog>

        <Dialog open={emailOpen} onClose={()=>setEmailOpen(false)} PaperProps={{ sx:dialogPaperSx }}>
          <DialogTitle sx={{ fontSize:'var(--fit-type-size-panel-title)', fontWeight:'var(--fit-type-weight-semibold)', lineHeight:'var(--fit-type-leading-heading)' }}>Get email updates</DialogTitle>
          <DialogContent sx={{ color:'var(--fit-color-text-body, #b9c1d0)' }}>
            <Typography variant="body2" sx={{ mb:1, color:'var(--fit-color-text-body, #b9c1d0)' }}>We’ll email you when Top Picks are updated. Stored locally for now.</Typography>
            <TextField label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} fullWidth autoFocus sx={dialogFieldSx} />
            {emailSaved && <Typography variant="body2" sx={{ color:'#38d996', mt:1 }}>Saved ✓</Typography>}
          </DialogContent>
          <DialogActions sx={{ borderTop:'1px solid var(--fit-color-border-subtle, rgba(132, 146, 176, 0.12))', p:2 }}>
            <Button onClick={()=>setEmailOpen(false)} sx={secondaryActionSx}>Cancel</Button>
            <Button onClick={saveEmail} variant="contained" disabled={!/\S+@\S+\.\S+/.test(email)} sx={primaryActionSx}>Save</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  )
}
