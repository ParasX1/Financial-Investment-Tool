import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { Article, fetchGeneralNews } from '@/services/news';

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

  useEffect(() => {
    // Only general news
    if (index !== 0) return;
    setLoading(true);
    fetchGeneralNews(15)
      .then(data => setArticles(data))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [index]);

  return (
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
      {/* Title line */}
      <Box sx={{ position: 'relative' }}>
        <Typography variant="subtitle1" sx={{ color: 'white' }}>
          {title}
        </Typography>

        <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 1 }}>
          <Button variant="contained" size="small" onClick={() => setIsFullscreen(f => !f)}>
            {isFullscreen ? '⤡' : '⤢'}
          </Button>
          <Button variant="contained" size="small">⚙︎</Button>
        </Box>
      </Box>

      {/* Information area */}
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

        {!loading && !error && articles.map(a => (
          <Box key={a.id} sx={{ mb: 2 }}>
            <a
              href={a.url}
              target="_blank"
              rel="noreferrer"
              style={{
                color: '#4ea1ff',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              {a.title}
            </a>
            <Typography variant="caption" component="div" sx={{ color: '#999', mt: 0.5 }}>
              {new Date(a.publishedAt).toLocaleString()} · {a.source}
            </Typography>
            {a.summary && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {a.summary}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default NewsCardComponent;
