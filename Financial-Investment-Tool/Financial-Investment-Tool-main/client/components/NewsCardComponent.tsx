import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Button,
  Chip
} from '@mui/material';
import {
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Tune as TuneIcon,
  OpenInNew as OpenInNewIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { useTheme, useMediaQuery } from '@mui/material';
import {
  fetchGeneralNews,
  fetchRegionalNews,
  fetchIndustryNews,
  fetchCommodityNews,
  fetchTickerNews,
  Article
} from '@/services/news';

const regionalOptions = ['au', 'cn', 'jp', 'us', 'gb'];
const industryOptions = ['technology', 'health', 'finance', 'internet', 'pharmaceutical'];
const commodityOptions = ['gold', 'oil', 'wheat', 'copper', 'silver'];

export interface NewsCardComponentProps {
  index: number;
  title: string;
  height?: number | string;
  filterTicker?: string;
  paramOverride?: string;
  limit?: number;
  dark?: boolean;
  fullscreenOffsetTop?: number;
  layout?: 'grid' | 'list';
}

const NewsCardComponent: React.FC<NewsCardComponentProps> = ({
  index,
  height = 300,
  title,
  filterTicker,
  paramOverride,
  limit,
  dark = false,
  fullscreenOffsetTop = 0,
  layout = 'grid'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openSettings, setOpenSettings] = useState(false);
  const [param, setParam] = useState<string>('');

  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  const usedLimit = limit ?? (isXs ? 6 : 12);
  const imgHeight = isXs ? 120 : 140;
  const isControlled = typeof paramOverride !== 'undefined';
  const effectiveParam = isControlled ? paramOverride : param;
  const isList = layout === 'list';

  useEffect(() => {
    const key = ['general', 'watchlist', 'regional', 'industry', 'commodity'][index];
    const saved = window.localStorage.getItem(`news-param-${key}`);
    setParam(saved || '');
  }, [index]);

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setError(null);

    if (index === 1 && !filterTicker) {
      setArticles([]);
      setLoading(false);
      return;
    }

    let request: Promise<Article[]>;
    switch (index) {
      case 0:
        request = fetchGeneralNews(usedLimit);
        break;
      case 1:
        request = fetchTickerNews(filterTicker!, usedLimit);
        break;
      case 2:
        request = fetchRegionalNews(effectiveParam || 'au', usedLimit);
        break;
      case 3:
        request = fetchIndustryNews(effectiveParam || 'technology', usedLimit);
        break;
      case 4:
        request = fetchCommodityNews(effectiveParam || 'gold', usedLimit);
        break;
      default:
        request = Promise.resolve([]);
    }

    request
      .then((result) => {
        if (!canceled) setArticles(result);
      })
      .catch((requestError) => {
        if (!canceled) setError((requestError as Error).message);
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [effectiveParam, filterTicker, index, usedLimit]);

  const onSaveSettings = () => {
    const key = ['general', 'watchlist', 'regional', 'industry', 'commodity'][index];
    window.localStorage.setItem(`news-param-${key}`, param);
    setOpenSettings(false);
  };

  const cardBg = dark ? '#0d0d0d' : 'background.paper';
  const line = dark ? 'rgba(255,255,255,0.12)' : 'divider';
  const titleCol = dark ? '#fff' : 'text.primary';
  const textCol = dark ? 'rgba(255,255,255,0.72)' : 'text.secondary';

  const formatRelativeTime = (publishedAt: string) => {
    const ts = new Date(publishedAt).getTime();
    if (Number.isNaN(ts)) return '';

    const diffMs = Date.now() - ts;
    const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
    if (diffHours < 1) {
      const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return `${diffMinutes} min ago`;
    }
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  const buildRelatedTags = (article: Article) => {
    if (index === 1 && filterTicker) {
      return filterTicker.split(/\s+OR\s+/).slice(0, 3);
    }

    const text = `${article.title} ${article.summary}`.toUpperCase();
    const candidates = ['NVDA', 'MSFT', 'GOOGL', 'AAPL', 'TSLA', 'AMZN', 'META', 'JPM', 'V', 'MA', 'XOM', 'GLD'];
    return candidates.filter((tag) => text.includes(tag)).slice(0, 3);
  };

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
            zIndex: (muiTheme) => muiTheme.zIndex.modal
          }}
        />
      )}

      <Box
        ref={containerRef}
        sx={{
          position: isFullscreen ? 'fixed' : 'relative',
          top: isFullscreen ? fullscreenOffsetTop : undefined,
          left: isFullscreen ? 0 : undefined,
          width: isFullscreen ? '100vw' : '100%',
          height: isFullscreen ? `calc(100vh - ${fullscreenOffsetTop}px)` : height,
          minHeight: 0,
          bgcolor: 'transparent',
          p: 0,
          zIndex: isFullscreen ? (muiTheme) => muiTheme.zIndex.modal + 1 : 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Chip
            label={title}
            size="small"
            sx={{
              color: dark ? '#fff' : 'inherit',
              borderColor: line
            }}
            variant="outlined"
          />
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="small" onClick={() => setIsFullscreen((current) => !current)} aria-label="toggle fullscreen" sx={{ color: dark ? '#fff' : 'inherit' }}>
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

          {error && <Typography sx={{ color: 'salmon', mt: 2 }}>Failed to load: {error}</Typography>}

          {!loading && !error && (
            <>
              {isList ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {articles.map((article) => {
                    const tags = buildRelatedTags(article);

                    return (
                      <Card
                        key={article.id}
                        component="a"
                        href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        sx={{
                          display: 'flex',
                          flexDirection: { xs: 'column', md: 'row' },
                          gap: { xs: 2, md: 2.4 },
                          textDecoration: 'none',
                          boxShadow: 'none',
                          border: '1px solid rgba(255,255,255,0.08)',
                          bgcolor: '#101014',
                          borderRadius: 3,
                          px: { xs: 2, md: 2.4 },
                          py: { xs: 2, md: 2.2 },
                          transition: 'border-color .18s ease, transform .18s ease',
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            borderColor: 'rgba(69,136,255,0.35)'
                          }
                        }}
                      >
                        <CardMedia
                          component="img"
                          image={article.image ?? '/placeholder.jpg'}
                          alt={article.title}
                          loading="lazy"
                          sx={{
                            width: { xs: '100%', md: 170 },
                            minWidth: { xs: '100%', md: 170 },
                            height: { xs: 170, md: 108 },
                            borderRadius: 2,
                            objectFit: 'cover',
                            bgcolor: '#1a1a1a'
                          }}
                        />

                        <CardContent sx={{ p: '0 !important', flex: 1, display: 'flex', flexDirection: 'column', gap: 1.1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="h6"
                                sx={{
                                  color: titleCol,
                                  fontWeight: 720,
                                  fontSize: { xs: '1.08rem', md: '1.16rem' },
                                  lineHeight: 1.3,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}
                              >
                                {article.title}
                              </Typography>
                            </Box>
                            <OpenInNewIcon sx={{ color: 'rgba(255,255,255,0.38)', fontSize: 22, mt: 0.2 }} />
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, color: textCol, flexWrap: 'wrap' }}>
                            <Typography variant="body2" sx={{ color: textCol }}>
                              {article.source}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AccessTimeIcon sx={{ fontSize: 15 }} />
                              <Typography variant="body2" sx={{ color: textCol }}>
                                {formatRelativeTime(article.publishedAt)}
                              </Typography>
                            </Box>
                          </Box>

                          {article.summary && (
                            <Typography
                              variant="body1"
                              sx={{
                                color: textCol,
                                fontSize: '1rem',
                                lineHeight: 1.55,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {article.summary}
                            </Typography>
                          )}

                          {tags.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', pt: 0.2 }}>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>
                                Related:
                              </Typography>
                              {tags.map((tag) => (
                                <Chip
                                  key={`${article.id}-${tag}`}
                                  label={tag}
                                  size="small"
                                  sx={{
                                    height: 24,
                                    color: '#60a5fa',
                                    bgcolor: 'rgba(23,63,140,0.45)',
                                    border: '1px solid rgba(59,130,246,0.22)',
                                    borderRadius: '8px'
                                  }}
                                />
                              ))}
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {articles.map((article) => (
                    <Grid item xs={12} sm={6} md={4} key={article.id}>
                      <Card
                        component="a"
                        href={article.url}
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
                          height={imgHeight}
                          image={article.image ?? '/placeholder.jpg'}
                          alt={article.title}
                          loading="lazy"
                          sx={{ borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
                        />
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: 600,
                              lineHeight: 1.25,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              color: titleCol
                            }}
                          >
                            {article.title}
                          </Typography>

                          {article.summary && (
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
                              {article.summary}
                            </Typography>
                          )}

                          <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ color: textCol }}>
                              {new Date(article.publishedAt).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" sx={{ color: textCol, ml: 1, whiteSpace: 'nowrap' }}>
                              {article.source}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </>
          )}
        </Box>
      </Box>

      <Dialog open={openSettings} onClose={() => setOpenSettings(false)}>
        <DialogTitle>Set {title}</DialogTitle>
        <DialogContent>
          <Select fullWidth value={param} onChange={(e) => setParam(e.target.value)}>
            {(index === 2 ? regionalOptions : index === 3 ? industryOptions : commodityOptions).map((option) => (
              <MenuItem key={option} value={option}>
                {option.toUpperCase()}
              </MenuItem>
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
