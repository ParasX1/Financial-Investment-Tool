import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, Select, MenuItem, Grid, Card, CardContent, CardMedia,
  IconButton, Button, Chip
} from '@mui/material';
import { Fullscreen as FullscreenIcon, FullscreenExit as FullscreenExitIcon, Tune as TuneIcon } from '@mui/icons-material';
import { useTheme, useMediaQuery } from '@mui/material';
import {
  fetchGeneralNews, fetchRegionalNews, fetchIndustryNews,
  fetchCommodityNews, fetchTickerNews, Article
} from '@/services/news';

const regionalOptions  = [ 'au','cn','jp','us','gb' ];
const industryOptions  = [ 'technology','health','finance','internet','pharmaceutical' ];
const commodityOptions = [ 'gold','oil','wheat','copper','silver' ];

export interface NewsCardComponentProps {
  index: number;
  title: string;
  height?: number | string;
  filterTicker?: string;
  paramOverride?: string;
  limit?: number;
  dark?: boolean;
  fullscreenOffsetTop?: number;
}

const NewsCardComponent: React.FC<NewsCardComponentProps> = ({
  index, height = 300, title, filterTicker, paramOverride, limit,
  dark = false, fullscreenOffsetTop = 0
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [openSettings, setOpenSettings] = useState(false);
  const [param, setParam]               = useState<string>('');

  const theme  = useTheme();
  const isXs   = useMediaQuery(theme.breakpoints.down('sm'));

  const usedLimit     = limit ?? (isXs ? 6 : 12);
  const imgHeight     = isXs ? 120 : 140;
  const isControlled  = typeof paramOverride !== 'undefined';
  const effectiveParam = isControlled ? paramOverride : param;

  useEffect(() => {
    const key = ['general','watchlist','regional','industry','commodity'][index];
    const saved = window.localStorage.getItem(`news-param-${key}`);
    setParam(saved || '');
  }, [index]);

  useEffect(() => {
    let canceled = false;
    setLoading(true); setError(null);

    if (index === 1 && !filterTicker) {
      setArticles([]); setLoading(false); return;
    }

    let p: Promise<Article[]>;
    switch (index) {
      case 0: p = fetchGeneralNews(usedLimit); break;
      case 1: p = fetchTickerNews(filterTicker!, usedLimit); break;
      case 2: p = fetchRegionalNews(effectiveParam || 'au', usedLimit); break;
      case 3: p = fetchIndustryNews(effectiveParam || 'technology', usedLimit); break;
      case 4: p = fetchCommodityNews(effectiveParam || 'gold', usedLimit); break;
      default: p = Promise.resolve([]);
    }

    p.then(a => { if (!canceled) setArticles(a); })
     .catch(e => { if (!canceled) setError((e as Error).message); })
     .finally(() => { if (!canceled) setLoading(false); });

    return () => { canceled = true; };
  }, [index, effectiveParam, filterTicker, usedLimit]);

  const onSaveSettings = () => {
    const key = ['general','watchlist','regional','industry','commodity'][index];
    window.localStorage.setItem(`news-param-${key}`, param);
    setOpenSettings(false);
  };

  const cardBg   = dark ? '#0d0d0d' : 'background.paper';
  const line     = dark ? 'rgba(255,255,255,0.12)' : 'divider';
  const titleCol = dark ? '#fff' : 'text.primary';
  const textCol  = dark ? 'rgba(255,255,255,0.72)' : 'text.secondary';

  return (
    <>
      {isFullscreen && (
        <Box
          sx={{
            position: 'fixed',
            top: fullscreenOffsetTop,
            left: 0,
            width: '100vw',
            height: `calc(100vh - ${fullscreenOffsetTop}px)`,
            bgcolor: '#000',
            zIndex: (theme) => theme.zIndex.modal, 
          }}
        />
      )}

      <Box
        ref={containerRef}
        sx={{
          position: isFullscreen ? 'fixed' : 'relative',
          top:      isFullscreen ? fullscreenOffsetTop : undefined,
          left:     isFullscreen ? 0 : undefined,
          width:    isFullscreen ? '100vw' : '100%',
          height:   isFullscreen ? `calc(100vh - ${fullscreenOffsetTop}px)` : height,
          minHeight: 0,
          bgcolor: 'transparent',
          p: 0,
          zIndex:  isFullscreen ? (theme) => theme.zIndex.modal + 1 : 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', pb: 1 }}>
          <Chip
            label={title}
            size="small"
            sx={{
              color: dark ? '#fff' : 'inherit',
              borderColor: line
            }}
            variant="outlined"
          />
          <Box sx={{ display:'flex', gap: 0.5 }}>
            <IconButton size="small" onClick={() => setIsFullscreen(f => !f)} aria-label="toggle fullscreen" sx={{ color: dark ? '#fff' : 'inherit' }}>
              {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
            </IconButton>
            {!isControlled && index >= 2 && (
              <IconButton size="small" onClick={() => setOpenSettings(true)} aria-label="settings" sx={{ color: dark ? '#fff' : 'inherit' }}>
                <TuneIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {loading && (
            <Box sx={{ textAlign: 'center', mt: 4, color: dark ? '#fff' : 'inherit' }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {error && (
            <Typography sx={{ color: 'salmon', mt: 2 }}>
              Failed to load: {error}
            </Typography>
          )}

          {!loading && !error && (
            <Grid container spacing={2}>
              {articles.map(a => (
                <Grid item xs={12} sm={6} md={4} key={a.id}>
                  <Card
                    component="a"
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      textDecoration: 'none',
                      boxShadow: 'none',
                      border: '1px solid',
                      borderColor: line,
                      bgcolor: cardBg,
                      borderRadius: 2,
                      transition: 'transform .15s ease, box-shadow .15s ease',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
                    }}
                  >
                    <CardMedia
                      component="img"
                      height={isXs ? 120 : 140}
                      image={a.image ?? '/placeholder.jpg'}
                      alt={a.title}
                      loading="lazy"
                      sx={{ borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
                    />
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 600, lineHeight: 1.25,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          overflow: 'hidden', color: titleCol
                        }}
                      >
                        {a.title}
                      </Typography>

                      {a.summary && (
                        <Typography
                          variant="body2"
                          sx={{
                            color: textCol,
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {a.summary}
                        </Typography>
                      )}

                      <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: textCol }}>
                          {new Date(a.publishedAt).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" sx={{ color: textCol, ml: 1, whiteSpace: 'nowrap' }}>
                          {a.source}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Box>

      <Dialog open={openSettings} onClose={() => setOpenSettings(false)}>
        <DialogTitle>Set {title}</DialogTitle>
        <DialogContent>
          <Select fullWidth value={param} onChange={e => setParam(e.target.value)}>
            {(index === 2 ? regionalOptions : index === 3 ? industryOptions : commodityOptions).map(opt => (
              <MenuItem key={opt} value={opt}>{opt.toUpperCase()}</MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSettings(false)}>Cancel</Button>
          <Button onClick={onSaveSettings}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NewsCardComponent;
