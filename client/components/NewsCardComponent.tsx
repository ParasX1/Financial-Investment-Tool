import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Typography, CircularProgress,
        Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem,
        Card, CardMedia, CardContent, Grid } from '@mui/material';
import {
  fetchGeneralNews,
  fetchRegionalNews,
  fetchIndustryNews,
  fetchCommodityNews,
  Article
} from '@/services/news';

const regionalOptions  = [ 'au','cn','jp','us','gb' ];
const industryOptions  = [ 'technology','health','finance','internet','pharmaceutical' ];
const commodityOptions = [ 'gold','oil','wheat','copper','silver' ];

export interface NewsCardComponentProps {
  index: number;
  title: string;
  height?: number | string;
}

const NewsCardComponent: React.FC<NewsCardComponentProps> = ({
  index,
  height = 300,
  title,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [openSettings, setOpenSettings] = useState(false);
  const [param, setParam]               = useState<string>('');

  // initial param
  useEffect(() => {
    const key = ['general','watchlist','regional','industry','commodity'][index];
    const saved = window.localStorage.getItem(`news-param-${key}`);
    setParam(saved || '');
  }, [index]);

  // Pull data
  useEffect(() => {
    setLoading(true);
    setError(null);
    let p: Promise<Article[]>;
    switch (index) {
      case 0: p = fetchGeneralNews(10); break;
      case 2: p = fetchRegionalNews(param || 'au',  10); break;
      case 3: p = fetchIndustryNews(param || 'technology', 10); break;
      case 4: p = fetchCommodityNews(param || 'gold', 10); break;
      default:
        p = Promise.resolve([]); // ToDo: watchlist or portfolio in following issues
    }
    p.then(setArticles)
     .catch(e => setError((e as Error).message))
     .finally(() => setLoading(false));
  }, [index, param]);

  const onSaveSettings = () => {
    const key = ['general','watchlist','regional','industry','commodity'][index];
    window.localStorage.setItem(`news-param-${key}`, param);
    setOpenSettings(false);
  };


  return (
    <>

    <Box
      ref={containerRef}
      sx={{
        position: isFullscreen ? 'fixed' : 'relative',
        top:      isFullscreen ? 0 : undefined,
        left:     isFullscreen ? 0 : undefined,
        width:    isFullscreen ? '100vw' : '100%',
        height:   isFullscreen ? '100vh' : height,
        minHeight: 0, 
        bgcolor:  '#111',
        border:   '1px solid #555',
        p:        1,
        zIndex:   isFullscreen ? 1200 : undefined,

        display:       'flex',
        flexDirection: 'column',
      }}
    >
      {/* Title + Controls */}
      <Box sx={{ position: 'relative' }}>
        <Typography variant="subtitle1" sx={{ color: 'white' }}>
          {title}
        </Typography>

        <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 1 }}>
            <Button variant="contained" size="small" onClick={() => setIsFullscreen(f => !f)}>
            {isFullscreen ? '⤡' : '⤢'}
          </Button>
            {index >= 2 && (
              <Button variant="contained" size="small" onClick={()=>setOpenSettings(true)}>⚙︎</Button>
            )}
        </Box>
      </Box>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          mt: 1,
          overflowY: 'auto',
          minHeight: 0,
          pr: 1,
        }}
      >
        {loading && (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <CircularProgress size={24} color="inherit" />
          </Box>
        )}

        {error && (
          <Typography sx={{ color: 'salmon', mt: 2 }}>
            Failed load: {error}
          </Typography>
        )}

        {!loading && !error && (
            <Grid container spacing={2}>
              {articles.map(a => (
                <Grid item xs={12} sm={6} md={4} key={a.id}>
                  <Card sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    boxShadow: 3,
                    '&:hover': { boxShadow: 6 },
                  }}>
                    <CardMedia
                      component="img"
                      height="120"
                      image={a.image ?? '/placeholder.jpg'}
                      alt={a.title}
                    />
                    <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <Typography
                        component="a"
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        variant="subtitle1"
                        sx={{
                          mb: 1,
                          color: '#4ea1ff',
                          textDecoration: 'none',
                          fontWeight: 500,
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {a.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ flex: 1, mb: 1 }}
                      >
                        {a.summary}
                      </Typography>
                      <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <Typography variant="caption" sx={{ color: '#999' }}>
                          {new Date(a.publishedAt).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#999' }}>
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

    {/* Settings Dialog */}
      <Dialog open={openSettings} onClose={()=>setOpenSettings(false)}>
        <DialogTitle>Set {title}</DialogTitle>
        <DialogContent>
          <Select
            fullWidth
            value={param}
            onChange={e=>setParam(e.target.value)}
          >
            {(index === 2 ? regionalOptions
             : index === 3 ? industryOptions
             : commodityOptions
            ).map(opt=>(
              <MenuItem key={opt} value={opt}>
                {opt.toUpperCase()}
              </MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpenSettings(false)}>Cancel</Button>
          <Button onClick={onSaveSettings}>Save</Button>
        </DialogActions>
      </Dialog>

      </>
  );
};

export default NewsCardComponent;
