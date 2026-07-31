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
  fetchCommodityNews, fetchTickerNews, fetchSearchNews
} from '@/services/news';
import type { Article } from '@/lib/news/contracts';

const regionalOptions  = [ 'au','cn','jp','us','gb' ];
const industryOptions  = [ 'technology','health','finance','internet','pharmaceutical' ];
const commodityOptions = [ 'gold','oil','wheat','copper','silver' ];

function getArticleDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Unknown website';
  }
}

export interface NewsCardComponentProps {
  index: number;
  title: string;
  height?: number | string;
  filterTicker?: string;
  paramOverride?: string;
  limit?: number;
  dark?: boolean;
  fullscreenOffsetTop?: number;
  refreshKey?: number;
  searchQuery?: string;
  searchContext?: string;
  categoryDescription?: string;
}

const NewsCardComponent: React.FC<NewsCardComponentProps> = ({
  index, height = 300, title, filterTicker, paramOverride, limit,
  dark = false, fullscreenOffsetTop = 0, refreshKey = 0, searchQuery = '',
  searchContext, categoryDescription
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

    const cleanedSearch = searchQuery.trim();
    if (index === 1 && !filterTicker && !cleanedSearch) {
      setArticles([]); setLoading(false); return;
    }

    let p: Promise<Article[]>;
    if (cleanedSearch) {
      p = fetchSearchNews(cleanedSearch, usedLimit, searchContext);
    } else {
      switch (index) {
        case 0: p = fetchGeneralNews(usedLimit); break;
        case 1: p = fetchTickerNews(filterTicker!, usedLimit); break;
        case 2: p = fetchRegionalNews(effectiveParam || 'au', usedLimit); break;
        case 3: p = fetchIndustryNews(effectiveParam || 'technology', usedLimit); break;
        case 4: p = fetchCommodityNews(effectiveParam || 'gold', usedLimit); break;
        default: p = Promise.resolve([]);
      }
    }

    p.then(a => { if (!canceled) setArticles(a); })
     .catch(e => { if (!canceled) setError((e as Error).message); })
     .finally(() => { if (!canceled) setLoading(false); });

    return () => { canceled = true; };
  }, [index, effectiveParam, filterTicker, usedLimit, refreshKey, searchQuery, searchContext]);

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
        <Box sx={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap: 2, pb: 2 }}>
          <Box>
            <Typography sx={{ color: titleCol, fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
              {searchQuery.trim() ? `Search results for "${searchQuery.trim()}"` : title}
            </Typography>
            {categoryDescription && (
              <Typography sx={{ color: textCol, mt: 0.5, maxWidth: 820 }}>
                {categoryDescription}
              </Typography>
            )}
          </Box>
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
                <Grid item xs={12} key={a.id}>
                  <Card
                    component="a"
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '220px minmax(0, 1fr)' },
                      minHeight: { xs: 'auto', sm: 178 },
                      textDecoration: 'none',
                      boxShadow: 'none',
                      border: '1px solid',
                      borderColor: line,
                      bgcolor: cardBg,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      transition: 'border-color .15s ease, background-color .15s ease',
                      '&:hover': {
                        borderColor: dark ? 'rgba(74,144,255,0.65)' : 'primary.main',
                        bgcolor: dark ? '#111319' : 'background.paper'
                      }
                    }}
                  >
                    {(() => {
                      const articleDomain = getArticleDomain(a.url);

                      return (
                        <>
                    <CardMedia
                      component="img"
                      image={a.image ?? '/assets/gridBackground1.png'}
                      alt={a.title}
                      loading="lazy"
                      sx={{
                        height: { xs: 168, sm: '100%' },
                        minHeight: { sm: 178 },
                        objectFit: 'cover',
                        bgcolor: '#161616'
                      }}
                    />
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, minWidth: 0, p: { xs: 2, sm: 3 } }}>
                      <Typography
                        sx={{
                          fontSize: { xs: 18, md: 24 },
                          fontWeight: 700,
                          lineHeight: 1.2,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          color: titleCol
                        }}
                      >
                        {a.title}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: textCol, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ color: textCol }}>
                          {a.source}
                        </Typography>
                        <Typography variant="body2" sx={{ color: textCol }}>
                          {articleDomain}
                        </Typography>
                        <Typography variant="body2" sx={{ color: textCol }}>
                          {new Date(a.publishedAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </Typography>
                      </Box>

                      {a.summary && (
                        <Typography
                          sx={{
                            fontSize: { xs: 14, md: 16 },
                            lineHeight: 1.55,
                            color: textCol,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {a.summary}
                        </Typography>
                      )}

                      <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={searchQuery.trim() ? 'Search' : title.replace(' News', '')}
                          size="small"
                          sx={{
                            color: '#4a90ff',
                            bgcolor: 'rgba(74,144,255,0.12)',
                            border: '1px solid rgba(74,144,255,0.35)',
                            borderRadius: '6px'
                          }}
                        />
                        <Typography variant="caption" sx={{ color: '#4a90ff', whiteSpace: 'nowrap' }}>
                          Open story
                        </Typography>
                      </Box>
                    </CardContent>
                        </>
                      );
                    })()}
                  </Card>
                </Grid>
              ))}
              {!articles.length && (
                <Grid item xs={12}>
                  <Box sx={{ border: `1px solid ${line}`, borderRadius: '8px', p: 3, color: textCol }}>
                    No news matched this view. Try another search term, region, or category.
                  </Box>
                </Grid>
              )}
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
